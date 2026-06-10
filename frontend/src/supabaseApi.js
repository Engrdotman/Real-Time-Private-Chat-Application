const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const SUPABASE_URL = trimTrailingSlash(import.meta.env.VITE_SUPABASE_URL || "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const STORAGE_KEY = "connect.supabase.session";

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (session?.access_token) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

function getCurrentUserId() {
  return getStoredSession()?.user?.id || null;
}

async function supabaseFetch(path, { token, headers, ...options } = {}) {
  requireConfig();

  const session = getStoredSession();
  const authHeaderValue = token || session?.access_token || SUPABASE_KEY;

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${authHeaderValue}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation", // Default to returning data
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      data?.msg || data?.message || data?.error_description || `Supabase request failed: ${response.statusText}`
    );
    error.status = response.status;
    error.details = data;
    console.error("Supabase API Error:", error);
    throw error;
  }

  return data;
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const supabaseProject = {
  url: SUPABASE_URL,
  publishableKey: SUPABASE_KEY,
};

export const supabaseAuth = {
  signUp({ email, password, username }) {
    return supabaseFetch("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { username },
      }),
    }).then(storeSession);
  },

  signIn({ email, password }) {
    return supabaseFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then(storeSession);
  },

  signOut() {
    localStorage.removeItem(STORAGE_KEY);
  },

  getUser() {
    return supabaseFetch("/auth/v1/user");
  },

  getSession: getStoredSession,
  getCurrentUserId,
};

export const supabaseChat = {
  upsertProfile(profile) {
    return supabaseFetch("/rest/v1/profiles", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(profile),
    });
  },

  updateProfile(userId, profile) {
    return supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(profile),
    });
  },

  listProfiles() {
    return supabaseFetch("/rest/v1/profiles?select=*&order=username.asc");
  },

  listConversations() {
    return supabaseFetch(
      "/rest/v1/conversations?select=*,conversation_members(*),messages(*)&order=updated_at.desc"
    );
  },

  createConversation(conversation) {
    return supabaseFetch("/rest/v1/conversations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(conversation),
    });
  },

  addConversationMember(member) {
    return supabaseFetch("/rest/v1/conversation_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(member),
    });
  },

  addConversationMembers(members) {
    return supabaseFetch("/rest/v1/conversation_members", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify(members),
    });
  },

  listMessages(conversationId) {
    return supabaseFetch(
      `/rest/v1/messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=created_at.asc`
    );
  },

  sendMessage(message) {
    return supabaseFetch("/rest/v1/messages", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(message),
    });
  },
};
