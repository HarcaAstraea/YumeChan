import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface PostRecord {
  id: string;
  thread_id: string;
  board_id: string;
  subject?: string;
  name: string;
  tripcode?: string;
  timestamp: number;
  content: string;
  content_type?: string;
  poetry_format?: string;
  attachment?: string;
  pixel_art_matrix?: number[][] | null;
  is_op: boolean;
  is_sticky: boolean;
  is_locked: boolean;
  is_deleted?: boolean;
  bumped_at: number;
}

interface RecycleBinRecord {
  id: string;
  postId: string;
  threadId: string;
  boardId: string;
  postNumberFormatted?: string;
  title?: string;
  postJson?: string;
  isOp: boolean;
  deletedAt: number;
  deletedBy?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const RECYCLE_FILE = path.join(DATA_DIR, 'recycle_bin.json');
const VALID_BOARDS = new Set(['yume', 'uta', 'mimi']);
const ADMIN_SECRET = 'yumechan1618';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function loadPostsFromDisk(): PostRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading posts from disk:', err);
  }
  return [];
}

function savePostsToDisk(posts: PostRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing posts to disk:', err);
  }
}

function loadRecycleBinFromDisk(): RecycleBinRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(RECYCLE_FILE)) {
      const data = fs.readFileSync(RECYCLE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading recycle bin from disk:', err);
  }
  return [];
}

function saveRecycleBinToDisk(records: RecycleBinRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(RECYCLE_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing recycle bin to disk:', err);
  }
}

let postsStore: PostRecord[] = loadPostsFromDisk();
let recycleBinStore: RecycleBinRecord[] = loadRecycleBinFromDisk();

const VALID_ADMIN_PASSCODES = new Set([
  'yumechan1618',
  'HaniBerry^0815',
  'ArcTwilight1014'
]);

const AUTH_ADMIN_DIGESTS = new Set([
  'a14fe84efb2bc888b1df9471b3d7f5aee628a519181f32d2382901729ceca843',
  '0ba3fc0416426e858113b8ca462d7f5030bc4063e3de536cba0129dbb9e9b4ef',
  '3b39af71ee8824872c5089e66e548fda17661e9bc6851607015e55064cdadeb9'
]);

function isValidSecret(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (VALID_ADMIN_PASSCODES.has(trimmed)) return true;
  if (AUTH_ADMIN_DIGESTS.has(trimmed)) return true;
  return false;
}

function verifyAdminAuth(req: express.Request): boolean {
  const authHeader = req.headers.authorization || (req.headers['x-admin-password'] as string) || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (isValidSecret(bearer)) return true;
  }
  if (isValidSecret(authHeader)) return true;
  const body = req.body || {};
  if (isValidSecret(body.adminPassword) || isValidSecret(body.adminToken) || isValidSecret(body.passcode)) {
    return true;
  }
  return false;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Download raw posts.json
app.get(['/api/download/posts.json', '/api/posts.json'], (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="posts.json"');
  res.send(JSON.stringify(postsStore, null, 2));
});

