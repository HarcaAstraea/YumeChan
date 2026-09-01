import { Thread, Post, AppSettings, DeletedPostRecord } from '../types';
import { INITIAL_THREADS } from './initialData';
import {
  fetchRemoteThreads,
  postRemoteThread,
  postRemoteReply,
  postRemoteDelete,
  postRemoteRestore,
  postRemotePurge,
  postRemoteEmptyRecycleBin,
} from './api';
import { formatPostNumber } from './textParser';

const STORAGE_KEY = 'yumechan_threads_v5_empty';
const SETTINGS_KEY = 'yumechan_settings_v1';
const RECYCLE_BIN_KEY = 'yumechan_recycle_bin_v1';
const PURGED_IDS_KEY = 'yumechan_purged_ids_v1';
const ADMIN_AUTH_KEY = 'yumechan_admin_auth';
const ADMIN_PASSCODE_KEY = 'yumechan_admin_passcode';

export function loadPermanentlyPurgedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PURGED_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function addPermanentlyPurgedId(postId: string): void {
  const current = loadPermanentlyPurgedIds();
  current.add(postId);
  try {
    localStorage.setItem(PURGED_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

const VALID_BOARD_IDS = ['yume', 'uta', 'mimi'];

// Clean legacy sample thread storage if present
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('yumechan_threads_v4_clean');
    localStorage.removeItem('yumechan_threads_v3');
    localStorage.removeItem('yumechan_threads_v2');
    localStorage.removeItem('yumechan_threads_v1');
    localStorage.removeItem('yumechan_threads');
  }
} catch {}

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'light',
  contrast: 'soft',
  soundEnabled: true,
  autoRefresh: true,
  autoRefreshInterval: 10,
  fontMode: 'pixel',
};

// Cross-tab broadcast channel for real-time post synchronization
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('yumechan_live_updates');
  }
} catch {}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Calculate the next sequential thread/post ID starting from 1 (No. 000001)
 * This counter is strictly for Threads/OPs so replies do not consume thread post numbers.
 */
export function getNextPostId(threads?: Thread[]): string {
  const currentThreads = threads || loadThreads();
  const recycleBin = loadRecycleBin();
  let maxId = 0;

  const checkId = (idStr: string | number | undefined) => {
    if (!idStr) return;
    const str = String(idStr);
    if (str.startsWith('rep-')) return; // Ignore replies entirely to keep counters separate!

    const clean = str.replace(/^(th-|p-)/, '');
    if (/^\d+$/.test(clean)) {
      const val = parseInt(clean, 10);
      if (val > maxId && val < 9999999) maxId = val;
    }
  };

  for (const th of currentThreads) {
    checkId(th.id);
    if (th.opPost) checkId(th.opPost.id);
  }

  for (const item of recycleBin) {
    if (item.isOp) {
      checkId(item.postId);
      checkId(item.threadId);
      if (item.originalThread) {
        checkId(item.originalThread.id);
        if (item.originalThread.opPost) checkId(item.originalThread.opPost.id);
      }
    }
  }

  return String(maxId + 1);
}

/**
 * Calculate the next sequential reply ID starting from 1 (e.g., rep-1, rep-2)
 * This is a separate counter strictly for replies, completely isolated from thread numbers.
 */
export function getNextReplyId(threads?: Thread[]): string {
  const currentThreads = threads || loadThreads();
  const recycleBin = loadRecycleBin();
  let maxReplyId = 0;

  const checkId = (idStr: string | number | undefined) => {
    if (!idStr) return;
    const str = String(idStr);
    let clean = str;
    if (str.startsWith('rep-')) {
      clean = str.replace('rep-', '');
    } else if (str.startsWith('p-') || str.startsWith('th-')) {
      clean = str.replace(/^(th-|p-)/, '');
    }
    if (/^\d+$/.test(clean)) {
      const val = parseInt(clean, 10);
      if (val > maxReplyId && val < 9999999) maxReplyId = val;
    }
  };

  for (const th of currentThreads) {
    if (Array.isArray(th.replies)) {
      for (const r of th.replies) {
        checkId(r.id);
      }
    }
  }

  for (const item of recycleBin) {
    if (!item.isOp) {
      checkId(item.postId);
    }
  }

  return `rep-${maxReplyId + 1}`;
}

