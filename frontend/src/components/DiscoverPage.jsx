/**
 * DiscoverPage.jsx
 * ================
 * Full User Discovery & Connection System UI.
 *
 * Sections:
 *  1. Search Users (debounced, paginated)
 *  2. Suggested Connections ("People You May Know")
 *  3. Pending Requests (incoming + outgoing)
 *  4. Recent Connections
 *  5. Privacy Settings panel
 *
 * Security:
 *  - All API calls use credentials: "same-origin" (session cookie)
 *  - No user IDs are exposed in the UI — only passed to the API
 *  - XSS: all user content is rendered as text, never dangerouslySetInnerHTML
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Clock,
  Shield,
  X,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Check,
  Ban,
  Loader2,
} from "lucide-react";
import { assetUrl, authFetch } from "../api";

// ── API helpers ───────────────────────────────────────────────────────────────

const api = {
  search:        (q, page = 1)  => authFetch(`/api/users/search/?q=${encodeURIComponent(q)}&page=${page}`).then(r => r.json()),
  send:          (userId)       => authFetch("/api/connections/send/",    { method: "POST", body: JSON.stringify({ receiver_id: userId }) }).then(r => r.json()),
  cancel:        (userId)       => authFetch("/api/connections/cancel/",  { method: "POST", body: JSON.stringify({ receiver_id: userId }) }).then(r => r.json()),
  accept:        (userId)       => authFetch("/api/connections/accept/",  { method: "POST", body: JSON.stringify({ sender_id: userId }) }).then(r => r.json()),
  reject:        (userId)       => authFetch("/api/connections/reject/",  { method: "POST", body: JSON.stringify({ sender_id: userId }) }).then(r => r.json()),
  remove:        (userId)       => authFetch("/api/connections/remove/",  { method: "POST", body: JSON.stringify({ user_id: userId }) }).then(r => r.json()),
  suggestions:   ()             => authFetch("/api/connections/suggestions/").then(r => r.json()),
  pending:       ()             => authFetch("/api/connections/pending/").then(r => r.json()),
  recent:        ()             => authFetch("/api/connections/recent/").then(r => r.json()),
  block:         (userId)       => authFetch("/api/users/block/",         { method: "POST", body: JSON.stringify({ user_id: userId }) }).then(r => r.json()),
  unblock:       (userId)       => authFetch("/api/users/unblock/",       { method: "POST", body: JSON.stringify({ user_id: userId }) }).then(r => r.json()),
  getPrivacy:    ()             => authFetch("/api/users/privacy/").then(r => r.json()),
  updatePrivacy: (data)         => authFetch("/api/users/privacy/update/", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 44, online = false }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div
      className="discover-avatar"
      style={{ width: size, height: size, minWidth: size }}
    >
      {src ? (
        <img src={assetUrl(src)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      ) : (
        <span style={{ fontSize: size * 0.36 }}>{initials}</span>
      )}
      {online && <i className="discover-online-dot" />}
    </div>
  );
}

function ConnectionButton({ user, onAction, loading }) {
  const status = user.connection_status;

  if (loading) {
    return (
      <button className="disc-btn disc-btn--loading" disabled>
        <Loader2 size={14} className="spin" />
      </button>
    );
  }

  if (status === "accepted") {
    return (
      <button
        className="disc-btn disc-btn--connected"
        onClick={() => onAction("remove", user.id)}
        title="Remove connection"
      >
        <UserCheck size={14} />
        Connected
      </button>
    );
  }

  if (status === "pending_sent") {
    return (
      <button
        className="disc-btn disc-btn--pending"
        onClick={() => onAction("cancel", user.id)}
        title="Cancel request"
      >
        <Clock size={14} />
        Pending
      </button>
    );
  }

  if (status === "pending_received") {
    return (
      <div className="disc-btn-group">
        <button
          className="disc-btn disc-btn--accept"
          onClick={() => onAction("accept", user.id)}
          title="Accept"
        >
          <Check size={14} />
        </button>
        <button
          className="disc-btn disc-btn--reject"
          onClick={() => onAction("reject", user.id)}
          title="Reject"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      className="disc-btn disc-btn--add"
      onClick={() => onAction("send", user.id)}
      title="Connect"
    >
      <UserPlus size={14} />
      Connect
    </button>
  );
}

function UserCard({ user, onAction, loadingId }) {
  return (
    <motion.div
      className="disc-user-card"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Avatar src={user.profile_pic} name={user.username} online={user.is_online} />
      <div className="disc-user-info">
        <strong>{user.display_name || user.username}</strong>
        <span className="disc-username">@{user.username}</span>
        {user.mutual_count > 0 && (
          <span className="disc-mutual">
            <Users size={11} />
            {user.mutual_count} mutual
          </span>
        )}
        {user.reason && (
          <span className="disc-reason">
            <Sparkles size={11} />
            {user.reason}
          </span>
        )}
      </div>
      <div className="disc-card-actions">
        <ConnectionButton
          user={user}
          onAction={onAction}
          loading={loadingId === user.id}
        />
      </div>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="disc-section-header">
      <Icon size={18} />
      <h3>{title}</h3>
      {count !== undefined && <span className="disc-count">{count}</span>}
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="disc-empty">
      <Icon size={32} />
      <p>{message}</p>
    </div>
  );
}

// ── Privacy Settings Panel ────────────────────────────────────────────────────

function PrivacyPanel({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    api.getPrivacy().then(setSettings);
  }, []);

  async function save() {
    setSaving(true);
    const result = await api.updatePrivacy(settings);
    if (result.status === "success") {
      setSettings(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (!settings) {
    return (
      <div className="disc-privacy-panel">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  const requestOptions = [
    { value: "everyone",    label: "Everyone" },
    { value: "connections", label: "Connections of Connections" },
    { value: "nobody",      label: "Nobody" },
  ];
  const profileOptions = [
    { value: "everyone",    label: "Everyone" },
    { value: "connections", label: "Connections Only" },
  ];
  const messageOptions = [
    { value: "everyone",    label: "Everyone" },
    { value: "connections", label: "Connections Only" },
  ];

  return (
    <motion.div
      className="disc-privacy-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="disc-privacy-header">
        <button className="icon-btn" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <h3>Privacy Settings</h3>
      </div>

      <div className="disc-privacy-group">
        <label>Who can send you connection requests?</label>
        <select
          value={settings.who_can_send_requests}
          onChange={e => setSettings({ ...settings, who_can_send_requests: e.target.value })}
        >
          {requestOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="disc-privacy-group">
        <label>Who can view your profile?</label>
        <select
          value={settings.who_can_view_profile}
          onChange={e => setSettings({ ...settings, who_can_view_profile: e.target.value })}
        >
          {profileOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="disc-privacy-group">
        <label>Who can message you?</label>
        <select
          value={settings.who_can_message}
          onChange={e => setSettings({ ...settings, who_can_message: e.target.value })}
        >
          {messageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <button className="primary-btn" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
      </button>
    </motion.div>
  );
}

// ── Pending Requests Section ──────────────────────────────────────────────────

function PendingSection({ pending, onAction, loadingId, onRefresh }) {
  if (!pending) return null;
  const { incoming = [], outgoing = [] } = pending;
  const total = incoming.length + outgoing.length;

  if (total === 0) {
    return (
      <section className="disc-section">
        <SectionHeader icon={Clock} title="Pending Requests" count={0} />
        <EmptyState icon={Clock} message="No pending requests" />
      </section>
    );
  }

  return (
    <section className="disc-section">
      <SectionHeader icon={Clock} title="Pending Requests" count={total} />

      {incoming.length > 0 && (
        <>
          <p className="disc-sub-label">Incoming</p>
          <div className="disc-card-grid">
            <AnimatePresence>
              {incoming.map(req => (
                <motion.div
                  key={req.connection_id}
                  className="disc-user-card"
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Avatar src={req.user.profile_pic} name={req.user.username} online={req.user.is_online} />
                  <div className="disc-user-info">
                    <strong>{req.user.username}</strong>
                    <span className="disc-username">@{req.user.username}</span>
                    <span className="disc-time">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="disc-btn-group">
                    <button
                      className="disc-btn disc-btn--accept"
                      onClick={() => onAction("accept", req.user.id).then(onRefresh)}
                      disabled={loadingId === req.user.id}
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      className="disc-btn disc-btn--reject"
                      onClick={() => onAction("reject", req.user.id).then(onRefresh)}
                      disabled={loadingId === req.user.id}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className="disc-sub-label">Sent</p>
          <div className="disc-card-grid">
            <AnimatePresence>
              {outgoing.map(req => (
                <motion.div
                  key={req.connection_id}
                  className="disc-user-card"
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Avatar src={req.user.profile_pic} name={req.user.username} online={req.user.is_online} />
                  <div className="disc-user-info">
                    <strong>{req.user.username}</strong>
                    <span className="disc-username">@{req.user.username}</span>
                  </div>
                  <button
                    className="disc-btn disc-btn--pending"
                    onClick={() => onAction("cancel", req.user.id).then(onRefresh)}
                    disabled={loadingId === req.user.id}
                  >
                    <X size={14} /> Cancel
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  );
}

// ── Main DiscoverPage ─────────────────────────────────────────────────────────

export default function DiscoverPage({ onBack }) {
  const [tab, setTab]               = useState("search"); // search | suggestions | pending | recent
  const [query, setQuery]           = useState("");
  const [searchResults, setResults] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [pending, setPending]       = useState(null);
  const [recent, setRecent]         = useState(null);
  const [loadingId, setLoadingId]   = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [toast, setToast]           = useState("");
  const [page, setPage]             = useState(1);
  const debounceRef                 = useRef(null);

  // Load data for non-search tabs
  useEffect(() => {
    if (tab === "suggestions" && !suggestions) {
      api.suggestions().then(d => setSuggestions(d.suggestions || []));
    }
    if (tab === "pending") {
      api.pending().then(setPending);
    }
    if (tab === "recent" && !recent) {
      api.recent().then(d => setRecent(d.connections || []));
    }
  }, [tab]);

  // Debounced search — 300ms
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const data = await api.search(query, page);
      setResults(data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, page]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // Central action handler — updates local state optimistically
  const handleAction = useCallback(async (action, userId) => {
    setLoadingId(userId);
    try {
      let result;
      switch (action) {
        case "send":   result = await api.send(userId);   break;
        case "cancel": result = await api.cancel(userId); break;
        case "accept": result = await api.accept(userId); break;
        case "reject": result = await api.reject(userId); break;
        case "remove": result = await api.remove(userId); break;
        case "block":  result = await api.block(userId);  break;
        default: return;
      }

      if (result.error) {
        showToast(result.error);
        return result;
      }

      showToast(result.message || "Done");

      // Update search results optimistically
      if (searchResults) {
        const statusMap = {
          send:   "pending_sent",
          cancel: "none",
          accept: "accepted",
          reject: "rejected",
          remove: "none",
          block:  "none",
        };
        setResults(prev => ({
          ...prev,
          results: prev.results.map(u =>
            u.id === userId ? { ...u, connection_status: statusMap[action] } : u
          ),
        }));
      }

      // Update suggestions optimistically
      if (suggestions) {
        if (["send", "block"].includes(action)) {
          setSuggestions(prev => prev.filter(u => u.id !== userId));
        }
      }

      return result;
    } finally {
      setLoadingId(null);
    }
  }, [searchResults, suggestions]);

  const refreshPending = useCallback(() => {
    api.pending().then(setPending);
  }, []);

  const tabs = [
    { id: "search",      label: "Search",      icon: Search },
    { id: "suggestions", label: "Suggestions", icon: Sparkles },
    { id: "pending",     label: "Requests",    icon: Clock },
    { id: "recent",      label: "Connections", icon: UserCheck },
  ];

  return (
    <div className="discover-page">
      {/* Header */}
      <header className="discover-header">
        <button className="icon-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Discover</h2>
          <p>Find and connect with people</p>
        </div>
        <button
          className="icon-btn"
          onClick={() => setShowPrivacy(v => !v)}
          title="Privacy settings"
        >
          <Shield size={20} />
        </button>
      </header>

      {/* Tab bar */}
      <nav className="discover-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`disc-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === "pending" && pending && (pending.incoming?.length || 0) > 0 && (
              <span className="disc-badge">{pending.incoming.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="discover-body">
        <AnimatePresence mode="wait">
          {showPrivacy ? (
            <PrivacyPanel key="privacy" onClose={() => setShowPrivacy(false)} />
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── Search Tab ── */}
              {tab === "search" && (
                <section className="disc-section">
                  <div className="disc-search-box">
                    <Search size={17} />
                    <input
                      value={query}
                      onChange={e => { setQuery(e.target.value); setPage(1); }}
                      placeholder="Search by username or name..."
                      autoFocus
                    />
                    {query && (
                      <button className="icon-btn" onClick={() => { setQuery(""); setResults(null); }}>
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {searching && (
                    <div className="disc-loading">
                      <Loader2 size={20} className="spin" />
                      <span>Searching...</span>
                    </div>
                  )}

                  {!searching && searchResults && (
                    <>
                      <p className="disc-result-count">
                        {searchResults.total ?? searchResults.count ?? 0} result{(searchResults.total ?? searchResults.count ?? 0) !== 1 ? "s" : ""} for "{query}"
                      </p>
                      {searchResults.results.length === 0 ? (
                        <EmptyState icon={Search} message="No users found" />
                      ) : (
                        <div className="disc-card-grid">
                          <AnimatePresence>
                            {searchResults.results.map(user => (
                              <UserCard
                                key={user.id}
                                user={user}
                                onAction={handleAction}
                                loadingId={loadingId}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Pagination */}
                      {(searchResults.next || searchResults.previous) && (
                        <div className="disc-pagination">
                          <button
                            className="disc-btn disc-btn--add"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                          >
                            Previous
                          </button>
                          <span>Page {page}</span>
                          <button
                            className="disc-btn disc-btn--add"
                            disabled={!searchResults.has_next && !searchResults.next}
                            onClick={() => setPage(p => p + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {!query && !searchResults && (
                    <EmptyState icon={Search} message="Type a name or username to search" />
                  )}
                </section>
              )}

              {/* ── Suggestions Tab ── */}
              {tab === "suggestions" && (
                <section className="disc-section">
                  <SectionHeader icon={Sparkles} title="People You May Know" count={suggestions?.length} />
                  {!suggestions ? (
                    <div className="disc-loading"><Loader2 size={20} className="spin" /></div>
                  ) : suggestions.length === 0 ? (
                    <EmptyState icon={Users} message="No suggestions right now. Connect with more people to get suggestions." />
                  ) : (
                    <div className="disc-card-grid">
                      <AnimatePresence>
                        {suggestions.map(user => (
                          <UserCard
                            key={user.id}
                            user={{ ...user, connection_status: "none" }}
                            onAction={handleAction}
                            loadingId={loadingId}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>
              )}

              {/* ── Pending Tab ── */}
              {tab === "pending" && (
                <PendingSection
                  pending={pending}
                  onAction={handleAction}
                  loadingId={loadingId}
                  onRefresh={refreshPending}
                />
              )}

              {/* ── Recent Connections Tab ── */}
              {tab === "recent" && (
                <section className="disc-section">
                  <SectionHeader icon={UserCheck} title="Recent Connections" count={recent?.length} />
                  {!recent ? (
                    <div className="disc-loading"><Loader2 size={20} className="spin" /></div>
                  ) : recent.length === 0 ? (
                    <EmptyState icon={UserCheck} message="No connections yet. Start by searching for people." />
                  ) : (
                    <div className="disc-card-grid">
                      {recent.map(user => (
                        <motion.div
                          key={user.id}
                          className="disc-user-card"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Avatar src={user.profile_pic} name={user.username} online={user.is_online} />
                          <div className="disc-user-info">
                            <strong>{user.username}</strong>
                            <span className="disc-username">@{user.username}</span>
                            <span className="disc-time">
                              Connected {new Date(user.connected_at).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            className="disc-btn disc-btn--connected"
                            onClick={() => handleAction("remove", user.id).then(() => setRecent(prev => prev.filter(u => u.id !== user.id)))}
                            disabled={loadingId === user.id}
                          >
                            <UserX size={14} />
                            Remove
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="disc-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
