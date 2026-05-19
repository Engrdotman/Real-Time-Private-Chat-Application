import { useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut,
  Plus,
  Search,
  Send,
  Settings,
  Paperclip,
  Smile,
  ArrowLeft,
  Phone,
  Video,
  Info,
  X,
  Camera,
  Heart,
  MessageCircle,
  Check,
  CheckCheck,
  Clock3,
  Moon,
  Sun,
  PanelRight,
  FileUp,
  ShieldCheck,
} from "lucide-react";
import logoUrl from "../static/images/chatapp-logo.png";

const authFetch = (url, options = {}) =>
  fetch(url, {
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });

function initials(value = "?") {
  return value.slice(0, 2).toUpperCase();
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "Last seen recently";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((now - date) / 60000));
  if (diffMinutes < 1) return "Last seen just now";
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
  if (date.toDateString() === now.toDateString()) return `Last seen today at ${formatTime(timestamp)}`;
  return `Last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${formatTime(timestamp)}`;
}

function Avatar({ name, src, square = false, online = false, size = 40 }) {
  return (
    <div className={`avatar ${square ? "avatar-square" : ""}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : <span>{initials(name).slice(0, square ? 2 : 1)}</span>}
      {!square && <i className={online ? "online" : ""} />}
    </div>
  );
}

function AuthScreen({ mode, setMode, onAuthed }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    remember_me: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const url = isSignup ? "/api/auth/signup/" : "/api/auth/login/";

    try {
      const response = await authFetch(url, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = data.error || Object.values(data.errors || {}).flat().join(" ");
        throw new Error(detail || "Something went wrong.");
      }
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img src={logoUrl} alt=".connect" />
          <div>
            <h1>.connect</h1>
            <p>{isSignup ? "Create your chat account" : "Welcome back"}</p>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          {error && <div className="form-alert">{error}</div>}
          <label>
            Username or email
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder={isSignup ? "Choose a username" : "Email or username"}
              required
            />
          </label>
          {isSignup && (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Your password"
              required
            />
          </label>
          {isSignup && (
            <label>
              Confirm password
              <input
                type="password"
                value={form.confirm_password}
                onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
                placeholder="Repeat password"
                required
              />
            </label>
          )}
          {!isSignup && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.remember_me}
                onChange={(event) => setForm({ ...form, remember_me: event.target.checked })}
              />
              Keep me signed in
            </label>
          )}
          <button className="primary-btn" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <button className="switch-auth" onClick={() => setMode(isSignup ? "login" : "signup")}>
          {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
        </button>
      </section>
    </main>
  );
}

function Sidebar({
  currentUser,
  users,
  groups,
  stories,
  selected,
  onSelect,
  onOpenSettings,
  onCreateGroup,
  onAddStory,
  onOpenStory,
  onLogout,
  darkMode,
  onToggleTheme,
}) {
  const [query, setQuery] = useState("");
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(query.toLowerCase()));
  const storiesByUser = useMemo(() => {
    const grouped = new Map();
    stories.forEach((story) => {
      if (!grouped.has(story.username)) grouped.set(story.username, []);
      grouped.get(story.username).push(story);
    });
    return Array.from(grouped.values());
  }, [stories]);

  return (
    <aside className="sidebar">
      <header className="sidebar-top">
        <div className="brand-row">
          <Avatar name={currentUser.username} src={currentUser.profile_pic} online size={34} />
          <img src={logoUrl} alt=".connect" />
          <h2>.connect</h2>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={19} />
          </button>
          <button className="icon-btn" onClick={onToggleTheme} title={darkMode ? "Light mode" : "Dark mode"}>
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="icon-btn" onClick={onLogout} title="Logout">
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <div className="search-box">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations..." />
      </div>

      <div className="stories-strip">
        <button className="story-chip add-story" onClick={onAddStory}>
          <span>
            <Camera size={18} />
            <Plus size={12} />
          </span>
          <small>Post Story</small>
        </button>
        {storiesByUser.map((storySet) => {
          const first = storySet[0];
          return (
            <button className="story-chip" key={first.username} onClick={() => onOpenStory(storySet, 0)}>
              <span className="story-ring">
                <Avatar name={first.username} src={first.user_avatar} size={44} />
              </span>
              <small>{first.username}</small>
            </button>
          );
        })}
      </div>

      <button className="my-status" onClick={onOpenSettings}>
        <Avatar name={currentUser.username} src={currentUser.profile_pic} online size={43} />
        <span>
          <strong>My Status</strong>
          <small>{currentUser.status_text || "Express how you feel..."}</small>
        </span>
        <Settings size={17} />
      </button>

      <div className="section-label">Direct Messages</div>
      <div className="conversation-list">
        {filteredUsers.map((user) => (
          <button
            className={`conversation ${selected?.type === "private" && selected.id === user.id ? "active" : ""}`}
            key={user.id}
            onClick={() => onSelect({ type: "private", ...user })}
          >
            <Avatar name={user.username} src={user.profile_pic} online={user.is_online} />
            <span>
              <strong>{user.username}</strong>
              <small>{user.last_message}</small>
              <em>{user.is_online ? "Online now" : formatLastSeen(user.last_seen)}</em>
            </span>
            <b>{formatTime(user.last_message_time)}</b>
            {user.unread_count > 0 && <mark>{user.unread_count}</mark>}
          </button>
        ))}
      </div>

      <div className="section-label label-with-action">
        <span>Groups</span>
        <button className="mini-btn" onClick={onCreateGroup} title="Create group">
          <Plus size={15} />
        </button>
      </div>
      <div className="conversation-list">
        {groups.map((group) => (
          <button
            className={`conversation ${selected?.type === "group" && selected.id === group.id ? "active" : ""}`}
            key={group.id}
            onClick={() => onSelect({ type: "group", ...group })}
          >
            <Avatar name={group.name} src={group.avatar} square />
            <span>
              <strong>{group.name}</strong>
              <small>{group.description || "No description"}</small>
            </span>
          </button>
        ))}
        {groups.length === 0 && <p className="empty-list">Create a group to start collaborating.</p>}
      </div>
    </aside>
  );
}

function MessageStatus({ message }) {
  if (message.is_read) {
    return (
      <span className="status-icon seen" title="Seen">
        <CheckCheck size={14} />
      </span>
    );
  }
  if (message.id) {
    return (
      <span className="status-icon delivered" title="Delivered">
        <CheckCheck size={14} />
      </span>
    );
  }
  return (
    <span className="status-icon sent" title="Sent">
      <Check size={14} />
    </span>
  );
}

function TypingIndicator({ name }) {
  if (!name) return null;
  return (
    <div className="typing-row">
      <span>{name} is typing</span>
      <i />
      <i />
      <i />
    </div>
  );
}

function ChatPanel({ currentUser, selected, messages, onSend, onUpload, onBack, connected, onOpenDetails, onTyping, typingUser }) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, selected]);

  function submit(event) {
    event.preventDefault();
    if (!selected || !text.trim()) return;
    onSend(text.trim());
    setText("");
    onTyping(false);
  }

  if (!selected) {
    return (
      <section className="chat-panel">
        <div className="empty-chat">
          <MessageCircle size={52} />
          <h3>Welcome to .connect</h3>
          <p>Select a conversation from the sidebar to start chatting.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-panel">
      <header className="chat-top">
        <div>
          <button className="icon-btn mobile-only" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <Avatar name={selected.username || selected.name} src={selected.profile_pic || selected.avatar} online={selected.is_online} square={selected.type === "group"} />
          <span>
            <h3>{selected.username || selected.name}</h3>
            <p>{selected.type === "group" ? selected.description || "Group Chat" : selected.is_online ? "Online now" : formatLastSeen(selected.last_seen)}</p>
          </span>
        </div>
        <nav>
          <button className="icon-btn" title="Call">
            <Phone size={18} />
          </button>
          <button className="icon-btn" title="Video">
            <Video size={18} />
          </button>
          <button className="icon-btn" onClick={onOpenDetails} title="Details">
            <PanelRight size={18} />
          </button>
        </nav>
      </header>

      <div className="messages" ref={messagesRef}>
        {messages.length === 0 && <p className="day-note">No messages yet. Say hello.</p>}
        {messages.map((message) => {
          const isSent = message.sender_id === currentUser.id;
          return (
            <div className={`message ${isSent ? "sent" : "received"}`} key={`${message.id}-${message.timestamp}`}>
              <div className="bubble">
                {selected.type === "group" && !isSent && <strong>{message.sender_username}</strong>}
                {message.file_url && <Attachment url={message.file_url} />}
                {message.content || message.message ? <span>{message.content || message.message}</span> : null}
                <small>
                  {formatTime(message.timestamp)}
                  {isSent && <MessageStatus message={message} />}
                </small>
              </div>
            </div>
          );
        })}
        <TypingIndicator name={typingUser} />
      </div>

      <form className="composer" onSubmit={submit}>
        <button type="button" className="icon-btn upload-btn" onClick={() => fileRef.current?.click()} title="Attach file">
          <Paperclip size={19} />
        </button>
        <input ref={fileRef} type="file" hidden onChange={(event) => onUpload(event.target.files?.[0], text, () => setText(""))} />
        <input
          value={text}
          onChange={(event) => {
            const nextValue = event.target.value;
            setText(nextValue);
            onTyping(Boolean(nextValue.trim()));
          }}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected}
        />
        <button type="button" className="icon-btn" onClick={() => setText((value) => `${value}:)`)}>
          <Smile size={19} />
        </button>
        <button className="send-btn" disabled={!connected || !text.trim()}>
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

function ProfileDrawer({ selected, currentUser, messageCount, onClose }) {
  if (!selected) return null;
  const isGroup = selected.type === "group";
  return (
    <aside className="profile-drawer">
      <header>
        <h3>Details</h3>
        <button className="icon-btn" onClick={onClose} title="Close details">
          <X size={18} />
        </button>
      </header>
      <div className="profile-hero">
        <Avatar name={selected.username || selected.name} src={selected.profile_pic || selected.avatar} square={isGroup} online={selected.is_online} size={84} />
        <h2>{selected.username || selected.name}</h2>
        <p>{isGroup ? selected.description || "Group Chat" : selected.is_online ? "Online now" : formatLastSeen(selected.last_seen)}</p>
      </div>
      <div className="detail-card">
        <span>Status</span>
        <strong>{isGroup ? selected.description || "No group description yet" : selected.status_text || "No status set"}</strong>
      </div>
      <div className="detail-grid">
        <div>
          <MessageCircle size={18} />
          <strong>{messageCount}</strong>
          <span>Messages</span>
        </div>
        <div>
          <FileUp size={18} />
          <strong>Media</strong>
          <span>Files ready</span>
        </div>
        <div>
          <ShieldCheck size={18} />
          <strong>Private</strong>
          <span>Session auth</span>
        </div>
      </div>
      <div className="detail-card muted-card">
        <span>Your account</span>
        <strong>{currentUser.username}</strong>
      </div>
    </aside>
  );
}

function Attachment({ url }) {
  const imageLike = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
  if (imageLike) return <img className="attachment-preview" src={url} alt="Attachment" />;
  return (
    <a className="attachment-link" href={url} target="_blank" rel="noreferrer">
      Open attachment
    </a>
  );
}

function SettingsModal({ currentUser, onClose, onSaved }) {
  const [status, setStatus] = useState(currentUser.status_text || "");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const data = new FormData();
    data.append("status_text", status);
    if (file) data.append("profile_pic", file);
    const response = await authFetch("/api/profile/update/", { method: "POST", body: data });
    const result = await response.json();
    if (result.status === "success") onSaved({ ...currentUser, ...result });
    setSaving(false);
  }

  return (
    <Modal title="Profile Settings" onClose={onClose}>
      <div className="profile-editor">
        <Avatar name={currentUser.username} src={file ? URL.createObjectURL(file) : currentUser.profile_pic} size={92} />
        <label className="file-pill">
          <Camera size={17} />
          Change photo
          <input type="file" accept="image/*" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <strong>{currentUser.username}</strong>
      </div>
      <label className="field">
        Status
        <input value={status} maxLength={100} onChange={(event) => setStatus(event.target.value)} />
      </label>
      <button className="primary-btn" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </Modal>
  );
}

function CreateGroupModal({ users, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState([]);
  const [avatar, setAvatar] = useState(null);

  async function create() {
    if (!name.trim()) return;
    const data = new FormData();
    data.append("name", name.trim());
    data.append("description", description.trim());
    members.forEach((id) => data.append("members", id));
    if (avatar) data.append("avatar", avatar);
    const response = await authFetch("/api/groups/create/", { method: "POST", body: data });
    const result = await response.json();
    if (result.status === "success") onCreated(result.group);
  }

  return (
    <Modal title="Create Group" onClose={onClose}>
      <label className="field">
        Group Name
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project Team" />
      </label>
      <label className="field">
        Description
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Brief group purpose" />
      </label>
      <label className="field">
        Group Avatar
        <input type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] || null)} />
      </label>
      <div className="member-list">
        {users.map((user) => (
          <label key={user.id}>
            <input
              type="checkbox"
              checked={members.includes(String(user.id))}
              onChange={(event) =>
                setMembers((value) => (event.target.checked ? [...value, String(user.id)] : value.filter((id) => id !== String(user.id))))
              }
            />
            {user.username}
          </label>
        ))}
      </div>
      <button className="primary-btn" onClick={create}>
        Create Group
      </button>
    </Modal>
  );
}

function StoryUploadModal({ onClose, onCreated }) {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");

  async function upload() {
    if (!image) return;
    const data = new FormData();
    data.append("image", image);
    data.append("caption", caption);
    const response = await authFetch("/api/stories/create/", { method: "POST", body: data });
    const result = await response.json();
    if (result.status === "success") onCreated();
  }

  return (
    <Modal title="Post Status Story" onClose={onClose}>
      <label className="field">
        Select Photo
        <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} />
      </label>
      <label className="field">
        Caption
        <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Say something about this photo" />
      </label>
      <button className="primary-btn" onClick={upload}>
        Share Story
      </button>
    </Modal>
  );
}

function StoryViewer({ storySet, index, onClose, onChanged }) {
  const [storyIndex, setStoryIndex] = useState(index);
  const [comment, setComment] = useState("");
  const story = storySet[storyIndex];

  async function like() {
    const response = await authFetch(`/api/stories/${story.id}/like/`, { method: "POST" });
    const result = await response.json();
    if (result.status === "success") onChanged();
  }

  async function sendComment() {
    if (!comment.trim()) return;
    const response = await authFetch(`/api/stories/${story.id}/comment/`, {
      method: "POST",
      body: JSON.stringify({ content: comment.trim() }),
    });
    const result = await response.json();
    if (result.status === "success") {
      setComment("");
      onChanged();
    }
  }

  return (
    <div className="story-viewer">
      <button className="icon-btn story-close" onClick={onClose}>
        <X size={20} />
      </button>
      <div className="story-header">
        <Avatar name={story.username} src={story.user_avatar} />
        <span>
          <strong>{story.username}</strong>
          <small>{formatTime(story.timestamp)}</small>
        </span>
      </div>
      <img src={story.image} alt="" onDoubleClick={like} />
      {story.caption && <p className="story-caption">{story.caption}</p>}
      <div className="story-actions">
        <button onClick={like}>
          <Heart size={18} fill={story.liked_by_me ? "currentColor" : "none"} />
          {story.likes_count} Likes
        </button>
        <div>
          <button disabled={storyIndex === 0} onClick={() => setStoryIndex((value) => value - 1)}>
            Prev
          </button>
          <button disabled={storyIndex === storySet.length - 1} onClick={() => setStoryIndex((value) => value + 1)}>
            Next
          </button>
        </div>
      </div>
      <div className="comments">
        {story.comments.map((item) => (
          <p key={item.id}>
            <strong>{item.username}:</strong> {item.content}
          </p>
        ))}
      </div>
      <div className="comment-box">
        <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a reply..." />
        <button onClick={sendComment}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <header>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stories, setStories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [modal, setModal] = useState(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  async function loadSession() {
    try {
      const response = await authFetch("/api/session/");
      if (!response.ok) throw new Error("Not logged in");
      const data = await response.json();
      setCurrentUser(data.current_user);
      setUsers(data.users);
      setGroups(data.groups);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadStories() {
    try {
      const response = await authFetch("/api/stories/");
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch {
      setStories([]);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (currentUser) loadStories();
  }, [currentUser]);

  useEffect(() => {
    if (!selected || !currentUser) return undefined;
    setMessages([]);
    setConnected(false);
    setTypingUser("");

    const loadUrl = selected.type === "group" ? `/api/groups/${selected.id}/messages/` : `/api/messages/${selected.id}/`;
    authFetch(loadUrl)
      .then((response) => response.json())
      .then((data) => setMessages(data.messages || []));

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = selected.type === "group" ? `${protocol}://${window.location.host}/ws/group/${selected.id}/` : `${protocol}://${window.location.host}/ws/chat/${selected.id}/`;
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.action === "user_status") {
        setUsers((items) => items.map((user) => (user.id === data.user_id ? { ...user, is_online: data.is_online } : user)));
        return;
      }
      if (data.action === "read_receipt") {
        setMessages((items) => items.map((message) => (data.message_ids.includes(message.id) ? { ...message, is_read: true } : message)));
        return;
      }
      if (data.action === "typing") {
        if (data.user_id !== currentUser.id) {
          setTypingUser(data.is_typing ? data.username : "");
          window.clearTimeout(typingTimeoutRef.current);
          if (data.is_typing) {
            typingTimeoutRef.current = window.setTimeout(() => setTypingUser(""), 2500);
          }
        }
        return;
      }
      if (data.action === "chat_message" || data.action === "group_chat_message") {
        const normalized = { ...data, content: data.message };
        setMessages((items) => (items.some((item) => item.id === data.id) ? items : [...items, normalized]));
      }
    };

    return () => socket.close();
  }, [selected, currentUser]);

  function sendMessage(text, filePath = null) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ action: "chat_message", message: text, file_path: filePath }));
  }

  function sendTyping(isTyping) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || selected?.type !== "private") return;
    socketRef.current.send(JSON.stringify({ action: "typing", is_typing: isTyping }));
  }

  async function uploadAttachment(file, text, afterSend) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    const response = await authFetch("/api/upload/", { method: "POST", body: data });
    const result = await response.json();
    if (result.file_url) {
      sendMessage(text.trim(), result.file_url.split("/media/")[1]);
      afterSend();
    }
  }

  async function logout() {
    await authFetch("/logout/");
    setCurrentUser(null);
    setSelected(null);
  }

  if (loading) return <div className="loading-screen">Loading .connect...</div>;
  if (!currentUser) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuthed={() => loadSession()} />;

  return (
    <main className={`app-shell ${darkMode ? "dark-mode" : ""} ${detailsOpen && selected ? "details-open" : ""}`}>
      <Sidebar
        currentUser={currentUser}
        users={users}
        groups={groups}
        stories={stories}
        selected={selected}
        onSelect={setSelected}
        onOpenSettings={() => setModal("settings")}
        onCreateGroup={() => setModal("group")}
        onAddStory={() => setModal("story")}
        onOpenStory={(storySet, index) => setModal({ type: "viewer", storySet, index })}
        onLogout={logout}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((value) => !value)}
      />
      <div className="chat-layout">
        <ChatPanel
          currentUser={currentUser}
          selected={selected}
          messages={messages}
          connected={connected}
          onSend={sendMessage}
          onUpload={uploadAttachment}
          onBack={() => setSelected(null)}
          onOpenDetails={() => setDetailsOpen((value) => !value)}
          onTyping={sendTyping}
          typingUser={typingUser}
        />
        <ProfileDrawer selected={selected} currentUser={currentUser} messageCount={messages.length} onClose={() => setDetailsOpen(false)} />
      </div>

      {modal === "settings" && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSaved={(user) => {
            setCurrentUser(user);
            setModal(null);
            loadSession();
          }}
        />
      )}
      {modal === "group" && (
        <CreateGroupModal
          users={users}
          onClose={() => setModal(null)}
          onCreated={(group) => {
            setGroups((items) => [...items, group]);
            setModal(null);
          }}
        />
      )}
      {modal === "story" && (
        <StoryUploadModal
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            loadStories();
          }}
        />
      )}
      {modal?.type === "viewer" && (
        <StoryViewer
          storySet={modal.storySet}
          index={modal.index}
          onClose={() => setModal(null)}
          onChanged={loadStories}
        />
      )}
    </main>
  );
}
