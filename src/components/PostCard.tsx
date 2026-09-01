import React, { useState } from 'react';
import { Post, ImageMetadata } from '../types';
import { format16BitTimestamp, formatTimeAgo, parseContentLines, formatPostNumber, formatAnonymousName, formatReplyNumber, getPostNumberInt } from '../utils/textParser';
import { PixelIcon } from './PixelIcon';
import { PoetryDisplay } from './PoetryDisplay';
import { sound } from '../utils/chiptune';

interface PostCardProps {
  post: Post;
  isOp?: boolean;
  threadTitle?: string;
  anonIndex?: number;
  onSelectThread?: () => void;
  onReplyClick?: (postId: string) => void;
  onQuoteHover?: (postId: string | null, event?: React.MouseEvent) => void;
  onExpandImage?: (imageUrl: string, metadata?: ImageMetadata, title?: string) => void;
  allPostsMap?: Record<string, Post>;
  isAdmin?: boolean;
  onDeletePost?: (postId: string) => void;
  replyIndex?: number;
  totalReplies?: number;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isOp = false,
  threadTitle,
  anonIndex,
  onSelectThread,
  onReplyClick,
  onQuoteHover,
  onExpandImage,
  allPostsMap,
  isAdmin = false,
  onDeletePost,
  replyIndex,
  totalReplies,
}) => {
  const [hoveredQuoteId, setHoveredQuoteId] = useState<string | null>(null);
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<number, boolean>>({});

  const isPoetry = (post?.contentType || 'text') === 'poetry';
  const parsedLines = parseContentLines(post.content, isPoetry);
  const displayAuthor = formatAnonymousName(post.author, anonIndex, isOp);

  const handleImageClick = () => {
    const targetUrl = post.pixelArtData || post.imageUrl;
    if (targetUrl && onExpandImage) {
      sound.playClick();
      onExpandImage(targetUrl, post.imageMeta, post.subject || `Post #${post.id}`);
    }
  };

  const handleQuoteClick = (quoteId: string) => {
    sound.playClick();
    const elem = document.getElementById(`post-${quoteId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.classList.add('ring-2', 'ring-[var(--accent-pink)]', 'transition-all');
      setTimeout(() => {
        elem.classList.remove('ring-2', 'ring-[var(--accent-pink)]');
      }, 2000);
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className={`my-2 transition-all relative ${
        post.isDeleted
          ? 'bg-[var(--bg-card)]/70 border-2 border-dashed border-[var(--border-color)] p-3 shadow-[2px_2px_0px_var(--border-color)] ' + (isOp ? '' : 'ml-2 sm:ml-8')
          : isOp
          ? 'bg-[var(--bg-card)] border-2 border-[var(--border-strong)] p-3 sm:p-4 shadow-[4px_4px_0px_var(--accent-pink)]'
          : 'bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-3 sm:p-3.5 shadow-[4px_4px_0px_var(--border-strong)] ml-2 sm:ml-8'
      }`}
    >
      {/* Post Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[var(--border-color)]/60 pb-1.5 mb-2 select-none font-mono">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {isOp ? (
            /* For OP: Display Thread Title inside the card header */
            <div className="flex items-center gap-2">
              <h2
                onClick={() => {
                  if (onSelectThread) {
                    sound.playBoardSwitch();
                    onSelectThread();
                  }
                }}
                className={`font-bold text-sm sm:text-base text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors ${
                  onSelectThread ? 'hover:text-[var(--accent-pink)] cursor-pointer' : ''
                }`}
              >
                <span className="text-[var(--accent-pink)] text-xs select-none">▶</span>
                <span>{threadTitle || post.subject || 'Thread'}</span>
              </h2>
              {/* Post Number (No. 000001 style for OP) */}
              <span className="text-[var(--text-secondary)] font-bold text-[11px] font-mono">
                {formatPostNumber(post.id)}
              </span>
            </div>
          ) : (
            /* For Replies: Display Author, Tripcode, Timestamp, and Post Number */
            <>
              {/* RN Number with Gradient Nameplate */}
              <span 
                className={`font-bold px-1.5 py-0.5 border text-[11px] font-mono select-none rounded-xs ${
                  post.isDeleted 
                    ? 'text-[var(--text-muted)] bg-[var(--bg-surface-alt)] border-[var(--border-color)]' 
                    : 'text-[#4A2C5A] border-[#DCD0F0]/70 shadow-[1px_1px_0px_rgba(0,0,0,0.03)]'
                }`}
                style={!post.isDeleted ? { background: 'linear-gradient(to right, #EDE5FA, #F5CFE9)' } : undefined}
              >
                {replyIndex !== undefined && totalReplies !== undefined
                  ? formatReplyNumber(post.threadId, replyIndex, totalReplies)
                  : `RN. ${getPostNumberInt(post.threadId)}.${getPostNumberInt(post.id) % 100 || 1}`
                }
              </span>

              {/* Author Name */}
              <span className={`font-bold ${post.isDeleted ? 'text-[var(--text-muted)]' : 'text-[var(--accent-pink)]'}`}>
                {post.isDeleted ? 'Anonymous' : displayAuthor}
              </span>

              {/* Tripcode Badge */}
              {!post.isDeleted && post.tripcode && (
                <span className="bg-[var(--bg-surface-alt)] text-[var(--text-primary)] border border-[var(--border-color)] px-1 py-0 text-[10px] font-mono font-bold">
                  {post.tripcode}
                </span>
              )}

              {/* Timestamp */}
              <span className="text-[var(--timestamp-color)] text-[11px] font-mono" title={formatTimeAgo(post.createdAt)}>
                {format16BitTimestamp(post.createdAt)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Reply Action Link */}
          {!post.isDeleted && onReplyClick && (
            <button
              onClick={() => {
                sound.playClick();
                onReplyClick(post.id);
              }}
              className="text-[10px] bg-[var(--bg-card)] border-2 border-[var(--border-strong)] px-2 py-0.5 font-bold shadow-[1px_1px_0px_var(--border-strong)] hover:bg-[var(--accent-pink)] hover:text-white transition-all"
              title="Quote and reply to this post"
            >
              Reply
            </button>
          )}


        </div>
      </header>

      {/* If Post is Deleted by Admin: Display Retro Tombstone Banner */}
      {post.isDeleted ? (
        <div className="py-2.5 px-3 bg-[var(--bg-surface-alt)] border-2 border-dashed border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)] flex items-center gap-2 select-none my-1">
          <span className="text-rose-500 font-bold">⚠</span>
          <span className="italic font-bold text-[var(--text-secondary)]">This post has been deleted by an administrator.</span>
        </div>
      ) : (
        <>
          {/* Media Attachment Info Bar (if image or pixel art present) */}
          {(post.imageUrl || post.pixelArtData) && (
            <div className="text-[11px] text-[var(--text-secondary)] mb-2 font-mono flex flex-wrap items-center gap-2 bg-[var(--bg-surface-alt)] p-1.5 border-2 border-[var(--border-color)]">
              <PixelIcon name="image" size={12} className="text-[var(--accent-pink)]" />
              <span>File: <span className="underline cursor-pointer font-bold" onClick={handleImageClick}>{post.imageMeta?.name || 'art_capture.png'}</span></span>
              {post.imageMeta?.size && <span className="opacity-75">({post.imageMeta.size}, {post.imageMeta.dimensions})</span>}
              <button
                onClick={handleImageClick}
                className="text-[var(--link-color)] hover:underline text-[10px] ml-auto font-mono font-bold"
              >
                Expand View
              </button>
            </div>
          )}

          {/* Main Post Body */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Attached Thumbnail (if any) */}
            {(post.imageUrl || post.pixelArtData) && (
              <div
                onClick={handleImageClick}
                className="cursor-pointer shrink-0 w-28 h-28 sm:w-32 sm:h-32 bg-[var(--bg-surface-alt)] border-2 border-[var(--border-strong)] p-1 flex items-center justify-center group relative hover:scale-[1.02] transition-transform shadow-[2px_2px_0px_var(--border-color)]"
              >
                <img
                  src={post.pixelArtData || post.imageUrl}
                  alt={post.imageMeta?.name || 'thumbnail'}
                  className="w-full h-full object-contain pixel-canvas-grid"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity font-mono">
                  Zoom
                </div>
              </div>
            )}

            {/* Content text or Poetry */}
            <div className="flex-1 w-full overflow-hidden">
              {isPoetry ? (
                <PoetryDisplay
                  content={post.content}
                  format={post.poetryFormat}
                  authorNote={post.poetryAuthorNote}
                  authorName={displayAuthor}
                />
              ) : (
                <div className="text-xs sm:text-sm leading-relaxed post-text-body space-y-0.5">
                  {parsedLines.map((line, idx) => {
                    if (line.type === 'greentext') {
                      return (
                        <div key={idx} className="greentext break-words whitespace-pre-wrap min-h-[1.3em]">
                          {line.raw || '\u00A0'}
                        </div>
                      );
                    }

                    if (line.type === 'heading') {
                      return (
                        <div key={idx} className="font-bold text-[var(--accent-lavender)] text-sm border-b border-[var(--border-color)] pb-0.5 my-1 whitespace-pre-wrap">
                          {line.raw}
                        </div>
                      );
                    }

                    if (line.type === 'quote') {
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-1.5 whitespace-pre-wrap min-h-[1.3em]">
                          <span className="greentext">{line.raw.split(' ')[0]}</span>
                          {line.quoteIds?.map((qId) => (
                            <span
                              key={qId}
                              onClick={() => handleQuoteClick(qId)}
                              onMouseEnter={() => {
                                setHoveredQuoteId(qId);
                                if (onQuoteHover) onQuoteHover(qId);
                              }}
                              onMouseLeave={() => {
                                setHoveredQuoteId(null);
                                if (onQuoteHover) onQuoteHover(null);
                              }}
                              className="quote-link relative"
                            >
                              &gt;&gt;{qId}
                              {/* Hover Tooltip Preview */}
                              {hoveredQuoteId === qId && allPostsMap && allPostsMap[qId] && (
                                <div className="absolute left-0 bottom-full mb-1 z-30 w-64 sm:w-80 pixel-box p-2 bg-[var(--bg-card)] shadow-xl pointer-events-none text-xs text-[var(--text-primary)]">
                                  <div className="font-bold text-[10px] text-[var(--text-muted)] mb-1 border-b border-[var(--border-color)] pb-0.5">
                                    Preview: {formatPostNumber(qId)} ({allPostsMap[qId].isDeleted ? 'Deleted' : allPostsMap[qId].author})
                                  </div>
                                  <p className="line-clamp-3 text-[11px] whitespace-pre-wrap">
                                    {allPostsMap[qId].isDeleted ? '(This post has been deleted by an administrator)' : allPostsMap[qId].content}
                                  </p>
                                </div>
                              )}
                            </span>
                          ))}
                          <span className="whitespace-pre-wrap">{line.raw.replace(/>>[a-zA-Z0-9_-]+/g, '').replace(/^>+/, '')}</span>
                        </div>
                      );
                    }

                    // Check for spoiler tags [spoiler]...[/spoiler]
                    if (line.raw.includes('[spoiler]')) {
                      const parts = line.raw.split(/(\[spoiler\].*?\[\/spoiler\])/g);
                      return (
                        <div key={idx} className="break-words whitespace-pre-wrap min-h-[1.3em]">
                          {parts.map((p, pIdx) => {
                            if (p.startsWith('[spoiler]') && p.endsWith('[/spoiler]')) {
                              const inner = p.replace('[spoiler]', '').replace('[/spoiler]', '');
                              const isRev = spoilerRevealed[idx * 100 + pIdx];
                              return (
                                <span
                                  key={pIdx}
                                  onClick={() => {
                                    sound.playClick();
                                    setSpoilerRevealed((prev) => ({ ...prev, [idx * 100 + pIdx]: !prev[idx * 100 + pIdx] }));
                                  }}
                                  className={`cursor-pointer px-1 rounded-xs transition-colors ${
                                    isRev
                                      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
                                      : 'bg-[var(--text-primary)] text-transparent hover:text-white/80'
                                  }`}
                                  title="Click to reveal spoiler"
                                >
                                  {inner}
                                </span>
                              );
                            }
                            return <span key={pIdx}>{p}</span>;
                          })}
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="break-words whitespace-pre-wrap min-h-[1.3em]">
                        {line.raw || '\u00A0'}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Backlinks row (Posts quoting this post) */}
      {post.repliesToThis && post.repliesToThis.length > 0 && (
        <div className="mt-2.5 pt-1 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-1 font-mono">
          <span>Replies:</span>
          {post.repliesToThis.map((repId) => (
            <button
              key={repId}
              onClick={() => handleQuoteClick(repId)}
              className="text-[var(--link-color)] hover:underline font-bold"
            >
              &gt;&gt;{repId.replace('p-', '')}
            </button>
          ))}
        </div>
      )}
    </article>
  );
};