// Download raw recycle_bin.json
app.get(['/api/download/recycle_bin.json', '/api/recycle_bin.json'], (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="recycle_bin.json"');
  res.send(JSON.stringify(recycleBinStore, null, 2));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// GET /api: Fetch posts and threads
app.get('/api', (req, res) => {
  // Disable any browser or CDN caching for API GET requests
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const boardId = req.query.board as string | undefined;
  const threadId = req.query.thread as string | undefined;
  const includeDeleted = req.query.include_deleted !== 'false';

  let filtered = [...postsStore];

  if (!includeDeleted) {
    filtered = filtered.filter((p) => !p.is_deleted);
  }

  if (threadId) {
    filtered = filtered.filter((p) => p.thread_id === threadId || p.id === threadId);
    filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } else if (boardId && VALID_BOARDS.has(boardId)) {
    filtered = filtered.filter((p) => p.board_id === boardId);
    filtered.sort((a, b) => {
      if (a.is_sticky && !b.is_sticky) return -1;
      if (!a.is_sticky && b.is_sticky) return 1;
      return (b.bumped_at || b.timestamp || 0) - (a.bumped_at || a.timestamp || 0);
    });
  } else {
    filtered.sort((a, b) => {
      if (a.is_sticky && !b.is_sticky) return -1;
      if (!a.is_sticky && b.is_sticky) return 1;
      return (b.bumped_at || b.timestamp || 0) - (a.bumped_at || a.timestamp || 0);
    });
  }

  // Map to normalized frontend shape
  const formatted = filtered.map((p) => ({
    id: p.id,
    threadId: p.thread_id,
    boardId: p.board_id,
    subject: p.subject || '',
    name: p.name || 'Anonymous',
    tripcode: p.tripcode || '',
    timestamp: p.timestamp,
    content: p.content,
    contentType: p.content_type || 'text',
    poetryFormat: p.poetry_format || undefined,
    attachment: p.attachment || '',
    pixelArtMatrix: p.pixel_art_matrix || null,
    isOp: Boolean(p.is_op),
    isSticky: Boolean(p.is_sticky),
    isLocked: Boolean(p.is_locked),
    isDeleted: Boolean(p.is_deleted),
    deletedByAdmin: Boolean(p.is_deleted),
    bumpedAt: p.bumped_at || p.timestamp,
  }));

  res.json(formatted);
});

// POST /api: Mutation actions
app.post('/api', (req, res) => {
  const body = req.body || {};
  const action = body.action || '';
  const now = Date.now();

  // Admin authentication enforcement for destructive actions
  const adminActions = ['delete', 'restore', 'purge', 'permanent_delete', 'empty_recycle_bin'];
  if (adminActions.includes(action)) {
    if (!verifyAdminAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    }
  }

  // Create Thread
  if (action === 'create_thread') {
    const boardId = body.boardId;
    if (!boardId || !VALID_BOARDS.has(boardId)) {
      return res.status(400).json({ error: `Invalid boardId. Must be one of: ${Array.from(VALID_BOARDS).join(', ')}` });
    }

    const id = String(body.id || `th-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`);
    const isSticky = Boolean(body.isSticky);

    const newOp: PostRecord = {
      id,
      thread_id: id,
      board_id: boardId,
      subject: body.subject || '',
      name: body.name || 'Anonymous',
      tripcode: body.tripcode || '',
      timestamp: now,
      content: body.content || '',
      content_type: body.contentType || 'text',
      poetry_format: body.poetryFormat || undefined,
      attachment: body.attachment || undefined,
      pixel_art_matrix: body.pixelArtMatrix || null,
      is_op: true,
      is_sticky: isSticky,
      is_locked: false,
      is_deleted: false,
      bumped_at: now,
    };

    postsStore = postsStore.filter((p) => p.id !== id);
    postsStore.push(newOp);
    savePostsToDisk(postsStore);

    return res.status(201).json({
      success: true,
      id,
      threadId: id,
      timestamp: now,
      bumpedAt: now,
    });
  }

  // Create Reply
  if (action === 'create_reply') {
    const threadId = String(body.threadId || '');
    if (!threadId) {
      return res.status(400).json({ error: 'Missing threadId' });
    }

    const parentThread = postsStore.find((p) => p.id === threadId && p.is_op);
    if (!parentThread) {
      return res.status(404).json({ error: 'Parent thread not found' });
    }

    if (parentThread.is_locked) {
      return res.status(403).json({ error: 'Thread is locked' });
    }

    const effectiveBoardId = parentThread.board_id;
    const id = String(body.id || `rep-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`);
    const isSage = Boolean(body.sage);

    const newReply: PostRecord = {
      id,
      thread_id: threadId,
      board_id: effectiveBoardId,
      subject: body.subject || '',
      name: body.name || 'Anonymous',
      tripcode: body.tripcode || '',
      timestamp: now,
      content: body.content || '',
      content_type: body.contentType || 'text',
      poetry_format: body.poetryFormat || undefined,
      attachment: body.attachment || undefined,
      pixel_art_matrix: body.pixelArtMatrix || null,
      is_op: false,
      is_sticky: false,
      is_locked: false,
      is_deleted: false,
      bumped_at: now,
    };

    postsStore = postsStore.filter((p) => p.id !== id);
    postsStore.push(newReply);

    if (!isSage) {
      const opIndex = postsStore.findIndex((p) => p.id === threadId && p.is_op);
      if (opIndex !== -1) {
        postsStore[opIndex] = { ...postsStore[opIndex], bumped_at: now };
      }
    }
    savePostsToDisk(postsStore);

    return res.status(201).json({
      success: true,
      id,
      threadId,
      timestamp: now,
      bumpedAt: now,
    });
  }

  // Delete Post or Thread
  if (action === 'delete') {
    const postId = String(body.id || '');
    const targetPost = postsStore.find((p) => p.id === postId);
    if (!targetPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isOp = targetPost.is_op;
    const threadId = targetPost.thread_id || targetPost.id;
    const boardId = targetPost.board_id;
    const recId = `del-${now}-${postId}`;

    if (isOp) {
      // Soft delete OP + replies
      postsStore = postsStore.map((p) => {
        if (p.id === postId || p.thread_id === postId) {
          return { ...p, is_deleted: true };
        }
        return p;
      });
    } else {
      // Soft delete only this reply
      postsStore = postsStore.map((p) => {
        if (p.id === postId) {
          return { ...p, is_deleted: true };
        }
        return p;
      });
    }
    savePostsToDisk(postsStore);

    recycleBinStore = recycleBinStore.filter((r) => r.postId !== postId);
    recycleBinStore.unshift({
      id: recId,
      postId,
      threadId,
      boardId,
      postNumberFormatted: postId,
      title: targetPost.subject || '',
      postJson: JSON.stringify(targetPost),
      isOp,
      deletedAt: now,
      deletedBy: 'Admin',
    });
    saveRecycleBinToDisk(recycleBinStore);

    return res.json({ success: true });
  }

  // Restore Post or Thread
  if (action === 'restore') {
    const postId = String(body.id || '');
    const recEntry = recycleBinStore.find((r) => r.postId === postId || r.id === postId);
    const isOp = recEntry ? recEntry.isOp : false;

    if (isOp) {
      postsStore = postsStore.map((p) => {
        if (p.id === postId || p.thread_id === postId) {
          return { ...p, is_deleted: false };
        }
        return p;
      });
    } else {
      postsStore = postsStore.map((p) => {
        if (p.id === postId) {
          return { ...p, is_deleted: false };
        }
        return p;
      });
    }
    savePostsToDisk(postsStore);

    recycleBinStore = recycleBinStore.filter((r) => r.postId !== postId && r.id !== postId);
    saveRecycleBinToDisk(recycleBinStore);

    return res.json({ success: true });
  }

  // Purge
  if (action === 'purge' || action === 'permanent_delete') {
    const postId = String(body.id || '');
    const recEntry = recycleBinStore.find((r) => r.postId === postId || r.id === postId);
    const isOp = recEntry ? recEntry.isOp : false;

    if (isOp) {
      postsStore = postsStore.filter((p) => p.id !== postId && p.thread_id !== postId);
    } else {
      postsStore = postsStore.filter((p) => p.id !== postId);
    }
    savePostsToDisk(postsStore);

    recycleBinStore = recycleBinStore.filter((r) => r.postId !== postId && r.id !== postId);
    saveRecycleBinToDisk(recycleBinStore);

    return res.json({ success: true });
  }

  // Empty Recycle Bin
  if (action === 'empty_recycle_bin') {
    const targetBoard = body.boardId;
    if (targetBoard && VALID_BOARDS.has(targetBoard)) {
      postsStore = postsStore.filter((p) => !(p.is_deleted && p.board_id === targetBoard));
      recycleBinStore = recycleBinStore.filter((r) => r.boardId !== targetBoard);
    } else {
      postsStore = postsStore.filter((p) => !p.is_deleted);
      recycleBinStore = [];
    }
    savePostsToDisk(postsStore);
    saveRecycleBinToDisk(recycleBinStore);

    return res.json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

async function initServer() {
  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen on port if not running in a serverless function environment like Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

initServer();

export default app;
