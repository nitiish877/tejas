import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Message, SubscriptionPlanType, UserProfile } from '../types';
import { AppVersionInfo, getClientVersion } from '../version';
import { Logo } from './Logo';
import { MarkdownMessage } from './MarkdownMessage';
import {
  Copy,
  Check,
  RotateCcw,
  Flame,
  Sparkles,
  Crown,
  ChevronDown,
  TestTube2,
  LogIn,
  Lock,
  Radio,
  ArrowUpCircle,
  Share2,
  Loader2,
  Pencil,
  X,
  Quote,
  MessageCircleQuestion,
  Download,
  FileText,
  ImagePlus,
} from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  isLoadingMessages?: boolean;
  isStreaming: boolean;
  isTempChatActive: boolean;
  onOpenSidebar: () => void;
  currentUser: UserProfile;
  onRegenerate: () => void;
  onSelectPromptSuggestion: (text: string) => void;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
  subscriptionPlan?: SubscriptionPlanType;
  ownedPlans?: SubscriptionPlanType[];
  subscriptionExpiresAt?: number;
  onOpenSubscription?: (plan?: SubscriptionPlanType) => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  isDark: boolean;
  renderCenteredInput?: () => React.ReactNode;
  serverState?: 'checking' | 'ready' | 'waking_up' | 'offline';
  updateInfo?: AppVersionInfo | null;
  onOpenUpdateModal?: () => void;
  onShareChat?: () => void;
  isSharing?: boolean;
  canShare?: boolean;
  onSendMessage?: (text: string, options?: { editedMessageId?: string }) => void;
  onAskAbout?: (text: string, messageId: string) => void;
  onJumpToSource?: (messageId: string, selectedText: string) => void;
  onGenerateImage?: (prompt: string) => void;
  isImageGenerating?: boolean;
  onUserSend?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoadingMessages = false,
  isStreaming,
  isTempChatActive,
  onOpenSidebar,
  currentUser,
  onRegenerate,
  onSelectPromptSuggestion,
  selectedModel = 'Qwen/Qwen2.5-1.5B-Instruct',
  onSelectModel,
  subscriptionPlan = 'free',
  ownedPlans = [],
  subscriptionExpiresAt,
  onOpenSubscription,
  onOpenSettings,
  onOpenAuth,
  isDark,
  renderCenteredInput,
  serverState = 'ready',
  updateInfo,
  onOpenUpdateModal,
  onShareChat,
  isSharing = false,
  canShare = false,
  onSendMessage,
  onAskAbout,
  onJumpToSource,
  onGenerateImage,
  isImageGenerating = false,
  onUserSend,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const confirmExternalLinks = messages.some((message) => message.role === 'user' && !!message.attachments?.length);
  const stickToBottomRef = useRef(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [regenState, setRegenState] = useState<{
    oldContent: string;
    variant: 'A' | 'B' | 'C';
  } | null>(null);

  const [askAboutButton, setAskAboutButton] = useState<{
    text: string;
    messageId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('[data-ask-about-btn]')) {
        setAskAboutButton(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!regenState) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content.trim().length > 0) {
      setRegenState(null);
    }
  }, [messages, regenState]);

  const daysRemaining = subscriptionExpiresAt
    ? Math.max(0, Math.ceil((subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const getModelLabel = () => {
    switch (selectedModel) {
      case 'Qwen/Qwen2.5-3B-Instruct':
        return {
          name: 'Cat (3B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹1 Test',
          isPro: true,
          plan: 'cat' as SubscriptionPlanType,
        };
      case 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B':
        return {
          name: 'Chetak (8B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹299/mo',
          isPro: true,
          plan: 'chetak' as SubscriptionPlanType,
        };
      case 'meta-llama/Llama-3.3-70B-Instruct':
      case 'meta-llama/Llama-3-70B-Instruct':
        return {
          name: 'Arka (70B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹799/mo',
          isPro: true,
          plan: 'arka' as SubscriptionPlanType,
        };
      case 'Qwen/Qwen2.5-1.5B-Instruct':
      default:
        return {
          name: '1.5B',
          badge: 'Free',
          isPro: false,
          plan: 'free' as SubscriptionPlanType,
        };
    }
  };

  const modelInfo = getModelLabel();

  const availableModels = useMemo(() => {
    const list = [
      {
        id: 'Qwen/Qwen2.5-1.5B-Instruct',
        name: '1.5B (Free)',
        desc: 'Fast, lightweight & free for all',
        badge: 'Free',
        badgeClass: 'bg-zinc-700/50 text-zinc-300',
        plan: 'free' as SubscriptionPlanType,
      },
    ];
    if (ownedPlans.includes('cat')) {
      list.push({
        id: 'Qwen/Qwen2.5-3B-Instruct',
        name: 'Cat (3B)',
        desc: 'Balanced reasoning & speed',
        badge: 'Active',
        badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        plan: 'cat' as SubscriptionPlanType,
      });
    }
    if (ownedPlans.includes('chetak')) {
      list.push({
        id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
        name: 'Chetak (8B)',
        desc: 'DeepSeek reasoning & coding',
        badge: 'Active',
        badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        plan: 'chetak' as SubscriptionPlanType,
      });
    }
    if (ownedPlans.includes('arka')) {
      list.push({
        id: 'meta-llama/Llama-3.3-70B-Instruct',
        name: 'Arka (70B)',
        desc: 'Flagship power & deep reasoning',
        badge: 'Active',
        badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        plan: 'arka' as SubscriptionPlanType,
      });
    }
    return list;
  }, [ownedPlans]);

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
    setShowScrollToBottom(distanceFromBottom >= 120);
    setAskAboutButton(null);
  };

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') stickToBottomRef.current = true;
    if (stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? 'auto' : 'smooth' });
      setShowScrollToBottom(false);
    } else {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollToBottom(distanceFromBottom >= 120);
    }
  }, [messages, isStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleDownloadImage = (imageUrl: string, prompt?: string) => {
    try {
      const a = document.createElement('a');
      a.href = imageUrl;
      const safeName = (prompt || 'tejas-image')
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
      a.download = `${safeName || 'tejas-image'}.jpg`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Image download failed:', e);
      window.open(imageUrl, '_blank');
    }
  };

  const handleShareImage = async (imageUrl: string, _prompt?: string) => {
    // Fixed invite message — deliberately does NOT include the user's prompt.
    const SHARE_TEXT =
      '✨ Generated with Tejas AI\n\nChat and generate images for free:\nhttps://tejassai.vercel.app/';

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || 'jpeg').replace('jpeg', 'jpg');
      const file = new File([blob], `tejas-image.${ext}`, {
        type: blob.type || 'image/jpeg',
      });

      // Preferred: share the image file + the invite text
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Tejas AI',
          text: SHARE_TEXT,
        });
        return;
      }

      // Fallback: share just the text + link
      if (navigator.share) {
        await navigator.share({
          title: 'Tejas AI',
          text: SHARE_TEXT,
        });
        return;
      }

      // Last resort (desktop Chrome without Web Share): copy the invite text
      // to the clipboard and download the image so the user can paste it manually.
      try {
        await navigator.clipboard.writeText(SHARE_TEXT);
      } catch {}
      handleDownloadImage(imageUrl, undefined);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share failed:', err);
        try {
          await navigator.clipboard.writeText(SHARE_TEXT);
        } catch {}
        handleDownloadImage(imageUrl, undefined);
      }
    }
  };

  const handleSelectionCheck = (_e: React.MouseEvent | React.TouchEvent) => {
    setTimeout(() => {
      try {
        const sel = window.getSelection();
        const text = sel?.toString().trim() || '';
        if (!text || text.length < 3) {
          setAskAboutButton(null);
          return;
        }
        const range = sel!.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const el =
          container.nodeType === 1
            ? (container as Element)
            : (container.parentElement as Element | null);
        const msgEl = el?.closest('[data-message-role="assistant"]') as HTMLElement | null;
        if (!msgEl) {
          setAskAboutButton(null);
          return;
        }
        const messageId = msgEl.getAttribute('data-message-id') || '';
        if (!messageId) {
          setAskAboutButton(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        const x = Math.min(rect.right + 6, window.innerWidth - 150);
        const y = Math.min(rect.bottom + 6, window.innerHeight - 50);
        setAskAboutButton({ text, messageId, x, y });
      } catch {
        setAskAboutButton(null);
      }
    }, 40);
  };

  const handleAskAboutClick = () => {
    if (!askAboutButton) return;
    onAskAbout?.(askAboutButton.text, askAboutButton.messageId);
    setAskAboutButton(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.content);
  };
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };
  const handleSaveEdit = (msgId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    onUserSend?.();
    setEditingMessageId(null);
    setEditingText('');
    stickToBottomRef.current = true;
    onSendMessage?.(trimmed, { editedMessageId: msgId });
    setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
  };

  const handleSendFromChat = (text: string) => {
    onUserSend?.();
    onSendMessage?.(text);
  };

  const handlePromptSuggestion = (text: string) => {
    onUserSend?.();
    onSelectPromptSuggestion(text);
  };

  const handleRegenerateClick = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    const variants: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    setRegenState({ oldContent: lastAssistant.content, variant });
    onRegenerate();
  };

  const starterSuggestions = [
    'Explain quantum computing in simple terms',
    'Write a clean JavaScript debounce function',
    'Help me plan a 3-day travel itinerary',
    'Draft a polite email asking for project updates',
  ];

  const formatShortTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const spinnerVariants = ['dots', 'ring', 'bars', 'pulse', 'cursor'] as const;
  const getSpinnerVariant = (id: string): (typeof spinnerVariants)[number] => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return spinnerVariants[hash % spinnerVariants.length];
  };

  const renderTypingSpinner = (variant: (typeof spinnerVariants)[number]) => {
    switch (variant) {
      case 'dots':
        return (
          <span className="spinner-dots text-zinc-400">
            <span /><span /><span />
          </span>
        );
      case 'ring':
        return <span className="spinner-ring text-zinc-400" />;
      case 'bars':
        return (
          <span className="spinner-bars text-zinc-400">
            <span /><span /><span />
          </span>
        );
      case 'pulse':
        return <span className="spinner-pulse text-zinc-400" />;
      case 'cursor':
      default:
        return <span className="streaming-cursor" />;
    }
  };

  const cursorVariants = ['block', 'line', 'circle', 'underline', 'glow', 'x'] as const;
  const getCursorVariant = (id: string): (typeof cursorVariants)[number] => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return cursorVariants[hash % cursorVariants.length];
  };

  const renderStreamingCursor = (variant: (typeof cursorVariants)[number]) => {
    switch (variant) {
      case 'line':
        return <span className="streaming-cursor-line" />;
      case 'circle':
        return <span className="streaming-cursor-circle" />;
      case 'underline':
        return <span className="streaming-cursor-underline" />;
      case 'glow':
        return <span className="streaming-cursor-glow" />;
      case 'x':
        return (
          <span className="streaming-cursor-x" aria-hidden>
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M5 5 L19 19" className="x-line-1" />
              <path d="M19 5 L5 19" className="x-line-2" />
            </svg>
          </span>
        );
      case 'block':
      default:
        return <span className="streaming-cursor" />;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      {/* Top Header Bar */}
      <header
        className={`h-14 px-4 flex items-center justify-between border-b shrink-0 z-10 transition-colors ${
          isDark
            ? 'bg-[#111e28] border-zinc-800 text-zinc-100'
            : 'bg-[#f5f8fa] border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            id="header-logo-btn"
            type="button"
            onClick={onOpenSidebar}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
            className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            }`}
          >
            <span aria-hidden="true" className="flex w-6 flex-col items-start gap-1">
              <span className="h-[3px] w-6 rounded-full bg-current" />
              <span className="h-[4px] w-4 rounded-full bg-current" />
            </span>
            <span className="font-bold text-lg tracking-tight">
              Tejas
            </span>
          </button>

          {isTempChatActive && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isDark
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <Flame className="w-3 h-3" /> Temp
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          <div ref={modelMenuRef} className="relative">
            <button
              id="header-model-pill-btn"
              type="button"
              onClick={() => setModelDropdownOpen((prev) => !prev)}
              title="Click to switch active model"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark
                  ? 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700/80 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
              }`}
            >
              <span>Tejas {modelInfo.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({modelInfo.badge})</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {modelDropdownOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-xl py-1.5 z-50 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              >
                <div className="px-3 py-1.5 border-b border-zinc-800/40 text-[11px] font-semibold opacity-60">
                  Switch Active Model
                </div>

                {availableModels.map((item) => {
                  const isSelected = selectedModel === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`px-3 py-2 flex items-center justify-between hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                        isSelected ? (isDark ? 'bg-zinc-800/70' : 'bg-zinc-100') : ''
                      }`}
                      onClick={() => {
                        onSelectModel?.(item.id);
                        setModelDropdownOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{item.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] opacity-70">{item.desc}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {onShareChat && canShare && (
            <button
              id="header-share-btn"
              type="button"
              onClick={onShareChat}
              disabled={isSharing}
              title="Share this chat"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-cyan-300/20 bg-gradient-to-r from-cyan-700 via-teal-700 to-blue-700 hover:from-cyan-600 hover:via-teal-600 hover:to-blue-600 text-white transition-all shadow-sm shadow-cyan-950/15 disabled:opacity-60"
            >
              {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {onOpenAuth && (currentUser.provider === 'guest' || !currentUser.email || currentUser.email.includes('guest')) && (
            <button
              id="header-auth-btn"
              type="button"
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-300 shadow-sm'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {onOpenSubscription && (
            <button
              id="header-upgrade-btn"
              type="button"
              onClick={() => onOpenSubscription()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                subscriptionPlan === 'arka'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                  : subscriptionPlan === 'chetak'
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25'
                  : subscriptionPlan === 'cat'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
                  : 'bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white'
              }`}
            >
              {subscriptionPlan === 'arka' ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : subscriptionPlan === 'cat' ? (
                <TestTube2 className="w-3.5 h-3.5 text-purple-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              )}
              <span className="hidden sm:inline">
                {subscriptionPlan === 'arka'
                  ? 'Arka Pro'
                  : subscriptionPlan === 'chetak'
                  ? 'Chetak Active'
                  : subscriptionPlan === 'cat'
                  ? 'Cat Active'
                  : 'Upgrade'}
              </span>
            </button>
          )}
        </div>
      </header>

      {updateInfo && updateInfo.version && updateInfo.version !== getClientVersion() && (
        <div className="w-full bg-gradient-to-r from-cyan-700/15 via-teal-700/15 to-blue-700/15 border-b border-cyan-600/25 px-4 py-2 flex items-center justify-between text-xs text-cyan-200 transition-all shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span>
              <strong>Update Ready:</strong> Version <strong>v{updateInfo.version}</strong> is available.
            </span>
          </div>
          <button
            id="open-update-modal-banner-btn"
            type="button"
            onClick={onOpenUpdateModal}
            className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>Update Now</span>
          </button>
        </div>
      )}

      {isLoadingMessages ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3">
            <span className="spinner-ring text-zinc-400" style={{ width: 28, height: 28, borderWidth: 3 }} />
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading chat…</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 overflow-y-auto">
          <div className="max-w-2xl w-full text-center space-y-6 animate-in fade-in duration-200 py-6">
            <div className="flex justify-center mb-2">
              <Logo size="lg" glowing={false} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-inherit">
              What can I help with?
            </h1>

            {renderCenteredInput && (
              <div className="w-full">
                {renderCenteredInput()}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-xl mx-auto">
              {starterSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePromptSuggestion(prompt)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    isDark
                      ? 'bg-zinc-800/40 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          data-chat-scroll-container
          onScroll={handleMessagesScroll}
          onMouseUp={handleSelectionCheck}
          onTouchEnd={handleSelectionCheck}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-6"
        >
          <div className="w-full space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLastAssistant =
                !isUser &&
                index === messages.length - 1 &&
                msg.role === 'assistant';
              const isEditingThis = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  data-message-role={msg.role}
                  className={`group relative flex gap-3 sm:gap-4 ${
                    isUser ? 'justify-end' : 'justify-start'
                  } items-start`}
                >

              <div className="relative flex-1 min-w-0 flex flex-col">
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed ${
                        isUser
                          ? isDark
                            ? 'bg-[#1e303b] text-zinc-100 self-end'
                            : 'bg-[#eaf1f4] text-zinc-900 self-end'
                          : 'text-inherit self-start px-0 sm:px-1'
                      }`}
                    >
                      {isUser ? (
                        isEditingThis ? (
                          <div className="w-full min-w-[260px] flex flex-col gap-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  handleSaveEdit(msg.id);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              rows={Math.min(8, Math.max(2, editingText.split('\n').length))}
                              className={`w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 focus:border-zinc-400'
                                  : 'bg-white text-zinc-900 border border-zinc-300 focus:border-zinc-500'
                              }`}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Ctrl+Enter to save • Esc to cancel
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  title="Cancel"
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isDark
                                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100'
                                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  disabled={!editingText.trim()}
                                  title="Save & resend"
                                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                                    isDark
                                      ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {msg.contextText && (
                              <button
                                type="button"
                                onClick={() => onJumpToSource?.(msg.contextMessageId || '', msg.contextText!)}
                                title="Jump to the original text"
                                className={`text-left rounded-lg border-l-2 px-2.5 py-1.5 transition-colors ${
                                  isDark
                                    ? 'bg-zinc-800/70 border-cyan-400/70 hover:bg-zinc-800'
                                    : 'bg-zinc-100 border-cyan-500/70 hover:bg-zinc-200'
                                }`}
                              >
                                <div className={`flex items-center gap-1 text-[10px] font-semibold mb-0.5 ${
                                  isDark ? 'text-cyan-300' : 'text-cyan-700'
                                }`}>
                                  <Quote className="w-2.5 h-2.5" />
                                  <span>About this part</span>
                                </div>
                                <div className={`text-xs whitespace-pre-wrap break-words max-h-24 overflow-hidden ${
                                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                                }`}>
                                  {msg.contextText.length > 300
                                    ? msg.contextText.slice(0, 300) + '…'
                                    : msg.contextText}
                                </div>
                              </button>
                            )}
                            {msg.attachments?.length ? (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {msg.attachments.map((attachment, attachmentIndex) => (
                                  <span key={`${attachment.name}-${attachmentIndex}`} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-zinc-600 bg-zinc-700/60 text-zinc-200' : 'border-zinc-300 bg-white/70 text-zinc-700'}`}>
                                    {attachment.kind === 'image' ? <ImagePlus className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                    <span className="max-w-40 truncate">{attachment.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          </div>
                        )
                      ) : (
                        <div
                          className={`prose prose-zinc ${
                            isDark ? 'prose-invert' : ''
                          } max-w-none break-words leading-relaxed text-sm sm:text-base prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-code:before:content-none prose-code:after:content-none`}
                        >
                          {msg.imageUrl ? (
                            <div className="not-prose flex flex-col gap-3">
                              <div
                                className={`relative overflow-hidden rounded-2xl border ${
                                  isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
                                }`}
                              >
                                <img
                                  src={msg.imageUrl}
                                  alt={msg.imagePrompt || 'Generated image'}
                                  className="w-full max-w-md h-auto block"
                                  loading="lazy"
                                  style={{ animation: 'imageFadeIn 0.35s ease-out' }}
                                />

                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadImage(msg.imageUrl!, msg.imagePrompt)}
                                    title="Download image"
                                    className="p-2 rounded-lg backdrop-blur-md bg-black/55 hover:bg-black/75 text-white border border-white/20 transition-all active:scale-95 shadow-lg"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareImage(msg.imageUrl!, msg.imagePrompt)}
                                    title="Share image"
                                    className="p-2 rounded-lg backdrop-blur-md bg-black/55 hover:bg-black/75 text-white border border-white/20 transition-all active:scale-95 shadow-lg"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : msg.status === 'streaming' && msg.imagePrompt ? (
                            /* --- Cat painting animation --- */
                            <div className="not-prose flex flex-col items-center justify-center py-2">
                              <div
                                className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border ${
                                  isDark
                                    ? 'bg-zinc-800 border-zinc-700'
                                    : 'bg-zinc-200 border-zinc-300'
                                }`}
                              >
                                {/* Small paint dots appearing on canvas */}
                                <div className="absolute inset-0">
                                  {[
                                    { top: '18%', left: '22%', delay: 0 },
                                    { top: '30%', left: '58%', delay: 0.25 },
                                    { top: '46%', left: '30%', delay: 0.5 },
                                    { top: '22%', left: '72%', delay: 0.75 },
                                    { top: '58%', left: '48%', delay: 1.0 },
                                    { top: '70%', left: '24%', delay: 1.25 },
                                    { top: '38%', left: '18%', delay: 1.5 },
                                    { top: '60%', left: '76%', delay: 1.75 },
                                  ].map((dot, i) => (
                                    <div
                                      key={i}
                                      className="absolute w-2 h-2 rounded-full bg-fuchsia-400/70"
                                      style={{
                                        top: dot.top,
                                        left: dot.left,
                                        animation: `paintDotAppear 2.4s ease-in-out ${dot.delay}s infinite`,
                                      }}
                                    />
                                  ))}
                                </div>

                                {/* The white cat */}
                                <div
                                  className="absolute"
                                  style={{
                                    bottom: '6%',
                                    right: '8%',
                                    animation: 'catBodyBob 1.1s ease-in-out infinite',
                                  }}
                                >
                                  <svg
                                    width="92"
                                    height="92"
                                    viewBox="0 0 100 100"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    {/* Tail */}
                                    <g
                                      style={{
                                        transformOrigin: '20px 82px',
                                        animation: 'catTailWag 1.1s ease-in-out infinite',
                                      }}
                                    >
                                      <path
                                        d="M 22 82 Q 6 74 8 58"
                                        stroke="#f8fafc"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        fill="none"
                                      />
                                    </g>

                                    {/* Body */}
                                    <ellipse cx="48" cy="76" rx="22" ry="16" fill="#f8fafc" />

                                    {/* Colored patches */}
                                    <ellipse cx="58" cy="78" rx="9" ry="8" fill="#f59e0b" />
                                    <ellipse cx="38" cy="74" rx="6" ry="5" fill="#8b5cf6" />
                                    <ellipse cx="50" cy="86" rx="5" ry="4" fill="#ef4444" />

                                    {/* Head */}
                                    <circle cx="66" cy="56" r="20" fill="#f8fafc" />

                                    {/* Ears */}
                                    <polygon points="50,42 46,24 62,38" fill="#f8fafc" />
                                    <polygon points="80,42 84,24 70,38" fill="#f8fafc" />
                                    <polygon points="53,40 51,28 61,38" fill="#fbcfe8" />
                                    <polygon points="77,40 79,28 69,38" fill="#fbcfe8" />

                                    {/* Head patch */}
                                    <ellipse cx="54" cy="50" rx="7" ry="5" fill="#8b5cf6" />

                                    {/* Eyes */}
                                    <ellipse cx="61" cy="56" rx="2.6" ry="3.4" fill="#0f172a" />
                                    <ellipse cx="74" cy="56" rx="2.6" ry="3.4" fill="#0f172a" />
                                    <circle cx="61.8" cy="55" r="0.9" fill="#ffffff" />
                                    <circle cx="74.8" cy="55" r="0.9" fill="#ffffff" />

                                    {/* Nose */}
                                    <polygon points="67,63 65,66 69,66" fill="#f472b6" />

                                    {/* Mouth */}
                                    <path
                                      d="M 67 66 Q 64 69 62 67 M 67 66 Q 70 69 72 67"
                                      stroke="#94a3b8"
                                      strokeWidth="0.8"
                                      fill="none"
                                    />

                                    {/* Whiskers */}
                                    <line x1="42" y1="62" x2="56" y2="63" stroke="#94a3b8" strokeWidth="0.7" />
                                    <line x1="42" y1="66" x2="56" y2="66" stroke="#94a3b8" strokeWidth="0.7" />
                                    <line x1="90" y1="62" x2="76" y2="63" stroke="#94a3b8" strokeWidth="0.7" />
                                    <line x1="90" y1="66" x2="76" y2="66" stroke="#94a3b8" strokeWidth="0.7" />

                                    {/* Front arm extending left */}
                                    <path
                                      d="M 32 72 Q 22 62 18 58"
                                      stroke="#f8fafc"
                                      strokeWidth="8"
                                      strokeLinecap="round"
                                      fill="none"
                                    />

                                    {/* Paw */}
                                    <circle cx="18" cy="58" r="5" fill="#f8fafc" />
                                    <circle cx="16" cy="56" r="1.4" fill="#e2e8f0" />
                                    <circle cx="19" cy="55" r="1.4" fill="#e2e8f0" />
                                    <circle cx="21" cy="58" r="1.4" fill="#e2e8f0" />
                                  </svg>
                                </div>

                                {/* Brush — sweeps across the canvas */}
                                <div
                                  className="absolute"
                                  style={{
                                    bottom: '46%',
                                    right: '42%',
                                    animation: 'catBrushPaint 1.4s ease-in-out infinite',
                                    transformOrigin: 'right center',
                                  }}
                                >
                                  <svg width="46" height="20" viewBox="0 0 46 20">
                                    <rect x="20" y="8" width="24" height="4" rx="1" fill="#b45309" />
                                    <rect x="14" y="7" width="7" height="6" rx="0.6" fill="#cbd5e1" />
                                    <path d="M 3 8 Q 14 9 14 10 Q 14 11 3 12 Z" fill="#f472b6" />
                                    <path d="M 5 9 Q 12 10 12 10" stroke="#db2777" strokeWidth="0.6" fill="none" />
                                  </svg>
                                </div>

                                {/* Small "Painting..." label */}
                                <div className="absolute top-3 left-0 right-0 text-center">
                                  <p
                                    className={`text-[10px] tracking-widest uppercase font-semibold ${
                                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                                    }`}
                                  >
                                    Painting
                                    <span className="inline-flex gap-0.5 ml-1">
                                      <span style={{ animation: 'paintingDotBlink 1.4s ease-in-out infinite' }}>.</span>
                                      <span style={{ animation: 'paintingDotBlink 1.4s ease-in-out 0.2s infinite' }}>.</span>
                                      <span style={{ animation: 'paintingDotBlink 1.4s ease-in-out 0.4s infinite' }}>.</span>
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <MarkdownMessage content={msg.content} isDark={isDark} confirmExternalLinks={confirmExternalLinks} />
                          )}

                          {isStreaming && isLastAssistant && msg.content.trim().length === 0 && !msg.imagePrompt && (
                            regenState ? (
                              <>
                                {regenState.variant === 'A' && (
                                  <div className="opacity-60">
                                  <MarkdownMessage content={regenState.oldContent} isDark={isDark} confirmExternalLinks={confirmExternalLinks} />
                                  </div>
                                )}
                                {regenState.variant === 'B' && (
                                  <div className="flex items-center gap-2 text-zinc-400">
                                    {renderTypingSpinner(getSpinnerVariant(msg.id))}
                                    <span className="text-xs">Regenerating…</span>
                                  </div>
                                )}
                                {regenState.variant === 'C' && (
                                  <div>
                                    <div className="opacity-30">
                                      <MarkdownMessage content={regenState.oldContent} isDark={isDark} confirmExternalLinks={confirmExternalLinks} />
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400 mt-1">
                                      {renderTypingSpinner(getSpinnerVariant(msg.id))}
                                      <span className="text-xs">Regenerating…</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              renderTypingSpinner(getSpinnerVariant(msg.id))
                            )
                          )}

                          {isStreaming && isLastAssistant && msg.content.trim().length > 0 && (
                            renderStreamingCursor(getCursorVariant(msg.id))
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`text-[10px] text-zinc-500 mt-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity select-none ${
                        isUser ? 'text-right' : 'text-left ml-1'
                      }`}
                    >
                      {formatShortTime(msg.timestamp)}
                    </div>

                    {!isUser && !isStreaming && (
                      <div className="flex items-center gap-1 mt-1 ml-1 text-zinc-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'hover:bg-zinc-200 hover:text-zinc-800'
                          }`}
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isLastAssistant && !msg.imageUrl && (
                          <button
                            type="button"
                            onClick={handleRegenerateClick}
                            title="Regenerate"
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'hover:bg-zinc-200 hover:text-zinc-800'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {isUser && !isEditingThis && !isStreaming && (
                      <div className="flex items-center justify-end gap-1 mt-1 mr-1 text-zinc-400">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          title="Edit message"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'hover:bg-zinc-200 hover:text-zinc-800'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'hover:bg-zinc-200 hover:text-zinc-800'
                          }`}
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {showScrollToBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          title="Go to latest message"
          className={`absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border p-2.5 shadow-lg transition-all hover:scale-105 active:scale-95 ${
            isDark
              ? 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {askAboutButton && (
        <button
          data-ask-about-btn
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleAskAboutClick}
          style={{ left: askAboutButton.x, top: askAboutButton.y }}
          className="fixed z-[60] flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl border border-zinc-700 hover:bg-zinc-800 active:scale-95 transition-all"
        >
          <MessageCircleQuestion className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ask about this</span>
        </button>
      )}
    </div>
  );
};
