import React from 'react';
import { Sparkles, Download, RefreshCw, X, ArrowRight, Smartphone, Clock, Settings } from 'lucide-react';
import { AppVersionInfo, getClientVersion, setAppliedVersion, dismissVersion } from '../version';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppVersionInfo | null;
  isDark: boolean;
  onRemindLater?: () => void;
  onOpenSettings?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isDark,
  onRemindLater,
  onOpenSettings,
}) => {
  if (!isOpen || !updateInfo) return null;

  const currentVersion = getClientVersion();
  const newVersion = updateInfo.version || currentVersion;

  const handleInstantUpdate = () => {
    // Persist new applied version so it never prompts again
    setAppliedVersion(newVersion);

    // Clear any service workers or cache storages
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // Force reload with cache-busting parameter
    const url = new URL(window.location.href);
    url.searchParams.set('reload', Date.now().toString());
    window.location.href = url.toString();
  };

  const handleDismiss = () => {
    dismissVersion(newVersion);
    onClose();
  };

  const handleRemindLater = () => {
    if (onRemindLater) {
      onRemindLater();
    } else {
      // Fallback: just close the modal without dismissing
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/70 backdrop-blur-sm flex justify-center items-center animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 relative overflow-hidden ${
          isDark
            ? 'bg-[#1e1e1e] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleRemindLater}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          }`}
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-700 to-blue-700 text-white flex items-center justify-center shadow-md shadow-cyan-900/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              System Notification
            </span>
            <h3 className="text-lg font-bold">New Update Available</h3>
          </div>
        </div>

        {/* Version comparison chip */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between mb-4 ${
            isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-mono">v{currentVersion}</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold text-emerald-400 font-mono">v{newVersion}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30">
            Ready to apply
          </span>
        </div>

        {/* Release notes / changelog */}
        <div className="mb-6">
          <p className={`text-xs mb-1.5 font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            What's New:
          </p>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {updateInfo.changelog || 'Latest features, UI improvements, and performance optimizations.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Update Now (Primary) */}
          <button
            type="button"
            onClick={handleInstantUpdate}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Update Now</span>
          </button>

          {/* Remind Me Later (Secondary) */}
          <button
            type="button"
            onClick={handleRemindLater}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border ${
              isDark
                ? 'border-zinc-800 hover:bg-zinc-800/80 text-zinc-200'
                : 'border-zinc-200 hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Remind Me Later</span>
          </button>

          {/* APK download option (if available) */}
          {updateInfo.apkDownloadUrl && (
            <a
              href={updateInfo.apkDownloadUrl}
              download="Tejas.apk"
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs border flex items-center justify-center gap-2 transition-all ${
                isDark
                  ? 'border-zinc-800 hover:bg-zinc-800/80 text-zinc-300'
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download Direct APK (.apk)</span>
              <Download className="w-3.5 h-3.5 opacity-60 ml-auto" />
            </a>
          )}

          {/* Hint: manual update */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`w-full flex items-center justify-center gap-1.5 text-[11px] pt-1 transition-colors ${
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Settings className="w-3 h-3" />
              <span>You can also update manually from Settings → App Version</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
