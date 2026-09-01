import React from 'react';
import { PixelIcon } from './PixelIcon';
import { Post } from '../types';

interface LiveToastProps {
  post: Post;
  threadTitle?: string;
  onClick: () => void;
  onDismiss: () => void;
}

export const LiveToast: React.FC<LiveToastProps> = ({ post, threadTitle, onClick, onDismiss }) => {
  return (
    <div
      onClick={onClick}
      className="pixel-box p-2.5 bg-[var(--bg-card)] border-2 border-[var(--accent-pink)] shadow-xl cursor-pointer hover:scale-[1.02] transition-transform max-w-sm w-full flex items-start gap-2.5 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="w-7 h-7 bg-[var(--accent-pink-soft)] flex items-center justify-center shrink-0 border border-[var(--border-color)]">
        <PixelIcon name="sparkles" size={14} className="text-[var(--accent-pink)]" />
      </div>

      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--accent-pink)] font-mono text-[10px]">
            ★ NEW POST IN /{post.boardId}/
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-[var(--text-muted)] hover:text-rose-500 p-0.5"
          >
            ✕
          </button>
        </div>

        <div className="font-bold text-[var(--text-primary)] truncate mt-0.5">
          {post.author}: {threadTitle || post.subject || 'New Reply'}
        </div>

        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 opacity-90 mt-0.5">
          {post.content}
        </p>
      </div>
    </div>
  );
};