/**
 * Normalizes all post numbers and anonymous names in threads without mutating inputs.
 * - Preserves existing stable post IDs so quotes (>>123) and links remain intact.
 * - Converts legacy IDs (e.g. 'p-123' or 'th-123') to clean stable numbers.
 * - OP is named 'Anonymous' (or their custom name).
 * - Anonymous repliers in each thread are named 'anon1', 'anon2', 'anon3', etc. sequentially.
 */
export function normalizeThreads(threads: Thread[]): { threads: Thread[]; changed: boolean } {
  if (!Array.isArray(threads) || threads.length === 0) {
    return { threads: [], changed: false };
  }

  let needsChange = false;

  // Deep clone to avoid mutating input objects
  const clonedThreads: Thread[] = threads.map((th) => ({
    ...th,
    opPost: {
      ...th.opPost,
      repliesToThis: Array.isArray(th.opPost.repliesToThis) ? [...th.opPost.repliesToThis] : undefined,
    },
    replies: Array.isArray(th.replies)
      ? th.replies.map((rep) => ({
          ...rep,
          repliesToThis: Array.isArray(rep.repliesToThis) ? [...rep.repliesToThis] : undefined,
        }))
      : [],
  }));

  const idMap = new Map<string, string>();

  // First pass: identify any legacy ID prefixes (e.g. "p-123", "th-123") and map them to clean IDs
  for (const th of clonedThreads) {
    if (th.opPost) {
      const rawId = String(th.opPost.id || '');
      const cleanId = rawId.replace(/^(th-|p-|rep-)/, '');
      if (cleanId && cleanId !== rawId) {
        th.opPost.id = cleanId;
        idMap.set(rawId, cleanId);
        idMap.set(`p-${rawId}`, cleanId);
        idMap.set(`p-${cleanId}`, cleanId);
        idMap.set(`th-${rawId}`, cleanId);
        idMap.set(`th-${cleanId}`, cleanId);
        needsChange = true;
      } else if (rawId) {
        idMap.set(`p-${rawId}`, rawId);
        idMap.set(`th-${rawId}`, rawId);
      }
    }

    if (Array.isArray(th.replies)) {
      for (const rep of th.replies) {
        const rawId = String(rep.id || '');
        let newRepId = rawId;
        if (!rawId.startsWith('rep-')) {
          const clean = rawId.replace(/^(th-|p-)/, '');
          if (/^\d+$/.test(clean)) {
            newRepId = `rep-${clean}`;
          } else if (rawId) {
            newRepId = `rep-${rawId}`;
          } else {
            newRepId = `rep-${Date.now()}`;
          }
        }
        if (newRepId !== rawId) {
          rep.id = newRepId;
          idMap.set(rawId, newRepId);
          idMap.set(`p-${rawId}`, newRepId);
          idMap.set(newRepId, newRepId);
          needsChange = true;
        } else if (rawId) {
          idMap.set(rawId, rawId);
          idMap.set(`p-${rawId}`, rawId);
          idMap.set(`rep-${rawId}`, rawId);
        }
      }
    }
  }

  // Second pass: Update thread IDs, reply threadIds, quote references, and anonymous names
  for (const th of clonedThreads) {
    const newThreadId = th.opPost.id;
    if (th.id !== newThreadId) {
      th.id = newThreadId;
      needsChange = true;
    }

    // OP author normalization
    const opAuthor = (th.opPost.author || '').trim();
    const isOpAnon =
      !opAuthor ||
      opAuthor.toLowerCase() === 'anonymous' ||
      opAuthor.toLowerCase() === 'anon' ||
      /^anonymous(#\w+)?$/i.test(opAuthor) ||
      /^anon\d*$/i.test(opAuthor);

    if (isOpAnon) {
      if (th.opPost.author !== 'Anonymous') {
        th.opPost.author = 'Anonymous';
        needsChange = true;
      }
    }
    if (th.opPost.threadId !== newThreadId) {
      th.opPost.threadId = newThreadId;
      needsChange = true;
    }

    // OP repliesToThis remapping
    if (Array.isArray(th.opPost.repliesToThis)) {
      const updatedOpRepliesToThis = th.opPost.repliesToThis.map(
        (oldRId) => idMap.get(oldRId) || idMap.get(`p-${oldRId}`) || oldRId
      );
      if (JSON.stringify(updatedOpRepliesToThis) !== JSON.stringify(th.opPost.repliesToThis)) {
        th.opPost.repliesToThis = updatedOpRepliesToThis;
        needsChange = true;
      }
    }

    // Repliers normalization
    let anonReplierCount = 0;
    if (Array.isArray(th.replies)) {
      for (const rep of th.replies) {
        if (rep.threadId !== newThreadId) {
          rep.threadId = newThreadId;
          needsChange = true;
        }
        const repAuthor = (rep.author || '').trim();
        const isAnon =
          !repAuthor ||
          repAuthor.toLowerCase() === 'anonymous' ||
          repAuthor.toLowerCase() === 'anon' ||
          /^anonymous(#\w+)?$/i.test(repAuthor) ||
          /^anon\d*$/i.test(repAuthor);

        if (isAnon) {
          anonReplierCount++;
          const newAnonName = `anon${anonReplierCount}`;
          if (rep.author !== newAnonName) {
            rep.author = newAnonName;
            needsChange = true;
          }
        }

        // Remap quote references in reply content (e.g. >>p-1 or >>12345)
        if (rep.content && idMap.size > 0) {
          const updatedContent = rep.content.replace(/>>([a-zA-Z0-9_-]+)/g, (match, qId) => {
            const mapped = idMap.get(qId) || idMap.get(`p-${qId}`);
            if (mapped) return `>>${mapped}`;
            return match;
          });
          if (updatedContent !== rep.content) {
            rep.content = updatedContent;
            needsChange = true;
          }
        }

        // Remap repliesToThis if present and check for change
        if (Array.isArray(rep.repliesToThis)) {
          const updatedRepliesToThis = rep.repliesToThis.map(
            (oldRId) => idMap.get(oldRId) || idMap.get(`p-${oldRId}`) || oldRId
          );
          if (JSON.stringify(updatedRepliesToThis) !== JSON.stringify(rep.repliesToThis)) {
            rep.repliesToThis = updatedRepliesToThis;
            needsChange = true;
          }
        }
      }
    }

    if (th.opPost.content && idMap.size > 0) {
      const updatedContent = th.opPost.content.replace(/>>([a-zA-Z0-9_-]+)/g, (match, qId) => {
        const mapped = idMap.get(qId) || idMap.get(`p-${qId}`);
        if (mapped) return `>>${mapped}`;
        return match;
      });
      if (updatedContent !== th.opPost.content) {
        th.opPost.content = updatedContent;
        needsChange = true;
      }
    }
  }

  return { threads: clonedThreads, changed: needsChange };
}

export function loadThreads(): Thread[] {
  if (typeof window === 'undefined') return INITIAL_THREADS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sanitize threads: ensure valid structure and boardId
        const sanitized = parsed.map((th) => {
          if (!th || typeof th !== 'object') return null;
          const boardId = VALID_BOARD_IDS.includes(th.boardId) ? th.boardId : 'yume';
          return {
            ...th,
            boardId,
            replies: Array.isArray(th.replies) ? th.replies : [],
            opPost: th.opPost || { id: '1', threadId: th.id || '1', content: '', author: 'Anonymous', createdAt: Date.now() }
          };
        }).filter(Boolean) as Thread[];

        // Normalize post numbers and anonymous names
        const { threads: normalized, changed } = normalizeThreads(sanitized);
        if (changed) {
          saveThreads(normalized);
        }
        return normalized;
      }
    }
  } catch {}
  return INITIAL_THREADS;
}

