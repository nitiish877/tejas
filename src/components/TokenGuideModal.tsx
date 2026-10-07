import React, { useState } from 'react';
import { Key, ExternalLink, Check, Copy, AlertCircle, X } from 'lucide-react';
import { HFStatus } from '../types';

interface TokenGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  customHfToken: string;
  onSaveToken: (token: string) => void;
  hfStatus: HFStatus | null;
  isDark: boolean;
}

export const TokenGuideModal: React.FC<TokenGuideModalProps> = ({
  isOpen,
  onClose,
  customHfToken,
  onSaveToken,
  hfStatus,
  isDark,
}) => {
  const [tokenInput, setTokenInput] = useState(customHfToken);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const copyEnvCode = () => {
    navigator.clipboard.writeText('HF_TOKEN="hf_your_token_here"');
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const isConfigured = Boolean(tokenInput.trim() || hfStatus?.hasTokenInEnv);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-xl p-6 sm:p-7 relative ${
          isDark
            ? 'bg-[#16191c] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          id="close-token-guide-btn"
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Hugging Face Token Setup</h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Configure your Hugging Face inference credentials
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`p-3.5 rounded-xl border mb-5 flex items-start gap-3 text-xs sm:text-sm ${
            isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {isConfigured ? (
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {isConfigured
                ? 'Hugging Face Token is active'
                : 'Access Token required for live inference'}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {isConfigured
                ? tokenInput.trim()
                  ? 'Custom token saved. Streaming live from Hugging Face.'
                  : 'Token detected in server environment (.env). Ready for streaming.'
                : 'Follow the steps below to connect your token.'}
            </p>
          </div>
        </div>

        {/* 3 Step Guide */}
        <div className="space-y-3 text-xs sm:text-sm mb-5">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center justify-between font-medium text-inherit mb-1">
              <span className="font-semibold">Step 1: Accept Llama License Terms</span>
              <a
                href="https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-[11px] text-zinc-400"
              >
                Model Page <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              Open the Hugging Face repository and click <strong>"Agree and access repository"</strong> to grant your Hugging Face account permission.
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center justify-between font-medium text-inherit mb-1">
              <span className="font-semibold">Step 2: Generate Access Token</span>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-[11px] text-zinc-400"
              >
                Access Tokens <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              Go to your Hugging Face settings, click <strong>"Create new token"</strong> with <strong>Read</strong> role, and copy your token (starts with <code>hf_...</code>).
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center justify-between font-medium text-inherit mb-1">
              <span className="font-semibold">Step 3: Save in App or .env file</span>
              <button
                type="button"
                onClick={copyEnvCode}
                className="flex items-center gap-1 hover:underline text-[11px] text-zinc-400"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy .env snippet
              </button>
            </div>
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              Paste your token in the input below, or add <code>HF_TOKEN="hf_..."</code> to your <code>.env</code> file.
            </p>
          </div>
        </div>

        {/* Form to paste token directly */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Save Token in App Storage
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-medium bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 hover:bg-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Saved!
                </>
              ) : (
                'Save Token'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
