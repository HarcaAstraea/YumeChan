import React from 'react';
import { motion } from 'motion/react';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  postNumber: string;
  postTitle: string;
  author?: string;
  boardSlug?: string;
  isPermanent?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  postNumber,
  postTitle,
  author,
  boardSlug,
  isPermanent = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    sound.playDelete();
    onConfirm();
  };

  const handleCancel = () => {
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[var(--bg-card)] border-4 border-rose-600 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Modal Window Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-3 py-2 border-b-2 border-rose-900 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <PixelIcon name="trash" size={14} className="text-white animate-pulse" />
            <span className="tracking-wider">
              {isPermanent ? 'ADMIN // PERMANENT DELETION' : 'ADMIN // MOVE TO RECYCLE BIN'}
            </span>
          </div>
          <button
            onClick={handleCancel}
            className="hover:bg-rose-800 px-1.5 py-0.5 border border-white/40 text-[10px]"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs text-[var(--text-primary)]">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-rose-100 dark:bg-rose-950 border-2 border-rose-500 rounded-none mb-1">
              <PixelIcon name="trash" size={20} className="text-rose-600" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {isPermanent ? 'Permanently Delete This Post?' : 'Delete This Post to Recycle Bin?'}
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {isPermanent
                ? 'WARNING: This action cannot be undone. The post will be completely erased.'
                : 'The post will be removed from public boards and placed in the Admin Recycle Bin.'}
            </p>
          </div>

          {/* Targeted Post Details Box */}
          <div className="bg-[var(--bg-surface-alt)] border-2 border-[var(--border-color)] p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">POST NUMBER:</span>
              <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-xs shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
                {postNumber}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">POST TITLE / SUBJECT:</span>
              <div className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] font-bold text-xs text-[var(--text-primary)] break-words">
                {postTitle || '(No Subject)'}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] pt-1">
              {boardSlug && <span>Board: <span className="font-bold font-mono">/{boardSlug}/</span></span>}
              {author && <span>Author: <span className="font-bold text-[var(--accent-pink)]">{author}</span></span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              onClick={handleCancel}
              className="pixel-btn px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirm}
              className={`pixel-btn px-4 py-1.5 text-xs font-bold text-white border-2 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] ${
                isPermanent
                  ? 'bg-rose-700 hover:bg-rose-800 border-rose-950'
                  : 'bg-rose-600 hover:bg-rose-700 border-rose-900'
              }`}
            >
              {isPermanent ? 'PERMANENTLY ERASE' : 'CONFIRM DELETE'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
