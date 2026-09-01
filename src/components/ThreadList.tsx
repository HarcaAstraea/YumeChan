import React, { useState, useEffect } from 'react';
import { Thread, Board, ImageMetadata } from '../types';
import { PostCard } from './PostCard';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';
import { formatPostNumber, getAnonymousIndexMap, format16BitTimestamp, formatTimeAgo, formatAnonymousName } from '../utils/textParser';

const THREADS_PER_PAGE = 10;

interface ThreadListProps {
  board: Board;
  threads: Thread[];
  onSelectThread: (threadId: string) => void;
  onOpenNewThread: () => void;
  onOpenReplyModal: (threadId: string, quotePostId?: string) => void;
  onExpandImage: (url: string, meta?: ImageMetadata, title?: string) => void;
  isAdmin?: boolean;
  onDeletePost?: (postId: string) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  board,
  threads,
  onSelectThread,
  onOpenNewThread,
  onOpenReplyModal,
  onExpandImage,
  isAdmin,
  onDeletePost,
}) => {
  const [showRules, setShowRules] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when board or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [board.id, filterQuery]);

  const boardThreads = threads.filter((th) => th.boardId === board.id);

  const filteredThreads = boardThreads.filter((th) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      th.title.toLowerCase().includes(q) ||
      th.opPost.content.toLowerCase().includes(q) ||
      th.opPost.author.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / THREADS_PER_PAGE));
  const startIndex = (currentPage - 1) * THREADS_PER_PAGE;
  const paginatedThreads = filteredThreads.slice(startIndex, startIndex + THREADS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    sound.playClick();
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="board-thread-list" className="space-y-4">
      {/* Board Header Banner */}
      <div className="p-4 sm:p-5 bg-[var(--bg-surface)] border-4 border-[var(--border-color)] shadow-[6px_6px_0px_var(--border-color)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold text-[var(--accent-pink)] font-mono">
                /{board.slug}/
              </span>
              <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {board.name}
              </h1>
              <span className={`text-xs bg-gradient-to-r from-rose-50 to-pink-200 text-[var(--badge-jp-text)] border-2 border-[var(--badge-jp-border)] font-bold font-mono shadow-[1px_1px_0px_var(--border-color)] inline-flex items-center justify-center ${
                board.slug === 'yume' || board.id === 'yume'
                  ? 'px-1.5 py-0.5 min-w-[32px]'
                  : 'px-1 py-0.5'
              }`}>
                {board.jpName}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{board.description}</p>
            <p className="text-[11px] text-[var(--accent-pink)] font-mono mt-0.5 font-bold">
              ★ {board.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                setShowRules(!showRules);
              }}
              className="pixel-btn px-2.5 py-1 text-xs border-2 border-[var(--border-strong)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface-alt)] font-mono shadow-[2px_2px_0px_var(--border-strong)]"
            >
              {showRules ? 'HIDE RULES' : 'RULES 𝜗ৎ'}
            </button>

            <button
              id="new-thread-btn"
              onClick={() => {
                sound.playClick();
                onOpenNewThread();
              }}
              className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white px-3.5 py-1 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border-strong)]"
            >
              <PixelIcon name="new-post" size={13} />
              <span>+ CREATE THREAD</span>
            </button>
          </div>
        </div>

        {/* Collapsible Rules Bar */}
        {showRules && (
          <div className="mt-3 pt-3 border-t-2 border-[var(--border-color)] bg-[var(--bg-surface-alt)] p-3 text-xs text-[var(--text-secondary)] space-y-1 font-mono">
            <div className="font-bold text-[var(--text-primary)] mb-1">/{board.slug}/ ETIQUETTE &amp; PROTOCOL:</div>
            {board.rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[var(--accent-pink)] font-mono">▸</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter / Search Bar with Pagination summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-surface)] p-2.5 border-2 border-[var(--border-color)] text-xs shadow-[2px_2px_0px_var(--border-color)] font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <PixelIcon name="search" size={13} className="text-[var(--text-muted)]" />
          <input
            id="thread-filter-input"
            name="threadFilterQuery"
            aria-label="Filter threads"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="FILTER_THREADS..."
            className="pixel-input text-xs px-2 py-1 w-full bg-[var(--bg-card)]"
          />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] font-mono font-bold">
          <span>THREADS: <strong>{filteredThreads.length}</strong></span>
          {totalPages > 1 && (
            <span className="bg-[var(--bg-card)] px-2 py-0.5 border border-[var(--border-color)]">
              PAGE {currentPage} OF {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {paginatedThreads.map((thread, index) => {
          const omittedCount = Math.max(0, thread.replies.length - 3);
          const visibleReplies = thread.replies.slice(-3);
          const anonMap = getAnonymousIndexMap(thread);

          return (
            <React.Fragment key={thread.id}>
              <section
                id={`thread-container-${thread.id}`}
                className="p-3 sm:p-4 bg-gradient-to-r from-pink-50 to-pink-100 border-4 border-[var(--border-strong)] shadow-[6px_6px_0px_var(--border-color)] relative"
              >
                {/* Upper Thread Bar: Thread Number on the uppermost left & actions on the right */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-2 border-b-2 border-[var(--border-color)] text-xs font-mono">
                  {/* Uppermost Left: Thread Number & Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-[var(--accent-pink)] text-[var(--thread-num-text)] text-[11px] font-mono font-bold shadow-[1px_1px_0px_var(--border-strong)] flex items-center gap-1">
                      <span>{formatPostNumber(thread.id)}</span>
                    </span>

                    {thread.isSticky && (
                      <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                        <PixelIcon name="pin" size={10} />
                        <span>PINNED</span>
                      </span>
                    )}

                    <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                      [/{board.slug}/ • {thread.repliesCount} {thread.repliesCount === 1 ? 'reply' : 'replies'}] ⋆｡°✩ ୨୧ ｡°*
                    </span>
                  </div>

                  {/* Actions on the Upper Right with mb-1 */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <button
                      onClick={() => {
                        sound.playBoardSwitch();
                        onSelectThread(thread.id);
                      }}
                      className="pixel-btn px-2.5 py-0.5 text-xs font-bold bg-[var(--bg-card)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] hover:text-white border-2 border-[var(--border-strong)] shadow-[1px_1px_0px_var(--border-strong)] flex items-center gap-1 transition-all"
                    >
                      <span>VIEW THREAD ({thread.repliesCount})</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenReplyModal(thread.id, thread.opPost.id);
                      }}
                      className="pixel-btn px-2 py-0.5 text-xs bg-[var(--bg-card)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] hover:text-white border-2 border-[var(--border-strong)] shadow-[1px_1px_0px_var(--border-strong)] font-bold transition-all"
                      title="Quick Reply to Thread"
                    >
                      <PixelIcon name="reply" size={11} />
                    </button>
                  </div>
                </div>

                {/* OP Author Name, Badges, Timestamp, and Post Number: Displayed above the OP Card */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 py-2 text-xs font-mono select-none">
                  <span className="font-bold text-[14px] text-[var(--accent-pink)]">
                    {formatAnonymousName(thread.opPost.author, 0, true)}
                  </span>

                  {thread.opPost.tripcode && (
                    <span className="bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border border-[var(--border-color)] px-1 py-0 text-[10px] font-mono font-bold">
                      {thread.opPost.tripcode}
                    </span>
                  )}

                  <span className="bg-[#ff87b9] text-white text-[9px] px-1 py-0.2 font-bold uppercase">
                    OP
                  </span>

                  <span className="text-[var(--timestamp-color)] text-[11px] font-mono" title={formatTimeAgo(thread.opPost.createdAt)}>
                    {format16BitTimestamp(thread.opPost.createdAt)}
                  </span>

                  <span className="text-[var(--text-secondary)] font-bold text-[11px] font-mono">
                    {formatPostNumber(thread.opPost.id)}
                  </span>
                </div>

                {/* OP Post (displays Thread Title inside its header) */}
                <PostCard
                  post={thread.opPost}
                  isOp={true}
                  threadTitle={thread.title}
                  onSelectThread={() => onSelectThread(thread.id)}
                  anonIndex={anonMap[thread.opPost.id]}
                  onReplyClick={(pId) => onOpenReplyModal(thread.id, pId)}
                  onExpandImage={onExpandImage}
                  isAdmin={isAdmin}
                  onDeletePost={onDeletePost}
                />

                {/* Omitted Replies Teaser */}
                {omittedCount > 0 && (
                  <div
                    onClick={() => {
                      sound.playBoardSwitch();
                      onSelectThread(thread.id);
                    }}
                    className="my-2 p-1.5 text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-surface)] border border-[var(--border-color)] text-center cursor-pointer hover:bg-[var(--accent-pink-soft)] transition-colors"
                  >
                    ★ {omittedCount} {omittedCount === 1 ? 'post' : 'posts'} omitted. Click to expand full thread. ★
                  </div>
                )}

                {/* Last 3 Recent Replies */}
                {visibleReplies.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {visibleReplies.map((rep) => {
                      const replyIndex = thread.replies.findIndex((r) => r.id === rep.id) + 1;
                      const totalReplies = thread.replies.length;
                      return (
                        <PostCard
                          key={rep.id}
                          post={rep}
                          isOp={false}
                          replyIndex={replyIndex}
                          totalReplies={totalReplies}
                          anonIndex={anonMap[rep.id]}
                          onReplyClick={(pId) => onOpenReplyModal(thread.id, pId)}
                          onExpandImage={onExpandImage}
                          isAdmin={isAdmin}
                          onDeletePost={onDeletePost}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            </React.Fragment>
          );
        })}

        {filteredThreads.length === 0 && (
          <div className="pixel-box p-8 text-center bg-[var(--bg-card)] text-[var(--text-muted)] space-y-3">
            <PixelIcon name="chat" size={28} className="mx-auto opacity-40" />
            <p className="font-bold text-sm">No threads yet in /{board.slug}/</p>
            <button
              onClick={() => {
                sound.playClick();
                onOpenNewThread();
              }}
              className="pixel-btn bg-[var(--border-strong)] hover:bg-[var(--accent-pink)] text-white px-4 py-1.5 text-xs font-bold mx-auto flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border-strong)]"
            >
              <PixelIcon name="new-post" size={12} />
              <span>Create First Thread</span>
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls (when more than 1 page / 10 threads) */}
      {totalPages > 1 && (
        <div
          id="thread-pagination"
          className="mt-6 p-3 sm:p-4 bg-[var(--bg-surface)] border-4 border-[var(--border-color)] shadow-[6px_6px_0px_var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono select-none"
        >
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
            <span className="bg-[var(--accent-pink)] text-[var(--accent-contrast-text)] px-2 py-0.5 text-[10px] font-mono font-bold">PAGINATION</span>
            <span>PAGE {currentPage} / {totalPages}</span>
            <span className="text-[var(--text-secondary)] text-[11px]">({filteredThreads.length} Total Threads)</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(1)}
              className="pixel-btn px-2.5 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-alt)] shadow-[2px_2px_0px_var(--border-color)] font-bold text-xs"
            >
              « FIRST
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="pixel-btn px-2.5 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-alt)] shadow-[2px_2px_0px_var(--border-color)] font-bold text-xs"
            >
              ‹ PREV
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`pixel-btn min-w-[28px] h-7 px-1.5 flex items-center justify-center font-bold text-xs border-2 ${
                    isActive
                      ? 'bg-[var(--accent-pink)] text-[var(--accent-contrast-text)] border-[var(--border-color)] shadow-[2px_2px_0px_var(--border-color)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-alt)] shadow-[2px_2px_0px_var(--border-color)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="pixel-btn px-2.5 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-alt)] shadow-[2px_2px_0px_var(--border-color)] font-bold text-xs"
            >
              NEXT ›
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="pixel-btn px-2.5 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-alt)] shadow-[2px_2px_0px_var(--border-color)] font-bold text-xs"
            >
              LAST »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
