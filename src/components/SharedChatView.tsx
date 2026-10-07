import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Logo } from './Logo';
import { MarkdownMessage } from './MarkdownMessage';
import { fetchSharedChat, SharedChatData } from '../utils/api';

interface SharedChatViewProps {
  shareId: string;
  getApiUrl: (path: string) => string;
  isDark: boolean;
}

// Public, read-only view of a shared chat. Login zaroori nahi — guest ya
// logged-in, koi bhi is link ko khol ke padh sakta hai.
export const SharedChatView: React.FC<SharedChatViewProps> = ({ shareId, getApiUrl, isDark }) => {
  const [data, setData] = useState<SharedChatData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchSharedChat(getApiUrl, shareId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || 'shared chat can not be loaded.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [shareId, getApiUrl]);

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col ${isDark ? 'bg-[#16191c] text-zinc-100' : 'bg-[#f5f8fa] text-zinc-900'}`}>
      {/* Header */}
      <header
        className={`h-14 px-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'bg-[#16191c] border-zinc-800' : 'bg-[#f5f8fa] border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Logo size="sm" glowing={false} />
          <span className="font-bold text-lg tracking-tight">Tejas</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            🔗 Shared
          </span>
        </div>
        <a
          href="/"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white transition-all"
        >
         try Tejas AI →
        </a>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-zinc-400 py-20">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading shared chat...</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )}

          {!loading && data && (
            <>
<div className="pb-2">
  <h1 className="text-xl font-semibold">{data.title}</h1>
  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
    Shared by {data.ownerName} • {new Date(data.createdAt).toLocaleDateString()}
  </p>
</div>

              {data.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id || idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} items-start`}>
                    {!isUser && (
                      <div className="shrink-0 pt-0.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                          <Logo size="xs" glowing={false} />
                        </div>
                      </div>
                    )}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm sm:text-base leading-relaxed ${
                        isUser
                          ? isDark
                            ? 'bg-[#252a2e] text-zinc-100'
                            : 'bg-[#eaf1f4] text-zinc-900'
                          : 'text-inherit px-0 sm:px-1'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      ) : (
                        <div
                          className={`prose prose-zinc ${
                            isDark ? 'prose-invert' : ''
                          } max-w-none break-words leading-relaxed text-sm sm:text-base prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-code:before:content-none prose-code:after:content-none`}
                        >
                          <MarkdownMessage content={msg.content} isDark={isDark} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-6 text-center">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white transition-all"
                >
                  ✨ Start your own chat — Tejas AI
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
