import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, UserProfile, AppSettings, HFStatus, ThemeMode, SubscriptionPlanType, MODEL_TO_PLAN } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { UserProfileModal } from './components/UserProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { TokenGuideModal } from './components/TokenGuideModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PaymentItem, PaymentModal } from './components/PaymentModal';
import { UpdateModal } from './components/UpdateModal';
import { SharedChatView } from './components/SharedChatView';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { SharedChatsModal } from './components/SharedChatsModal';
import { getClientVersion, isVersionDismissed, AppVersionInfo } from './version';
import { playNotificationChime } from './utils/audio';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  ApiError,
  chatSignature,
  clearAuthToken,
  createShareLink,
  deleteShareLink,
  deleteServerChat,
  fetchMe,
  fetchServerChatById,
  fetchServerChats,
  fetchTrashChats,
  getAuthToken,
  isGuestUser,
  permanentlyDeleteServerChat,
  purgeGuestEphemeralChats,
  restoreServerChat,
  saveEphemeralChat,
  savePaymentRecord,
  saveServerChat,
  saveSubscriptionToServer,
  updateMyName,
} from './utils/api';
import { copyText } from './utils/clipboard';

const STORAGE_KEY_CHATS = 'llama_chatbot_sessions_v1';
const STORAGE_KEY_USER = 'llama_chatbot_user_v1';
const STORAGE_KEY_SETTINGS = 'llama_chatbot_settings_v1';

const DEFAULT_USER: UserProfile = {
  id: 'user_guest',
  name: 'Tejas User',
  email: '',
  provider: 'guest',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  notificationsEnabled: true,
  customHfToken: '',
  customBackendUrl: '',
  systemPrompt: 'You are Tejas, an intelligent, fast, and polite AI assistant. Always match the response length directly to the user\'s query: keep simple questions concise and direct (1-3 sentences), and provide structured explanations only for complex or coding queries.',
  selectedModel: 'meta-llama/Llama-3.2-1B-Instruct',
  subscriptionPlan: 'free',
  ownedPlans: [],
  planExpiries: {},
};

