import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, Smile, Quote, X, ImagePlus } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    options?: { contextText?: string; contextMessageId?: string }
  ) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  isDark: boolean;
  isCentered?: boolean;
  disableAutoType?: boolean;
  contextText?: string;
  contextMessageId?: string;
  onClearContext?: () => void;
  onGenerateImage?: (prompt: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  isDark,
  isCentered = false,
  disableAutoType = false,
  contextText,
  contextMessageId,
  onClearContext,
  onGenerateImage,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-type: focus the chat box when the user types anywhere on the page.
  useEffect(() => {
    if (disableAutoType) return;

    const isEditable = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node || !node.tagName) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key.length !== 1) return;
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      if (e.key === ' ') e.preventDefault(), setText((prev) => prev + ' ');
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      const pasted = e.clipboardData?.getData('text');
      if (!pasted) return;
      e.preventDefault();
      setText((prev) => prev + pasted);
      textareaRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [disableAutoType]);

  // Focus textarea when a context is added.
  useEffect(() => {
    if (contextText) textareaRef.current?.focus();
  }, [contextText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isStreaming) return;

    const message = text.trim();
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setShowEmojiPicker(false);

    if (imageMode && onGenerateImage) {
      onGenerateImage(message);
      setImageMode(false);
      return;
    }

    onSendMessage(message, contextText ? { contextText, contextMessageId } : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }, 10);
  };

  const toggleImageMode = () => {
    setImageMode((prev) => !prev);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const placeholder = imageMode
    ? 'Describe the image you want to generate…'
    : contextText
    ? 'Ask something about the selected text…'
    : 'Ask here...';

  return (
    <div
      ref={containerRef}
      className={`relative w-full transition-all duration-300 ${
        isCentered
          ? 'max-w-2xl mx-auto px-4 my-auto'
          : 'max-w-3xl mx-auto px-3 sm:px-6 pb-2 pt-1'
      }`}
    >
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          isDark={isDark}
        />
      )}

      {/* Context chip (hidden in image mode) */}
      {contextText && !imageMode && (
        <div
          className={`mb-2 flex items-start gap-2 rounded-xl border-l-2 border-cyan-400/80 px-3 py-2 ${
            isDark ? 'bg-zinc-800/70' : 'bg-zinc-100'
          }`}
        >
          <Quote className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-semibold mb-0.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              Asking about selected text
            </div>
            <div
              className={`text-xs break-words ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
              }}
            >
              {contextText}
            </div>
          </div>
          {onClearContext && (
            <button
              type="button"
              onClick={onClearContext}
              title="Clear"
              className={`shrink-0 p-1 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Input box */}
      <div
        className={`relative flex flex-col rounded-2xl border transition-all shadow-sm ${
          imageMode
            ? isDark
              ? 'bg-gradient-to-br from-fuchsia-900/20 via-purple-900/15 to-indigo-900/20 border-fuchsia-500/50'
              : 'bg-gradient-to-br from-fuchsia-50 via-purple-50 to-indigo-50 border-fuchsia-400'
            : isDark
            ? 'bg-[#2f2f2f] border-zinc-700/70 focus-within:border-zinc-500 text-zinc-100'
            : 'bg-white border-zinc-300 focus-within:border-zinc-500 text-zinc-900 shadow-sm'
        } ${isCentered ? 'py-2.5 px-3 sm:px-3.5 rounded-3xl' : 'p-2 sm:p-2.5'}`}
      >
        {/* Image mode banner (inside the input box) */}
        {imageMode && (
          <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-fuchsia-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded-md shrink-0 ${
                isDark ? 'bg-fuchsia-500/25 text-fuchsia-300' : 'bg-fuchsia-200 text-fuchsia-800'
              }`}>
                <ImagePlus className="w-3 h-3" />
              </div>
              <span className={`text-[11px] font-semibold truncate ${
                isDark ? 'text-fuchsia-200' : 'text-fuchsia-800'
              }`}>
                Image mode
              </span>
              <span className={`text-[10px] truncate ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                — describe your image, then press send
              </span>
            </div>
            <button
              type="button"
              onClick={() => setImageMode(false)}
              title="Exit image mode"
              className={`shrink-0 p-1 rounded-md transition-colors ${
                isDark ? 'hover:bg-fuchsia-500/20 text-fuchsia-300' : 'hover:bg-fuchsia-100 text-fuchsia-700'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Emoji button */}
          <button
            id="toggle-emoji-btn"
            type="button"
            onClick={() => {
              setShowEmojiPicker((prev) => !prev);
            }}
            title="Add emoji"
            className={`p-2 rounded-xl shrink-0 transition-colors ${
              showEmojiPicker
                ? isDark
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-200 text-zinc-800'
                : isDark
                ? 'hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            id="chat-message-input"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 max-h-44 resize-none bg-transparent py-1.5 px-1 text-sm sm:text-base focus:outline-none leading-relaxed ${
              isDark
                ? 'text-zinc-100 placeholder-zinc-400'
                : 'text-zinc-900 placeholder-zinc-500'
            }`}
          />

          {isStreaming ? (
            <button
              id="stop-streaming-btn"
              type="button"
              onClick={onStopStreaming}
              title="Stop generating"
              className="p-2.5 rounded-full bg-zinc-200 text-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 transition-transform active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              id="send-message-btn"
              type="button"
              onClick={() => handleSubmit()}
              disabled={!text.trim()}
              title={imageMode ? 'Generate image' : 'Send message'}
              className={`p-2.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                text.trim()
                  ? imageMode
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white active:scale-95'
                    : isDark
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95'
                  : isDark
                  ? 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row — Generate Image button + Disclaimer */}
      <div className="mt-2 px-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        {onGenerateImage ? (
          <button
            type="button"
            onClick={toggleImageMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
              imageMode
                ? isDark
                  ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200'
                  : 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-800'
                : isDark
                ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/70 text-zinc-300 hover:text-zinc-100'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {imageMode ? (
              <>
                <X className="w-3 h-3" />
                <span>Cancel Image Mode</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-3 h-3" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        ) : (
          <span />
        )}

        <p className={`text-[11px] select-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          tejas is ai can make mistakes please double chek response
        </p>
      </div>
    </div>
  );
};