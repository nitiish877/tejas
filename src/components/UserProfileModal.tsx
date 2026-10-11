import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, X, Check, Mail, ShieldCheck, LogOut, LogIn } from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateName: (newName: string) => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  isDark: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateName,
  onLogout,
  onOpenAuth,
  isDark,
}) => {
  const [name, setName] = useState(user.name);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const isGuest = user.provider === 'guest' || !user.email || user.email === '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateName(name.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm flex justify-center items-start sm:items-center min-h-screen animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md my-auto max-h-[92vh] flex flex-col rounded-2xl border shadow-xl p-5 sm:p-6 relative overflow-y-auto ${
          isDark
            ? 'bg-[#16191c] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          id="close-profile-modal-btn"
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-xl">
            {user.name ? user.name[0].toUpperCase() : 'T'}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">User Profile</h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {isGuest ? 'Default Guest Profile' : 'Authenticated Account Details'}
            </p>
          </div>
        </div>

        {/* Profile Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Read-only details */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
              isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate pr-2">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="truncate">{user.email || 'No email attached (Guest)'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize shrink-0">
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              {user.provider}
            </div>
          </div>

          {/* Edit Name */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="user-display-name-input"
              className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-zinc-300' : 'text-zinc-600'
              }`}
            >
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                id="user-display-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                maxLength={40}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Sign Out or Switch to Real Account */}
          <div className="pt-2">
            {!isGuest ? (
              <button
                id="logout-btn"
                type="button"
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isDark
                    ? 'bg-red-950/20 hover:bg-red-950/40 border-red-500/30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out (Switch to Tejas Guest)</span>
              </button>
            ) : (
              onOpenAuth && (
                <button
                  id="connect-account-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 text-blue-400 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Log In with Google or Email</span>
                </button>
              )
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              id="cancel-profile-btn"
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              Cancel
            </button>
            <button
              id="save-profile-btn"
              type="submit"
              disabled={isSaved || !name.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 hover:bg-zinc-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Saved!
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