export default function App() {
  // Persistence state loaders
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_CHATS);
      const saved = sessionStorage.getItem(STORAGE_KEY_CHATS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved chats', e);
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.name === 'Nitish Vishwakarma' ||
          parsed.email === 'nitishvishwakarma1332@gmail.com' ||
          parsed.id === 'user_default'
        ) {
          return DEFAULT_USER;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse user', e);
    }
    return DEFAULT_USER;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.systemPrompt ||
          parsed.systemPrompt.includes('Provide clean, well-formatted answers with markdown, clear headings, and concise explanations.')
        ) {
          parsed.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
        }
        // MIGRATION: seed ownedPlans from the old single-plan field
        if (!Array.isArray(parsed.ownedPlans)) {
          if (parsed.subscriptionPlan && parsed.subscriptionPlan !== 'free') {
            parsed.ownedPlans = [parsed.subscriptionPlan];
            parsed.planExpiries = {
              [parsed.subscriptionPlan]:
                parsed.subscriptionExpiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
            };
          } else {
            parsed.ownedPlans = [];
            parsed.planExpiries = {};
          }
        } else if (!parsed.planExpiries) {
          parsed.planExpiries = {};
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isTempChatActive, setIsTempChatActive] = useState(false);
  const [tempChatMessages, setTempChatMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // "/share/<id>" URL
  const [sharedChatId] = useState<string | null>(() => {
    try {
      const m = window.location.pathname.match(/^\/share\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  });

  const tempChatIdRef = useRef<string>('temp_' + Date.now());

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const pendingShareRef = useRef<string | null>(null);

  // Modals & drawers state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tokenGuideOpen, setTokenGuideOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentItem, setPendingPaymentItem] = useState<PaymentItem | null>(null);
  const [highlightPlan, setHighlightPlan] = useState<SubscriptionPlanType>('cat');

  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [sharedChatsOpen, setSharedChatsOpen] = useState(false);

  // "Ask about this" — selected text from an earlier assistant message
  const [askAbout, setAskAbout] = useState<{ text: string; messageId: string } | null>(null);

  // ---- Trash + loading state ----
  const [trashChats, setTrashChats] = useState<ChatSession[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState<boolean>(() => !!getAuthToken());
  const [loadingMessageIds, setLoadingMessageIds] = useState<Record<string, boolean>>({});

  // Delete confirmation toast (bottom of screen)
  const [deleteToast, setDeleteToast] = useState<{ title: string; daysLeft: number } | null>(null);

  // Share warning modal
  const [shareWarningOpen, setShareWarningOpen] = useState(false);
  const pendingShareRef2 = useRef<(() => void) | null>(null);

  // Permanent delete confirmation
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<{ id: string; title: string } | null>(null);

  const handleOpenSubscription = (plan: SubscriptionPlanType = 'cat') => {
    setHighlightPlan(plan);
    setSubscriptionModalOpen(true);
  };

  const handleInitiateCheckout = (item: PaymentItem) => {
    if (isGuestUser(currentUser)) {
      setAuthNotice(
        'Please sign in or create an account to subscribe. Guest payments are not saved, so your plan would be lost on refresh.'
      );
      setAuthModalOpen(true);
      return;
    }
    setPendingPaymentItem(item);
    setPaymentModalOpen(true);
  };

  const handleSelectFreePlan = () => {
    setSettings((prev) => ({
      ...prev,
      subscriptionPlan: 'free',
      selectedModel: 'meta-llama/Llama-3.2-1B-Instruct',
    }));
  };

  const handlePaymentSuccess = (
    plan: SubscriptionPlanType,
    modelId: string,
    durationDays: number,
    paymentId: string,
    meta: { paymentMethod: string; utrNumber?: string }
  ) => {
    const now = Date.now();
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;
    setSettings((prev) => {
      const owned = new Set(prev.ownedPlans || []);
      owned.add(plan);
      const next: AppSettings = {
        ...prev,
        subscriptionPlan: plan,
        selectedModel: modelId,
        subscriptionStartedAt: now,
        subscriptionExpiresAt: expiresAt,
        lastPaymentId: paymentId,
        ownedPlans: Array.from(owned),
        planExpiries: {
          ...(prev.planExpiries || {}),
          [plan]: expiresAt,
        },
      };
      if (getAuthToken() && !isGuestUser(currentUser)) {
        saveSubscriptionToServer(getApiUrl, {
          subscriptionPlan: next.subscriptionPlan || 'free',
          ownedPlans: next.ownedPlans || [],
          planExpiries: next.planExpiries || {},
          subscriptionStartedAt: next.subscriptionStartedAt,
          subscriptionExpiresAt: next.subscriptionExpiresAt,
          lastPaymentId: next.lastPaymentId,
        }).catch((e) => console.error('Subscription sync failed', e));

        const planNames: Record<SubscriptionPlanType, { name: string; modelId: string }> = {
          free: { name: 'Free Tier', modelId: 'meta-llama/Llama-3.2-1B-Instruct' },
          cat: { name: 'Tejas Cat (3B) Test Tier', modelId: 'meta-llama/Llama-3.2-3B-Instruct' },
          chetak: { name: 'Tejas Chetak (8B)', modelId: 'meta-llama/Llama-3.1-8B-Instruct' },
          arka: { name: 'Tejas Arka (70B)', modelId: 'meta-llama/Llama-3.3-70B-Instruct' },
        };
        const info = planNames[plan] || planNames.free;
        const amounts: Record<SubscriptionPlanType, number> = {
          free: 0,
          cat: 1,
          chetak: 299,
          arka: 799,
        };
        savePaymentRecord(getApiUrl, {
          plan,
          modelId: info.modelId,
          planName: info.name,
          amount: amounts[plan] || 0,
          period: durationDays >= 365 ? '1 year' : '1 month',
          durationDays,
          paymentMethod: meta.paymentMethod,
          utrNumber: meta.utrNumber,
          txId: paymentId,
          createdAt: now,
        }).catch((e) => console.error('Payment record sync failed', e));
      }
      return next;
    });
    playNotificationChime();
  };

  // Independently expire each owned plan as its own expiry passes.
  useEffect(() => {
    const checkSubscriptionExpiry = () => {
      setSettings((prev) => {
        const now = Date.now();
        const owned = prev.ownedPlans || [];
        const expiries = prev.planExpiries || {};

        const active = owned.filter((p) => {
          if (p === 'free') return true;
          const exp = expiries[p];
          return !exp || exp > now;
        });

        if (active.length === owned.length) return prev;

        const newExpiries: Partial<Record<SubscriptionPlanType, number>> = { ...expiries };
        for (const p of owned) {
          if (p === 'free') continue;
          const exp = expiries[p];
          if (exp && exp <= now) delete newExpiries[p];
        }

        const currentPlan = prev.subscriptionPlan || 'free';
        const stillOwned = currentPlan === 'free' || active.includes(currentPlan);

        const next: AppSettings = {
          ...prev,
          ownedPlans: active,
          planExpiries: newExpiries,
          subscriptionPlan: stillOwned ? currentPlan : 'free',
          selectedModel: stillOwned
            ? prev.selectedModel
            : 'meta-llama/Llama-3.2-1B-Instruct',
          subscriptionExpiresAt: stillOwned ? prev.subscriptionExpiresAt : undefined,
        };

        if (getAuthToken() && !isGuestUser(currentUser)) {
          saveSubscriptionToServer(getApiUrl, {
            subscriptionPlan: next.subscriptionPlan || 'free',
            ownedPlans: next.ownedPlans || [],
            planExpiries: next.planExpiries || {},
            subscriptionStartedAt: next.subscriptionStartedAt,
            subscriptionExpiresAt: next.subscriptionExpiresAt,
            lastPaymentId: next.lastPaymentId,
          }).catch((e) => console.error('Subscription sync failed', e));
        }

        return next;
      });
    };

    checkSubscriptionExpiry();
    const timer = setInterval(checkSubscriptionExpiry, 5000);
    return () => clearInterval(timer);
  }, []);

  // HF status info from backend
  const [hfStatus, setHfStatus] = useState<HFStatus | null>(null);

  // Resolve the backend endpoint
  const getApiUrl = (path: string): string => {
    let base = (
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_URL ||
      settings.customBackendUrl ||
      ''
    ).trim().replace(/\/$/, '');

    if (base && !base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }

    return base ? `${base}${path}` : path;
  };

  // Guest chats are session-scoped
  useEffect(() => {
    try {
      if (isGuestUser(currentUser)) {
        sessionStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CHATS);
      }
      localStorage.removeItem(STORAGE_KEY_CHATS);
    } catch (e) {
      console.error('Failed to save chats', e);
    }
  }, [chats, currentUser]);

  // Auto-save logged-in user's chats to the DB ~0.8s after streaming stops.
  useEffect(() => {
    if (isGuestUser(currentUser) || !getAuthToken() || isStreaming) return;
    const timer = setTimeout(async () => {
      const ok = await syncPendingChats();
      if (!ok) resetToGuest(); // 401: session expired
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, isStreaming, currentUser]);

  // Flush pending saves immediately when the tab goes hidden / closed.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && getAuthToken() && !isGuestUser(currentUser)) {
        syncPendingChats();
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // SECURITY: A guest's normal chats live only in the current tab. In the background,
  // only a 30-day safety-net copy is pushed to the server (ephemeral_chats table).
  useEffect(() => {
    if (!isGuestUser(currentUser)) return;
    const timer = setTimeout(() => {
      chats.forEach((chat) => {
        if (chat.messages.length > 0) saveEphemeralChat(getApiUrl, chat, false);
      });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, currentUser]);

  // SECURITY: Temp Chats (guest or logged-in) are never permanently stored and never migrated
  // into the user's account. Only a 30-day safety-net copy is pushed.
  useEffect(() => {
    if (!isTempChatActive || tempChatMessages.length === 0) return;
    const timer = setTimeout(() => {
      saveEphemeralChat(
        getApiUrl,
        {
          id: tempChatIdRef.current,
          title: 'Temporary chat',
          messages: tempChatMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        true
      );
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempChatMessages, isTempChatActive]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Failed to save user', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  const [serverState, setServerState] = useState<'checking' | 'ready' | 'waking_up' | 'offline'>('checking');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const UPDATE_SNOOZE_KEY = 'tejas_update_snoozed_v1';
  const [updateSnoozed, setUpdateSnoozed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(UPDATE_SNOOZE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Version check
  const checkForUpdates = async (manual = false) => {
    if (manual) setIsCheckingUpdates(true);
    try {
      const res = await fetch(getApiUrl('/api/version'));
      if (res.ok) {
        const data: AppVersionInfo = await res.json();
        if (data && data.version) {
          setUpdateInfo(data);
          const currentVer = getClientVersion();
          if (data.version !== currentVer) {
            if (manual) {
              setUpdateModalOpen(true);
            } else if (!isVersionDismissed(data.version) && !updateSnoozed) {
              setUpdateModalOpen(true);
            }
          } else if (manual) {
            alert(`Tejas AI is up to date (v${currentVer}).`);
          }
        }
      } else if (manual) {
        alert('Could not check updates from server.');
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (manual) {
        alert('Unable to connect to server. Please check your internet connection.');
      }
    } finally {
      if (manual) setIsCheckingUpdates(false);
    }
  };

  // Auto-check for updates: once shortly after boot, then every 5 minutes.
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      checkForUpdates(false);
    }, 2000);
    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 5 * 60 * 1000);
    return () => {
      clearTimeout(bootTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.customBackendUrl, updateSnoozed]);

  // Server health check
  useEffect(() => {
    let isMounted = true;
    let retryTimer: any = null;

    const checkServerHealth = async () => {
      const hasCustomUrl = Boolean(
        (
          settings.customBackendUrl ||
          import.meta.env.VITE_API_URL ||
          import.meta.env.VITE_BACKEND_URL ||
          ''
        ).trim()
      );

      const slowTimer = setTimeout(() => {
        if (isMounted && hasCustomUrl) {
          setServerState('waking_up');
        }
      }, 2500);

      try {
        const res = await fetch(getApiUrl('/api/status'));
        clearTimeout(slowTimer);
        const contentType = res.headers.get('content-type') || '';

        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted) {
            setHfStatus(data);
            setServerState('ready');
          }
        } else {
          if (isMounted) {
            setServerState(hasCustomUrl ? 'waking_up' : 'offline');
            if (hasCustomUrl) {
              retryTimer = setTimeout(checkServerHealth, 6000);
            }
          }
        }
      } catch (err) {
        clearTimeout(slowTimer);
        if (isMounted) {
          setServerState(hasCustomUrl ? 'waking_up' : 'offline');
          if (hasCustomUrl) {
            retryTimer = setTimeout(checkServerHealth, 6000);
          }
        }
      }
    };

    checkServerHealth();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [settings.customBackendUrl]);

  // System theme preference listener
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);
  useEffect(() => {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(matchMedia.matches);
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    matchMedia.addEventListener('change', listener);
    return () => matchMedia.removeEventListener('change', listener);
  }, []);

  const isDark =
    settings.theme === 'dark'
      ? true
      : settings.theme === 'bright'
      ? false
      : systemPrefersDark;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#090d16';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [isDark]);

  // Set the default active chat if none is selected
  useEffect(() => {
    if (!isTempChatActive && !activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId, isTempChatActive]);

  // Get the currently active messages
  const currentChat = chats.find((c) => c.id === activeChatId);
  const activeMessages: Message[] = isTempChatActive
    ? tempChatMessages
    : currentChat
    ? currentChat.messages
    : [];

  // Chat handlers
  const handleNewChat = () => {
    setIsTempChatActive(false);
    const newSession: ChatSession = {
      id: 'chat_' + Date.now(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => (isGuestUser(currentUser) ? [newSession] : [newSession, ...prev]));
    setActiveChatId(newSession.id);
  };

  const handleStartTempChat = () => {
    setIsTempChatActive(true);
    setTempChatMessages([]);
    tempChatIdRef.current = 'temp_' + Date.now();
  };

  const handleSelectChat = (id: string) => {
    setIsTempChatActive(false);
    setActiveChatId(id);
    loadChatMessages(id);
  };

  const handleTogglePinChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = chats.find((c) => c.id === id);
    const title = target?.title || 'Chat';

    // Optimistically remove from the active list
    syncedRef.current.delete(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }

    // Server: move to trash (also revokes share link)
    if (getAuthToken() && !isGuestUser(currentUser)) {
      try {
        const res = await deleteServerChat(getApiUrl, id);
        const days = res?.recoveryDays ?? 60;
        setDeleteToast({ title, daysLeft: days });
        setTimeout(() => setDeleteToast(null), 5000);
      } catch (err) {
        console.error('Chat delete sync failed', err);
        // If server delete failed, put the chat back so it doesn't disappear silently.
        if (target) setChats((prev) => [target, ...prev].sort((a, b) => b.updatedAt - a.updatedAt));
        alert('Could not delete the chat. Please try again.');
      }
    }
  };

  const handleUpdateUserName = (newName: string) => {
    setCurrentUser((prev) => ({ ...prev, name: newName }));
    if (getAuthToken() && !isGuestUser(currentUser)) {
      updateMyName(getApiUrl, newName).catch((e) => console.error('Name sync failed', e));
    }
  };

  // ---- Server (DB) chat sync ----
  const syncedRef = useRef<Map<string, string>>(new Map());
  const chatsRef = useRef<ChatSession[]>(chats);
  chatsRef.current = chats;

  const resetToGuest = () => {
    clearAuthToken();
    syncedRef.current = new Map();
    setChats([]);
    setActiveChatId(null);
    setIsTempChatActive(false);
    setCurrentUser(DEFAULT_USER);
    setSettings((prev) => ({
      ...prev,
      selectedModel: 'meta-llama/Llama-3.2-1B-Instruct',
      subscriptionPlan: 'free',
      subscriptionExpiresAt: undefined,
      subscriptionStartedAt: undefined,
      lastPaymentId: undefined,
      ownedPlans: [],
      planExpiries: {},
    }));
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_CHATS);
    sessionStorage.removeItem(STORAGE_KEY_CHATS);
  };

  const syncLockRef = useRef<Promise<boolean> | null>(null);

  const syncPendingChats = async (): Promise<boolean> => {
    // If a save is already in flight, wait for it to finish, then run with the latest changes.
    if (syncLockRef.current) {
      try {
        await syncLockRef.current;
      } catch {}
    }
    const run = runSyncPendingChats();
    syncLockRef.current = run;
    try {
      return await run;
    } finally {
      if (syncLockRef.current === run) syncLockRef.current = null;
    }
  };

  const runSyncPendingChats = async (): Promise<boolean> => {
    if (!getAuthToken()) return true;
    for (const chat of chatsRef.current) {
      if (chat.isTemp) continue;
      if (chat.messages.length === 0) continue;
      const sig = chatSignature(chat);
      if (syncedRef.current.get(chat.id) === sig) continue;
      try {
        await saveServerChat(getApiUrl, chat);
        syncedRef.current.set(chat.id, sig);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return false;
        console.error('Chat sync failed', e);
      }
    }
    return true;
  };

  // Load only the chat LIST (metadata) — messages load on demand.
  const loadServerChats = async () => {
    setChatsLoading(true);
    try {
      const { chats: serverChats } = await fetchServerChats(getApiUrl);
      setChats((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        for (const sc of serverChats) {
          const local = map.get(sc.id);
          if (!local || sc.updatedAt >= local.updatedAt) {
            map.set(sc.id, {
              ...sc,
              messages: local && local.messages.length > 0 ? local.messages : sc.messages,
            });
            syncedRef.current.set(sc.id, chatSignature(sc));
          }
        }
        return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) resetToGuest();
      else console.error('Failed to load chats', e);
    } finally {
      setChatsLoading(false);
    }
  };

  // Load full messages for a single chat (called when the user opens it).
  const loadChatMessages = async (chatId: string) => {
    if (!getAuthToken() || isGuestUser(currentUser)) return;
    const existing = chatsRef.current.find((c) => c.id === chatId);
    if (!existing) return;
    if (existing.messages.length > 0) return;
    setLoadingMessageIds((prev) => ({ ...prev, [chatId]: true }));
    try {
      const { chat: fullChat } = await fetchServerChatById(getApiUrl, chatId);
      // Mark as already-synced so we don't re-save an unchanged chat right after loading.
      syncedRef.current.set(chatId, chatSignature({ ...existing, messages: fullChat.messages }));
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: fullChat.messages } : c))
      );
    } catch (e) {
      console.error('Failed to load chat messages', e);
    } finally {
      setLoadingMessageIds((prev) => {
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });
    }
  };

  // ---- Trash: load list ----
  const loadTrashChats = async () => {
    if (!getAuthToken() || isGuestUser(currentUser)) {
      setTrashChats([]);
      return;
    }
    setTrashLoading(true);
    try {
      const { chats } = await fetchTrashChats(getApiUrl);
      setTrashChats(chats || []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) resetToGuest();
      else console.error('Failed to load trash', e);
    } finally {
      setTrashLoading(false);
    }
  };

  // ---- Trash: restore ----
  const handleRestoreChat = async (chatId: string) => {
    try {
      await restoreServerChat(getApiUrl, chatId);
      setTrashChats((prev) => prev.filter((c) => c.id !== chatId));
      await loadServerChats();
    } catch (e: any) {
      alert(e?.message || 'Could not recover this chat.');
    }
  };

  // ---- Trash: permanently delete (hard delete from DB) ----
  const handlePermanentlyDeleteChat = (chatId: string, title: string) => {
    setConfirmPermanentDelete({ id: chatId, title });
  };

  const executePermanentDelete = async () => {
    if (!confirmPermanentDelete) return;
    const { id } = confirmPermanentDelete;
    setConfirmPermanentDelete(null);
    try {
      await permanentlyDeleteServerChat(getApiUrl, id);
      setTrashChats((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Could not delete this chat.');
    }
  };

  // Whenever the active chat changes, lazily load its messages if needed.
  useEffect(() => {
    if (!activeChatId || isTempChatActive) return;
    if (isGuestUser(currentUser)) return;
    loadChatMessages(activeChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, isTempChatActive]);

  // ---- BOOT RESTORE ----
  // On app open (refresh / reopening), if a saved auth token exists, re-fetch the
  // user account + subscription + full chat list so returning users see their data.
  useEffect(() => {
    if (!getAuthToken() || isGuestUser(currentUser)) {
      setChatsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { user: fresh } = await fetchMe(getApiUrl);
        if (cancelled) return;
        const serverUser: any = fresh;
        setCurrentUser(fresh);
        setSettings((prev) => ({
          ...prev,
          subscriptionPlan: serverUser.subscriptionPlan || 'free',
          ownedPlans: Array.isArray(serverUser.ownedPlans) ? serverUser.ownedPlans : [],
          planExpiries:
            serverUser.planExpiries && typeof serverUser.planExpiries === 'object' ? serverUser.planExpiries : {},
          subscriptionStartedAt: serverUser.subscriptionStartedAt,
          subscriptionExpiresAt: serverUser.subscriptionExpiresAt,
          lastPaymentId: serverUser.lastPaymentId,
        }));
        await loadServerChats();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) resetToGuest(); // token expired
        else console.error('Session restore failed', e); // network error: don't log out
        setChatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    if (isGuestUser(currentUser)) return;
    await syncPendingChats();
    resetToGuest();
  };

  // ---- Share helpers ----
  const buildShareUrl = (id: string): string => {
    const site = ((import.meta.env.VITE_PUBLIC_SITE_URL as string) || window.location.origin).replace(/\/+$/, '');
    return `${site}/share/${id}`;
  };

  const createShareFor = async (chatId: string) => {
    setIsSharing(true);
    setShareError(null);
    setShareLink(null);
    setShareId(null);
    setShareCopied(false);
    try {
      const synced = await syncPendingChats();
      if (!synced) throw new ApiError('Session expired. Please sign in again.', 401);
      const { shareId: newId } = await createShareLink(getApiUrl, chatId);
      const link = buildShareUrl(newId);
      setShareId(newId);
      setShareLink(link);
      setShareModalOpen(true);
      if (await copyText(link)) setShareCopied(true);
    } catch (e: any) {
      setShareError(e?.message || 'Could not create the share link. Please try again.');
      setShareModalOpen(true);
    } finally {
      setIsSharing(false);
    }
  };

  const handleLoginSuccess = async (user: UserProfile) => {
    const pendingShareChatId = pendingShareRef.current;
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch (e) {}
    if (!isGuestUser(user)) {
      // Pull the latest user record (including subscription) from the server, so
      // plans the user bought previously reappear after logout/login.
      try {
        const { user: fresh } = await fetchMe(getApiUrl);
        const serverUser: any = fresh;
        setSettings((prev) => ({
          ...prev,
          subscriptionPlan: serverUser.subscriptionPlan || 'free',
          ownedPlans: Array.isArray(serverUser.ownedPlans) ? serverUser.ownedPlans : [],
          planExpiries: serverUser.planExpiries && typeof serverUser.planExpiries === 'object'
            ? serverUser.planExpiries
            : {},
          subscriptionStartedAt: serverUser.subscriptionStartedAt,
          subscriptionExpiresAt: serverUser.subscriptionExpiresAt,
          lastPaymentId: serverUser.lastPaymentId,
        }));
      } catch (e) {
        console.error('Failed to load subscription from server', e);
      }

      await syncPendingChats();
      await loadServerChats();
      purgeGuestEphemeralChats(getApiUrl);
      if (pendingShareChatId) await createShareFor(pendingShareChatId);
    }
  };

  // Sharing a chat requires login/signup for guests. After they sign in, the same chat
  // is shared automatically.
  const handleShareChat = async () => {
    if (isTempChatActive || !activeChatId) return;
    if (isGuestUser(currentUser)) {
      pendingShareRef.current = activeChatId;
      setAuthNotice('Sign in or create an account to share this chat. Once you sign in, this chat will be saved to your account and shared automatically.');
      setAuthModalOpen(true);
      return;
    }
    // Show a warning before sharing — the chat content is public once shared.
    pendingShareRef2.current = () => {
      createShareFor(activeChatId);
    };
    setShareWarningOpen(true);
  };

  const proceedWithShare = () => {
    setShareWarningOpen(false);
    const fn = pendingShareRef2.current;
    pendingShareRef2.current = null;
    fn?.();
  };

  const cancelShare = () => {
    setShareWarningOpen(false);
    pendingShareRef2.current = null;
  };

  const handleStopSharing = async () => {
    if (!shareId) return;
    try {
      await deleteShareLink(getApiUrl, shareId);
      setShareLink(null);
      setShareId(null);
      setShareModalOpen(false);
    } catch (e: any) {
      setShareError(e?.message || 'Could not disable the link.');
    }
  };

  const handleSaveCustomToken = (token: string) => {
    setSettings((prev) => ({ ...prev, customHfToken: token }));
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Main streaming request to the Llama REST API
  const handleSendMessage = async (
    text: string,
    options?: { editedMessageId?: string; contextText?: string; contextMessageId?: string }
  ) => {
    const editedMessageId = options?.editedMessageId;
    const contextText = options?.contextText;
    const contextMessageId = options?.contextMessageId;
    if (contextText) setAskAbout(null);
    if (!text.trim() || isStreaming) return;

    let targetChatId = activeChatId;
    let targetTitle = 'New Conversation';

    if (!editedMessageId && !isTempChatActive && (!targetChatId || !currentChat)) {
      targetTitle = text.slice(0, 32) + (text.length > 32 ? '...' : '');
      const newSession: ChatSession = {
        id: 'chat_' + Date.now(),
        title: targetTitle,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      targetChatId = newSession.id;
      setChats((prev) => (isGuestUser(currentUser) ? [newSession] : [newSession, ...prev]));
      setActiveChatId(newSession.id);
    }

    const assistantMessageId = 'msg_assistant_' + (Date.now() + 1);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      status: 'streaming',
    };

    let historyForModel: Message[];

    if (editedMessageId) {
      const baseList = isTempChatActive
        ? tempChatMessages
        : chats.find((c) => c.id === targetChatId)?.messages || [];
      const idx = baseList.findIndex((m) => m.id === editedMessageId);
      if (idx === -1) return;
      historyForModel = baseList
        .slice(0, idx + 1)
        .map((m) => (m.id === editedMessageId ? { ...m, content: text, timestamp: Date.now() } : m));
    } else {
      const userMessage: Message = {
        id: 'msg_user_' + Date.now(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        contextText: contextText || undefined,
        contextMessageId: contextMessageId || undefined,
      };
      historyForModel = [...activeMessages, userMessage];
    }

    if (isTempChatActive) {
      if (editedMessageId) {
        setTempChatMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === editedMessageId);
          if (idx === -1) return prev;
          const head = prev
            .slice(0, idx + 1)
            .map((m) => (m.id === editedMessageId ? { ...m, content: text, timestamp: Date.now() } : m));
          return [...head, assistantMessage];
        });
      } else {
        setTempChatMessages((prev) => [...prev, historyForModel[historyForModel.length - 1], assistantMessage]);
      }
    } else {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== targetChatId) return c;
          if (editedMessageId) {
            const idx = c.messages.findIndex((m) => m.id === editedMessageId);
            if (idx === -1) return c;
            const head = c.messages
              .slice(0, idx + 1)
              .map((m) => (m.id === editedMessageId ? { ...m, content: text, timestamp: Date.now() } : m));
            return { ...c, updatedAt: Date.now(), messages: [...head, assistantMessage] };
          } else {
            const isFirst = c.messages.length === 0;
            const updatedTitle = isFirst ? text.slice(0, 32) + (text.length > 32 ? '...' : '') : c.title;
            const newUserMsg = historyForModel[historyForModel.length - 1];
            return {
              ...c,
              title: updatedTitle,
              updatedAt: Date.now(),
              messages: [...c.messages, newUserMsg, assistantMessage],
            };
          }
        })
      );
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const expandForModel = (m: Message): Message => {
        if (m.role === 'user' && m.contextText) {
          return {
            ...m,
            content:
              `The user is asking about a specific part of your previous response.\n\n` +
              `--- SELECTED TEXT FROM YOUR EARLIER RESPONSE ---\n` +
              `${m.contextText}\n` +
              `--- END SELECTED TEXT ---\n\n` +
              `User's question about the above:\n${m.content}`,
          };
        }
        return m;
      };
      const historyToSend = historyForModel
        .filter((m) => m.content.trim().length > 0)
        .map(expandForModel);

      const response = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyToSend,
          userToken: settings.customHfToken,
          systemPrompt: settings.systemPrompt,
          preferredModel: settings.selectedModel,
          userProfile: currentUser,
        }),
        signal: controller.signal,
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('event-stream')) {
        if (response.status === 404) {
          throw new Error(
            'Backend server not reached (HTTP 404). Please ensure your backend URL is set in VITE_BACKEND_URL environment variable on Netlify.'
          );
        }
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let streamError = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) streamError = String(parsed.error);
              if (parsed.text) {
                accumulatedText += parsed.text;

                if (isTempChatActive) {
                  setTempChatMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedText }
                        : m
                    )
                  );
                } else {
                  setChats((prev) =>
                    prev.map((c) =>
                      c.id === targetChatId
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                              m.id === assistantMessageId
                                ? { ...m, content: accumulatedText }
                                : m
                            ),
                          }
                        : c
                    )
                  );
                }
              }
            } catch {
              // Ignore chunk parse error
            }
          }
        }
      }

      if (streamError && !accumulatedText) {
        throw new Error(streamError);
      }

      if (isTempChatActive) {
        setTempChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, status: 'complete' } : m
          )
        );
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessageId ? { ...m, status: 'complete' } : m
                  ),
                }
              : c
          )
        );
      }

      if (settings.notificationsEnabled) {
        playNotificationChime();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Chat streaming error:', err);
        const friendly =
          err.message === 'Failed to fetch'
            ? 'Could not reach the backend. Check your backend URL (VITE_BACKEND_URL) and the server status.'
            : err.message || 'Failed to connect to the Llama 3.2 model endpoint';
        const errorText = `\n\n⚠️ *Streaming error: ${friendly}*`;
        if (isTempChatActive) {
          setTempChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: (m.content || '') + errorText, status: 'error' }
                : m
            )
          );
        } else {
          setChats((prev) =>
            prev.map((c) =>
              c.id === targetChatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: (m.content || '') + errorText, status: 'error' }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Scroll to a message and highlight the snippet the user had selected.
  const handleJumpToSource = (messageId: string, selectedText: string) => {
    const el = document.querySelector(
      `[data-message-id="${messageId}"]`
    ) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      try {
        window.getSelection()?.removeAllRanges();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node: Node | null = null;
        while ((node = walker.nextNode())) {
          const value = node.nodeValue || '';
          const idx = value.indexOf(selectedText);
          if (idx !== -1) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + selectedText.length);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            setTimeout(() => window.getSelection()?.removeAllRanges(), 2600);
            return;
          }
        }
        el.classList.add('ring-2', 'ring-cyan-400/70', 'rounded-2xl');
        setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400/70', 'rounded-2xl'), 2000);
      } catch {}
    }, 600);
  };

  const handleRegenerate = () => {
    if (activeMessages.length === 0 || isStreaming) return;
    const lastUserMsg = [...activeMessages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    if (isTempChatActive) {
      setTempChatMessages((prev) => {
        const lastIdx = prev.map((m) => m.role).lastIndexOf('assistant');
        if (lastIdx !== -1) {
          const copy = [...prev];
          copy.splice(lastIdx, 1);
          return copy;
        }
        return prev;
      });
    } else if (activeChatId) {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === activeChatId) {
            const lastIdx = c.messages.map((m) => m.role).lastIndexOf('assistant');
            if (lastIdx !== -1) {
              const copy = [...c.messages];
              copy.splice(lastIdx, 1);
              return { ...c, messages: copy };
            }
          }
          return c;
        })
      );
    }

    handleSendMessage(lastUserMsg.content);
  };

  const isAnyModalOpen =
    userProfileOpen ||
    settingsOpen ||
    authModalOpen ||
    tokenGuideOpen ||
    subscriptionModalOpen ||
    paymentModalOpen ||
    paymentHistoryOpen ||
    sharedChatsOpen;

  if (sharedChatId) {
    return <SharedChatView shareId={sharedChatId} getApiUrl={getApiUrl} isDark={isDark} />;
  }

  return (
    <div
      className={`flex h-[100dvh] w-full overflow-hidden ${
        isDark ? 'bg-[#212121] text-zinc-100' : 'bg-white text-zinc-900'
      }`}
    >
      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onStartTempChat={handleStartTempChat}
        isTempChatActive={isTempChatActive}
        onTogglePinChat={handleTogglePinChat}
        onDeleteChat={handleDeleteChat}
        currentUser={currentUser}
        onOpenProfile={() => setUserProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenSubscription={() => handleOpenSubscription()}
        subscriptionPlan={settings.subscriptionPlan || 'free'}
        isDark={isDark}
        appDownloadUrl="/Tejas.apk"
        trashChats={trashChats}
        trashLoading={trashLoading}
        chatsLoading={chatsLoading}
        onLoadTrash={loadTrashChats}
        onRestoreChat={handleRestoreChat}
        onPermanentlyDeleteChat={handlePermanentlyDeleteChat}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden md:pl-72 sm:md:pl-80 transition-all">
        <ChatArea
          messages={activeMessages}
          isLoadingMessages={!!activeChatId && !!loadingMessageIds[activeChatId]}
          isStreaming={isStreaming}
          isTempChatActive={isTempChatActive}
          onOpenSidebar={() => setSidebarOpen(true)}
          currentUser={currentUser}
          onRegenerate={handleRegenerate}
          onSelectPromptSuggestion={(prompt) => handleSendMessage(prompt)}
          selectedModel={settings.selectedModel}
          onSelectModel={(modelId) =>
            setSettings((prev) => ({
              ...prev,
              selectedModel: modelId,
              subscriptionPlan: MODEL_TO_PLAN[modelId] || 'free',
            }))
          }
          subscriptionPlan={settings.subscriptionPlan || 'free'}
          ownedPlans={settings.ownedPlans || []}
          subscriptionExpiresAt={settings.subscriptionExpiresAt}
          onOpenSubscription={(plan) => handleOpenSubscription(plan || 'cat')}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          isDark={isDark}
          serverState={serverState}
          updateInfo={updateInfo}
          onOpenUpdateModal={() => setUpdateModalOpen(true)}
          onShareChat={handleShareChat}
          isSharing={isSharing}
          canShare={!isTempChatActive && activeMessages.length > 0}
          onSendMessage={handleSendMessage}
          onAskAbout={(text, messageId) => setAskAbout({ text, messageId })}
          onJumpToSource={handleJumpToSource}
          renderCenteredInput={() => (
            <ChatInput
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onStopStreaming={handleStopStreaming}
              isDark={isDark}
              isCentered={true}
              disableAutoType={isAnyModalOpen}
              contextText={askAbout?.text}
              contextMessageId={askAbout?.messageId}
              onClearContext={() => setAskAbout(null)}
            />
          )}
        />

        {/* Bottom input field */}
        {activeMessages.length > 0 && (
          <ChatInput
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStopStreaming={handleStopStreaming}
            isDark={isDark}
            isCentered={false}
            disableAutoType={isAnyModalOpen}
            contextText={askAbout?.text}
            contextMessageId={askAbout?.messageId}
            onClearContext={() => setAskAbout(null)}
          />
        )}
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        user={currentUser}
        isOpen={userProfileOpen}
        onClose={() => setUserProfileOpen(false)}
        onUpdateName={handleUpdateUserName}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        isDark={isDark}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenProfile={() => setUserProfileOpen(true)}
        onOpenSubscription={(plan) => handleOpenSubscription(plan || 'cat')}
        onOpenPaymentHistory={() => setPaymentHistoryOpen(true)}
        onOpenSharedChats={() => setSharedChatsOpen(true)}
        isDark={isDark}
        onCheckForUpdates={() => checkForUpdates(true)}
        isCheckingUpdates={isCheckingUpdates}
      />

      {/* Update Modal */}
      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onRemindLater={() => {
          try {
            sessionStorage.setItem(UPDATE_SNOOZE_KEY, '1');
          } catch {}
          setUpdateSnoozed(true);
          setUpdateModalOpen(false);
        }}
        onOpenSettings={() => {
          setUpdateModalOpen(false);
          setSettingsOpen(true);
        }}
        updateInfo={updateInfo}
        isDark={isDark}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthNotice(null);
          pendingShareRef.current = null;
        }}
        onLoginSuccess={handleLoginSuccess}
        isDark={isDark}
        getApiUrl={getApiUrl}
        notice={authNotice}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        currentPlan={settings.subscriptionPlan || 'free'}
        highlightPlan={highlightPlan}
        onSelectFreePlan={handleSelectFreePlan}
        onInitiateCheckout={handleInitiateCheckout}
        subscriptionExpiresAt={settings.subscriptionExpiresAt}
        isDark={isDark}
      />

      {/* Payment Modal */}
      {pendingPaymentItem && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          item={pendingPaymentItem}
          onPaymentSuccess={handlePaymentSuccess}
          isDark={isDark}
        />
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border shadow-xl p-5 space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              🔗 Share this chat
            </h2>
            {shareError ? (
              <p className="text-sm text-rose-400">{shareError}</p>
            ) : (
              <>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Anyone with this link can read the chat — no sign-in required.
                </p>
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <span className="truncate flex-1">{shareLink}</span>
                  <button
                    type="button"
                    onClick={async () => { if (shareLink && (await copyText(shareLink))) { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } }}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all"
                  >
                    {shareCopied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleStopSharing}
                  className="w-full py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                >
                  🚫 Stop sharing (disable this link)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShareModalOpen(false)}
              className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={paymentHistoryOpen}
        onClose={() => setPaymentHistoryOpen(false)}
        getApiUrl={getApiUrl}
        isDark={isDark}
      />

      {/* Shared Chats Modal */}
      <SharedChatsModal
        isOpen={sharedChatsOpen}
        onClose={() => setSharedChatsOpen(false)}
        getApiUrl={getApiUrl}
        isDark={isDark}
        onOpenShare={(shareId) => {
          window.open(`/share/${shareId}`, '_blank', 'noopener,noreferrer');
        }}
      />

      {/* Hugging Face Token Guide */}
      <TokenGuideModal
        isOpen={tokenGuideOpen}
        onClose={() => setTokenGuideOpen(false)}
        customHfToken={settings.customHfToken}
        onSaveToken={handleSaveCustomToken}
        hfStatus={hfStatus}
        isDark={isDark}
      />

      {/* Share warning modal */}
      {shareWarningOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={cancelShare}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Before you share</h3>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  This chat will become publicly readable
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Please check that this chat does not contain any <strong>sensitive, private, or personal information</strong>.
              Anyone with the link will be able to read the entire conversation.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={cancelShare}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-200' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedWithShare}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-sm"
              >
                Continue to Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirmation modal */}
      {confirmPermanentDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setConfirmPermanentDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold">Delete forever?</h3>
                <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {confirmPermanentDelete.title}
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              This chat will be <strong>permanently deleted</strong> and cannot be recovered.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmPermanentDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-200' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePermanentDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete-to-trash toast */}
      {deleteToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-2xl ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
            }`}
          >
            <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">Moved to Trash</p>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Recover within {deleteToast.daysLeft} days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}