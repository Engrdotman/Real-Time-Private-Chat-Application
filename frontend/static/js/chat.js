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

let currentRoomType = 'private'; 
let currentGroupId = null;

function connectWebSocket(id, type = 'private') {
    if (chatSocket) {
        chatSocket.close();
    }

    currentRoomType = type;
    if (type === 'group') {
        currentGroupId = id;
        currentChatUserId = null;
        chatSocket = new WebSocket(
            (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
            window.location.host +
            `/ws/group/${id}/`
        );
    } else {
        currentChatUserId = id;
        currentGroupId = null;
        chatSocket = new WebSocket(
            (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
            window.location.host +
            `/ws/chat/${id}/`
        );
    }

    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const action = data.action || 'chat_message';

        if (action === 'chat_message') {
            const isSent = data.sender_id === window.currentUserId;
            addMessage(data.sender_username, data.message, isSent, data.timestamp, data.id, data.is_read, data.file_url);
            if (!isSent) {
                markMessagesRead();
            }
        } else if (action === 'group_chat_message') {
            const isSent = data.sender_id === window.currentUserId;
            addMessage(data.sender_username, data.message, isSent, data.timestamp, data.id, true, data.file_url);
        } else if (action === 'user_status') {
            const userItem = document.querySelector(`.user-item[data-user-id="${data.user_id}"]`);
            if (userItem) {
                const statusIndicator = userItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.style.background = data.is_online ? '#22c55e' : 'transparent';
                }
            }
            if (currentRoomType === 'private' && currentChatUserId == data.user_id) {
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

function loadGroupMessages(groupId) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    fetch(`/api/groups/${groupId}/messages/`)
        .then(response => response.json())
        .then(data => {
            chatMessages.innerHTML = '';
            seenMessageIds.clear();
            unreadMessageIds = [];
            data.messages.forEach(msg => {
                const isSent = msg.sender_id === window.currentUserId;
                addMessage(msg.sender_username, msg.content, isSent, msg.timestamp, msg.id, true, msg.file_url);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
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

function initChatApp() {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const userListItems = document.querySelectorAll('.user-item');
    const groupListItems = document.querySelectorAll('.group-item');
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
            
            const unreadBadge = this.querySelector('.unread-badge');
            if(unreadBadge) unreadBadge.remove();

            userListItems.forEach(i => i.classList.remove('active'));
            groupListItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            chatHeader.textContent = username;
            
            chatHeaderAvatar.style.display = 'flex';
            chatHeaderAvatar.textContent = username.charAt(0).toUpperCase();
            chatHeaderAvatar.style.borderRadius = '50%';
            
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

    // Group Chat Click Handlers
    groupListItems.forEach(item => {
        item.addEventListener('click', function() {
            const groupId = this.dataset.groupId;
            const groupName = this.querySelector('div[style*="font-weight: 600"]').textContent;
            const groupDesc = this.querySelector('p').textContent;
            
            userListItems.forEach(i => i.classList.remove('active'));
            groupListItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            chatHeader.textContent = groupName;
            
            chatHeaderAvatar.style.display = 'flex';
            chatHeaderAvatar.textContent = groupName.slice(0, 2).toUpperCase();
            chatHeaderAvatar.style.borderRadius = '12px';
            
            chatHeaderStatus.textContent = groupDesc || 'Group Chat';
            chatHeaderStatus.style.display = 'block';
            
            messageInput.disabled = false;
            sendButton.disabled = false;
            if (attachBtn) attachBtn.disabled = false;
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            }
            
            messageInput.focus();
            
            connectWebSocket(groupId, 'group');
            loadGroupMessages(groupId);
        });
    });

    // Create Group Modal Handlers
    const createGroupBtn = document.getElementById('createGroupBtn');
    const createGroupModal = document.getElementById('createGroupModal');
    const closeCreateGroupBtn = document.getElementById('closeCreateGroupBtn');
    const submitCreateGroupBtn = document.getElementById('submitCreateGroupBtn');
    
    if (createGroupBtn && createGroupModal) {
        createGroupBtn.addEventListener('click', () => {
            createGroupModal.classList.add('active');
        });
        
        closeCreateGroupBtn.addEventListener('click', () => {
            createGroupModal.classList.remove('active');
        });
        
        submitCreateGroupBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('groupNameInput');
            const descInput = document.getElementById('groupDescInput');
            const avatarInput = document.getElementById('groupAvatarInput');
            const checkedMembers = document.querySelectorAll('input[name="group_members"]:checked');
            
            if (!nameInput.value.trim()) {
                alert('Please enter a group name');
                return;
            }
            
            const formData = new FormData();
            formData.append('name', nameInput.value.trim());
            formData.append('description', descInput.value.trim());
            if (avatarInput.files.length > 0) {
                formData.append('avatar', avatarInput.files[0]);
            }
            checkedMembers.forEach(chk => {
                formData.append('members', chk.value);
            });
            
            fetch('/api/groups/create/', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    location.reload();
                } else {
                    alert('Error creating group: ' + (data.error || 'Unknown error'));
                }
            });
        });
    }

    // Emoji Picker Interactions
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    
    if (emojiBtn && emojiPicker) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
        });
        
        emojiPicker.querySelectorAll('.emoji-grid span').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                const startPos = messageInput.selectionStart;
                const endPos = messageInput.selectionEnd;
                const text = messageInput.value;
                messageInput.value = text.substring(0, startPos) + span.textContent + text.substring(endPos);
                messageInput.focus();
                messageInput.selectionStart = messageInput.selectionEnd = startPos + span.textContent.length;
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    // Status Story Handlers
    const addStoryBtn = document.getElementById('addStoryBtn');
    const uploadStoryModal = document.getElementById('uploadStoryModal');
    const closeUploadStoryBtn = document.getElementById('closeUploadStoryBtn');
    const submitStoryBtn = document.getElementById('submitStoryBtn');
    
    if (addStoryBtn && uploadStoryModal) {
        addStoryBtn.addEventListener('click', () => {
            uploadStoryModal.classList.add('active');
        });
        
        closeUploadStoryBtn.addEventListener('click', () => {
            uploadStoryModal.classList.remove('active');
        });
        
        submitStoryBtn.addEventListener('click', () => {
            const imageInput = document.getElementById('storyImageInput');
            const captionInput = document.getElementById('storyCaptionInput');
            
            if (imageInput.files.length === 0) {
                alert('Please select a photo to share');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            formData.append('caption', captionInput.value.trim());
            
            fetch('/api/stories/create/', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    uploadStoryModal.classList.remove('active');
                    imageInput.value = '';
                    captionInput.value = '';
                    loadStories();
                } else {
                    alert('Error posting story: ' + (data.error || 'Unknown error'));
                }
            });
        });
    }

    // Stories Feed Retriever & Viewer
    let activeStories = [];
    const activeStoriesContainer = document.getElementById('activeStoriesContainer');
    const storyViewerModal = document.getElementById('storyViewerModal');
    const closeStoryViewerBtn = document.getElementById('closeStoryViewerBtn');
    const storyViewerAvatar = document.getElementById('storyViewerAvatar');
    const storyViewerUsername = document.getElementById('storyViewerUsername');
    const storyViewerTime = document.getElementById('storyViewerTime');
    const storyViewerImage = document.getElementById('storyViewerImage');
    const storyViewerCaption = document.getElementById('storyViewerCaption');
    const storyLikeBtn = document.getElementById('storyLikeBtn');
    const storyLikeIcon = document.getElementById('storyLikeIcon');
    const storyLikesCount = document.getElementById('storyLikesCount');
    const storyCommentsArea = document.getElementById('storyCommentsArea');
    const storyCommentInput = document.getElementById('storyCommentInput');
    const storySendCommentBtn = document.getElementById('storySendCommentBtn');
    
    function loadStories() {
        if (!activeStoriesContainer) return;
        
        fetch('/api/stories/')
            .then(res => res.json())
            .then(data => {
                activeStories = data.stories;
                activeStoriesContainer.innerHTML = '';
                
                const userStoriesMap = {};
                activeStories.forEach(s => {
                    if (!userStoriesMap[s.username]) {
                        userStoriesMap[s.username] = [];
                    }
                    userStoriesMap[s.username].push(s);
                });
                
                Object.keys(userStoriesMap).forEach(username => {
                    const stories = userStoriesMap[username];
                    const firstStory = stories[0];
                    
                    const storyCircle = document.createElement('div');
                    storyCircle.className = 'story-circle';
                    storyCircle.style.cssText = 'display: flex; flex-direction: column; align-items: center; cursor: pointer; flex-shrink: 0; text-align: center;';
                    
                    const avatarSrc = firstStory.user_avatar || (window.location.origin + '/static/images/default-avatar.png');
                    
                    storyCircle.innerHTML = `
                        <div class="gradient-ring" style="width: 48px; height: 48px; border-radius: 50%; padding: 2px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                            <img src="${avatarSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--bg-sidebar);">
                        </div>
                        <span style="font-size: 9.5px; color: var(--text-secondary); margin-top: 5px; font-weight: 600; width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${username}</span>
                    `;
                    
                    storyCircle.addEventListener('click', () => {
                        openStoryViewer(stories, 0);
                    });
                    
                    activeStoriesContainer.appendChild(storyCircle);
                });
            });
    }
    
    function openStoryViewer(stories, index) {
        if (!stories || stories.length === 0) return;
        
        const story = stories[index];
        storyViewerModal.classList.add('active');
        
        storyViewerAvatar.src = story.user_avatar || (window.location.origin + '/static/images/default-avatar.png');
        storyViewerUsername.textContent = story.username;
        
        const date = new Date(story.timestamp);
        storyViewerTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        storyViewerImage.src = story.image;
        storyViewerCaption.textContent = story.caption || '';
        
        updateLikeUI(story.liked_by_me, story.likes_count);
        
        storyCommentsArea.innerHTML = '';
        story.comments.forEach(c => {
            appendStoryComment(c.username, c.content);
        });
        
        storyCommentInput.value = '';
        
        storyLikeBtn.onclick = () => {
            toggleLikeStory(story, stories, index);
        };
        
        storyViewerImage.ondblclick = () => {
            if (!story.liked_by_me) {
                toggleLikeStory(story, stories, index);
            }
        };
        
        storySendCommentBtn.onclick = () => {
            sendStoryComment(story);
        };
        
        storyCommentInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendStoryComment(story);
            }
        };
    }
    
    function updateLikeUI(liked, count) {
        storyLikesCount.textContent = `${count} Like${count !== 1 ? 's' : ''}`;
        storyLikeIcon.style.color = liked ? '#ef4444' : '#94a3b8';
        storyLikeIcon.textContent = liked ? 'favorite' : 'favorite_border';
    }
    
    function toggleLikeStory(story, stories, index) {
        fetch(`/api/stories/${story.id}/like/`, {
            method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                story.liked_by_me = data.liked;
                story.likes_count = data.likes_count;
                updateLikeUI(story.liked_by_me, story.likes_count);
                loadStories();
            }
        });
    }
    
    function sendStoryComment(story) {
        const text = storyCommentInput.value.trim();
        if (!text) return;
        
        fetch(`/api/stories/${story.id}/comment/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: text })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                appendStoryComment(data.comment.username, data.comment.content);
                storyCommentInput.value = '';
                story.comments.push(data.comment);
            }
        });
    }
    
    function appendStoryComment(username, content) {
        const div = document.createElement('div');
        div.style.cssText = 'font-size: 12px; background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 10px; line-height: 1.4;';
        div.innerHTML = `<strong style="color: var(--primary-color);">${username}:</strong> <span style="color: #cbd5e1;">${content}</span>`;
        storyCommentsArea.appendChild(div);
        storyCommentsArea.scrollTop = storyCommentsArea.scrollHeight;
    }
    
    if (closeStoryViewerBtn) {
        closeStoryViewerBtn.addEventListener('click', () => {
            storyViewerModal.classList.remove('active');
        });
    }
    
    loadStories();

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatApp);
} else {
    initChatApp();
}