export function saveThreads(threads: Thread[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SYNC_THREADS', timestamp: Date.now() });
    }
  } catch {}
}

export async function addThread(newThread: Thread): Promise<Thread[]> {
  const current = loadThreads();
  const updated = [newThread, ...current];
  saveThreads(updated);
  dispatchLiveEvent('NEW_THREAD', { thread: newThread });

  try {
    await postRemoteThread(newThread);
  } catch (err) {
    console.error('Remote thread post failed:', err);
  }

  return updated;
}

export async function addReply(threadId: string, reply: Post): Promise<{ threads: Thread[]; updatedThread?: Thread }> {
  const current = loadThreads();
  let updatedThread: Thread | undefined;

  const updated = current.map((th) => {
    if (th.id === threadId) {
      const replies = [...th.replies, reply];
      const hasImage = !!(reply.imageUrl || reply.pixelArtData);

      // If reply is to a specific post ID, record the back-reference
      if (reply.replyToPostId) {
        if (th.opPost.id === reply.replyToPostId) {
          th.opPost.repliesToThis = [...(th.opPost.repliesToThis || []), reply.id];
        } else {
          replies.forEach((r) => {
            if (r.id === reply.replyToPostId) {
              r.repliesToThis = [...(r.repliesToThis || []), reply.id];
            }
          });
        }
      }

      updatedThread = {
        ...th,
        replies,
        repliesCount: replies.length,
        imagesCount: th.imagesCount + (hasImage ? 1 : 0),
        // If sage is enabled, do not bump thread
        lastBumpTime: reply.sage ? th.lastBumpTime : Date.now(),
      };
      return updatedThread;
    }
    return th;
  });

  // Re-sort threads by lastBumpTime (pinned threads remain at top)
  updated.sort((a, b) => {
    if (a.isSticky && !b.isSticky) return -1;
    if (!a.isSticky && b.isSticky) return 1;
    return b.lastBumpTime - a.lastBumpTime;
  });

  saveThreads(updated);
  dispatchLiveEvent('NEW_REPLY', { threadId, reply });

  try {
    const targetBoardId = reply.boardId || updatedThread?.boardId || 'yume';
    await postRemoteReply(threadId, reply, targetBoardId);
  } catch (err) {
    console.error('Remote reply post failed:', err);
  }

  return { threads: updated, updatedThread };
}

