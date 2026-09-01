import React from 'react';
import { Board, AppSettings } from '../types';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';

interface NavbarProps {
  boards: Board[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  viewMode: 'thread-list' | 'catalog' | 'studio' | 'admin';
  onSetViewMode: (mode: 'thread-list' | 'catalog' | 'studio' | 'admin') => void;
  onOpenNewPostModal: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onManualRefresh: () => void;
  liveNewCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  viewMode,
  onSetViewMode,
  onOpenNewPostModal,
  onOpenAdmin,
  isAdminAuthenticated,
  settings,
  onUpdateSettings,
  onManualRefresh,
  liveNewCount,
}) => {
  const toggleSound = () => {
    const next = !settings.soundEnabled;
    sound.setEnabled(next);
    onUpdateSettings({ soundEnabled: next });
    if (next) sound.playPostSuccess();
  };

  const toggleTheme = () => {
    sound.playThemeSwitch();
    onUpdateSettings({
      themeMode: settings.themeMode === 'light' ? 'dark' : 'light',
    });
  };

  return (
    <header id="yumechan-navbar" className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b-4 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] select-none">
      {/* Top Board Slugs Bar (Authentic Imageboard header) */}
      <div className="w-full bg-[var(--window-header)] border-b-2 border-[var(--border-color)] px-3 py-1 text-xs overflow-x-auto whitespace-nowrap flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 font-bold text-[var(--window-header-text)]">
          <span className="opacity-70 mr-1 uppercase text-[11px] tracking-wider">BOARDS_LIST:</span>
          {boards.map((b) => {
            const isActive = b.id === activeBoardId;
            return (
              <button
                key={b.id}
                id={`board-link-${b.id}`}
                onClick={() => {
                  sound.playBoardSwitch();
                  onSelectBoard(b.id);
                }}
                className={`px-2 py-0.5 transition-all text-xs flex items-center gap-1 border-2 ${
                  isActive
                    ? 'bg-[var(--sidebar-active)] text-white border-[var(--border-strong)] font-bold shadow-[2px_2px_0px_var(--border-strong)]'
                    : 'hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border-transparent hover:border-[var(--border-color)]'
                }`}
              >
                <span className="font-mono font-bold">/{b.slug}/</span>
                <span className="hidden sm:inline opacity-90 text-[10px]">{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time Indicator & Actions */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] shrink-0">
          {/* Admin Button on uppermost header beside at left side of refresh button */}
          <button
            id="header-admin-btn"
            onClick={() => {
              sound.playClick();
              onOpenAdmin();
            }}
            className={`px-2 py-0.5 border font-mono text-[10px] flex items-center gap-1 transition-all ${
              viewMode === 'admin'
                ? 'bg-rose-600 text-white border-rose-700 font-bold shadow-[1px_1px_0px_var(--border-strong)]'
                : isAdminAuthenticated
                ? 'bg-rose-500/10 text-rose-600 border-rose-400/60 hover:bg-rose-500/20 font-bold'
                : 'border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-400'
            }`}
            title="Open Administrator Moderation Portal"
          >
            <PixelIcon name="lock" size={11} className={isAdminAuthenticated || viewMode === 'admin' ? 'text-rose-500' : ''} />
            <span className="font-bold">{viewMode === 'admin' ? 'EXIT ADMIN' : 'ADMIN'}</span>
          </button>

          <button
            id="manual-refresh-btn"
            onClick={() => {
              sound.playClick();
              onManualRefresh();
            }}
            className="hover:text-[var(--accent-pink)] px-2 py-0.5 border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] flex items-center gap-1 font-mono text-[10px]"
            title="Refresh threads"
          >
            <PixelIcon name="refresh" size={11} />
            <span className="hidden md:inline">REFRESH</span>
            {liveNewCount > 0 && (
              <span className="bg-[var(--border-strong)] text-white text-[9px] px-1 py-0 font-bold animate-bounce">
                +{liveNewCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            id="logo-brand"
            onClick={() => {
              sound.playBoardSwitch();
              onSetViewMode('thread-list');
            }}
            className="cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-8 h-8 bg-[var(--accent-pink)] border-2 border-[var(--border-strong)] flex items-center justify-center text-xs text-white shadow-[2px_2px_0px_var(--border-strong)] group-hover:rotate-6 transition-transform">
              <div className="w-4 h-4 bg-white opacity-90 rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-wide uppercase text-[var(--text-primary)]">
                  HaniBerry Dream Board
                </h1>
                <span className="bg-[var(--accent-pink)] text-white px-2 py-0.5 text-[10px] font-mono font-bold border border-[var(--border-strong)]">
                  /{activeBoardId}/
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:block">
                You can rest here, stay as much as you want
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Post Button */}
          <button
            id="nav-new-post-btn"
            onClick={() => {
              sound.playClick();
              onOpenNewPostModal();
            }}
            className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white px-3 py-1 text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border-strong)]"
          >
            <PixelIcon name="new-post" size={13} />
            <span>+ NEW THREAD</span>
          </button>

          {/* Pixel Art Studio Button */}
          <button
            id="nav-pixel-studio-btn"
            onClick={() => {
              sound.playClick();
              onSetViewMode(viewMode === 'studio' ? 'thread-list' : 'studio');
            }}
            className={`pixel-btn px-2.5 py-1 text-xs flex items-center gap-1 shadow-[2px_2px_0px_var(--border-strong)] ${
              viewMode === 'studio'
                ? 'bg-[var(--accent-pink)] text-white font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
            }`}
            title="Open 16-bit Pixel Art Canvas"
          >
            <PixelIcon name="palette" size={13} />
            <span className="font-mono">STUDIO</span>
          </button>

          {/* Catalog View Toggle */}
          <button
            id="nav-catalog-btn"
            onClick={() => {
              sound.playClick();
              onSetViewMode(viewMode === 'catalog' ? 'thread-list' : 'catalog');
            }}
            className={`pixel-btn px-2.5 py-1 text-xs flex items-center gap-1 shadow-[2px_2px_0px_var(--border-strong)] ${
              viewMode === 'catalog'
                ? 'bg-[var(--accent-pink)] text-white font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
            }`}
            title="Toggle Catalog Grid View"
          >
            <PixelIcon name="catalog" size={13} />
            <span className="font-mono">{viewMode === 'catalog' ? 'LIST' : 'CATALOG'}</span>
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            id="toggle-theme-mode-btn"
            onClick={toggleTheme}
            className={`pixel-btn px-2.5 py-1 text-xs font-mono shadow-[2px_2px_0px_var(--border-strong)] ${
              settings.themeMode === 'dark'
                ? 'bg-[var(--border-strong)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {settings.themeMode === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </button>

          {/* Audio Chiptune Toggle */}
          <button
            id="toggle-audio-sfx-btn"
            onClick={toggleSound}
            className={`pixel-btn px-2 py-1 text-xs font-mono shadow-[2px_2px_0px_var(--border-strong)] ${
              settings.soundEnabled ? 'text-[var(--accent-pink)] font-bold' : 'text-[var(--text-muted)] opacity-60'
            }`}
            title="Toggle Chiptune Audio"
          >
            {settings.soundEnabled ? 'SFX: ON' : 'SFX: OFF'}
          </button>
        </div>
      </div>
    </header>
  );
};
