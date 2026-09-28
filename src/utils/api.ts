import { ChatSession, Message, UserProfile, SubscriptionPlanType } from '../types';

const TOKEN_KEY = 'tejas_auth_token_v1';
const GUEST_ID_KEY = 'tejas_guest_id_v1';

export const getAuthToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const getGuestId = (): string => {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_temp';
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const isGuestUser = (user: UserProfile): boolean =>
  user.provider === 'guest' || !user.email || user.id === 'user_guest';

type UrlBuilder = (path: string) => string;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(getUrl: UrlBuilder, path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(getUrl(path), { ...options, headers: { ...headers, ...(options.headers as any) } });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet or backend URL.', 0);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  if (data === null) {
    throw new ApiError(
      'Backend returned an invalid response (page instead of JSON). Check VITE_BACKEND_URL or the /api proxy rewrite.',
      502
    );
  }

  return data as T;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
}

export interface ServerSubscription {
  subscriptionPlan: SubscriptionPlanType;
  ownedPlans: SubscriptionPlanType[];
  planExpiries: Partial<Record<SubscriptionPlanType, number>>;
  subscriptionStartedAt?: number;
  subscriptionExpiresAt?: number;
  lastPaymentId?: string;
}

export const registerAccount = (getUrl: UrlBuilder, body: { name: string; email: string; password: string }) =>
  request<AuthResult>(getUrl, '/api/auth/register', { method: 'POST', body: JSON.stringify(body) });

export const loginAccount = (getUrl: UrlBuilder, body: { email: string; password: string }) =>
  request<AuthResult>(getUrl, '/api/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const loginWithFirebase = (getUrl: UrlBuilder, idToken: string) =>
  request<AuthResult>(getUrl, '/api/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken }) });

export const fetchAuthProviders = (getUrl: UrlBuilder) =>
  request<{ email: boolean; google: boolean; github: boolean; microsoft: boolean }>(
    getUrl,
    '/api/auth/providers'
  );

export const fetchMe = (getUrl: UrlBuilder) => request<{ user: UserProfile }>(getUrl, '/api/auth/me', {}, true);

export const updateMyName = (getUrl: UrlBuilder, name: string) =>
  request<{ user: UserProfile }>(getUrl, '/api/auth/me', { method: 'PUT', body: JSON.stringify({ name }) }, true);

// ---- Chats ----
export const fetchServerChats = (getUrl: UrlBuilder) =>
  request<{ chats: ChatSession[] }>(getUrl, '/api/chats', {}, true);

export const fetchServerChatById = (getUrl: UrlBuilder, chatId: string) =>
  request<{ chat: ChatSession }>(getUrl, `/api/chats/${encodeURIComponent(chatId)}`, {}, true);

export const fetchTrashChats = (getUrl: UrlBuilder) =>
  request<{ chats: ChatSession[] }>(getUrl, '/api/chats/trash', {}, true);

export const saveServerChat = (getUrl: UrlBuilder, chat: ChatSession) =>
  request<{ ok: boolean }>(
    getUrl,
    `/api/chats/${encodeURIComponent(chat.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: chat.title,
        isPinned: !!chat.isPinned,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: chat.messages,
      }),
    },
    true
  );

// Sirf NAYE messages server ki chat me jodo (poori chat dobara nahi bhejni padti).
export const appendServerMessages = (
  getUrl: UrlBuilder,
  chat: ChatSession,
  baseCount: number,
  messages: Message[]
) =>
  request<{ ok: boolean; count?: number; skipped?: string }>(
    getUrl,
    `/api/chats/${encodeURIComponent(chat.id)}/append`,
    {
      method: 'POST',
      body: JSON.stringify({
        baseCount,
        messages,
        title: chat.title,
        isPinned: !!chat.isPinned,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      }),
    },
    true
  );

// Server pe jo messages pehle se save hain unka halka "fingerprint" (id/length/status).
// Isse pata chalta hai ki purane messages badle (regenerate) ya sirf naye jude.
export interface ChatSyncState {
  fp: string[];
  meta: string;
}
export const messageFingerprint = (m: Message): string => `${m.id}:${m.role}:${m.content.length}:${m.status || ''}`;
export const chatMeta = (c: ChatSession): string => `${c.isPinned ? 1 : 0}|${c.title}`;

// Move chat to trash (soft delete). Share link is revoked server-side.
export const deleteServerChat = (getUrl: UrlBuilder, id: string) =>
  request<{ ok: boolean; deletedAt?: number; recoveryDays?: number }>(
    getUrl,
    `/api/chats/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    true
  );

// Restore from trash.
export const restoreServerChat = (getUrl: UrlBuilder, id: string) =>
  request<{ ok: boolean }>(
    getUrl,
    `/api/chats/${encodeURIComponent(id)}/restore`,
    { method: 'PUT' },
    true
  );

// Permanently delete (hard delete from DB).
export const permanentlyDeleteServerChat = (getUrl: UrlBuilder, id: string) =>
  request<{ ok: boolean }>(
    getUrl,
    `/api/chats/${encodeURIComponent(id)}/permanent`,
    { method: 'DELETE' },
    true
  );

export const chatSignature = (c: ChatSession): string => {
  const last = c.messages[c.messages.length - 1];
  return `${c.updatedAt}|${c.isPinned ? 1 : 0}|${c.title}|${c.messages.length}|${last?.content?.length ?? 0}`;
};

// ---------------- EPHEMERAL ----------------
export const saveEphemeralChat = async (
  getUrl: UrlBuilder,
  chat: ChatSession,
  isTemp: boolean
): Promise<void> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  else headers['X-Guest-Id'] = getGuestId();

  try {
    await fetch(getUrl(`/api/ephemeral/chats/${encodeURIComponent(chat.id)}`), {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isTemp,
        messages: chat.messages,
      }),
    });
  } catch {}
};

