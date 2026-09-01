import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';
import { verifyAdminPassword, setAdminAuthenticated } from '../utils/storage';

interface AdminLoginModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter administrator passcode');
      return;
    }

    const isValid = await verifyAdminPassword(passcode);
    if (isValid) {
      sound.playPostSuccess();
      setAdminAuthenticated(true, passcode);
      setErrorMsg('');
      setPasscode('');
      onSuccess();
    } else {
      sound.playDelete();
      setErrorMsg('ACCESS DENIED: Invalid administrator passcode');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleClose = () => {
    sound.playClick();
    setPasscode('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-sm bg-[var(--bg-card)] border-4 border-[var(--border-strong)] shadow-[8px_8px_0px_rgba(0,0,0,0.8)] overflow-hidden ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Terminal Header */}
        <div className="bg-[var(--window-header)] text-[var(--window-header-text)] px-3 py-2 border-b-2 border-[var(--border-color)] flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <PixelIcon name="lock" size={13} className="text-[var(--accent-pink)]" />
            <span className="tracking-wider">ADMIN AUTHENTICATION // SYS_GATE</span>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-black/20 px-1.5 py-0.5 border border-[var(--border-color)] text-[10px]"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleLogin} className="p-4 sm:p-5 space-y-4 text-xs">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-[var(--bg-surface-alt)] border-2 border-[var(--border-strong)] mb-1 shadow-[2px_2px_0px_var(--border-strong)]">
              <PixelIcon name="lock" size={18} className="text-[var(--accent-pink)]" />
            </div>
            <h2 className="font-bold text-sm text-[var(--text-primary)]">
              ADMIN CONTROL PANEL
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Enter master passcode to access parallel moderation portal
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)]">
              ADMIN PASSCODE:
            </label>
            <input
              id="admin-passcode-input"
              name="adminPasscode"
              aria-label="Admin Passcode"
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter administrator passcode..."
              className="w-full p-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:border-[var(--accent-pink)] font-mono"
            />
            {errorMsg && (
              <div className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-1.5 border border-rose-500/30">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleClose}
              className="pixel-btn px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="pixel-btn px-4 py-1.5 text-xs font-bold bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]"
            >
              UNLOCK ACCESS
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
