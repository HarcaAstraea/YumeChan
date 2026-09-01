import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PixelIcon } from './PixelIcon';

interface LoadingScreenProps {
  progress: number;
  statusText: string;
  totalPostsLoaded?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  statusText,
  totalPostsLoaded,
}) => {
  const logs = useMemo(() => {
    const list: string[] = ['LOADING...'];
    if (progress >= 25) {
      list.push('MOUNTING BOARDS [/yume/ /uta/ /mimi/]... [OK]');
    }
    if (progress >= 50 && progress < 90) {
      list.push('RETRIEVING THREADS & POST ARCHIVE...');
    } else if (progress >= 90) {
      list.push(
        `RETRIEVING THREADS & POST ARCHIVE... [OK${
          totalPostsLoaded ? ` ${totalPostsLoaded} POSTS` : ''
        }]`
      );
    }
    if (progress >= 95) {
      list.push('SYSTEM READY, ENTERING THE BOARDS...');
    }
    return list;
  }, [progress, totalPostsLoaded]);

  // Generate 20-block pixel progress bar (e.g. ■■■■■□□□□□)
  const totalBlocks = 20;
  const filledBlocks = Math.min(totalBlocks, Math.floor((progress / 100) * totalBlocks));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.22, ease: 'easeInOut' } }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)] select-none font-mono"
    >
      {/* Retro Backdrop CRT / Scanline Effect */}
      <div className="absolute inset-0 bg-radial from-transparent to-black/20 pointer-events-none" />

      {/* Main 16-bit Boot Card */}
      <div className="w-full max-w-md bg-[var(--bg-card)] border-4 border-[var(--border-strong)] shadow-[8px_8px_0px_var(--border-color)] relative overflow-hidden">
        {/* Title Bar */}
        <div className="p-2.5 bg-[var(--window-header)] text-[var(--window-header-text)] border-b-4 border-[var(--border-color)] flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-2">
            <span className="animate-spin text-[var(--accent-pink)]">
              <PixelIcon name="sparkles" size={14} />
            </span>
            <span className="tracking-wider">YUMECHAN_BBS // SYS_BOOT</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="px-1 py-0.2 bg-[var(--border-color)]/30 border border-[var(--border-color)] font-bold">
              16-BIT
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Logo / Mascot Greeting */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center p-2.5 bg-gradient-to-r from-rose-50 to-pink-100 border-2 border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)] mb-1">
              <span className="text-xs font-bold text-[var(--badge-jp-text)] px-1">
                ハニベリ ⋆｡°✩ Threads
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-wide">
              RETRIEVING DISCUSSIONS
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {statusText || 'Syncing fresh posts and pixel artworks...'}
            </p>
          </div>

          {/* 16-bit Progress Bar */}
          <div className="space-y-1.5 bg-[var(--bg-surface-alt)] p-3 border-2 border-[var(--border-color)]">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-[var(--accent-pink)]">LOADING_POSTS</span>
              <span className="text-[var(--text-primary)]">{Math.round(progress)}%</span>
            </div>

            {/* Custom Pixel Block Progress Bar */}
            <div className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] p-0.5 flex gap-0.5 h-6">
              {Array.from({ length: totalBlocks }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full transition-colors duration-75 ${
                    i < filledBlocks
                      ? 'bg-gradient-to-t from-[var(--accent-pink)] to-[var(--accent-cherry)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                      : 'bg-transparent opacity-10'
                  }`}
                />
              ))}
            </div>

            {/* ASCII block visual string */}
            <div className="text-[9px] text-[var(--text-muted)] text-center tracking-widest overflow-hidden whitespace-nowrap">
              {'■'.repeat(filledBlocks)}{'□'.repeat(totalBlocks - filledBlocks)}
            </div>
          </div>

          {/* Terminal / Boot Logs */}
          <div className="p-2.5 bg-[var(--bg-page)] border-2 border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-mono space-y-1 h-24 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-1.5 ${
                  idx === logs.length - 1 ? 'text-[var(--accent-pink)] font-bold' : ''
                }`}
              >
                <span>&gt;</span>
                <span className="truncate">{log}</span>
              </div>
            ))}
          </div>

          {/* Bottom Footer Status */}
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border-color)]/50 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--greentext)] animate-pulse" />
              <span>D1_REALTIME_SYNC</span>
            </span>
            <span className="font-bold text-[var(--text-secondary)]">PORT: 3000 // READY</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
