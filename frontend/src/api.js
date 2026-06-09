const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || "");
const WS_BASE_URL = trimTrailingSlash(import.meta.env.VITE_WS_BASE_URL || "");

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function assetUrl(path) {
  if (!path || /^(https?:|blob:|data:)/i.test(path)) return path;
  return apiUrl(path);
}

export function wsUrl(path) {
  if (/^wss?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (WS_BASE_URL) {
    return `${WS_BASE_URL}${normalizedPath}`;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/^http/i, "ws")}${normalizedPath}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}${normalizedPath}`;
}

export const authFetch = (url, options = {}) =>
  fetch(apiUrl(url), {
    credentials: API_BASE_URL ? "include" : "same-origin",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });
