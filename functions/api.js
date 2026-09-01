// functions/api.js - Cloudflare Worker / Pages API endpoint for YumeChan

const VALID_BOARDS = new Set(['yume', 'uta', 'mimi']);

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

function isValidSecret(val, env) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (env && env.ADMIN_SECRET && trimmed === env.ADMIN_SECRET.trim()) return true;
  if (VALID_ADMIN_PASSCODES.has(trimmed)) return true;
  if (AUTH_ADMIN_DIGESTS.has(trimmed)) return true;
  return false;
}

// Validate admin token or password
function verifyAdminAuth(request, body, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const xAdminPass = request.headers.get('X-Admin-Password') || '';
  const xAdminToken = request.headers.get('X-Admin-Token') || '';
  
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (isValidSecret(bearer, env)) return true;
  }
  if (isValidSecret(authHeader, env)) return true;
  if (isValidSecret(xAdminPass, env)) return true;
  if (isValidSecret(xAdminToken, env)) return true;
  if (body) {
    if (isValidSecret(body.adminPassword, env)) return true;
    if (isValidSecret(body.adminToken, env)) return true;
    if (isValidSecret(body.passcode, env)) return true;
  }
  return false;
}

let d1TablesInitialized = false;

async function ensureD1Tables(DB) {
  if (d1TablesInitialized || !DB) return;
  try {
    await DB.batch([
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          thread_id TEXT,
          board_id TEXT,
          subject TEXT,
          name TEXT,
          author TEXT,
          tripcode TEXT,
          timestamp INTEGER,
          created_at INTEGER,
          content TEXT,
          content_type TEXT,
          poetry_format TEXT,
          poetry_author_note TEXT,
          attachment TEXT,
          image_url TEXT,
          image_meta_json TEXT,
          pixel_art_matrix TEXT,
          pixel_art_data TEXT,
          pixel_art_grid_json TEXT,
          is_op INTEGER DEFAULT 0,
          is_sticky INTEGER DEFAULT 0,
          is_locked INTEGER DEFAULT 0,
          is_deleted INTEGER DEFAULT 0,
          sage INTEGER DEFAULT 0,
          reply_to_post_id TEXT,
          replies_to_this_json TEXT,
          bumped_at INTEGER
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS recycle_bin (
          id TEXT PRIMARY KEY,
          postId TEXT,
          threadId TEXT,
          boardId TEXT,
          postNumberFormatted TEXT,
          title TEXT,
          postJson TEXT,
          isOp INTEGER DEFAULT 0,
          deletedAt INTEGER,
          deletedBy TEXT
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          board_id TEXT,
          title TEXT,
          author TEXT,
          tripcode TEXT,
          comment TEXT,
          image_url TEXT,
          pixel_art_matrix TEXT,
          created_at INTEGER,
          bumped_at INTEGER,
          last_bump_time INTEGER,
          is_sticky INTEGER DEFAULT 0,
          is_locked INTEGER DEFAULT 0,
          reply_count INTEGER DEFAULT 0,
          replies_count INTEGER DEFAULT 0,
          images_count INTEGER DEFAULT 0
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS boards (
          id TEXT PRIMARY KEY,
          slug TEXT,
          name TEXT,
          jp_name TEXT,
          description TEXT,
          icon TEXT,
          accent_color TEXT,
          tagline TEXT,
          rules TEXT
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS replies (
          id TEXT PRIMARY KEY,
          thread_id TEXT,
          author TEXT,
          tripcode TEXT,
          comment TEXT,
          image_url TEXT,
          pixel_art_matrix TEXT,
          created_at INTEGER
        )
      `)
    ]);
    d1TablesInitialized = true;
  } catch (err) {
    console.error('Failed to ensure D1 database schema tables exist:', err);
  }
}

export async function handleApiRequest(request, env) {
  const DB = env.DB;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password, X-Admin-Token',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!DB) {
    return new Response(
      JSON.stringify({ error: 'D1 binding DB is not configured in this environment.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  await ensureD1Tables(DB);

  try {
    // 1. GET: Fetch posts
    if (request.method === 'GET') {
      const boardId = url.searchParams.get('board');
      const threadId = url.searchParams.get('thread');
      const includeDeleted = url.searchParams.get('include_deleted') !== 'false';

      let query = `
        SELECT 
          id, thread_id, board_id, subject, name, tripcode, timestamp,
          content, content_type, poetry_format, attachment, pixel_art_matrix,
          is_op, is_sticky, is_locked, is_deleted, bumped_at
        FROM posts
      `;
      const conditions = [];
      const params = [];

      if (!includeDeleted) {
        conditions.push(`(is_deleted = 0 OR is_deleted IS NULL)`);
      }

      if (threadId) {
        conditions.push(`(thread_id = ? OR id = ?)`);
        params.push(threadId, threadId);
      } else if (boardId) {
        if (VALID_BOARDS.has(boardId)) {
          conditions.push(`board_id = ?`);
          params.push(boardId);
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      if (threadId) {
        query += ` ORDER BY timestamp ASC`;
      } else {
        query += ` ORDER BY is_sticky DESC, bumped_at DESC, timestamp DESC LIMIT 200`;
      }

      const { results } = await DB.prepare(query).bind(...params).all();

      const posts = (results || []).map((row) => {
        let parsedPixelMatrix = null;
        if (row.pixel_art_matrix) {
          try {
            parsedPixelMatrix = typeof row.pixel_art_matrix === 'string'
              ? JSON.parse(row.pixel_art_matrix)
              : row.pixel_art_matrix;
          } catch {
            parsedPixelMatrix = null;
          }
        }

        return {
          id: row.id,
          threadId: row.thread_id || row.id,
          boardId: row.board_id || 'yume',
          subject: row.subject || '',
          name: row.name || 'Anonymous',
          tripcode: row.tripcode || '',
          timestamp: Number(row.timestamp || Date.now()),
          content: row.content || '',
          contentType: row.content_type || 'text',
          poetryFormat: row.poetry_format || undefined,
          attachment: row.attachment || '',
          pixelArtMatrix: parsedPixelMatrix,
          isOp: Boolean(row.is_op),
          isSticky: Boolean(row.is_sticky),
          isLocked: Boolean(row.is_locked),
          isDeleted: Boolean(row.is_deleted),
          deletedByAdmin: Boolean(row.is_deleted),
          bumpedAt: Number(row.bumped_at || row.timestamp || Date.now()),
        };
      });

      return new Response(JSON.stringify(posts), { headers: corsHeaders });
    }

    // 2. POST: Create thread, reply, or admin actions
    if (request.method === 'POST') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        // empty body fallback
      }

      const action = body.action || '';

      // --- ADMIN PROTECTED ACTIONS ---
      const adminActions = ['delete', 'restore', 'purge', 'permanent_delete', 'empty_recycle_bin', 'export_posts', 'export_recycle_bin'];
      if (adminActions.includes(action)) {
        if (!verifyAdminAuth(request, body, env)) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized: Admin authentication required.' }),
            { status: 401, headers: corsHeaders }
          );
        }
      }

      if (action === 'export_posts') {
        const { results } = await DB.prepare(`SELECT * FROM posts ORDER BY timestamp ASC`).all();
        return new Response(JSON.stringify(results || [], null, 2), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="posts.json"',
          },
        });
      }

      if (action === 'export_recycle_bin') {
        const { results } = await DB.prepare(`SELECT * FROM recycle_bin ORDER BY deleted_at DESC`).all();
        return new Response(JSON.stringify(results || [], null, 2), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="recycle_bin.json"',
          },
        });
      }

      // Action: Soft delete post (or entire thread if OP)
      if (action === 'delete' && body.id) {
        const postId = String(body.id);

        // Fetch authoritative post from database
        const targetPost = await DB.prepare(`SELECT * FROM posts WHERE id = ? LIMIT 1`).bind(postId).first();
        if (!targetPost) {
          return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: corsHeaders });
        }

        const now = Date.now();
        const isOpPost = Boolean(targetPost.is_op);
        const threadId = targetPost.thread_id || targetPost.id;
        const boardId = targetPost.board_id || 'yume';
        const recId = `del-${now}-${postId}`;
        const postJson = JSON.stringify(targetPost);

        if (isOpPost) {
          // Soft-delete the entire thread
          await DB.batch([
            DB.prepare(`
              INSERT INTO recycle_bin (id, postId, threadId, boardId, postNumberFormatted, title, postJson, isOp, deletedAt, deletedBy)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(recId, postId, threadId, boardId, postId, targetPost.subject || '', postJson, 1, now, 'Admin'),
            DB.prepare(`UPDATE posts SET is_deleted = 1 WHERE id = ? OR thread_id = ?`).bind(postId, postId),
          ]);
        } else {
          // Soft-delete only this single reply
          await DB.batch([
            DB.prepare(`
              INSERT INTO recycle_bin (id, postId, threadId, boardId, postNumberFormatted, title, postJson, isOp, deletedAt, deletedBy)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(recId, postId, threadId, boardId, postId, targetPost.subject || '', postJson, 0, now, 'Admin'),
            DB.prepare(`UPDATE posts SET is_deleted = 1 WHERE id = ?`).bind(postId),
          ]);
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // Action: Restore post or thread
      if (action === 'restore' && body.id) {
        const postId = String(body.id);
        const recEntry = await DB.prepare(`SELECT * FROM recycle_bin WHERE postId = ? OR id = ? LIMIT 1`).bind(postId, postId).first();
        let isOp = recEntry ? Boolean(recEntry.isOp) : false;
        if (!isOp) {
          const postInDb = await DB.prepare(`SELECT is_op FROM posts WHERE id = ? LIMIT 1`).bind(postId).first();
          if (postInDb && Boolean(postInDb.is_op)) {
            isOp = true;
          }
        }

        if (isOp) {
          await DB.batch([
            DB.prepare(`DELETE FROM recycle_bin WHERE postId = ? OR id = ?`).bind(postId, postId),
            DB.prepare(`UPDATE posts SET is_deleted = 0 WHERE id = ? OR thread_id = ?`).bind(postId, postId),
          ]);
        } else {
          await DB.batch([
            DB.prepare(`DELETE FROM recycle_bin WHERE postId = ? OR id = ?`).bind(postId, postId),
            DB.prepare(`UPDATE posts SET is_deleted = 0 WHERE id = ?`).bind(postId),
          ]);
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // Action: Permanently purge
      if ((action === 'purge' || action === 'permanent_delete') && body.id) {
        const postId = String(body.id);
        const recEntry = await DB.prepare(`SELECT * FROM recycle_bin WHERE postId = ? OR id = ? LIMIT 1`).bind(postId, postId).first();
        const isOp = recEntry ? Boolean(recEntry.isOp) : false;

        if (isOp) {
          await DB.batch([
            DB.prepare(`DELETE FROM recycle_bin WHERE postId = ? OR id = ?`).bind(postId, postId),
            DB.prepare(`DELETE FROM posts WHERE id = ? OR thread_id = ?`).bind(postId, postId),
          ]);
        } else {
          await DB.batch([
            DB.prepare(`DELETE FROM recycle_bin WHERE postId = ? OR id = ?`).bind(postId, postId),
            DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(postId),
          ]);
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // Action: Empty recycle bin (scoped by board if provided)
      if (action === 'empty_recycle_bin') {
        const targetBoardId = body.boardId;
        if (targetBoardId && VALID_BOARDS.has(targetBoardId)) {
          await DB.batch([
            DB.prepare(`DELETE FROM posts WHERE is_deleted = 1 AND board_id = ?`).bind(targetBoardId),
            DB.prepare(`DELETE FROM recycle_bin WHERE boardId = ?`).bind(targetBoardId),
          ]);
        } else {
          await DB.batch([
            DB.prepare(`DELETE FROM posts WHERE is_deleted = 1`),
            DB.prepare(`DELETE FROM recycle_bin`),
          ]);
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // Action: Create Thread
      if (action === 'create_thread') {
        const boardId = body.boardId;
        if (!boardId || !VALID_BOARDS.has(boardId)) {
          return new Response(JSON.stringify({ error: `Invalid boardId. Must be one of: ${Array.from(VALID_BOARDS).join(', ')}` }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const now = Date.now();
        const id = body.id || `th-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
        const threadId = id;
        const subject = String(body.subject || body.title || '').trim();
        const name = String(body.name || body.author || 'Anonymous').trim();
        const tripcode = String(body.tripcode || '').trim();
        const content = String(body.content || body.comment || '').trim();
        const contentType = body.contentType || 'text';
        const poetryFormat = body.poetryFormat || null;
        const attachment = body.attachment || body.imageUrl || null;
        const pixelArtMatrix = body.pixelArtMatrix ? JSON.stringify(body.pixelArtMatrix) : null;
        const isSticky = body.isSticky ? 1 : 0;

        await DB.prepare(`
          INSERT INTO posts (
            id, thread_id, board_id, subject, name, tripcode, timestamp, content, content_type, poetry_format, attachment, pixel_art_matrix, is_op, is_sticky, is_locked, is_deleted, bumped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0, ?)
        `).bind(
          id, threadId, boardId, subject, name, tripcode, now, content, contentType, poetryFormat, attachment, pixelArtMatrix, isSticky, now
        ).run();

        return new Response(JSON.stringify({ success: true, id, threadId, timestamp: now, bumpedAt: now }), {
          status: 201,
          headers: corsHeaders,
        });
      }

      // Action: Create Reply
      if (action === 'create_reply') {
        const threadId = body.threadId;
        const boardId = body.boardId;

        if (!threadId) {
          return new Response(JSON.stringify({ error: 'Missing threadId' }), { status: 400, headers: corsHeaders });
        }

        // Validate parent thread in D1
        const parentThread = await DB.prepare(`
          SELECT id, board_id, is_locked FROM posts WHERE id = ? AND is_op = 1 LIMIT 1
        `).bind(threadId).first();

        if (!parentThread) {
          return new Response(JSON.stringify({ error: 'Parent thread not found' }), { status: 404, headers: corsHeaders });
        }

        if (parentThread.is_locked) {
          return new Response(JSON.stringify({ error: 'Thread is locked' }), { status: 403, headers: corsHeaders });
        }

        const effectiveBoardId = parentThread.board_id || boardId || 'yume';

        const now = Date.now();
        const id = body.id || `rep-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
        const subject = String(body.subject || '').trim();
        const name = String(body.name || body.author || 'Anonymous').trim();
        const tripcode = String(body.tripcode || '').trim();
        const content = String(body.content || body.comment || '').trim();
        const contentType = body.contentType || 'text';
        const poetryFormat = body.poetryFormat || null;
        const attachment = body.attachment || body.imageUrl || null;
        const pixelArtMatrix = body.pixelArtMatrix ? JSON.stringify(body.pixelArtMatrix) : null;
        const isSage = Boolean(body.sage);

        const queries = [
          DB.prepare(`
            INSERT INTO posts (
              id, thread_id, board_id, subject, name, tripcode, timestamp, content, content_type, poetry_format, attachment, pixel_art_matrix, is_op, is_sticky, is_locked, is_deleted, bumped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
          `).bind(
            id, threadId, effectiveBoardId, subject, name, tripcode, now, content, contentType, poetryFormat, attachment, pixelArtMatrix, now
          )
        ];

        if (!isSage) {
          queries.push(DB.prepare(`UPDATE posts SET bumped_at = ? WHERE id = ?`).bind(now, threadId));
        }

        await DB.batch(queries);

        return new Response(JSON.stringify({ success: true, id, timestamp: now }), {
          status: 201,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env);
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      let response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        const pathname = url.pathname;
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
        if (!hasExtension) {
          const indexUrl = new URL('/index.html', request.url);
          return await env.ASSETS.fetch(new Request(indexUrl, request));
        }
      }
      return response;
    }

    return new Response('Not found', { status: 404 });
  }
};
