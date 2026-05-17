let currentChatUserId = null;
let chatSocket = null;
let seenMessageIds = new Set();

function addMessage(sender, text, isSent = false, timestamp = null, messageId = null) {
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

    const senderLabel = document.createElement("div");
    senderLabel.classList.add("sender-name");
    senderLabel.textContent = isSent ? "You" : sender;

    const messageBubble = document.createElement("div");
    messageBubble.classList.add("message-bubble", isSent ? "sent" : "received");
    messageBubble.textContent = text;

    const messageMeta = document.createElement("div");
    messageMeta.classList.add("message-meta");
    if (timestamp) {
        const date = new Date(timestamp);
        messageMeta.textContent = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        const now = new Date();
        messageMeta.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    messageDiv.appendChild(senderLabel);
    messageDiv.appendChild(messageBubble);
    messageDiv.appendChild(messageMeta);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    
    hideTypingIndicator();

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("typing-indicator");
    typingDiv.innerHTML = `
        <span>Typing</span>
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
        const isSent = data.sender_id === window.currentUserId;
        addMessage(data.sender_username, data.message, isSent, data.timestamp);
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
            data.messages.forEach(msg => {
                const isSent = msg.sender_id === window.currentUserId;
                addMessage(msg.sender_username, msg.content, isSent, msg.timestamp, msg.id);
            });
        });
}

// Initialize and setup event listeners
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const userListItems = document.querySelectorAll('.user-item');
    const chatHeader = document.getElementById('chatHeader');

    // Handle user selection
    userListItems.forEach(item => {
        item.addEventListener('click', function() {
            const userId = this.dataset.userId;
            const username = this.textContent;

            userListItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            chatHeader.textContent = username;
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();

            connectWebSocket(userId);
            loadMessageHistory(userId);
        });
    });

    // Select user on page load if specified
    if (window.selectedUserId && window.selectedUserId !== 0) {
        const userItem = document.querySelector(`.user-item[data-user-id="${window.selectedUserId}"]`);
        if (userItem) {
            userItem.click();
        }
    }

    // Send message
    sendButton.addEventListener("click", () => {
        const messageText = messageInput.value.trim();
        if (messageText && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify({
                'message': messageText
            }));
            messageInput.value = "";
        }
    });

    // Enter key to send
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !sendButton.disabled) {
            sendButton.click();
        }
    });
});