/* =========================================================================
   RECYCLE BIN & ADMIN MODERATION OPERATIONS
   ========================================================================= */

export function loadRecycleBin(): DeletedPostRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveRecycleBin(records: DeletedPostRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(records));
    dispatchLiveEvent('RECYCLE_BIN_UPDATE', { count: records.length });
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'RECYCLE_BIN_UPDATE', timestamp: Date.now() });
    }
  } catch {}
}

/**
 * Move a post (either an OP thread or a Reply) into the Recycle Bin
 * Marks the post as deleted so post numbers and quote references are preserved
 */
export async function deletePostToRecycleBin(
  postId: string
): Promise<{ threads: Thread[]; deletedRecord: DeletedPostRecord | null }> {
  const current = loadThreads();
  const recycleBin = loadRecycleBin();
  let deletedRecord: DeletedPostRecord | null = null;

  const newThreads = current.map((th) => {
    // Check if OP is being deleted
    if (th.id === postId || th.opPost.id === postId) {
      const opPost = th.opPost;
      deletedRecord = {
        id: `del-${Date.now()}-${opPost.id}`,
        postId: opPost.id,
        threadId: th.id,
        boardId: th.boardId,
        postNumberFormatted: formatPostNumber(opPost.id),
        title: th.title || opPost.subject || 'Untitled Thread',
        post: { ...opPost },
        isOp: true,
        deletedAt: Date.now(),
        deletedBy: 'Admin',
        originalThread: { ...th },
      };

      return {
        ...th,
        opPost: {
          ...opPost,
          isDeleted: true,
          deletedByAdmin: true,
          deletedAt: Date.now(),
          originalContentBackup: opPost.content,
        },
      };
    }

    // Check if a reply inside this thread is being deleted
    const replyIdx = th.replies.findIndex((r) => r.id === postId);
    if (replyIdx !== -1) {
      const foundReply = th.replies[replyIdx];
      deletedRecord = {
        id: `del-${Date.now()}-${foundReply.id}`,
        postId: foundReply.id,
        threadId: th.id,
        boardId: th.boardId,
        postNumberFormatted: formatPostNumber(foundReply.id),
        title: foundReply.subject || `Reply in "${th.title}"`,
        post: { ...foundReply },
        isOp: false,
        deletedAt: Date.now(),
        deletedBy: 'Admin',
      };

      const updatedReplies = th.replies.map((r) => {
        if (r.id === postId) {
          return {
            ...r,
            isDeleted: true,
            deletedByAdmin: true,
            deletedAt: Date.now(),
            originalContentBackup: r.content,
          };
        }
        return r;
      });

      return {
        ...th,
        replies: updatedReplies,
      };
    }

    return th;
  });

  if (deletedRecord) {
    saveThreads(newThreads);
    saveRecycleBin([deletedRecord, ...recycleBin]);
    dispatchLiveEvent('DELETE_POST', { postId, deletedRecord });
    try {
      await postRemoteDelete(postId, deletedRecord, deletedRecord.boardId);
    } catch (err) {
      console.error('Remote delete failed:', err);
    }
  }

  return { threads: newThreads, deletedRecord };
}

