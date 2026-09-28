import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Message, SubscriptionPlanType, UserProfile } from '../types';
import { AppVersionInfo, getClientVersion } from '../version';
import { Logo } from './Logo';
import { MarkdownMessage } from './MarkdownMessage';
import {
  Menu,
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
  selectedModel = 'meta-llama/Llama-3.2-1B-Instruct',
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
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const [regenState, setRegenState] = useState<{
    oldContent: string;
    variant: 'A' | 'B' | 'C';
  } | null>(null);

  // Selection → floating "Ask about this" button
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
      // Close Ask About button if clicked outside (but only if it's not the button itself — button has its own onClick)
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
      case 'meta-llama/Llama-3.2-3B-Instruct':
        return {
          name: 'Cat (3B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹1 Test',
          isPro: true,
          plan: 'cat',
        };
      case 'meta-llama/Llama-3.1-8B-Instruct':
        return {
          name: 'Chetak (8B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹299/mo',
          isPro: true,
          plan: 'chetak',
        };
      case 'meta-llama/Llama-3.3-70B-Instruct':
      case 'meta-llama/Llama-3-70B-Instruct':
        return {
          name: 'Arka (70B)',
          badge: daysRemaining !== null ? `${daysRemaining}d` : '₹799/mo',
          isPro: true,
          plan: 'arka',
        };
      case 'meta-llama/Llama-3.2-1B-Instruct':
      default:
        return {
          name: '1B',
          badge: 'Free',
          isPro: false,
          plan: 'free',
        };
    }
  };

  const modelInfo = getModelLabel();

  const availableModels = useMemo(() => {
    const list = [
      {
        id: 'meta-llama/Llama-3.2-1B-Instruct',
        name: '1B (Free)',
        desc: 'Fast, lightweight & free for all',
        badge: 'Free',
        badgeClass: 'bg-zinc-700/50 text-zinc-300',
        plan: 'free' as SubscriptionPlanType,
      },
    ];
    if (ownedPlans.includes('cat')) {
      list.push({
        id: 'meta-llama/Llama-3.2-3B-Instruct',
        name: 'Cat (3B)',
        desc: 'Balanced reasoning & speed',
        badge: 'Active',
        badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        plan: 'cat' as SubscriptionPlanType,
      });
    }
    if (ownedPlans.includes('chetak')) {
      list.push({
        id: 'meta-llama/Llama-3.1-8B-Instruct',
        name: 'Chetak (8B)',
        desc: 'Pro reasoning & coding',
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
    // Any active selection-aware button should hide when scrolling
    setAskAboutButton(null);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') stickToBottomRef.current = true;
    if (stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // ---- Selection detection ----
  const handleSelectionCheck = (_e: React.MouseEvent | React.TouchEvent) => {
    // Wait for the browser to update the selection, then read it
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
        // Clamp so button stays on-screen
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

  // ---- Edit ----
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
    setEditingMessageId(null);
    setEditingText('');
    stickToBottomRef.current = true;
    onSendMessage?.(trimmed, { editedMessageId: msgId });
    setTimeout(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
  };

  // ---- Regenerate ----
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
            ? 'bg-[#212121] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            id="header-logo-btn"
            type="button"
            onClick={onOpenSidebar}
            title="Open sidebar"
            className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            }`}
          >
            <Logo size="sm" glowing={false} />
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-transparent bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 text-white transition-all shadow-sm disabled:opacity-60"
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
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
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

      {/* Update banner */}
      {updateInfo && updateInfo.version && updateInfo.version !== getClientVersion() && (
        <div className="w-full bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 border-b border-blue-500/30 px-4 py-2 flex items-center justify-between text-xs text-blue-200 transition-all shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span>
              <strong>Update Ready:</strong> Version <strong>v{updateInfo.version}</strong> is available.
            </span>
          </div>
          <button
            id="open-update-modal-banner-btn"
            type="button"
            onClick={onOpenUpdateModal}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>Update Now</span>
          </button>
        </div>
      )}

      {/* Main content */}
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
                  onClick={() => onSelectPromptSuggestion(prompt)}
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
          onScroll={handleMessagesScroll}
          onMouseUp={handleSelectionCheck}
          onTouchEnd={handleSelectionCheck}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 space-y-6"
        >
          <div className="max-w-3xl mx-auto space-y-6">
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
                  {!isUser && (
                    <div className="shrink-0 pt-0.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Logo size="xs" glowing={false} />
                      </div>
                    </div>
                  )}

                  <div className="relative max-w-[85%] sm:max-w-[80%] flex flex-col">
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed ${
                        isUser
                          ? isDark
                            ? 'bg-[#2f2f2f] text-zinc-100 self-end'
                            : 'bg-[#f4f4f4] text-zinc-900 self-end'
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
                            {/* Reference chip if user's message was "Ask about this" */}
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
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          </div>
                        )
                      ) : (
                        <div
                          className={`prose prose-zinc ${
                            isDark ? 'prose-invert' : ''
                          } max-w-none break-words leading-relaxed text-sm sm:text-base prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-code:before:content-none prose-code:after:content-none`}
                        >
                          <MarkdownMessage content={msg.content} isDark={isDark} />

                          {isStreaming && isLastAssistant && msg.content.trim().length === 0 && (
                            regenState ? (
                              <>
                                {regenState.variant === 'A' && (
                                  <div className="opacity-60">
                                    <MarkdownMessage content={regenState.oldContent} isDark={isDark} />
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
                                      <MarkdownMessage content={regenState.oldContent} isDark={isDark} />
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

                        {isLastAssistant && (
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

                  {isUser && (
                    <div className="shrink-0 pt-0.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center font-medium text-xs">
                        {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Floating "Ask about this" button */}
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