let currentChatUserId = null;
let chatSocket = null;
let seenMessageIds = new Set();
let unreadMessageIds = [];

function addMessage(sender, text, isSent = false, timestamp = null, messageId = null, isRead = false, fileUrl = null) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    hideTypingIndicator();

    if (messageId && seenMessageIds.has(messageId)) {
        return;
    }
    if (messageId) {
        seenMessageIds.add(messageId);
    }

    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", isSent ? "sent" : "received");
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    }

    const messageBubble = document.createElement("div");
    messageBubble.classList.add("message-bubble");
    
    if (fileUrl) {
        const img = document.createElement("img");
        img.src = fileUrl;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "8px";
        img.style.marginBottom = "8px";
        messageBubble.appendChild(img);
    }
    
    if (text) {
        const textSpan = document.createElement("span");
        textSpan.textContent = text;
        messageBubble.appendChild(textSpan);
    }

    const messageMeta = document.createElement("div");
    messageMeta.classList.add("message-meta");
    
    const timeSpan = document.createElement("span");
    if (timestamp) {
        const date = new Date(timestamp);
        timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        const now = new Date();
        timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    messageMeta.appendChild(timeSpan);
    
    if (isSent) {
        const receiptSpan = document.createElement("span");
        receiptSpan.classList.add("material-symbols-outlined", "read-receipt");
        receiptSpan.textContent = isRead ? "done_all" : "done";
        if (isRead) {
            receiptSpan.style.color = "#4ade80"; 
        }
        messageMeta.appendChild(receiptSpan);
    } else if (messageId && !isRead) {
        unreadMessageIds.push(messageId);
    }

    messageBubble.appendChild(messageMeta);
    messageDiv.appendChild(messageBubble);

    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

function showTypingIndicator() {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    hideTypingIndicator();

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("typing-indicator");
    typingDiv.innerHTML = `
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function markMessagesRead() {
    if (unreadMessageIds.length > 0 && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            'action': 'mark_read',
            'message_ids': unreadMessageIds
        }));
        unreadMessageIds = [];
    }
}

function connectWebSocket(userId) {
    if (chatSocket) {
        chatSocket.close();
    }

    currentChatUserId = userId;
    chatSocket = new WebSocket(
        (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
        window.location.host +
        `/ws/chat/${userId}/`
    );

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const action = data.action || 'chat_message';

        if (action === 'chat_message') {
            const isSent = data.sender_id === window.currentUserId;
            addMessage(data.sender_username, data.message, isSent, data.timestamp, data.id, data.is_read, data.file_url);
            if (!isSent) {
                markMessagesRead();
            }
        } else if (action === 'user_status') {
            const userItem = document.querySelector(`.user-item[data-user-id="${data.user_id}"]`);
            if (userItem) {
                const statusIndicator = userItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.style.background = data.is_online ? '#22c55e' : 'transparent';
                }
            }
            if (currentChatUserId == data.user_id) {
                const statusText = userItem ? userItem.dataset.statusText || '' : '';
                const statusString = data.is_online ? 'Online' : 'Offline';
                document.getElementById('chatHeaderStatus').textContent = statusText ? `${statusString} • ${statusText}` : statusString;
            }
        } else if (action === 'read_receipt') {
            data.message_ids.forEach(id => {
                const msgDiv = document.querySelector(`.message[data-message-id="${id}"] .read-receipt`);
                if (msgDiv) {
                    msgDiv.textContent = 'done_all';
                    msgDiv.style.color = '#4ade80';
                }
            });
        }
    };

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };
}

function loadMessageHistory(userId) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    fetch(`/api/messages/${userId}/`)
        .then(response => response.json())
        .then(data => {
            chatMessages.innerHTML = '';
            seenMessageIds.clear();
            unreadMessageIds = [];
            data.messages.forEach(msg => {
                const isSent = msg.sender_id === window.currentUserId;
                addMessage(msg.sender_username, msg.content, isSent, msg.timestamp, msg.id, msg.is_read, msg.file_url);
            });
            markMessagesRead();
        });
}

document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const userListItems = document.querySelectorAll('.user-item');
    const chatHeader = document.getElementById('chatHeader');
    const sidebar = document.getElementById('sidebar');
    const mobileBackBtn = document.getElementById('mobileBackBtn');
    const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
    const chatHeaderStatus = document.getElementById('chatHeaderStatus');

    // Setup Attachments
    const attachBtn = document.getElementById("attachBtn");
    const fileInput = document.getElementById("fileInput");

    if (mobileBackBtn) {
        mobileBackBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
        });
    }

    userListItems.forEach(item => {
        item.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const username = this.querySelector('.user-name').textContent;
            
            // clear unread badge locally
            const unreadBadge = this.querySelector('.unread-badge');
            if(unreadBadge) unreadBadge.remove();

            userListItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            chatHeader.textContent = username;
            
            chatHeaderAvatar.style.display = 'flex';
            chatHeaderAvatar.textContent = username.charAt(0).toUpperCase();
            
            const statusIndicator = this.querySelector('.status-indicator');
            const isOnline = statusIndicator && (
                statusIndicator.style.background === 'rgb(34, 197, 94)' ||
                statusIndicator.style.backgroundColor === 'rgb(34, 197, 94)' ||
                statusIndicator.style.background === '#22c55e' ||
                statusIndicator.style.backgroundColor === '#22c55e'
            );
            const statusText = this.dataset.statusText || '';
            const statusString = isOnline ? 'Online' : 'Offline';
            chatHeaderStatus.textContent = statusText ? `${statusString} • ${statusText}` : statusString;
            chatHeaderStatus.style.display = 'block';

            messageInput.disabled = false;
            sendButton.disabled = false;
            if (attachBtn) attachBtn.disabled = false;
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            }

            messageInput.focus();

            connectWebSocket(userId);
            loadMessageHistory(userId);
        });
    });

    if (window.selectedUserId && window.selectedUserId !== 0) {
        const userItem = document.querySelector(`.user-item[data-user-id="${window.selectedUserId}"]`);
        if (userItem) {
            userItem.click();
        }
    }

    function sendMessage(text, filePath = null) {
        if ((text || filePath) && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify({
                'action': 'chat_message',
                'message': text,
                'file_path': filePath
            }));
            messageInput.value = "";
        }
    }

    sendButton.addEventListener("click", () => {
        sendMessage(messageInput.value.trim());
    });

    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !sendButton.disabled) {
            sendButton.click();
        }
    });

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch('/api/upload/', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.file_url) {
                        sendMessage(messageInput.value.trim(), data.file_url.split('/media/')[1]); 
                        messageInput.value = "";
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                }
            }
        });
    }
    
    // Emoji Picker dummy logic
    const emojiBtn = document.getElementById("emojiBtn");
    if (emojiBtn) {
        emojiBtn.addEventListener('click', () => {
            messageInput.value += "😀"; // minimal logic for practice
            messageInput.focus();
        });
    }

    // Modal Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const profilePicInput = document.getElementById('profilePicInput');
    const settingsProfilePicPreview = document.getElementById('settingsProfilePicPreview');
    const settingsProfilePicPreviewText = document.getElementById('settingsProfilePicPreviewText');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const statusTextInput = document.getElementById('statusTextInput');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
        });
    }

    const myStatusBtn = document.getElementById('myStatusBtn');
    if (myStatusBtn) {
        myStatusBtn.addEventListener('click', () => {
            if (settingsBtn) settingsBtn.click();
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    if (profilePicInput) {
        profilePicInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (settingsProfilePicPreview) {
                        settingsProfilePicPreview.src = e.target.result;
                    } else if (settingsProfilePicPreviewText) {
                        const img = document.createElement('img');
                        img.id = 'settingsProfilePicPreview';
                        img.src = e.target.result;
                        img.style.width = '100px';
                        img.style.height = '100px';
                        img.style.borderRadius = '50%';
                        img.style.objectFit = 'cover';
                        settingsProfilePicPreviewText.replaceWith(img);
                    }
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const formData = new FormData();
            formData.append('status_text', statusTextInput.value);
            if (profilePicInput.files[0]) {
                formData.append('profile_pic', profilePicInput.files[0]);
            }

            saveProfileBtn.textContent = "Saving...";
            saveProfileBtn.disabled = true;

            try {
                const response = await fetch('/api/profile/update/', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.status === 'success') {
                    // Update UI gracefully or reload
                    window.location.reload();
                }
            } catch (error) {
                console.error("Failed to update profile", error);
            } finally {
                saveProfileBtn.textContent = "Save Changes";
                saveProfileBtn.disabled = false;
            }
        });
    }

    // Call Logic
    const audioCallBtn = document.getElementById('audioCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    const callingModal = document.getElementById('callingModal');
    const endCallBtn = document.getElementById('endCallBtn');
    const callingName = document.getElementById('callingName');
    const callingAvatar = document.getElementById('callingAvatar');
    let callTimeout;

    function startCall(type) {
        if (!currentChatUserId) return;
        const activeUserItem = document.querySelector('.user-item.active');
        if (activeUserItem) {
            const username = activeUserItem.querySelector('.user-name').textContent;
            const profilePicImg = activeUserItem.querySelector('.user-avatar img');
            callingName.textContent = `Calling ${username}...`;
            
            callingAvatar.innerHTML = '';
            if (profilePicImg) {
                const img = document.createElement('img');
                img.src = profilePicImg.src;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                callingAvatar.appendChild(img);
            } else {
                callingAvatar.textContent = username.charAt(0).toUpperCase();
            }

            callingModal.classList.add('active');
            
            // Auto close after 5 seconds to mock unanswered call
            callTimeout = setTimeout(() => {
                endCall();
                alert(`${username} is unavailable right now.`);
            }, 5000);
        }
    }

    function endCall() {
        callingModal.classList.remove('active');
        clearTimeout(callTimeout);
    }

    if (audioCallBtn) audioCallBtn.addEventListener('click', () => startCall('audio'));
    if (videoCallBtn) videoCallBtn.addEventListener('click', () => startCall('video'));
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);

});