/**
 * Restore a deleted post from the Recycle Bin back to the live BBS
 */
export async function restorePostFromRecycleBin(
  recordId: string
): Promise<{ threads: Thread[]; restoredRecord: DeletedPostRecord | null }> {
  const current = loadThreads();
  const recycleBin = loadRecycleBin();
  const targetRecord = recycleBin.find((r) => r.id === recordId || r.postId === recordId);

  if (!targetRecord) return { threads: current, restoredRecord: null };

  let updatedThreads = current.map((th) => {
    // If OP post is restored
    if (targetRecord.isOp && (th.id === targetRecord.threadId || th.opPost.id === targetRecord.postId)) {
      return {
        ...th,
        opPost: {
          ...th.opPost,
          ...targetRecord.post,
          isDeleted: false,
          deletedByAdmin: false,
          deletedAt: undefined,
        },
      };
    }

    // If reply is restored
    if (th.id === targetRecord.threadId || th.replies.some((r) => r.id === targetRecord.postId)) {
      const updatedReplies = th.replies.map((r) => {
        if (r.id === targetRecord.postId) {
          return {
            ...r,
            ...targetRecord.post,
            isDeleted: false,
            deletedByAdmin: false,
            deletedAt: undefined,
          };
        }
        return r;
      });

      // If reply was completely absent, append it
      if (!th.replies.some((r) => r.id === targetRecord.postId)) {
        updatedReplies.push({
          ...targetRecord.post,
          isDeleted: false,
          deletedByAdmin: false,
        });
        updatedReplies.sort((a, b) => a.createdAt - b.createdAt);
      }

      return {
        ...th,
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
      };
    }

    return th;
  });

  // If thread was missing completely, restore it
  if (targetRecord.isOp && targetRecord.originalThread && !updatedThreads.some((th) => th.id === targetRecord.originalThread!.id || th.opPost.id === targetRecord.postId)) {
    updatedThreads = [
      {
        ...targetRecord.originalThread,
        opPost: {
          ...targetRecord.originalThread.opPost,
          isDeleted: false,
          deletedByAdmin: false,
        },
      },
      ...updatedThreads,
    ];
  }

  const newRecycleBin = recycleBin.filter((r) => r.id !== targetRecord.id);
  saveThreads(updatedThreads);
  saveRecycleBin(newRecycleBin);
  dispatchLiveEvent('RESTORE_POST', { record: targetRecord });

  try {
    await postRemoteRestore(targetRecord.postId, targetRecord.boardId);
  } catch (err) {
    console.error('Remote restore failed:', err);
  }

  return { threads: updatedThreads, restoredRecord: targetRecord };
}

/**
 * Permanently delete an item completely from the Recycle Bin
 */
