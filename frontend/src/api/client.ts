import axios from "axios";
import { getDeviceId } from "./device";

// The device normally running this frontend is also running the backend on
// the same machine, so "localhost" is a correct default almost every time.
// Override at build time via VITE_DEFAULT_SERVER_URL (see .env.example) if
// the backend runs elsewhere.
const SERVER_KEY = "academy_share_server_url";
const TOKEN_KEY = "academy_share_device_tokens";
const DEFAULT_SERVER_URL = import.meta.env.VITE_DEFAULT_SERVER_URL || "http://localhost:8000";

export function getServerUrl(): string {
  const queryServer = new URLSearchParams(window.location.search).get("server");
  if (queryServer && /^https?:\/\//i.test(queryServer)) return queryServer.replace(/\/+$/, "");
  return localStorage.getItem(SERVER_KEY) || DEFAULT_SERVER_URL;
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
