import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thread, Post, Board, DeletedPostRecord } from '../types';
import { PixelIcon } from './PixelIcon';
import { formatPostNumber, format16BitTimestamp, formatTimeAgo, parseContentLines, getPostNumberInt, formatReplyNumber } from '../utils/textParser';
import { sound } from '../utils/chiptune';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { isAdminAuthenticated, downloadJsonBackup } from '../utils/storage';
import { fetchWithAdminAuth } from '../utils/api';

interface AdminPortalProps {
  boards: Board[];
  threads: Thread[];
  recycleBin: DeletedPostRecord[];
  onDeletePost: (postId: string) => void;
  onRestorePost: (recordId: string) => void;
  onPermanentDeletePost: (recordId: string) => void;
  onEmptyRecycleBin: () => void;
  onExitAdmin: () => void;
  onLogout: () => void;
}

interface FlattenedPost {
  postId: string;
  threadId: string;
  boardId: string;
  title: string;
  post: Post;
  isOp: boolean;
  repliesCount?: number;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  boards,
  threads,
  recycleBin,
  onDeletePost,
  onRestorePost,
  onPermanentDeletePost,
  onEmptyRecycleBin,
  onExitAdmin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'recycle-bin' | 'stats'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'op' | 'reply'>('all');
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [expandedThreadReplies, setExpandedThreadReplies] = useState<Record<string, boolean>>({});

  // Modal State for Delete Confirmation Prompt (HOOK MUST BE AT TOP LEVEL BEFORE ANY EARLY RETURN)
  const [deleteTarget, setDeleteTarget] = useState<{
    postId: string;
    postNumber: string;
    postTitle: string;
    author?: string;
    boardSlug?: string;
    isPermanent: boolean;
  } | null>(null);

  // Compute live threads (excluding deleted OPs)
  const liveThreads = useMemo(() => {
    return threads.filter((th) => !th.opPost.isDeleted);
  }, [threads]);