export async function permanentlyDeleteFromRecycleBin(
  recordId: string
): Promise<{ threads: Thread[]; recycleBin: DeletedPostRecord[] }> {
  const recycleBin = loadRecycleBin();
  const currentThreads = loadThreads();

  const targetRecord = recycleBin.find((r) => r.id === recordId || r.postId === recordId);
  const postId = targetRecord ? targetRecord.postId : recordId;
  const boardId = targetRecord ? targetRecord.boardId : undefined;

  if (postId) {
    addPermanentlyPurgedId(postId);
  }

  // Filter out the deleted post/thread completely from active threads
  const updatedThreads = currentThreads.filter((th) => {
    if (targetRecord?.isOp && (th.id === postId || th.opPost.id === postId)) {
      return false;
    }
    return true;
  }).map((th) => {
    const filteredReplies = th.replies.filter((r) => r.id !== postId);
    return {
      ...th,
      replies: filteredReplies,
      repliesCount: filteredReplies.length,
    };
  });

  const updatedBin = recycleBin.filter((r) => r.id !== recordId && r.postId !== recordId);
  saveThreads(updatedThreads);
  saveRecycleBin(updatedBin);
  dispatchLiveEvent('PURGE_POST', { recordId, postId });

  try {
    await postRemotePurge(postId, boardId);
  } catch (err) {
    console.error('Remote purge failed:', err);
  }

  return { threads: updatedThreads, recycleBin: updatedBin };
}

/**
 * Purge the entire Recycle Bin permanently
 */
export async function emptyRecycleBin(): Promise<Thread[]> {
  const recycleBin = loadRecycleBin();
  const deletedPostIds = new Set(recycleBin.map((r) => r.postId));
  for (const id of deletedPostIds) {
    addPermanentlyPurgedId(id);
  }
  const currentThreads = loadThreads();

  const updatedThreads = currentThreads.filter((th) => {
    if (th.opPost.isDeleted || deletedPostIds.has(th.id) || deletedPostIds.has(th.opPost.id)) {
      return false;
    }
    return true;
  }).map((th) => {
    const filteredReplies = th.replies.filter((r) => !r.isDeleted && !deletedPostIds.has(r.id));
    return {
      ...th,
      replies: filteredReplies,
      repliesCount: filteredReplies.length,
    };
  });

  saveThreads(updatedThreads);
  saveRecycleBin([]);
  dispatchLiveEvent('EMPTY_RECYCLE_BIN', {});

  try {
    await postRemoteEmptyRecycleBin();
  } catch (err) {
    console.error('Remote empty recycle bin failed:', err);
  }

  return updatedThreads;
}

/* =========================================================================
   ADMIN SESSION & PASSCODE
   ========================================================================= */

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {}
  return false;
}

export function getAdminAuthToken(): string {
  if (typeof window === 'undefined') return 'yumechan1618';
  try {
    const stored = sessionStorage.getItem(ADMIN_PASSCODE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch {}
  return 'yumechan1618';
}

export function setAdminAuthenticated(auth: boolean, passcode?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (auth) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      if (passcode) {
        sessionStorage.setItem(ADMIN_PASSCODE_KEY, passcode.trim());
      }
    } else {
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
      sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
    }
    dispatchLiveEvent('ADMIN_AUTH_CHANGE', { authenticated: auth });
  } catch {}
}

