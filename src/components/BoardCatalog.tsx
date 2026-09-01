import React, { useState } from 'react';
import { Thread, Board } from '../types';
import { PixelIcon } from './PixelIcon';
import { formatTimeAgo } from '../utils/textParser';
import { sound } from '../utils/chiptune';

interface BoardCatalogProps {
  board: Board;
  threads: Thread[];
  onSelectThread: (threadId: string) => void;
  onOpenNewThread: () => void;
}

export const BoardCatalog: React.FC<BoardCatalogProps> = ({
  board,
  threads,
  onSelectThread,
  onOpenNewThread,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'bump' | 'replies' | 'newest'>('bump');

  const filteredThreads = threads.filter((th) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = th.title.toLowerCase().includes(q);
    const contentMatch = th.opPost.content.toLowerCase().includes(q);
    const authorMatch = th.opPost.author.toLowerCase().includes(q);
    return titleMatch || contentMatch || authorMatch;
  });

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (a.isSticky && !b.isSticky) return -1;
    if (!a.isSticky && b.isSticky) return 1;
    if (sortBy === 'bump') return b.lastBumpTime - a.lastBumpTime;
    if (sortBy === 'replies') return b.repliesCount - a.repliesCount;
    return b.createdAt - a.createdAt;
  });

  return (
    <div id="board-catalog-view" className="space-y-4">
      {/* Catalog Search & Controls Bar */}
      <div className="p-3 bg-[var(--bg-surface)] border-4 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <PixelIcon name="search" size={14} className="text-[var(--accent-pink)]" />
          <input
            id="catalog-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH_CATALOG..."
            className="pixel-input text-xs px-2.5 py-1.5 flex-1 bg-[var(--bg-card)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[var(--text-muted)] hover:text-rose-500 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">SORT:</span>
          {(['bump', 'replies', 'newest'] as const).map((s) => (
            <button
              key={s}
              id={`sort-${s}-btn`}
              onClick={() => {
                sound.playClick();
                setSortBy(s);
              }}
              className={`pixel-btn px-2.5 py-1 text-xs uppercase font-mono border-2 border-[var(--border-strong)] shadow-[1px_1px_0px_var(--border-strong)] ${
                sortBy === s ? 'bg-[var(--accent-pink)] text-[var(--accent-contrast-text)] font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              {s === 'bump' ? 'Bump' : s === 'replies' ? 'Replies' : 'Date'}
            </button>
          ))}

          <button
            id="catalog-new-thread-btn"
            onClick={() => {
              sound.playClick();
              onOpenNewThread();
            }}
            className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-[var(--accent-contrast-text)] px-3 py-1 font-bold flex items-center gap-1 shadow-[2px_2px_0px_var(--border-strong)] ml-2"
          >
            <PixelIcon name="new-post" size={12} />
            <span>+ NEW THREAD</span>
          </button>
        </div>
      </div>

      {/* Catalog Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
        {sortedThreads.map((th) => {
          const thumbnail = th.opPost.pixelArtData || th.opPost.imageUrl;
          return (
            <div
              key={th.id}
              id={`catalog-thread-${th.id}`}
              onClick={() => {
                sound.playClick();
                onSelectThread(th.id);
              }}
              className="bg-[var(--bg-card)] border-2 border-[var(--border-strong)] hover:border-[var(--accent-pink)] shadow-[3px_3px_0px_var(--border-color)] transition-all cursor-pointer flex flex-col p-2 group hover:-translate-y-0.5"
            >
              {/* Thumbnail Frame */}
              <div className="aspect-square w-full bg-[var(--bg-surface-alt)] flex items-center justify-center p-1 relative overflow-hidden border-2 border-[var(--border-color)] mb-1.5">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={th.title}
                    className="w-full h-full object-contain pixel-canvas-grid group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-[var(--text-muted)] text-[10px] text-center p-2 font-mono flex flex-col items-center gap-1">
                    <PixelIcon name="new-post" size={18} className="opacity-40" />
                    <span>Text Only</span>
                  </div>
                )}

                {/* Sticky / Lock Badges */}
                {th.isSticky && (
                  <span className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] px-1 font-bold font-mono">
                    PIN
                  </span>
                )}
              </div>

              {/* Counts: R: 12 / I: 3 */}
              <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center justify-between border-b border-[var(--border-color)] pb-1 mb-1">
                <span>R: <strong className="text-[var(--text-primary)]">{th.repliesCount}</strong> / I: <strong className="text-[var(--text-primary)]">{th.imagesCount}</strong></span>
                <span className="text-[9px] opacity-75">{formatTimeAgo(th.lastBumpTime)}</span>
              </div>

              {/* Title & Teaser */}
              <div className="flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[var(--link-color)]">
                  {th.title}
                </h4>
                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1 font-sans opacity-90 leading-tight">
                  {th.opPost.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sortedThreads.length === 0 && (
        <div className="pixel-box p-8 text-center bg-[var(--bg-card)] text-[var(--text-muted)] space-y-2">
          <PixelIcon name="search" size={24} className="mx-auto opacity-50" />
          <p className="font-bold text-sm">No threads found matching "{searchQuery}"</p>
          <p className="text-xs">Be the first to start a new discussion in /{board.slug}/!</p>
        </div>
      )}
    </div>
  );
};
