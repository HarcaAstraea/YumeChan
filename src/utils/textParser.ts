// Handles 4chan-style greentext, quote cross-referencing (>>12345), tripcodes, spoilers, and poetry formatting

/**
 * Format author name.
 * - For Original Posters (OP): Displays custom name, or 'Anonymous' if no name was provided.
 * - For Repliers: Displays custom name, or 'anon1', 'anon2', 'anon3'... sequentially if no name was provided.
 */
export function formatAnonymousName(
  rawAuthor?: string,
  anonIndex?: number,
  isOp: boolean = false
): string {
  const trimmed = (rawAuthor || '').trim();
  const isAnon =
    !trimmed ||
    trimmed.toLowerCase() === 'anonymous' ||
    trimmed.toLowerCase() === 'anon' ||
    /^anonymous(#\w+)?$/i.test(trimmed) ||
    /^anon\d*$/i.test(trimmed);

  if (!isAnon) {
    return trimmed;
  }

  if (isOp) {
    return 'Anonymous';
  }

  const index = anonIndex && anonIndex > 0 ? anonIndex : 1;
  return `anon${index}`;
}

export function getAnonymousIndexMap(thread: {
  opPost: { id: string; author: string };
  replies: { id: string; author: string }[];
}): Record<string, number> {
  const map: Record<string, number> = {};

  // OP is always the original poster (Anonymous)
  map[thread.opPost.id] = 0;

  let anonCount = 0;
  if (Array.isArray(thread.replies)) {
    for (const rep of thread.replies) {
      const trimmed = (rep.author || '').trim();
      const isAnon =
        !trimmed ||
        trimmed.toLowerCase() === 'anonymous' ||
        trimmed.toLowerCase() === 'anon' ||
        /^anonymous(#\w+)?$/i.test(trimmed) ||
        /^anon\d*$/i.test(trimmed);

      if (isAnon) {
        anonCount++;
        map[rep.id] = anonCount;
      }
    }
  }

  return map;
}

export function generateTripcode(rawName: string): { author: string; tripcode?: string } {
  if (!rawName.trim()) {
    return { author: 'Anonymous' };
  }

  const hashIdx = rawName.indexOf('#');
  if (hashIdx === -1) {
    return { author: rawName.trim() };
  }

  const namePart = rawName.slice(0, hashIdx).trim() || 'Anonymous';
  const keyPart = rawName.slice(hashIdx + 1);

  if (!keyPart) {
    return { author: namePart };
  }

  // Simple deterministic 8-char retro tripcode generator
  let hash = 0x811c9dc5;
  for (let i = 0; i < keyPart.length; i++) {
    hash ^= keyPart.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
  let trip = '!';
  let h = Math.abs(hash);
  for (let i = 0; i < 7; i++) {
    trip += chars[h % chars.length];
    h = Math.floor(h / chars.length) + (i * 37);
  }

  return { author: namePart, tripcode: trip };
}

export interface ParsedLine {
  type: 'greentext' | 'quote' | 'normal' | 'poetry-line' | 'heading' | 'code';
  raw: string;
  quoteIds?: string[];
}

export function parseContentLines(content: string, isPoetry: boolean = false): ParsedLine[] {
  if (!content) return [];
  const lines = content.split('\n');

  return lines.map((line) => {
    const trimmed = line.trim();

    if (isPoetry) {
      return {
        type: 'poetry-line',
        raw: line,
      };
    }

    if (trimmed.startsWith('&gt;&gt;') || trimmed.startsWith('>>')) {
      const quoteMatches = trimmed.match(/>>([a-zA-Z0-9_-]+)/g);
      const quoteIds = quoteMatches ? quoteMatches.map((m) => m.replace('>>', '')) : [];
      return {
        type: 'quote',
        raw: line,
        quoteIds,
      };
    }

    if (trimmed.startsWith('&gt;') || trimmed.startsWith('>')) {
      return {
        type: 'greentext',
        raw: line,
      };
    }

    if (trimmed.startsWith('==') && trimmed.endsWith('==')) {
      return {
        type: 'heading',
        raw: trimmed.slice(2, -2).trim(),
      };
    }

    return {
      type: 'normal',
      raw: line,
    };
  });
}

// Format relative and authentic 16-bit imageboard timestamp (e.g. 2026/08/23(Sun)12:08:10)
export function format16BitTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dayName = days[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${y}/${m}/${d}(${dayName})${hh}:${mm}:${ss}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format any post / thread ID into a retro 6-digit imageboard post number (e.g., No. 000001, No. 000042)
 */
export function formatPostNumber(id: string | number): string {
  if (typeof id === 'number') {
    return `No. ${String(Math.max(1, Math.floor(id))).padStart(6, '0')}`;
  }

  const clean = String(id).replace(/^(th-|p-|rep-)/, '');

  // If it's an integer or numeric string
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    return `No. ${String(Math.max(1, num)).padStart(6, '0')}`;
  }

  // If it's a timestamp-based base36 string (e.g. 'p-lno35f') or random string, hash consistently to a positive number 1..999999
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const sequenceNum = (hash % 999998) + 1;
  return `No. ${String(sequenceNum).padStart(6, '0')}`;
}

export function getPostNumberInt(id: string | number): number {
  if (typeof id === 'number') return id;
  const clean = String(id).replace(/^(th-|p-|rep-)/, '');
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return (hash % 999998) + 1;
}

/**
 * Format reply counter
 * e.g., if the OP post of the thread has ID/number `5`
 * and replyIndex is 1, totalReplies is 5 -> "RN. 5.1"
 * if totalReplies is 12:
 * if replyIndex is 1 -> "RN. 5.01"
 * if replyIndex is 10 -> "RN. 5.10"
 */
export function formatReplyNumber(threadId: string | number, replyIndex: number, totalReplies: number): string {
  const opNum = getPostNumberInt(threadId);
  const useTwoDigits = totalReplies > 9;
  const formattedIndex = useTwoDigits 
    ? String(replyIndex).padStart(2, '0') 
    : String(replyIndex);
  return `RN. ${opNum}.${formattedIndex}`;
}

