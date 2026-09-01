import React, { useMemo } from 'react';
import { Thread, Board, Post, ImageMetadata } from '../types';
import { PostCard } from './PostCard';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';
import { formatPostNumber, getAnonymousIndexMap, format16BitTimestamp, formatTimeAgo, formatAnonymousName } from '../utils/textParser';

interface ThreadViewProps {
  thread: Thread;
  board: Board;
  onBackToBoard: () => void;
  onOpenReplyModal: (quotePostId?: string) => void;
  onExpandImage: (url: string, meta?: ImageMetadata, title?: string) => void;
  onManualRefresh: () => void;
  isAdmin?: boolean;
  onDeletePost?: (postId: string) => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  board,
  onBackToBoard,
  onOpenReplyModal,
  onExpandImage,
  onManualRefresh,
  isAdmin,
  onDeletePost,
}) => {
  // Map of all posts in this thread for instant quote preview lookup
  const postsMap = useMemo(() => {
    const map: Record<string, Post> = {
      [thread.opPost.id]: thread.opPost,
    };
    thread.replies.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [thread]);

  const anonMap = getAnonymousIndexMap(thread);

  return (
    <div id="thread-view-container" className="space-y-3">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-surface)] p-3 border-4 border-[var(--border-color)] shadow-[4px_4px_0px_var(--border-color)] font-mono">
        <div className="flex items-center gap-2">
          <button
            id="back-to-board-btn"
            onClick={() => {
              sound.playBoardSwitch();
              onBackToBoard();
            }}
            className="pixel-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 bg-[var(--bg-card)] border-2 border-[var(--border-strong)] shadow-[2px_2px_0px_var(--border-strong)] hover:bg-[var(--border-strong)] hover:text-white"
          >
            <PixelIcon name="reply" size={11} />
            <span>&lt;&lt; RETURN TO /{board.slug}/</span>
          </button>

          <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline">
            THREAD #{thread.id}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            id="thread-refresh-btn"
            onClick={() => {
              sound.playClick();
              onManualRefresh();
            }}
            className="pixel-btn px-2 py-1 text-xs flex items-center gap-1 bg-[var(--bg-card)] border-2 border-[var(--border-strong)] shadow-[1px_1px_0px_var(--border-strong)]"
            title="Refresh thread replies"
          >
            <PixelIcon name="refresh" size={11} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>

          <button
            id="thread-quick-reply-btn"
            onClick={() => {
              sound.playClick();
              onOpenReplyModal(thread.opPost.id);
            }}
            className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white px-3 py-1 font-bold flex items-center gap-1 shadow-[2px_2px_0px_var(--border-strong)]"
          >
            <PixelIcon name="new-post" size={12} />
            <span>+ POST REPLY</span>
          </button>
        </div>
      </div>

      {/* Thread Title & Header Card with Thread Number at Upper Most Left */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-pink-50 to-pink-50 border-4 border-[var(--border-strong)] shadow-[6px_6px_0px_var(--border-color)]">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="px-2 py-0.5 bg-[var(--accent-pink)] text-[var(--thread-num-text)] text-[11px] font-mono font-bold shadow-[1px_1px_0px_var(--border-strong)]">
            {formatPostNumber(thread.id)}
          </span>
          {thread.isSticky && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 font-bold flex items-center gap-1">
              <PixelIcon name="pin" size={10} />
              <span>PINNED</span>
            </span>
          )}
          <span className="text-xs text-[var(--text-secondary)] font-mono font-bold">
            [/{board.slug}/ • {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}] ⋆｡°✩ ୨୧ ｡°*
          </span>
        </div>
        {/* OP Author Name, Badges, Timestamp, and Post Number: Displayed above the OP Card */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 text-xs font-mono select-none">
          <span className="font-bold text-[var(--accent-pink)]">
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

        {/* Main OP Post (displays Thread Title in its header) */}
        <div className="relative">
          <PostCard
            post={thread.opPost}
            isOp={true}
            threadTitle={thread.title}
            anonIndex={anonMap[thread.opPost.id]}
            onReplyClick={(pId) => onOpenReplyModal(pId)}
            onExpandImage={onExpandImage}
            allPostsMap={postsMap}
            isAdmin={isAdmin}
            onDeletePost={onDeletePost}
          />
        </div>

        {/* Replies Divider / Counter */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-2 font-mono border-b border-[var(--border-color)] pb-1 pt-2">
          <div className="flex items-center gap-2">
            <PixelIcon name="chat" size={14} className="text-[var(--accent-lavender)]" />
            <span className="font-bold">
              {thread.replies.length} {thread.replies.length === 1 ? 'Reply' : 'Replies'}
            </span>
            <span>• {thread.imagesCount} Images</span>
          </div>
          <button
            onClick={() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
            className="text-[var(--link-color)] hover:underline text-[11px]"
          >
            Bottom ↓
          </button>
        </div>

      </div>



      {/* Replies Thread Tree*/}
      <div className="space-y-1.5 pl-0 sm:pl-2">
        {thread.replies.map((replyPost, index) => (
          <PostCard
            key={replyPost.id}
            post={replyPost}
            isOp={false}
            replyIndex={index + 1}
            totalReplies={thread.replies.length}
            anonIndex={anonMap[replyPost.id]}
            onReplyClick={(pId) => onOpenReplyModal(pId)}
            onExpandImage={onExpandImage}
            allPostsMap={postsMap}
            isAdmin={isAdmin}
            onDeletePost={onDeletePost}
          />
        ))}

        {thread.replies.length === 0 && (
          <div className="p-6 text-center text-[var(--text-muted)] text-xs font-mono bg-[var(--bg-card)] pixel-box-sm my-3">
            <p>No replies yet. Be the first Anon to respond! (✿◠‿◠)</p>
          </div>
        )}
      </div>

      {/* Bottom Reply Bar */}
      <div className="pixel-box p-3 bg-[var(--bg-surface)] flex items-center justify-between mt-4">
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 font-mono">
          <PixelIcon name="sakura" size={14} className="text-[var(--accent-pink)]" />
          <span>Thread End. Post updates in real-time.</span>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onOpenReplyModal(thread.opPost.id);
          }}
          className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white px-4 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border-strong)]"
        >
          <PixelIcon name="new-post" size={14} />
          <span>Quick Reply ₊˚⊹ᰔ</span>
        </button>
      </div>
    </div>
  );
};
