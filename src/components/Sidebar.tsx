import React, { useEffect, useRef, useState } from 'react';
import { ChatSession, SubscriptionPlanType, UserProfile } from '../types';
import { Logo } from './Logo';
import {
  Plus,
  Pin,
  Trash2,
  Settings,
  X,
  Search,
  MessageSquare,
  Flame,
  Sparkles,
  Crown,
  TestTube2,
  LogIn,
  Code2,
  MoreVertical,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose: () => void;
  onToggleCollapsed?: () => void;
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onStartTempChat: () => void;
  isTempChatActive: boolean;
  onTogglePinChat: (id: string, e: React.MouseEvent) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
  currentUser: UserProfile;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  onOpenSubscription?: (plan?: SubscriptionPlanType) => void;
  subscriptionPlan?: SubscriptionPlanType;
  isDark: boolean;
  onOpenCodeEditor: () => void;
  // ---- Trash support ----
  trashChats?: ChatSession[];
  trashLoading?: boolean;
  chatsLoading?: boolean;
  onLoadTrash?: () => void;
  onRestoreChat?: (id: string) => void;
  onPermanentlyDeleteChat?: (id: string, title: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed = false,
  onClose,
  onToggleCollapsed,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onStartTempChat,
  isTempChatActive,
  onTogglePinChat,
  onDeleteChat,
  currentUser,
  onOpenProfile,
  onOpenSettings,
  onOpenAuth,
  onOpenSubscription,
  subscriptionPlan = 'free',
  isDark,
  onOpenCodeEditor,
  trashChats = [],
  trashLoading = false,
  chatsLoading = false,
  onLoadTrash,
  onRestoreChat,
  onPermanentlyDeleteChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'chats' | 'trash'>('chats');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchToTrash = () => {
    setView('trash');
    setOpenMenuId(null);
    onLoadTrash?.();
  };

  const switchToChats = () => {
    setView('chats');
    setOpenMenuId(null);
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const recentChats = filteredChats.filter((c) => !c.isPinned);

  const isLoggedIn = !(currentUser.provider === 'guest' || !currentUser.email);

  // ---- Chat row ----
  const ChatRow: React.FC<{ chat: ChatSession; isPinned?: boolean }> = ({ chat, isPinned }) => {
    const isActive = activeChatId === chat.id && !isTempChatActive && view === 'chats';
    return (
      <div
        onClick={() => {
          onSelectChat(chat.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
          isActive
            ? isDark
              ? 'bg-zinc-800 text-white'
              : 'bg-zinc-200 text-zinc-900'
            : isDark
            ? 'hover:bg-zinc-800/60 text-zinc-300'
            : 'hover:bg-zinc-100 text-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-8 flex-1 min-w-0">
          {isPinned ? (
            <Pin className="w-3 h-3 text-zinc-400 shrink-0 rotate-45" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          )}
          <span className="truncate">{chat.title}</span>
        </div>

        {/* 3-dot menu */}
        <div
          className={`relative shrink-0 ${openMenuId === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          ref={openMenuId === chat.id ? menuRef : null}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId((cur) => (cur === chat.id ? null : chat.id));
            }}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            }`}
            title="More options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {openMenuId === chat.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border shadow-xl py-1 ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  onTogglePinChat(chat.id, e as any);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>{isPinned ? 'Unpin' : 'Pin to top'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  onDeleteChat(chat.id, e as any);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-rose-500/10 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Move to Trash</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Trash row (heading-only, super light) ----
  const TrashRow: React.FC<{ chat: ChatSession }> = ({ chat }) => {
    const daysLeft = chat.daysLeft ?? 0;
    return (
      <div
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
          isDark ? 'hover:bg-zinc-800/60 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
          <Trash2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate">{chat.title}</p>
            <p
              className={`text-[10px] mt-0.5 ${
                daysLeft <= 7 ? 'text-rose-400 font-semibold' : isDark ? 'text-zinc-500' : 'text-zinc-500'
              }`}
            >
              {daysLeft} day{daysLeft === 1 ? '' : 's'} left
            </p>
          </div>
        </div>

        <div className="relative shrink-0" ref={openMenuId === chat.id ? menuRef : null}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId((cur) => (cur === chat.id ? null : chat.id));
            }}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            }`}
            title="More options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {openMenuId === chat.id && (
            <div
              className={`absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border shadow-xl py-1 ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  onRestoreChat?.(chat.id);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-emerald-400' : 'hover:bg-zinc-100 text-emerald-600'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Recover</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  onPermanentlyDeleteChat?.(chat.id, chat.title);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-rose-500/10 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Delete Forever</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 flex flex-col border-r transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : isCollapsed ? '-translate-x-full' : '-translate-x-full md:translate-x-0'
        } ${
          isDark
            ? 'bg-[#191c1f] border-zinc-800 text-zinc-200'
            : 'bg-[#f2f7f9] border-zinc-200 text-zinc-800'
        }`}
      >
        {/* Top Header */}
        <div className={`p-4 flex items-center justify-between border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {view === 'trash' ? (
            <button
              type="button"
              onClick={switchToChats}
              className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-bold text-base tracking-tight">Trash</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Logo size="sm" glowing={false} />
              <span className="font-bold text-lg tracking-tight text-inherit">Tejas</span>
            </div>
          )}

          <button
            id="close-sidebar-btn"
            type="button"
            onClick={() => {
              if (window.innerWidth >= 768) onToggleCollapsed?.();
              else onClose();
            }}
            title="Close sidebar"
            aria-label="Close sidebar"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action buttons — only in chats view */}
        {view === 'chats' && (
          <div className="p-3 space-y-2">
            <button
              id="new-chat-btn"
              type="button"
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-sm font-medium border flex items-center justify-between transition-all ${
                isDark
                  ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/60 text-zinc-100 shadow-sm'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New chat</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-500'}`}>
                Ctrl+K
              </span>
            </button>

            <button
              id="temp-chat-btn"
              type="button"
              onClick={() => {
                onStartTempChat();
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                isTempChatActive
                  ? isDark
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                  : isDark
                  ? 'bg-zinc-800/40 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isTempChatActive ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>{isTempChatActive ? 'Temporary chat active' : 'Temporary chat'}</span>
            </button>

            <div className="relative pt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                id="search-chats-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-500'
                    : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>
        )}

        {/* Chat / Trash list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
          {view === 'chats' ? (
            chatsLoading && chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                <p className="text-xs text-zinc-500">Loading chats…</p>
              </div>
            ) : (
              <>
                {pinnedChats.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      <Pin className="w-3 h-3 rotate-45" />
                      <span>Pinned</span>
                    </div>
                    {pinnedChats.map((chat) => (
                      <ChatRow key={chat.id} chat={chat} isPinned />
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Chats
                  </div>

                  {filteredChats.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-zinc-500">
                      {searchQuery ? 'No matching chats found' : 'No conversation history'}
                    </div>
                  ) : (
                    recentChats.map((chat) => <ChatRow key={chat.id} chat={chat} />)
                  )}
                </div>

                {/* Trash entry point */}
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={switchToTrash}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                        : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trash</span>
                    <ChevronLeft className="w-3 h-3 ml-auto rotate-180" />
                  </button>
                )}
              </>
            )
          ) : (
            <>
              {trashLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  <p className="text-xs text-zinc-500">Loading trash…</p>
                </div>
              ) : trashChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-3">
                  <Trash2 className="w-7 h-7 text-zinc-500" />
                  <p className="text-xs text-zinc-500">Trash is empty</p>
                  <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Deleted chats stay here for 60 days
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Deleted · Auto-remove in 60 days
                  </div>
                  {trashChats.map((chat) => (
                    <TrashRow key={chat.id} chat={chat} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Code editor entry point */}
        {view === 'chats' && (
          <div className="px-3 pb-2">
            <button
              id="sidebar-code-editor-btn"
              type="button"
              onClick={onOpenCodeEditor}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                isDark
                  ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Editor</span>
            </button>
          </div>
        )}

        {/* Subscription */}
        {view === 'chats' && onOpenSubscription && (
          <div className="px-3 pb-2">
            <button
              id="sidebar-upgrade-plan-btn"
              type="button"
              onClick={() => onOpenSubscription()}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                isDark
                  ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {subscriptionPlan === 'arka' ? (
                  <Crown className="w-3.5 h-3.5" />
                ) : subscriptionPlan === 'chetak' ? (
                  <Sparkles className="w-3.5 h-3.5" />
                ) : subscriptionPlan === 'cat' ? (
                  <TestTube2 className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {/* <span>
                  {subscriptionPlan === 'arka'
                    ? 'Tejas Arka (70B)'
                    : subscriptionPlan === 'chetak'
                    ? 'Tejas Chetak (8B)'
                    : subscriptionPlan === 'cat'
                    ? 'Tejas Cat (3B)'
                    : 'Try 1 month for ₹1'}
                </span> */}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                {subscriptionPlan === 'free' ? 'then ₹199' : 'Active'}
              </span>
            </button>
          </div>
        )}

        {/* Guest sign-in banner */}
        {view === 'chats' && onOpenAuth && (currentUser.provider === 'guest' || !currentUser.email || currentUser.email.includes('guest')) && (
          <div className="px-3 py-2 border-t border-zinc-800/80">
            <button
              id="sidebar-auth-btn"
              type="button"
              onClick={() => {
                onOpenAuth();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In / Register</span>
            </button>
          </div>
        )}

        {/* Bottom: profile + settings */}
        <div className={`p-2.5 border-t ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
          <div className="flex items-center justify-between gap-1.5">
            <button
              id="user-account-btn"
              type="button"
              onClick={onOpenProfile}
              title="Change your name"
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors truncate ${
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200/80'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center font-semibold text-xs shrink-0">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'T'}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-medium truncate leading-tight">{currentUser.name || 'Tejas User'}</p>
                <p className={`text-[10px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {currentUser.email ? currentUser.email : 'Guest • Click to sign in'}
                </p>
              </div>
            </button>

            <button
              id="sidebar-settings-btn"
              type="button"
              onClick={onOpenSettings}
              title="Settings"
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
