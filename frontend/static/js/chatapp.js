const sendBtn = document.getElementById("sendButton");
const messageInput = document.getElementById("messageInput");

// Get or set username
let currentUsername = localStorage.getItem('chatUsername');

if (!currentUsername || currentUsername === 'Anonymous') {
    currentUsername = prompt('Please enter your username:');
    if (currentUsername && currentUsername.trim() !== "") {
        localStorage.setItem('chatUsername', currentUsername);
    } else {
        currentUsername = 'Anonymous';
    }
}
console.log("Logged in as:", currentUsername);

// WebSocket Setup - using a default room
const roomName = "general"; // Default room name
const chatSocket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
    window.location.host + 
    `/ws/chat/${roomName}/`
);

// Handle incoming messages
chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    // Use the addMessage function from ui.js
    addMessage(data.username, data.message, data.username === currentUsername);
};

chatSocket.onclose = function(e) {
    console.error('Chat socket closed unexpectedly');
};

// Send message logic
sendBtn.addEventListener("click", () => {
    const messageText = messageInput.value.trim();
    if (messageText && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            'message': messageText,
            'username': currentUsername
        }));
        messageInput.value = "";
    }
});

// Handle 'Enter' key to send messages
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

// Handle typing events for better UX
let typingTimeout;
messageInput.addEventListener("input", () => {
    // Show typing indicator when user is typing
    showTypingIndicator();
    
    // Auto-hide after 3 seconds of inactivity
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(hideTypingIndicator, 3000);
});

// Change Username logic
const changeUsernameBtn = document.getElementById('changeUsernameBtn');
if (changeUsernameBtn) {
    changeUsernameBtn.addEventListener('click', () => {
        console.log("Change username button clicked");
        const newUsername = prompt('Enter new username:', currentUsername);
        if (newUsername && newUsername.trim() !== "") {
            currentUsername = newUsername.trim();
            localStorage.setItem('chatUsername', currentUsername);
            location.reload(); // Reload to update current session
        }
    });
}