export const purgeGuestEphemeralChats = async (getUrl: UrlBuilder): Promise<void> => {
  const token = getAuthToken();
  const guestId = getGuestId();
  if (!token || !guestId) return;
  try {
    await fetch(getUrl(`/api/ephemeral/guest/${encodeURIComponent(guestId)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
};

// ---------------- SHARE ----------------
export const createShareLink = (getUrl: UrlBuilder, chatId: string) =>
  request<{ shareId: string }>(getUrl, `/api/share/${encodeURIComponent(chatId)}`, { method: 'POST' }, true);

export const deleteShareLink = (getUrl: UrlBuilder, shareId: string) =>
  request<{ ok: boolean }>(getUrl, `/api/share/${encodeURIComponent(shareId)}`, { method: 'DELETE' }, true);

export interface SharedChatData {
  title: string;
  messages: ChatSession['messages'];
  ownerName: string;
  createdAt: number;
}

export const fetchSharedChat = (getUrl: UrlBuilder, shareId: string) =>
  request<SharedChatData>(getUrl, `/api/share/${encodeURIComponent(shareId)}`, {}, false);

// ---------------- SUBSCRIPTION ----------------
export const saveSubscriptionToServer = (getUrl: UrlBuilder, data: ServerSubscription) =>
  request<{ user: UserProfile }>(
    getUrl,
    '/api/auth/subscription',
    { method: 'PUT', body: JSON.stringify(data) },
    true
  );

// ---------------- PAYMENTS ----------------
export interface PaymentRecord {
  id: string;
  plan: SubscriptionPlanType;
  modelId: string;
  planName: string;
  amount: number;
  period: string;
  durationDays: number;
  paymentMethod: string;
  utrNumber?: string;
  txId: string;
  createdAt: number;
}

export const savePaymentRecord = (getUrl: UrlBuilder, data: Omit<PaymentRecord, 'id'>) =>
  request<{ ok: boolean; id: string }>(getUrl, '/api/payments', { method: 'POST', body: JSON.stringify(data) }, true);

export const fetchMyPayments = (getUrl: UrlBuilder) =>
  request<{ payments: PaymentRecord[] }>(getUrl, '/api/payments', {}, true);

// ---------------- SHARES (list user's own) ----------------
export interface ShareRecord {
  shareId: string;
  chatId: string;
  title: string;
  createdAt: number;
}

export const fetchMyShares = (getUrl: UrlBuilder) =>
  request<{ shares: ShareRecord[] }>(getUrl, '/api/shares', {}, true);