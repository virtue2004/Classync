import axios from "axios";
import { getDeviceId } from "./device";

// Production serves the frontend and API from the same origin. Using
// localhost on a receiver would incorrectly point at the receiver itself.
const SERVER_KEY = "academy_share_server_url";
const TOKEN_KEY = "academy_share_device_tokens";
const DEFAULT_SERVER_URL = import.meta.env.VITE_DEFAULT_SERVER_URL ||
  (window.location.port === "5500" ? "http://localhost:8000" : window.location.origin);

export function getServerUrl(): string {
  const queryServer = new URLSearchParams(window.location.search).get("server");
  if (queryServer && /^https?:\/\//i.test(queryServer)) return queryServer.replace(/\/+$/, "");
  const savedServer = localStorage.getItem(SERVER_KEY);
  // Older Classync builds saved localhost on receiving devices. Never reuse
  // that host-only address when this page was loaded from a LAN server.
  if (savedServer && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    try {
      const savedHost = new URL(savedServer).hostname;
      if (savedHost === "localhost" || savedHost === "127.0.0.1") {
        localStorage.removeItem(SERVER_KEY);
        return DEFAULT_SERVER_URL;
      }
    } catch {
      localStorage.removeItem(SERVER_KEY);
      return DEFAULT_SERVER_URL;
    }
  }
  return savedServer || DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string) {
  localStorage.setItem(SERVER_KEY, url.replace(/\/+$/, ""));
}

function tokenMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getDeviceToken(server = getServerUrl()): string | undefined {
  return tokenMap()[server];
}

export function setDeviceToken(token: string, server = getServerUrl()) {
  const tokens = tokenMap();
  tokens[server] = token;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getServerUrl();
  config.headers["X-Device-Id"] = getDeviceId();
  const token = getDeviceToken(config.baseURL);
  if (token) config.headers["X-Device-Token"] = token;
  return config;
});