  // Helper to resolve RN reply numbers for active and deleted replies
  const getReplyNumber = (threadId: string, postId: string): string => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) {
      const opNum = getPostNumberInt(threadId);
      const postInt = getPostNumberInt(postId);
      const fallbackIndex = (postInt % 100) || 1;
      return `RN. ${opNum}.${fallbackIndex}`;
    }
    const repliesList = thread.replies || [];
    const index = repliesList.findIndex((r) => r.id === postId);
    if (index === -1) {
      const opNum = getPostNumberInt(threadId);
      const fallbackIndex = (repliesList.length + 1) || 1;
      return `RN. ${opNum}.${fallbackIndex}`;
    }
    return formatReplyNumber(threadId, index + 1, repliesList.length);
  };

  // Flatten all live non-deleted threads and replies into a single comprehensive post directory
  const allFlattenedPosts = useMemo(() => {
    const list: FlattenedPost[] = [];

    for (const th of threads) {
      // Add OP Post if not deleted
      if (!th.opPost.isDeleted) {
        list.push({
          postId: th.opPost.id,
          threadId: th.id,
          boardId: th.boardId,
          title: th.title || th.opPost.subject || 'Untitled Thread',
          post: th.opPost,
          isOp: true,
          repliesCount: th.replies?.filter((r) => !r.isDeleted).length || 0,
        });
      }

      // Add Replies if not deleted
      if (Array.isArray(th.replies)) {
        for (const rep of th.replies) {
          if (!rep.isDeleted) {
            list.push({
              postId: rep.id,
              threadId: th.id,
              boardId: th.boardId,
              title: rep.subject || `Reply in "${th.title || 'Untitled'}"`,
              post: rep,
              isOp: false,
            });
          }
        }
      }
    }

    // Sort by post number integer ascending (or creation date)
    list.sort((a, b) => getPostNumberInt(a.postId) - getPostNumberInt(b.postId));
    return list;
  }, [threads]);

  // Filtered live posts based on search and filters
  const filteredPosts = useMemo(() => {
    return allFlattenedPosts.filter((item) => {
      // Board filter
      if (selectedBoardFilter !== 'all' && item.boardId !== selectedBoardFilter) {
        return false;
      }

      // Type filter
      if (selectedTypeFilter === 'op' && !item.isOp) return false;
      if (selectedTypeFilter === 'reply' && item.isOp) return false;

      // Search query (matches post number, title, author, content)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const postNumStr = formatPostNumber(item.postId).toLowerCase();
        const cleanNum = item.postId.toString().toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const authorMatch = item.post.author.toLowerCase().includes(q);
        const contentMatch = item.post.content.toLowerCase().includes(q);
        const numMatch = postNumStr.includes(q) || cleanNum.includes(q);

        if (!titleMatch && !authorMatch && !contentMatch && !numMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allFlattenedPosts, selectedBoardFilter, selectedTypeFilter, searchQuery]);

  // Filtered Recycle Bin posts
  const filteredRecycleBin = useMemo(() => {
    return recycleBin.filter((item) => {
      if (selectedBoardFilter !== 'all' && item.boardId !== selectedBoardFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const postNumStr = (item.postNumberFormatted || formatPostNumber(item.postId)).toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const authorMatch = item.post.author.toLowerCase().includes(q);
        const contentMatch = item.post.content.toLowerCase().includes(q);
        const numMatch = postNumStr.includes(q) || item.postId.toLowerCase().includes(q);

        if (!titleMatch && !authorMatch && !contentMatch && !numMatch) {
          return false;
        }
      }
      return true;
    });
  }, [recycleBin, selectedBoardFilter, searchQuery]);

  // Grouped active threads with nested replies for dropdown presentation
  const groupedActiveThreads = useMemo(() => {
    return threads
      .filter((th) => {
        // Board filter
        if (selectedBoardFilter !== 'all' && th.boardId !== selectedBoardFilter) {
          return false;
        }
        return !th.opPost.isDeleted;
      })
      .map((th) => {
        const replies = (th.replies || []).filter((r) => !r.isDeleted);
        const q = searchQuery.toLowerCase().trim();
        let opMatches = true;
        let filteredRepliesList = replies;

        if (q) {
          const opNumStr = formatPostNumber(th.opPost.id).toLowerCase();
          const titleMatch = (th.title || th.opPost.subject || '').toLowerCase().includes(q);
          const authorMatch = th.opPost.author.toLowerCase().includes(q);
          const contentMatch = th.opPost.content.toLowerCase().includes(q);
          const numMatch = opNumStr.includes(q) || th.opPost.id.toLowerCase().includes(q);

          opMatches = titleMatch || authorMatch || contentMatch || numMatch;

          filteredRepliesList = replies.filter((rep, index) => {
            const rnStr = formatReplyNumber(th.id, index + 1, replies.length).toLowerCase();
            const repAuthorMatch = rep.author.toLowerCase().includes(q);
            const repContentMatch = rep.content.toLowerCase().includes(q);
            const repNumMatch = rnStr.includes(q) || rep.id.toLowerCase().includes(q) || formatPostNumber(rep.id).toLowerCase().includes(q);

            return repAuthorMatch || repContentMatch || repNumMatch;
          });
        }

        if (selectedTypeFilter === 'op') {
          filteredRepliesList = [];
        } else if (selectedTypeFilter === 'reply') {
          opMatches = false;
        }

        return {
          thread: th,
          opMatches,
          replies: filteredRepliesList,
          totalRepliesCount: replies.length,
        };
      })
      .filter((item) => {
        if (selectedTypeFilter === 'reply') {
          return item.replies.length > 0;
        }
        return item.opMatches || item.replies.length > 0;
      });
  }, [threads, selectedBoardFilter, selectedTypeFilter, searchQuery]);

  // Strict Authentication Guard Check (Safe placement after all React Hooks)
  if (!isAdminAuthenticated()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-card)] border-4 border-rose-500 p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] max-w-md w-full"
        >
          <PixelIcon name="lock" size={40} className="text-rose-500 mx-auto mb-3" />
          <h2 className="text-rose-500 font-bold text-lg mb-2 uppercase tracking-wide">ACCESS DENIED</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
            Administrator authentication required. You must enter a valid passcode to access moderation features.
          </p>
          <button
            onClick={onExitAdmin}
            className="pixel-btn px-4 py-2 bg-[var(--accent-pink)] text-white font-bold text-xs"
          >
            RETURN TO BOARDS
          </button>
        </motion.div>
      </div>
    );
  }

  const toggleExpand = (postId: string) => {
    sound.playClick();
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    sound.playClick();
    if (activeTab === 'posts') {
      const allIds = threads.map((th) => th.opPost.id);
      setExpandedPostIds(new Set([...allIds, ...threads.flatMap((th) => (th.replies || []).map((r) => r.id))]));
      
      const expandedRepliesMap: Record<string, boolean> = {};
      threads.forEach((th) => {
        expandedRepliesMap[th.id] = true;
      });
      setExpandedThreadReplies(expandedRepliesMap);
    } else {
      const allIds = filteredRecycleBin.map((p) => p.id);
      setExpandedPostIds(new Set(allIds));
    }
  };

  const handleCollapseAll = () => {
    sound.playClick();
    setExpandedPostIds(new Set());
    if (activeTab === 'posts') {
      setExpandedThreadReplies({});
    }
  };

  // Open Delete Confirmation Modal for active post
  const promptDeletePost = (item: FlattenedPost) => {
    sound.playClick();
    const postNumber = item.isOp 
      ? formatPostNumber(item.postId) 
      : getReplyNumber(item.threadId, item.postId);
    setDeleteTarget({
      postId: item.postId,
      postNumber,
      postTitle: item.title,
      author: item.post.author,
      boardSlug: item.boardId,
      isPermanent: false,
    });
  };

  // Open Delete Confirmation Modal for permanent erase from recycle bin
  const promptPermanentDelete = (item: DeletedPostRecord) => {
    sound.playClick();
    const targetPostId = item.postId || item.id;
    const postNumber = item.isOp 
      ? (item.postNumberFormatted || formatPostNumber(targetPostId)) 
      : getReplyNumber(item.threadId, targetPostId);
    setDeleteTarget({
      postId: targetPostId,
      postNumber,
      postTitle: item.title,
      author: item.post.author,
      boardSlug: item.boardId,
      isPermanent: true,
    });
  };

  const handleConfirmDeletion = () => {
    if (!deleteTarget) return;

    if (deleteTarget.isPermanent) {
      onPermanentDeletePost(deleteTarget.postId);
    } else {
      onDeletePost(deleteTarget.postId);
    }
    setDeleteTarget(null);
  };

  const handleDownloadPostsJson = async () => {
    sound.playClick();
    try {
      const res = await fetchWithAdminAuth({ action: 'export_posts' });
      if (res && res.ok) {
        const data = await res.json();
        downloadJsonBackup('posts.json', data);
        return;
      }
    } catch {}
    downloadJsonBackup('posts.json', threads);
  };

  const handleDownloadRecycleBinJson = async () => {
    sound.playClick();
    try {
      const res = await fetchWithAdminAuth({ action: 'export_recycle_bin' });
      if (res && res.ok) {
        const data = await res.json();
        downloadJsonBackup('recycle_bin.json', data);
        return;
      }
    } catch {}
    downloadJsonBackup('recycle_bin.json', recycleBin);
  };

  return (
    <div className="flex-1 bg-[var(--bg-page)] min-h-[calc(100vh-120px)] p-3 sm:p-6 font-mono select-none">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Administrator Banner & Controls Header */}
        <header className="bg-[var(--bg-card)] border-4 border-[var(--border-strong)] p-3 sm:p-4 shadow-[6px_6px_0px_var(--border-strong)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#ff4492] border-2 border-[#b81d63] flex items-center justify-center text-white shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                <PixelIcon name="lock" size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-wide">
                    ADMINISTRATOR CONTROL PORTAL
                  </h1>
                  <span className="px-1.5 py-0.2 bg-[#ff4492] text-white text-[10px] font-bold border border-[#b81d63]">
                    PARALLEL VIEW
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Complete post directory, collapsible inspections, recycle bin & restoration engine
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  sound.playBoardSwitch();
                  onExitAdmin();
                }}
                className="pixel-btn px-3 py-1 text-xs font-bold bg-[#ff4492] hover:bg-[#e0337f] text-white border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)] flex items-center gap-1.5"
              >
                <span>← EXIT TO BBS</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onLogout();
                }}
                className="pixel-btn px-2.5 py-1 text-xs font-bold bg-[var(--bg-surface)] hover:bg-rose-500 hover:text-white text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]"
                title="Log out of admin session"
              >
                LOG OUT
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pt-3 flex-wrap text-xs">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('posts');
              }}
              className={`pixel-btn px-3 py-1.5 font-bold border-2 flex items-center gap-1.5 ${
                activeTab === 'posts'
                  ? 'bg-[var(--accent-pink)] text-white border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <PixelIcon name="boards" size={13} />
              <span>ACTIVE POSTS ({allFlattenedPosts.length})</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('recycle-bin');
              }}
              className={`pixel-btn px-3 py-1.5 font-bold border-2 flex items-center gap-1.5 ${
                activeTab === 'recycle-bin'
                  ? 'bg-rose-600 text-white border-rose-950 shadow-[2px_2px_0px_rgba(0,0,0,0.6)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <PixelIcon name="trash" size={13} />
              <span>RECYCLE BIN ({recycleBin.length})</span>
              {recycleBin.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('stats');
              }}
              className={`pixel-btn px-3 py-1.5 font-bold border-2 flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-[var(--sidebar-active)] text-white border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <PixelIcon name="catalog" size={13} />
              <span>SYSTEM STATS</span>
            </button>
          </div>
        </header>

        {/* Filter and Search Toolbar */}
        {activeTab !== 'stats' && (
          <div className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  id="admin-search-input"
                  name="adminSearchQuery"
                  aria-label="Search posts"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by No. 000001, title, author, text..."
                  className="w-full pl-7 pr-2 py-1 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-pink)] text-xs font-mono"
                />
                <span className="absolute left-2 top-1.5 opacity-60">
                  <PixelIcon name="search" size={12} />
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1 opacity-70 hover:opacity-100 text-[10px]"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Board Selector Filter */}
              <select
                id="admin-board-filter"
                name="selectedBoardFilter"
                aria-label="Filter by Board"
                value={selectedBoardFilter}
                onChange={(e) => setSelectedBoardFilter(e.target.value)}
                className="p-1 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-color)] font-mono text-xs cursor-pointer"
              >
                <option value="all">All Boards</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    /{b.slug}/ - {b.name}
                  </option>
                ))}
              </select>

              {/* Type Filter (Active posts only) */}
              {activeTab === 'posts' && (
                <select
                  id="admin-type-filter"
                  name="selectedTypeFilter"
                  aria-label="Filter by Post Type"
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  className="p-1 bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-color)] font-mono text-xs cursor-pointer"
                >
                  <option value="all">All Post Types</option>
                  <option value="op">Thread OPs Only</option>
                  <option value="reply">Replies Only</option>
                </select>
              )}
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                className="pixel-btn px-2 py-1 text-[11px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-[1px_1px_0px_var(--border-color)] font-bold"
              >
                + Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="pixel-btn px-2 py-1 text-[11px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-[1px_1px_0px_var(--border-color)] font-bold"
              >
                - Collapse All
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: ACTIVE POSTS DIRECTORY
            ========================================================================= */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span>
                Displaying <strong>{groupedActiveThreads.length}</strong> active threads with matching posts
              </span>
              <span className="text-[10px] italic opacity-80">
                Replies are nested in collapsible dropdowns
              </span>
            </div>

            {groupedActiveThreads.length === 0 ? (
              <div className="bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] p-8 text-center space-y-2 text-xs">
                <PixelIcon name="boards" size={24} className="mx-auto text-[var(--text-muted)]" />
                <p className="font-bold text-[var(--text-primary)]">No threads found matching the active filter.</p>
                <p className="text-[11px] text-[var(--text-muted)]">Try resetting the search query or selecting all boards.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedActiveThreads.map(({ thread, opMatches, replies, totalRepliesCount }) => {
                  const hasReplies = replies.length > 0;
                  const repliesExpanded = !!expandedThreadReplies[thread.id];
                  const opPost = thread.opPost;
                  const isOpExpanded = expandedPostIds.has(opPost.id);
                  const parsedOpLines = parseContentLines(opPost.content, opPost.contentType === 'poetry');

                  return (
                    <div key={thread.id} className="border-2 border-[var(--border-strong)] bg-[var(--bg-card)] shadow-[4px_4px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                      {/* Thread Header Block */}
                      <div className="bg-[var(--bg-surface-alt)] p-3 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Thread OP Post Number */}
                          <span className="px-2 py-0.5 bg-[var(--accent-pink)] text-[var(--thread-num-text)] font-bold text-xs shadow-[1px_1px_0px_var(--border-strong)]">
                            {formatPostNumber(opPost.id)}
                          </span>

                          <span className="px-1.5 py-0.2 bg-[var(--sidebar-active)] text-white font-bold text-[10px] border border-[var(--border-strong)]">
                            /{thread.boardId}/
                          </span>

                          <span className="font-bold text-sm text-[var(--text-primary)] truncate max-w-sm sm:max-w-md">
                            {thread.title || opPost.subject || 'Untitled Thread'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--text-muted)]">
                            by {opPost.author}
                          </span>
                          <span className="text-[11px] text-[var(--timestamp-color)] hidden sm:inline">
                            {format16BitTimestamp(opPost.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Main OP Details / Controls Row */}
                      {opMatches ? (
                        <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-1 py-0.2 bg-rose-500 text-white text-[9px] font-bold">
                              THREAD OP
                            </span>
                            {opPost.tripcode && (
                              <span className="bg-[var(--bg-surface-alt)] px-1 border border-[var(--border-color)] font-mono text-[10px]">
                                {opPost.tripcode}
                              </span>
                            )}
                            {(opPost.imageUrl || opPost.pixelArtData) && (
                              <span className="text-[10px] text-[var(--accent-pink)] flex items-center gap-1 font-bold">
                                <PixelIcon name="image" size={11} />
                                <span>MEDIA</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(opPost.id)}
                              className="pixel-btn px-2 py-0.5 text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] font-bold shadow-[1px_1px_0px_var(--border-strong)]"
                            >
                              {isOpExpanded ? 'COLLAPSE' : 'EXPAND OP CONTENT'}
                            </button>

                            <button
                              onClick={() => promptDeletePost({
                                postId: opPost.id,
                                threadId: thread.id,
                                boardId: thread.boardId,
                                title: thread.title || opPost.subject || 'Untitled Thread',
                                post: opPost,
                                isOp: true,
                              })}
                              className="pixel-btn px-2 py-0.5 text-xs bg-rose-600 hover:bg-rose-700 text-white border border-rose-900 font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.5)] flex items-center gap-1"
                            >
                              <PixelIcon name="trash" size={11} />
                              <span>DELETE THREAD</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-[var(--bg-surface-alt)]/50 text-[11px] text-[var(--text-secondary)] italic px-3 border-b border-[var(--border-color)]">
                          Thread OP matches filters, but replies are listed below.
                        </div>
                      )}

                      {/* Expanded OP Content Area */}
                      {opMatches && isOpExpanded && (
                        <div className="p-3 bg-[var(--bg-surface-alt)]/30 border-b border-[var(--border-color)] space-y-3 text-xs leading-relaxed">
                          <div className="space-y-1">
                            {parsedOpLines.map((line, idx) => (
                              <div
                                key={idx}
                                className={
                                  line.type === 'greentext'
                                    ? 'text-[var(--greentext)] font-bold'
                                    : line.type === 'quote'
                                    ? 'text-[var(--link-color)]'
                                    : ''
                                }
                              >
                                {line.raw || <br />}
                              </div>
                            ))}
                          </div>
                          {(opPost.imageUrl || opPost.pixelArtData) && (
                            <div className="pt-2">
                              {opPost.pixelArtData ? (
                                <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-surface)] max-w-[200px]">
                                  <div className="text-[10px] text-[var(--text-muted)] mb-1 font-mono">Pixel Art Content</div>
                                  <div className="w-16 h-16 border bg-black" />
                                </div>
                              ) : opPost.imageUrl ? (
                                <div className="max-w-[250px] border-2 border-[var(--border-color)] bg-[var(--bg-surface)] p-1">
                                  <img
                                    src={opPost.imageUrl}
                                    alt="Admin Preview"
                                    referrerPolicy="no-referrer"
                                    className="max-h-48 object-contain"
                                  />
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dropdown Toggle for Replies */}
                      {totalRepliesCount > 0 && (
                        <div className="border-t border-[var(--border-color)] bg-[var(--bg-surface)]/20 px-3 py-2 flex items-center justify-between text-xs font-mono">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setExpandedThreadReplies((prev) => ({
                                ...prev,
                                [thread.id]: !prev[thread.id],
                              }));
                            }}
                            className="flex items-center gap-1.5 text-[var(--text-primary)] hover:text-[var(--accent-pink)] font-bold transition-colors"
                          >
                            <PixelIcon name={repliesExpanded ? 'close' : 'boards'} size={12} className="text-[var(--accent-pink)]" />
                            <span>
                              {repliesExpanded ? '▼ HIDE' : '▶ SHOW'} REPLIES ({replies.length} matching / {totalRepliesCount} total)
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Dropdown Content of Replies */}
                      {totalRepliesCount > 0 && repliesExpanded && (
                        <div className="bg-[var(--bg-surface-alt)]/20 p-2 sm:p-3 space-y-2 border-t border-[var(--border-color)] divide-y divide-[var(--border-color)]/50">
                          {replies.length === 0 ? (
                            <div className="text-center py-4 text-[11px] text-[var(--text-muted)] italic">
                              No matching replies for this thread.
                            </div>
                          ) : (
                            replies.map((reply, replyIdx) => {
                              const isRepExpanded = expandedPostIds.has(reply.id);
                              const parsedRepLines = parseContentLines(reply.content, reply.contentType === 'poetry');
                              const replyNumber = getReplyNumber(thread.id, reply.id);

                              return (
                                <div key={reply.id} className="pt-2 first:pt-0 pl-2 sm:pl-4 border-l-2 border-[var(--accent-pink)]/20">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Gradient RN Number Badge */}
                                      <span 
                                        className="font-bold px-1.5 py-0.5 border text-[11px] font-mono select-none rounded-xs text-[#4A2C5A] border-[#DCD0F0]/70 shadow-[1px_1px_0px_rgba(0,0,0,0.03)]"
                                        style={{ background: 'linear-gradient(to right, #EDE5FA, #F5CFE9)' }}
                                      >
                                        {replyNumber}
                                      </span>

                                      <span className="font-bold text-[var(--text-primary)]">
                                        {reply.author}
                                      </span>

                                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {format16BitTimestamp(reply.createdAt)}
                                      </span>

                                      {(reply.imageUrl || reply.pixelArtData) && (
                                        <span className="text-[9px] text-[var(--accent-pink)] bg-pink-500/10 border border-pink-500/20 px-1 py-0.1 font-bold">
                                          MEDIA
                                        </span>
                                      )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => toggleExpand(reply.id)}
                                        className="pixel-btn px-1.5 py-0.2 text-[10px] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] font-bold shadow-[1px_1px_0px_var(--border-strong)]"
                                      >
                                        {isRepExpanded ? 'HIDE' : 'SHOW CONTENT'}
                                      </button>

                                      <button
                                        onClick={() => promptDeletePost({
                                          postId: reply.id,
                                          threadId: thread.id,
                                          boardId: thread.boardId,
                                          title: reply.subject || `Reply in "${thread.title || 'Untitled'}"`,
                                          post: reply,
                                          isOp: false,
                                        })}
                                        className="pixel-btn px-1.5 py-0.2 text-[10px] bg-rose-600 hover:bg-rose-700 text-white border border-rose-900 font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.5)] flex items-center gap-1"
                                      >
                                        <PixelIcon name="trash" size={9} />
                                        <span>DELETE</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Reply content if expanded */}
                                  {isRepExpanded && (
                                    <div className="mt-2 p-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] leading-relaxed space-y-2">
                                      <div className="space-y-1">
                                        {parsedRepLines.map((line, idx) => (
                                          <div
                                            key={idx}
                                            className={
                                              line.type === 'greentext'
                                                ? 'text-[var(--greentext)] font-bold'
                                                : line.type === 'quote'
                                                ? 'text-[var(--link-color)]'
                                                : ''
                                            }
                                          >
                                            {line.raw || <br />}
                                          </div>
                                        ))}
                                      </div>
                                      {(reply.imageUrl || reply.pixelArtData) && (
                                        <div className="pt-1">
                                          {reply.pixelArtData ? (
                                            <div className="p-1 border border-[var(--border-color)] bg-[var(--bg-surface)] max-w-[120px]">
                                              <div className="w-12 h-12 bg-black" />
                                            </div>
                                          ) : reply.imageUrl ? (
                                            <div className="max-w-[160px] border border-[var(--border-color)] bg-[var(--bg-surface)] p-0.5">
                                              <img
                                                src={reply.imageUrl}
                                                alt="Admin Preview"
                                                referrerPolicy="no-referrer"
                                                className="max-h-32 object-contain"
                                              />
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: RECYCLE BIN
            ========================================================================= */}
        {activeTab === 'recycle-bin' && (
          <div className="space-y-3">
            {/* Recycle Bin Top Bar */}
            <div className="bg-[#7181c8]/10 dark:bg-[#7181c8]/20 border-2 border-[#7181c8]/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <PixelIcon name="trash" size={14} className="text-[#7181c8]" />
                  <h2 className="font-bold text-[var(--text-primary)]">ADMIN RECYCLE BIN</h2>
                  <span className="px-1.5 py-0.2 bg-[#7181c8] text-white font-bold text-[10px]">
                    {recycleBin.length} DELETED
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Deleted posts remain safely in this holding bin. Restore them anytime, or purge permanently.
                </p>
              </div>

              {recycleBin.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to completely empty the entire Recycle Bin? All deleted posts will be permanently erased.')) {
                      sound.playDelete();
                      onEmptyRecycleBin();
                    }
                  }}
                  className="pixel-btn px-3 py-1 text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold border border-rose-950 shadow-[1px_1px_0px_rgba(0,0,0,0.6)] flex items-center gap-1.5"
                >
                  <PixelIcon name="trash" size={12} />
                  <span>EMPTY RECYCLE BIN</span>
                </button>
              )}
            </div>

            {/* Recycle Bin Post Items */}
            {filteredRecycleBin.length === 0 ? (
              <div className="bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] p-8 text-center space-y-2 text-xs">
                <PixelIcon name="trash" size={24} className="mx-auto text-[var(--text-muted)] opacity-50" />
                <p className="font-bold text-[var(--text-primary)]">Recycle Bin is currently empty.</p>
                <p className="text-[11px] text-[var(--text-muted)]">Any posts deleted by administrators will appear here for safe restoration or permanent purging.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecycleBin.map((item) => {
                  const isExpanded = expandedPostIds.has(item.id);
                  const postNumberFormatted = item.isOp 
                    ? (item.postNumberFormatted || formatPostNumber(item.postId)) 
                    : getReplyNumber(item.threadId, item.postId);
                  const parsedLines = parseContentLines(item.post.content, item.post.contentType === 'poetry');

                  return (
                    <article
                      key={item.id}
                      className="bg-[var(--bg-card)] border-2 border-[#7181c8]/50 shadow-[2px_2px_0px_rgba(113,129,200,0.3)] overflow-hidden"
                    >
                      {/* Row Header */}
                      <div className="p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 text-xs bg-[#7181c8]/5 dark:bg-[#7181c8]/10 border-b border-[#7181c8]/30">
                        {/* Post info */}
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[240px]">
                          <span className="px-2 py-0.5 bg-[#7181c8] text-white font-bold text-xs shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
                            {postNumberFormatted}
                          </span>

                          <span className="px-1.5 py-0.2 bg-[var(--sidebar-active)] text-white font-bold text-[10px] border border-[var(--border-strong)]">
                            /{item.boardId}/
                          </span>

                          {item.isOp ? (
                            <span className="px-1 py-0.2 bg-[#7181c8] text-white text-[9px] font-bold">
                              DELETED THREAD
                            </span>
                          ) : (
                            <span className="px-1 py-0.2 bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] text-[9px] font-bold">
                              DELETED REPLY
                            </span>
                          )}

                          <span className="font-bold text-sm text-[var(--text-primary)] truncate max-w-md">
                            {item.title}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-[10px] text-[#7181c8] font-bold hidden md:inline">
                            Deleted {formatTimeAgo(item.deletedAt)}
                          </span>

                          {/* Expand/Collapse */}
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="pixel-btn px-2 py-0.5 text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] font-bold shadow-[1px_1px_0px_var(--border-strong)]"
                          >
                            {isExpanded ? 'COLLAPSE' : 'EXPAND CONTENT'}
                          </button>

                          {/* RESTORE ACTION */}
                          <button
                            onClick={() => {
                              sound.playPostSuccess();
                              onRestorePost(item.postId || item.id);
                            }}
                            className="pixel-btn px-2.5 py-0.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-950 font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.5)] flex items-center gap-1"
                            title="Restore post back to live boards"
                          >
                            <PixelIcon name="refresh" size={11} />
                            <span>RESTORE</span>
                          </button>

                          {/* PERMANENT DELETE ACTION */}
                          <button
                            onClick={() => promptPermanentDelete(item)}
                            className="pixel-btn px-2 py-0.5 text-xs bg-rose-800 hover:bg-rose-900 text-white border border-rose-950 font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.5)] flex items-center gap-1"
                            title="Completely erase post forever"
                          >
                            <PixelIcon name="trash" size={11} />
                            <span>ERASE FOREVER</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Deleted Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="p-3 sm:p-4 bg-[var(--bg-card)] space-y-3 border-t border-[var(--border-color)] text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)] pb-2 border-b border-[var(--border-color)]/60">
                              <div>
                                <span>Author: <strong className="text-[var(--accent-pink)]">{item.post.author}</strong></span>
                                <span> • Deleted at: {format16BitTimestamp(item.deletedAt)}</span>
                              </div>
                              <div>
                                <span>Original Post ID: <code>{item.postId}</code></span>
                              </div>
                            </div>

                            {/* Content text */}
                            <div className="space-y-1 text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--bg-surface-alt)] p-2.5 border border-[var(--border-color)]">
                              {parsedLines.map((line, idx) => (
                                <div
                                  key={idx}
                                  className={`${
                                    line.type === 'greentext'
                                      ? 'text-[var(--greentext)] font-bold'
                                      : line.type === 'quote'
                                      ? 'text-[var(--link-color)]'
                                      : ''
                                  }`}
                                >
                                  {line.raw || <br />}
                                </div>
                              ))}
                            </div>

                            {/* Media */}
                            {(item.post.imageUrl || item.post.pixelArtData) && (
                              <div className="p-2 bg-[var(--bg-surface-alt)] border border-[var(--border-color)] space-y-1">
                                <span className="text-[10px] font-bold text-[var(--text-secondary)]">Attached Media</span>
                                <div className="max-w-xs max-h-40 overflow-hidden border border-[var(--border-color)]">
                                  <img
                                    src={item.post.pixelArtData || item.post.imageUrl}
                                    alt="Deleted Post Attachment"
                                    className="max-h-40 max-w-full object-contain [image-rendering:pixelated]"
                                  />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: SYSTEM STATS & DIAGNOSTICS
            ========================================================================= */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-strong)] p-4 space-y-2 shadow-[3px_3px_0px_var(--border-strong)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">TOTAL LIVE THREADS</span>
                <div className="text-2xl font-bold text-[var(--accent-pink)]">
                  {liveThreads.length}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Active discussion threads across all 3 boards
                </p>
              </div>

              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-strong)] p-4 space-y-2 shadow-[3px_3px_0px_var(--border-strong)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">TOTAL LIVE POSTS</span>
                <div className="text-2xl font-bold text-[var(--sidebar-active)]">
                  {allFlattenedPosts.length}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Combined sum of thread original posts & reply comments
                </p>
              </div>

              <div className="bg-[var(--bg-card)] border-2 border-[var(--border-strong)] p-4 space-y-2 shadow-[3px_3px_0px_var(--border-strong)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">RECYCLE BIN RETENTION</span>
                <div className="text-2xl font-bold text-rose-600">
                  {recycleBin.length}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Posts held in moderation quarantine
                </p>
              </div>
            </div>

            {/* Export & Backup Section */}
            <div className="bg-[var(--bg-card)] border-2 border-[var(--border-strong)] p-4 space-y-3 shadow-[4px_4px_0px_var(--border-strong)] text-xs">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                <PixelIcon name="download" size={16} className="text-[var(--accent-pink)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-wide">
                  DATA EXPORT & BACKUP ARCHIVES
                </h3>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Download JSON data backups directly to your device. You can download active system posts (<code>posts.json</code>) or quarantined deleted records (<code>recycle_bin.json</code>).
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleDownloadPostsJson}
                  className="pixel-btn px-3.5 py-2 bg-[var(--accent-pink)] hover:bg-[#e0337f] text-white border-2 border-[var(--border-strong)] font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_var(--border-strong)]"
                >
                  <PixelIcon name="download" size={14} />
                  <span>Download posts.json</span>
                </button>

                <button
                  onClick={handleDownloadRecycleBinJson}
                  className="pixel-btn px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-950 font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.6)]"
                >
                  <PixelIcon name="download" size={14} />
                  <span>Download recycle_bin.json</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Prompts Pop-up displaying Post Number & Title) */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeletion}
        postNumber={deleteTarget?.postNumber || ''}
        postTitle={deleteTarget?.postTitle || ''}
        author={deleteTarget?.author}
        boardSlug={deleteTarget?.boardSlug}
        isPermanent={deleteTarget?.isPermanent}
      />
    </div>
  );
};