// Cryptographic SHA-256 hash calculator using Web Crypto API with robust fallback
export async function computeSha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Pure JS fallback with corrected prime sieve (i = candidate * candidate)
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  let ascii = input;
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = candidate * candidate; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 !== 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const t1 =
        (hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ch +
          k[i] +
          w[i]) |
        0;
      const t2 =
        ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
          maj) |
        0;
      hash = [(t1 + t2) | 0, hash[0], hash[1], hash[2], (hash[3] + t1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Authorized SHA-256 hash digests (Passcodes are never stored in plaintext)
const AUTH_ADMIN_DIGESTS = new Set([
  'a14fe84efb2bc888b1df9471b3d7f5aee628a519181f32d2382901729ceca843', // yumechan1618
  '0ba3fc0416426e858113b8ca462d7f5030bc4063e3de536cba0129dbb9e9b4ef', // HaniBerry^0815
  '3b39af71ee8824872c5089e66e548fda17661e9bc6851607015e55064cdadeb9', // ArcTwilight1014
]);

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const hash = await computeSha256(password.trim());
  return AUTH_ADMIN_DIGESTS.has(hash);
}

/**
 * Fetch and sync fresh threads from Cloudflare D1 if available
 */
export async function syncWithCloudflareD1(timeoutMs: number = 3000): Promise<Thread[] | null> {
  const remoteThreads = await fetchRemoteThreads(undefined, timeoutMs);
  if (remoteThreads !== null) {
    const localThreads = loadThreads();
    const recycleBin = loadRecycleBin();
    const permanentlyPurgedIds = loadPermanentlyPurgedIds();
    const recycleBinPostMap = new Map(recycleBin.map((r) => [r.postId, r]));

    if (localThreads.length === 0) {
      // Filter out only permanently purged posts from remote
      const filteredRemote = remoteThreads.filter(
        (t) => !permanentlyPurgedIds.has(t.id) && !permanentlyPurgedIds.has(t.opPost.id)
      );

      // Auto sync deleted posts into recycle bin
      let binUpdated = false;
      const newBinEntries: DeletedPostRecord[] = [...recycleBin];
      filteredRemote.forEach((th) => {
        const checkAndAddBin = (p: Post, isOp: boolean) => {
          if (p.isDeleted && !recycleBinPostMap.has(p.id)) {
            const recRecord: DeletedPostRecord = {
              id: `del-${Date.now()}-${p.id}`,
              postId: p.id,
              threadId: th.id,
              boardId: th.boardId,
              postNumberFormatted: formatPostNumber(p.id),
              title: th.title || p.subject || 'Deleted Post',
              post: { ...p },
              isOp,
              deletedAt: Date.now(),
              deletedBy: 'Admin',
            };
            newBinEntries.unshift(recRecord);
            recycleBinPostMap.set(p.id, recRecord);
            binUpdated = true;
          }
        };
        checkAndAddBin(th.opPost, true);
        th.replies.forEach((r) => checkAndAddBin(r, false));
      });

      if (binUpdated) {
        saveRecycleBin(newBinEntries);
        dispatchLiveEvent('RECYCLE_BIN_UPDATE', newBinEntries);
      }

      saveThreads(filteredRemote);
      dispatchLiveEvent('SYNC_THREADS', { timestamp: Date.now() });
      return filteredRemote;
    }

    const threadMap = new Map<string, Thread>();
    const localMap = new Map<string, Thread>(localThreads.map((t) => [t.id, t]));

    // First evaluate remote threads
    for (const rt of remoteThreads) {
      if (permanentlyPurgedIds.has(rt.id) || permanentlyPurgedIds.has(rt.opPost.id)) {
        continue;
      }

      const lt = localMap.get(rt.id);

      // OP Post deletion status: remote state is authority
      const opDeleted = Boolean(rt.opPost.isDeleted);
      const mergedOpPost: Post = {
        ...(lt?.opPost || rt.opPost),
        ...rt.opPost,
        isDeleted: opDeleted,
        deletedByAdmin: opDeleted,
      };

      // Merge replies from remote and local
      const remoteReplyMap = new Map<string, Post>((rt.replies || []).map((r) => [r.id, r]));
      const localReplyMap = new Map<string, Post>((lt?.replies || []).map((r) => [r.id, r]));

      const replyIds = new Set<string>([...remoteReplyMap.keys(), ...localReplyMap.keys()]);
      const mergedReplies: Post[] = [];

      replyIds.forEach((rid) => {
        if (permanentlyPurgedIds.has(rid)) return;

        const rr = remoteReplyMap.get(rid);
        const lr = localReplyMap.get(rid);

        if (rr && lr) {
          const isDel = Boolean(rr.isDeleted);
          mergedReplies.push({
            ...lr,
            ...rr,
            isDeleted: isDel,
            deletedByAdmin: isDel,
          });
        } else if (rr) {
          mergedReplies.push(rr);
        } else if (lr) {
          // Keep only if it's extremely new (created in the last 60 seconds) and not synced yet
          const ageMs = Math.abs(Date.now() - (lr.createdAt || 0));
          if (ageMs < 60000) {
            mergedReplies.push(lr);
          }
        }
      });

      mergedReplies.sort((a, b) => a.createdAt - b.createdAt);

      const mergedThread: Thread = {
        ...rt,
        opPost: mergedOpPost,
        replies: mergedReplies,
        repliesCount: mergedReplies.length,
        imagesCount: Math.max(
          (mergedOpPost.imageUrl || mergedOpPost.pixelArtData ? 1 : 0) +
            mergedReplies.filter((r) => r.imageUrl || r.pixelArtData).length,
          rt.imagesCount || 0
        ),
        lastBumpTime: Math.max(rt.lastBumpTime || 0, lt?.lastBumpTime || 0),
      };

      threadMap.set(rt.id, mergedThread);
    }

    // Retain any local threads that haven't propagated to remote yet
    for (const lt of localThreads) {
      if (permanentlyPurgedIds.has(lt.id) || permanentlyPurgedIds.has(lt.opPost.id)) {
        continue;
      }
      if (!threadMap.has(lt.id)) {
        // Keep only if it's very new (created in the last 60 seconds) and not synced yet
        const ageMs = Math.abs(Date.now() - (lt.createdAt || 0));
        if (ageMs < 60000) {
          threadMap.set(lt.id, lt);
        }
      }
    }

    const mergedThreads = Array.from(threadMap.values());
    mergedThreads.sort((a, b) => {
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      return (b.lastBumpTime || b.createdAt || 0) - (a.lastBumpTime || a.createdAt || 0);
    });

    // Auto sync any deleted posts into local recycle bin if not present
    let recycleBinUpdated = false;
    let newBinEntries: DeletedPostRecord[] = [...recycleBin];

    mergedThreads.forEach((th) => {
      const checkAndAddBin = (p: Post, isOp: boolean) => {
        if (p.isDeleted && !recycleBinPostMap.has(p.id)) {
          const recRecord: DeletedPostRecord = {
            id: `del-${Date.now()}-${p.id}`,
            postId: p.id,
            threadId: th.id,
            boardId: th.boardId,
            postNumberFormatted: formatPostNumber(p.id),
            title: th.title || p.subject || 'Deleted Post',
            post: { ...p },
            isOp,
            deletedAt: Date.now(),
            deletedBy: 'Admin',
          };
          newBinEntries.unshift(recRecord);
          recycleBinPostMap.set(p.id, recRecord);
          recycleBinUpdated = true;
        }
      };

      checkAndAddBin(th.opPost, true);
      th.replies.forEach((r) => checkAndAddBin(r, false));
    });

    // Filter out restored active post IDs from local recycle bin entries
    const activeRestoredPostIds = new Set<string>();
    mergedThreads.forEach((th) => {
      if (!th.opPost.isDeleted) activeRestoredPostIds.add(th.opPost.id);
      th.replies.forEach((r) => {
        if (!r.isDeleted) activeRestoredPostIds.add(r.id);
      });
    });

    const cleanedBinEntries = newBinEntries.filter((r) => !activeRestoredPostIds.has(r.postId));
    if (cleanedBinEntries.length !== newBinEntries.length) {
      newBinEntries = cleanedBinEntries;
      recycleBinUpdated = true;
    }

    if (recycleBinUpdated) {
      saveRecycleBin(newBinEntries);
      dispatchLiveEvent('RECYCLE_BIN_UPDATE', newBinEntries);
    }

    saveThreads(mergedThreads);
    dispatchLiveEvent('SYNC_THREADS', { timestamp: Date.now() });
    return mergedThreads;
  }
  return null;
}

// Event Dispatcher for active component reactive updates
function dispatchLiveEvent(type: string, detail: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yumechan-live-event', { detail: { type, detail } }));
  }
}

export function subscribeToLiveUpdates(callback: (type: string, data: unknown) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      callback(customEvent.detail.type, customEvent.detail.detail);
    }
  };

  const bcHandler = (e: MessageEvent) => {
    if (e.data && e.data.type === 'SYNC_THREADS') {
      callback('SYNC_THREADS', e.data);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('yumechan-live-event', handler);
  }

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', bcHandler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('yumechan-live-event', handler);
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
  };
}

export function downloadJsonBackup(filename: 'posts.json' | 'recycle_bin.json', data: any): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(`Failed to download ${filename}:`, err);
  }
}
