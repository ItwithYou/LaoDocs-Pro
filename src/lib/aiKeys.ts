// Bring-your-own-key storage. Keys live only in the user's browser (localStorage)
// and are sent with each convert request. They are never stored on the server.

export type AIProvider = "gemini" | "openai" | "openrouter";

export interface StoredKeys {
  gemini?: string;
  openai?: string;
  openrouter?: string;
  active?: AIProvider;
  models?: Partial<Record<AIProvider, string>>;
}

const STORAGE_KEY = "laodocs_ai_keys";

// Guess the provider from the API key format.
export function detectProvider(key: string): AIProvider {
  const k = (key || "").trim();
  if (k.startsWith("sk-or-")) return "openrouter";
  if (k.startsWith("sk-")) return "openai";
  return "gemini"; // "AIza..." and anything else defaults to Gemini
}

export function loadKeys(): StoredKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredKeys;
  } catch {
    /* ignore malformed storage */
  }
  return {};
}

export function saveKeys(keys: StoredKeys): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    window.dispatchEvent(new CustomEvent("laodocs_ai_keys_change"));
  } catch {
    /* ignore quota errors */
  }
}

export interface ActiveAuth {
  userApiKey: string;
  provider: AIProvider;
  model?: string;
}

// The key that should power AI requests right now (active provider, else first available).
export function getActiveAuth(): ActiveAuth | null {
  const keys = loadKeys();
  const order: AIProvider[] = keys.active
    ? [keys.active, "gemini", "openrouter", "openai"]
    : ["gemini", "openrouter", "openai"];
  for (const p of order) {
    const val = keys[p];
    if (val && val.trim()) {
      return { userApiKey: val.trim(), provider: p, model: keys.models?.[p]?.trim() || undefined };
    }
  }
  return null;
}

export function hasAnyKey(): boolean {
  return getActiveAuth() !== null;
}
