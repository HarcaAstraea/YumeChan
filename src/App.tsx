import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Board, Thread, Post, AppSettings, ImageMetadata, ContentType, ViewMode, DeletedPostRecord } from './types';
import { BOARDS } from './utils/initialData';
import {
  loadThreads,
  loadSettings,
  saveSettings,
  addThread,
  addReply,
  subscribeToLiveUpdates,
  syncWithCloudflareD1,
  getNextPostId,
  getNextReplyId,
  loadRecycleBin,
  deletePostToRecycleBin,
  restorePostFromRecycleBin,
  permanentlyDeleteFromRecycleBin,
  emptyRecycleBin,
  isAdminAuthenticated,
  setAdminAuthenticated,
} from './utils/storage';
import { postRemoteDelete } from './utils/api';
import { sound } from './utils/chiptune';
import { Navbar } from './components/Navbar';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { BoardCatalog } from './components/BoardCatalog';
import { PixelArtStudio } from './components/PixelArtStudio';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { NewPostModal } from './components/NewPostModal';
import { ImageModal } from './components/ImageModal';
import { LiveToast } from './components/LiveToast';
import { Footer } from './components/Footer';
import { PixelIcon } from './components/PixelIcon';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [recycleBin, setRecycleBin] = useState<DeletedPostRecord[]>(() => loadRecycleBin());
  const [activeBoardId, setActiveBoardId] = useState<string>('yume');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('thread-list');

  // Admin authentication state initialized from persistent storage
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => isAdminAuthenticated());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  // Initial loading state
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(15);
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing 16-bit retro BBS...');

  // Modal states
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState<boolean>(false);
  const [replyTargetThreadId, setReplyTargetThreadId] = useState<string | undefined>(undefined);
  const [replyTargetThreadTitle, setReplyTargetThreadTitle] = useState<string | undefined>(undefined);
  const [initialQuoteId, setInitialQuoteId] = useState<string | undefined>(undefined);
  const [pendingPixelArt, setPendingPixelArt] = useState<string | undefined>(undefined);

  // Synchronization concurrency lock to prevent overlapping requests and race conditions
  const syncInProgress = useRef<boolean>(false);

  const safeSync = useCallback(async (timeoutMs: number = 5000): Promise<Thread[] | null> => {
    if (syncInProgress.current) return null;
    syncInProgress.current = true;
    try {
      return await syncWithCloudflareD1(timeoutMs);
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  // Lightbox modal state
  const [expandedImage, setExpandedImage] = useState<{
    url: string;
    meta?: ImageMetadata;
    title?: string;
  } | null>(null);

  // Real-time live notifications state
  const [liveToast, setLiveToast] = useState<{ post: Post; threadTitle?: string } | null>(null);
  const [liveNewCount, setLiveNewCount] = useState<number>(0);

  // Sync settings to document attributes for CSS theme styling
  useEffect(() => {
    saveSettings(settings);
    sound.setEnabled(settings.soundEnabled);

    const root = document.documentElement;
    if (settings.themeMode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    if (settings.contrast === 'high-contrast') {
      root.setAttribute('data-contrast', 'high-contrast');
    } else {
      root.removeAttribute('data-contrast');
    }
  }, [settings]);

  // Periodic auto-refresh polling using concurrency-locked safeSync every 2 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      const remote = await safeSync(2000);
      if (remote) {
        setThreads(remote);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [safeSync]);

  // Initial startup: Load posts from storage and remote D1 with loading state
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      setLoadingProgress(25);
      setLoadingStatus('Mounting board directory & local cache...');

      // Small async tick for silky smooth visual progression
      await new Promise((r) => setTimeout(r, 60));
      if (!isMounted) return;

      setLoadingProgress(50);
      setLoadingStatus('Retrieving posts from 16-bit database...');

      // Load cached local threads first
      const localCached = loadThreads();

      // Attempt concurrency-safe sync with remote database with a 2.5s timeout
      try {
        const remote = await safeSync(2500);
        if (!isMounted) return;

        setLoadingProgress(85);
        setLoadingStatus('Formatting thread matrix & media...');

        if (remote && remote.length > 0) {
          setThreads(remote);
        } else if (localCached && localCached.length > 0) {
          setThreads(localCached);
        }
      } catch {
        if (localCached && localCached.length > 0) {
          setThreads(localCached);
        }
      }

      if (!isMounted) return;
      setLoadingProgress(100);
      setLoadingStatus('System Ready! Entering BBS...');

      // Smooth transition to uncover the fully prepared interface
      setTimeout(() => {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }, 180);
    };

    initializeApp();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        safeSync(3000).then((remote) => {
          if (remote && isMounted) setThreads(remote);
        });
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const unsubscribe = subscribeToLiveUpdates((type, data) => {
      if (type === 'SYNC_THREADS' || type === 'RESET') {
        setThreads(loadThreads());
        setRecycleBin(loadRecycleBin());
      } else if (type === 'NEW_REPLY') {
        const payload = data as { threadId: string; reply: Post };
        setThreads(loadThreads());
        if (payload.reply.author !== 'Anonymous' || Math.random() > 0.3) {
          const targetTh = loadThreads().find((t) => t.id === payload.threadId);
          setLiveToast({ post: payload.reply, threadTitle: targetTh?.title });
          setLiveNewCount((prev) => prev + 1);
          sound.playNewPostAlert();
        }
      } else if (type === 'NEW_THREAD') {
        setThreads(loadThreads());
        setLiveNewCount((prev) => prev + 1);
        sound.playNewPostAlert();
      } else if (type === 'DELETE_POST' || type === 'RESTORE_POST' || type === 'RECYCLE_BIN_UPDATE' || type === 'EMPTY_RECYCLE_BIN' || type === 'PURGE_POST') {
        setThreads(loadThreads());
        setRecycleBin(loadRecycleBin());
      } else if (type === 'ADMIN_AUTH_CHANGE') {
        const payload = data as { authenticated: boolean };
        setIsAdminLoggedIn(payload.authenticated);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [safeSync]);

  const activeBoard = useMemo(() => {
    return BOARDS.find((b) => b.id === activeBoardId) || BOARDS[0];
  }, [activeBoardId]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find((t) => t.id === activeThreadId) || null;
  }, [activeThreadId, threads]);

  const totalPostsCount = useMemo(() => {
    return threads.reduce((acc, t) => acc + 1 + t.replies.length, 0);
  }, [threads]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleSelectBoard = (boardId: string) => {
    setActiveBoardId(boardId);
    setActiveThreadId(null);
    if (viewMode === 'studio' || viewMode === 'admin') {
      if (viewMode === 'admin') {
        setAdminAuthenticated(false);
        setIsAdminLoggedIn(false);
      }
      setViewMode('thread-list');
    }
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBoard = () => {
    setActiveThreadId(null);
  };

  const handleManualRefresh = async () => {
    const remote = await safeSync(5000);
    if (remote) {
      setThreads(remote);
    } else {
      setThreads(loadThreads());
    }
    setLiveNewCount(0);
    sound.playPostSuccess();
  };

  const handleOpenNewThreadModal = () => {
    setReplyTargetThreadId(undefined);
    setReplyTargetThreadTitle(undefined);
    setInitialQuoteId(undefined);
    setIsNewPostModalOpen(true);
  };

  const handleOpenReplyModal = (threadId: string, quotePostId?: string) => {
    const th = threads.find((t) => t.id === threadId);
    setReplyTargetThreadId(threadId);
    setReplyTargetThreadTitle(th?.title);
    setInitialQuoteId(quotePostId);
    setIsNewPostModalOpen(true);
  };

  const handleSubmitPost = async (data: {
    boardId: string;
    threadId?: string;
    title?: string;
    author: string;
    tripcode?: string;
    subject?: string;
    content: string;
    contentType: ContentType;
    poetryFormat?: string;
    poetryAuthorNote?: string;
    imageUrl?: string;
    imageMeta?: ImageMetadata;
    pixelArtData?: string;
    sage?: boolean;
    replyToPostId?: string;
  }) => {
    try {
      if (data.threadId) {
        // Validate target thread existence and synchronize board ID
        const targetThread = threads.find((t) => t.id === data.threadId);
        if (!targetThread) {
          throw new Error(`Target thread #${data.threadId} not found`);
        }

        const effectiveBoardId = targetThread.boardId || data.boardId;
        const nextId = getNextReplyId(threads);

        const newPost: Post = {
          id: nextId,
          threadId: data.threadId,
          boardId: effectiveBoardId,
          author: data.author || 'Anonymous',
          tripcode: data.tripcode,
          subject: data.subject,
          content: data.content,
          contentType: data.contentType,
          poetryFormat: data.poetryFormat,
          poetryAuthorNote: data.poetryAuthorNote,
          imageUrl: data.imageUrl,
          imageMeta: data.imageMeta,
          pixelArtData: data.pixelArtData,
          sage: data.sage,
          replyToPostId: data.replyToPostId,
          createdAt: Date.now(),
        };

        const { threads: updatedThreads } = await addReply(data.threadId, newPost);
        setThreads(updatedThreads);
        setActiveBoardId(effectiveBoardId);
        setActiveThreadId(data.threadId);
      } else {
        // Creating a new thread: generate unique sequential post ID
        const nextId = getNextPostId(threads);
        const threadId = nextId;
        const opPostId = nextId;

        const newOpPost: Post = {
          id: opPostId,
          threadId,
          boardId: data.boardId,
          author: data.author || 'Anonymous',
          tripcode: data.tripcode,
          subject: data.subject,
          content: data.content,
          contentType: data.contentType,
          poetryFormat: data.poetryFormat,
          poetryAuthorNote: data.poetryAuthorNote,
          imageUrl: data.imageUrl,
          imageMeta: data.imageMeta,
          pixelArtData: data.pixelArtData,
          createdAt: Date.now(),
          isOp: true,
        };

        const newThread: Thread = {
          id: threadId,
          boardId: data.boardId,
          title: data.title || data.subject || data.content.slice(0, 40) || 'Untitled Thread',
          opPost: newOpPost,
          replies: [],
          repliesCount: 0,
          imagesCount: data.imageUrl || data.pixelArtData ? 1 : 0,
          createdAt: Date.now(),
          lastBumpTime: Date.now(),
        };

        const updated = await addThread(newThread);
        setThreads(updated);
        setActiveBoardId(data.boardId);
        setActiveThreadId(threadId);
      }

      // Close composer and clean up pending export on success
      setIsNewPostModalOpen(false);
      setPendingPixelArt(undefined);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit post:', err);
      throw err;
    }
  };

  /* Admin Moderation Handlers */
  const handleOpenAdminPortal = () => {
    if (viewMode === 'admin') {
      sound.playBoardSwitch();
      setAdminAuthenticated(false);
      setIsAdminLoggedIn(false);
      setViewMode('thread-list');
      return;
    }
    // Always require administrator passcode whenever entering the admin panel
    sound.playClick();
    setIsAdminLoginModalOpen(true);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsAdminLoginModalOpen(false);
    setViewMode('admin');
    setActiveThreadId(null);
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setIsAdminLoggedIn(false);
    setViewMode('thread-list');
  };

  const handleAdminExit = () => {
    setAdminAuthenticated(false);
    setIsAdminLoggedIn(false);
    setViewMode('thread-list');
  };

  const handleAdminDeletePost = async (postId: string) => {
    const { threads: updatedThreads } = await deletePostToRecycleBin(postId);
    setThreads(updatedThreads);
    setRecycleBin(loadRecycleBin());
    if (activeThreadId === postId) {
      setActiveThreadId(null);
    }
  };

  const handleAdminRestorePost = async (recordId: string) => {
    const { threads: updatedThreads } = await restorePostFromRecycleBin(recordId);
    setThreads(updatedThreads);
    setRecycleBin(loadRecycleBin());
  };

  const handleAdminPermanentDeletePost = async (recordId: string) => {
    const { threads: updatedThreads, recycleBin: updatedBin } = await permanentlyDeleteFromRecycleBin(recordId);
    setThreads(updatedThreads);
    setRecycleBin(updatedBin);
  };

  const handleAdminEmptyRecycleBin = async () => {
    const updatedThreads = await emptyRecycleBin();
    setThreads(updatedThreads);
    setRecycleBin([]);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-pink-300 selection:text-pink-900 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        boards={BOARDS}
        activeBoardId={activeBoardId}
        onSelectBoard={handleSelectBoard}
        viewMode={viewMode}
        onSetViewMode={(mode) => {
          if (viewMode === 'admin' && mode !== 'admin') {
            setAdminAuthenticated(false);
            setIsAdminLoggedIn(false);
          }
          setViewMode(mode);
          setActiveThreadId(null);
        }}
        onOpenNewPostModal={handleOpenNewThreadModal}
        onOpenAdmin={handleOpenAdminPortal}
        isAdminAuthenticated={isAdminLoggedIn}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onManualRefresh={handleManualRefresh}
        liveNewCount={liveNewCount}
      />

      {/* Main Workspace Frame or Parallel Admin Portal */}
      {viewMode === 'admin' ? (
        isAdminAuthenticated() ? (
          <AdminPortal
            boards={BOARDS}
            threads={threads}
            recycleBin={recycleBin}
            onDeletePost={handleAdminDeletePost}
            onRestorePost={handleAdminRestorePost}
            onPermanentDeletePost={handleAdminPermanentDeletePost}
            onEmptyRecycleBin={handleAdminEmptyRecycleBin}
            onExitAdmin={handleAdminExit}
            onLogout={handleAdminLogout}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono select-none">
            <div className="bg-[var(--bg-card)] border-4 border-rose-500 p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] max-w-md w-full">
              <PixelIcon name="lock" size={36} className="text-rose-500 mx-auto mb-3" />
              <h2 className="text-rose-500 font-bold text-base mb-2 uppercase tracking-wide">ACCESS DENIED</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                Valid administrator authentication is required to access the moderation panel.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setIsAdminLoginModalOpen(true)}
                  className="pixel-btn px-3 py-1.5 bg-[var(--accent-pink)] text-white font-bold text-xs"
                >
                  ENTER PASSCODE
                </button>
                <button
                  onClick={handleAdminExit}
                  className="pixel-btn px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs border border-[var(--border-color)]"
                >
                  RETURN TO BOARDS
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Immersive Side Navigation Drawer */}
          <aside className="w-56 lg:w-64 border-r-4 border-[var(--border-color)] bg-[var(--bg-page)] hidden md:flex flex-col shrink-0 select-none">
            <div className="p-3 text-xs font-bold bg-[var(--window-header)] text-[var(--window-header-text)] border-b-2 border-[var(--border-color)] uppercase flex items-center justify-between font-mono">
              <span className="font-bold tracking-wider">BOARDS_LIST</span>
              <span className="text-[10px] opacity-75">[DIR]</span>
            </div>

            <nav className="flex-1 p-2 space-y-1.5 overflow-y-auto">
              {BOARDS.map((b) => {
                const isActive = b.id === activeBoardId && viewMode !== 'studio';
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      sound.playBoardSwitch();
                      handleSelectBoard(b.id);
                    }}
                    className={`w-full text-left p-2 text-xs border-2 transition-all flex flex-col gap-0.5 font-mono ${
                      isActive
                        ? 'bg-[var(--sidebar-active)] text-[var(--accent-contrast-text)] border-[var(--border-color)] font-bold shadow-[2px_2px_0px_var(--border-strong)]'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold gap-1.5">
                      <span className="font-mono truncate">/{b.slug}/ - {b.name}</span>
                      <span className={`text-[9px] py-0.5 rounded-none font-bold border shrink-0 text-center ${
                        b.id === 'yume' ? 'px-2.5 tracking-[0.18em] min-w-[56px]' : 'px-1.5 tracking-wider'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-rose-50 to-pink-200 text-[var(--badge-jp-text)] border-[var(--border-strong)]'
                          : 'bg-gradient-to-r from-rose-50 to-pink-200 text-[var(--badge-jp-text)] border-[var(--badge-jp-border)] shadow-[1px_1px_0px_var(--border-color)]'
                      }`}>
                        {b.jpName}
                      </span>
                    </div>
                    <p className={`text-[10px] line-clamp-1 ${isActive ? 'opacity-90 font-medium' : 'text-[var(--text-secondary)]'}`}>
                      {b.description}
                    </p>
                  </button>
                );
              })}

              <div className="pt-2 border-t-2 border-[var(--border-color)] space-y-1.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setViewMode(viewMode === 'studio' ? 'thread-list' : 'studio');
                    setActiveThreadId(null);
                  }}
                  className={`w-full text-left p-2 text-xs border-2 border-[var(--border-strong)] transition-all flex items-center gap-2 font-mono ${
                    viewMode === 'studio'
                      ? 'bg-[var(--sidebar-active)] text-[var(--accent-contrast-text)] font-bold shadow-[2px_2px_0px_var(--border-strong)]'
                      : 'bg-[var(--bg-card)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--border-strong)]'
                  }`}
                >
                  <PixelIcon name="palette" size={14} />
                  <span className="font-bold">Pixel Art Studio</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setViewMode(viewMode === 'catalog' ? 'thread-list' : 'catalog');
                    setActiveThreadId(null);
                  }}
                  className={`w-full text-left p-2 text-xs border-2 border-[var(--border-strong)] transition-all flex items-center gap-2 font-mono ${
                    viewMode === 'catalog'
                      ? 'bg-[var(--sidebar-active)] text-[var(--accent-contrast-text)] font-bold shadow-[2px_2px_0px_var(--border-strong)]'
                      : 'bg-[var(--bg-card)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] shadow-[1px_1px_0px_var(--border-strong)]'
                  }`}
                >
                  <PixelIcon name="catalog" size={14} />
                  <span className="font-bold">Catalog Grid</span>
                </button>
              </div>
            </nav>

            {/* System Diagnostics Box */}
            <div className="p-3 bg-[var(--bg-surface)] border-t-4 border-[var(--border-color)] text-[10px] leading-relaxed font-mono select-none">
              <div className="text-[var(--accent-pink)] font-bold mb-0.5">SYSTEM: OK (ONLINE)</div>
              <div>POSTS_TOTAL: {totalPostsCount}</div>
              <div>THREADS: {threads.length}</div>
            </div>
          </aside>

          {/* Main Content Workspace with Immersive Checkerboard Background */}
          <main className="flex-1 flex flex-col p-3 sm:p-5 immersive-checkerboard overflow-y-auto">
            <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
              <AnimatePresence mode="wait">
                {viewMode === 'studio' ? (
                  /* Standalone Pixel Art Studio */
                  <motion.div
                    key="view-studio"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PixelArtStudio
                      onClose={() => setViewMode('thread-list')}
                      onExportToPost={(dataUrl) => {
                        setPendingPixelArt(dataUrl);
                        setViewMode('thread-list');
                        handleOpenNewThreadModal();
                      }}
                    />
                  </motion.div>
                ) : activeThread ? (
                  /* Single Thread Discussion View */
                  <motion.div
                    key={`view-thread-${activeThread.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ThreadView
                      thread={activeThread}
                      board={activeBoard}
                      onBackToBoard={handleBackToBoard}
                      onOpenReplyModal={(quoteId) => handleOpenReplyModal(activeThread.id, quoteId)}
                      onExpandImage={(url, meta, title) => setExpandedImage({ url, meta, title })}
                      onManualRefresh={handleManualRefresh}
                      isAdmin={isAdminLoggedIn}
                      onDeletePost={handleAdminDeletePost}
                    />
                  </motion.div>
                ) : viewMode === 'catalog' ? (
                  /* Board Catalog Grid View */
                  <motion.div
                    key={`view-catalog-${activeBoard.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <BoardCatalog
                      board={activeBoard}
                      threads={threads.filter((t) => t.boardId === activeBoard.id)}
                      onSelectThread={handleSelectThread}
                      onOpenNewThread={handleOpenNewThreadModal}
                    />
                  </motion.div>
                ) : (
                  /* Board Thread List View (Default) */
                  <motion.div
                    key={`view-board-${activeBoard.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ThreadList
                      board={activeBoard}
                      threads={threads}
                      onSelectThread={handleSelectThread}
                      onOpenNewThread={handleOpenNewThreadModal}
                      onOpenReplyModal={handleOpenReplyModal}
                      onExpandImage={(url, meta, title) => setExpandedImage({ url, meta, title })}
                      isAdmin={isAdminLoggedIn}
                      onDeletePost={handleAdminDeletePost}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* Floating Quick Action Button on Mobile */}
      <div className="fixed bottom-4 right-4 z-30 sm:hidden flex flex-col gap-2">
        <button
          id="mobile-new-thread-fab"
          onClick={() => {
            sound.playClick();
            if (activeThread) {
              handleOpenReplyModal(activeThread.id);
            } else {
              handleOpenNewThreadModal();
            }
          }}
          className="pixel-btn w-12 h-12 bg-[var(--accent-pink)] text-white hover:bg-[var(--accent-cherry)] rounded-full flex items-center justify-center shadow-lg active:scale-95"
          title="New Post"
        >
          <PixelIcon name="new-post" size={20} />
        </button>
      </div>

      {/* Live Notification Toast (Bottom Left) */}
      <div className="fixed bottom-4 left-4 z-40 max-w-sm">
        {liveToast && (
          <LiveToast
            post={liveToast.post}
            threadTitle={liveToast.threadTitle}
            onClick={() => {
              handleSelectThread(liveToast.post.threadId);
              setLiveToast(null);
            }}
            onDismiss={() => setLiveToast(null)}
          />
        )}
      </div>

      {/* Modals */}
      {isAdminLoginModalOpen && (
        <AdminLoginModal
          onClose={() => setIsAdminLoginModalOpen(false)}
          onSuccess={handleAdminLoginSuccess}
        />
      )}

      {isNewPostModalOpen && (
        <NewPostModal
          boards={BOARDS}
          activeBoardId={activeBoardId}
          targetThreadId={replyTargetThreadId}
          targetThreadTitle={replyTargetThreadTitle}
          initialQuotePostId={initialQuoteId}
          initialPixelArtData={pendingPixelArt}
          onClose={() => {
            setIsNewPostModalOpen(false);
            setPendingPixelArt(undefined);
          }}
          onSubmitPost={handleSubmitPost}
        />
      )}

      {expandedImage && (
        <ImageModal
          imageUrl={expandedImage.url}
          metadata={expandedImage.meta}
          title={expandedImage.title}
          onClose={() => setExpandedImage(null)}
        />
      )}

      {/* Initial 16-bit Boot Loading Screen */}
      <AnimatePresence>
        {isInitialLoading && (
          <LoadingScreen
            progress={loadingProgress}
            statusText={loadingStatus}
            totalPostsLoaded={totalPostsCount}
          />
        )}
      </AnimatePresence>

      {/* Global Footer */}
      <Footer
        totalThreads={threads.length}
        totalPosts={totalPostsCount}
        onOpenStudio={() => {
          setViewMode('studio');
          setActiveThreadId(null);
        }}
      />
    </div>
  );
}
