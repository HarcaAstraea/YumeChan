import React from 'react';
import { sound } from '../utils/chiptune';

interface FooterProps {
  totalThreads: number;
  totalPosts: number;
  onOpenStudio: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  totalThreads,
  totalPosts,
  onOpenStudio,
}) => {
  return (
    <footer
      id="yumechan-footer"
      className="h-9 bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center px-4 sm:px-6 text-[10px] justify-between uppercase tracking-wider border-t-4 border-[var(--border-color)] select-none shrink-0 font-mono z-30 shadow-[0_-2px_0px_var(--border-color)]"
    >
      <div className="flex items-center gap-2 font-bold">
        <span className="text-[var(--text-primary)]">Station ID: <span className="text-[var(--accent-pink)]">0xFF02</span> (Online)</span>
        <span className="hidden md:inline text-[var(--text-secondary)] text-[9px]">| POSTS: {totalPosts} | THREADS: {totalThreads}</span>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold">
        <button
          onClick={() => {
            sound.playClick();
            onOpenStudio();
          }}
          className="px-2 py-0.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--accent-pink)] hover:text-white transition-all cursor-pointer shadow-[1px_1px_0px_var(--border-color)]"
        >
          Studio
        </button>
        <button
          onClick={() => {
            sound.playClick();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-2 py-0.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--accent-pink)] hover:text-white transition-all cursor-pointer shadow-[1px_1px_0px_var(--border-color)]"
        >
          Top ↑
        </button>
      </div>

      <div className="flex gap-2 items-center text-[10px] font-bold text-[var(--text-secondary)]">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-pink)] animate-pulse shadow-[0_0_4px_var(--accent-pink)]" />
        <span className="hidden sm:inline">Stream Online</span>
      </div>
    </footer>
  );
};

