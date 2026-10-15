import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, Quote, X, ImagePlus, Plus, FileText, Loader2, Images, Paperclip } from 'lucide-react';
import type { SubscriptionPlanType } from '../types';
import { MAX_FILES_PER_UPLOAD, prepareAttachments, releaseAttachmentPreviews } from '../utils/attachments';
import type { PreparedAttachment } from '../utils/attachments';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    options?: { contextText?: string; contextMessageId?: string; attachments?: PreparedAttachment[] }
  ) => boolean | void;
  onBeforeSend?: () => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  isDark: boolean;
  isCentered?: boolean;
  disableAutoType?: boolean;
  contextText?: string;
  contextMessageId?: string;
  onClearContext?: () => void;
  onGenerateImage?: (prompt: string) => void;
  selectedModel?: string;
  ownedPlans?: SubscriptionPlanType[];
  onSelectModel?: (modelId: string) => void;
  onOpenSubscription?: (plan: SubscriptionPlanType) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onBeforeSend,
  isStreaming,
  onStopStreaming,
  isDark,
  isCentered = false,
  disableAutoType = false,
  contextText,
  contextMessageId,
  onClearContext,
  onGenerateImage,
  selectedModel = 'Qwen/Qwen2.5--Instruct',
  ownedPlans = [],
  onSelectModel,
  onOpenSubscription,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([]);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [imageMode, setImageMode] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const models: { id: string; name: string; plan: SubscriptionPlanType }[] = [
    { id: 'Qwen/Qwen2.5-1.5B-Instruct', name: 'sieo', plan: 'free' },
    { id: 'Qwen/Qwen2.5-3B-Instruct', name: 'Cat (3B)', plan: 'cat' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B', name: 'Chetak (8B)', plan: 'chetak' },
    { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Arka (70B)', plan: 'arka' },
  ];
  const currentModel = models.find((model) => model.id === selectedModel) || models[0];

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
    if ((!text.trim() && attachments.length === 0) || isStreaming || isPreparingFiles) return;

    const message = text.trim();
    if (imageMode && onGenerateImage && attachments.length === 0) {
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onBeforeSend?.();
      onGenerateImage(message);
      setImageMode(false);
      return;
    }

    onBeforeSend?.();
    setImageMode(false);
    const accepted = onSendMessage(message, {
      ...(contextText ? { contextText, contextMessageId } : {}),
      attachments: attachments.length ? attachments : undefined,
    });
    if (accepted === false) return;
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    releaseAttachmentPreviews(attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (attachments.length + files.length > MAX_FILES_PER_UPLOAD) {
      setAttachmentError(`Attach up to ${MAX_FILES_PER_UPLOAD} files in one message.`);
      return;
    }
    setAttachmentError('');
    setImageMode(false);
    setIsPreparingFiles(true);
    try {
      const prepared = await prepareAttachments(files);
      setAttachments((current) => {
        const currentImageCount = current.filter((attachment) => attachment.kind === 'image').length;
        const nextImageCount = prepared.filter((attachment) => attachment.kind === 'image').length;
        const encodedImageChars = [...current, ...prepared]
          .filter((attachment) => attachment.kind === 'image')
          .reduce((total, attachment) => total + (attachment.dataUrl?.length || 0), 0);
        if (currentImageCount + nextImageCount > 5 || encodedImageChars > 4 * 1024 * 1024) {
          releaseAttachmentPreviews(prepared);
          setAttachmentError(currentImageCount + nextImageCount > 5
            ? 'Attach up to 5 images in one message.'
            : 'Processed images in one message can total up to 3 MB.');
          return current;
        }
        return [...current, ...prepared];
      });
    } catch (error: any) {
      setAttachmentError(error?.message || 'Could not read the selected file.');
    } finally {
      setIsPreparingFiles(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id);
      if (removed) releaseAttachmentPreviews([removed]);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const toggleImageMode = () => {
    setImageMode((prev) => !prev);
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
          : 'w-full px-4 pb-2 pt-1'
      }`}
    >
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.tsv,.txt,.md,.json,.jsonl,.xml,.html,.htm,.yaml,.yml,.zip,.js,.jsx,.ts,.tsx,.css,.py,.java,.go,.rs,.c,.cpp,.h,.sql,.sh,.ps1,.toml,.ini,.log,.svg"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {!!attachments.length && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className={`flex max-w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'}`}>
              {attachment.previewUrl ? (
                <img src={attachment.previewUrl} alt={attachment.name} className="h-8 w-8 rounded-md object-cover" />
              ) : <FileText className="h-4 w-4 shrink-0 text-cyan-500" />}
              <span className="max-w-48 truncate">{attachment.name}</span>
              <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.name}`} className="rounded p-0.5 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      {isPreparingFiles && <p className="mb-2 flex items-center gap-1.5 px-2 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Reading files…</p>}

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
          isDark
            ? 'bg-[#252a2e] border-zinc-700/70 focus-within:border-cyan-700 text-zinc-100'
            : 'bg-white border-zinc-300 focus-within:border-cyan-700 text-zinc-900 shadow-sm'
        } ${isCentered ? 'py-2.5 px-3 sm:px-3.5 rounded-3xl' : 'p-2 sm:p-2.5'}`}
      >
        {/* Image mode banner (inside the input box) */}
        {imageMode && (
          <div className={`flex items-center justify-between gap-2 pb-2 mb-1 border-b ${
            isDark ? 'border-zinc-700/60' : 'border-zinc-200'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded-md shrink-0 ${
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              }`}>
                <ImagePlus className="w-3 h-3" />
              </div>
              <span className={`text-[11px] font-semibold truncate ${
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              }`}>
                Image mode
              </span>
              <span className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                — describe your image, then press send
              </span>
            </div>
            <button
              type="button"
              onClick={() => setImageMode(false)}
              title="Exit image mode"
              className={`shrink-0 p-1 rounded-md transition-colors ${
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Attach files */}
          <div className="relative shrink-0">
            <button
              id="attach-files-btn"
              type="button"
              disabled={isPreparingFiles}
              onClick={() => setAttachMenuOpen((open) => !open)}
              title="Attach images or files"
              aria-label="Attach images or files"
              className={`rounded-xl p-2 transition-colors ${isDark ? 'text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}
            >
              <Plus className="h-5 w-5" />
            </button>
            {attachMenuOpen && (
              <div className={`absolute bottom-12 left-0 z-30 w-44 overflow-hidden rounded-xl border p-1 shadow-xl ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                <button type="button" onClick={() => { setAttachMenuOpen(false); imageInputRef.current?.click(); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] ${isDark ? 'text-zinc-100 hover:bg-zinc-800/40' : 'text-zinc-900 hover:bg-zinc-50'}`}>
                  <Images className="h-4 w-4 text-cyan-500" /> Images
                </button>
                <button type="button" onClick={() => { setAttachMenuOpen(false); documentInputRef.current?.click(); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] ${isDark ? 'text-zinc-100 hover:bg-zinc-800/40' : 'text-zinc-900 hover:bg-zinc-50'}`}>
                  <Paperclip className="h-4 w-4 text-violet-500" /> Files
                </button>
              </div>
            )}
          </div>

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

          {/* Show only the current model name; hide model picker */}
          <div className="relative shrink-0">
            <div title={currentModel.id} className={`flex items-center gap-1 rounded-full border px-2 py-2 text-xs ${isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-200 text-zinc-700'}`}>
              <span className="max-w-20 truncate">{currentModel.name}</span>
            </div>
          </div>

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
              disabled={!text.trim() && attachments.length === 0 || isPreparingFiles}
              title={imageMode ? 'Generate image' : 'Send message'}
              className={`p-2.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                text.trim() || attachments.length > 0
                  ? isDark
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

      {attachmentError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setAttachmentError('')}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="attachment-limit-title" className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}>
            <h2 id="attachment-limit-title" className="text-base font-semibold">File upload limit</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{attachmentError}</p>
            <p className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Allowed size: images up to 10 MB each; PDF, Word, PowerPoint and Excel files up to 20 MB; text files up to 2 MB.</p>
            <button type="button" autoFocus onClick={() => setAttachmentError('')} className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500">Got it</button>
          </section>
        </div>
      )}

      {/* Bottom row — Generate Image button + Disclaimer */}
      <div className="mt-2 px-2 flex flex-col items-center justify-end gap-2">
        <span />
        <p className={`text-[11px] select-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          tejas is ai can make mistakes please double check response
        </p>
      </div>
    </div>
  );
};
