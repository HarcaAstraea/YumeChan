// Cloudflare Pages Function: /api/threads
// Handles GET (list threads by board) and POST (create new thread with OP post)

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 Database binding DB not found' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const boardId = url.searchParams.get('boardId');

  try {
    let query = 'SELECT * FROM threads';
    const params: any[] = [];

    if (boardId) {
      query += ' WHERE board_id = ?';
      params.push(boardId);
    }
    query += ' ORDER BY is_sticky DESC, last_bump_time DESC LIMIT 100';

    const threadsRes = await env.DB.prepare(query).bind(...params).all();
    const threadRows = threadsRes.results as any[];

    // For each thread, fetch the OP post and all replies
    const fullThreads = await Promise.all(
      threadRows.map(async (th) => {
        const postsRes = await env.DB.prepare(
          'SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC'
        ).bind(th.id).all();

        const posts = (postsRes.results as any[]).map(formatPostFromRow);
        const opPost = posts.find((p) => p.isOp) || posts[0];
        const replies = posts.filter((p) => !p.isOp);

        return {
          id: th.id,
          boardId: th.board_id,
          title: th.title,
          opPost: opPost || null,
          replies: replies,
          repliesCount: th.replies_count || replies.length,
          imagesCount: th.images_count,
          lastBumpTime: th.last_bump_time,
          createdAt: th.created_at,
          isSticky: Boolean(th.is_sticky),
          isLocked: Boolean(th.is_locked),
        };
      })
    );

    return new Response(JSON.stringify({ success: true, threads: fullThreads }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 Database binding DB not found' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as any;
    const { thread, opPost } = body;

    if (!thread || !opPost) {
      return new Response(JSON.stringify({ error: 'Missing thread or opPost data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasImage = Boolean(opPost.imageUrl || opPost.pixelArtData);

    // Batch insert Thread + OP Post in atomic D1 execution
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO threads (id, board_id, title, replies_count, images_count, last_bump_time, created_at, is_sticky, is_locked)
         VALUES (?, ?, ?, 0, ?, ?, ?, 0, 0)`
      ).bind(
        thread.id,
        thread.boardId,
        thread.title,
        hasImage ? 1 : 0,
        thread.lastBumpTime || Date.now(),
        thread.createdAt || Date.now()
      ),
      env.DB.prepare(
        `INSERT INTO posts (
          id, thread_id, board_id, author, tripcode, subject, content,
          content_type, poetry_format, poetry_author_note, image_url,
          image_meta_json, pixel_art_data, pixel_art_grid_json, created_at,
          sage, is_op, reply_to_post_id, replies_to_this_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NULL, '[]')`
      ).bind(
        opPost.id,
        thread.id,
        thread.boardId,
        opPost.author || 'Anonymous',
        opPost.tripcode || null,
        opPost.subject || thread.title,
        opPost.content || '',
        opPost.contentType || 'text',
        opPost.poetryFormat || null,
        opPost.poetryAuthorNote || null,
        opPost.imageUrl || null,
        opPost.imageMeta ? JSON.stringify(opPost.imageMeta) : null,
        opPost.pixelArtData || null,
        opPost.pixelArtGrid ? JSON.stringify(opPost.pixelArtGrid) : null,
        opPost.createdAt || Date.now()
      ),
    ]);

    return new Response(JSON.stringify({ success: true, threadId: thread.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function formatPostFromRow(row: any) {
  return {
    id: row.id,
    threadId: row.thread_id,
    boardId: row.board_id,
    author: row.author,
    tripcode: row.tripcode || undefined,
    subject: row.subject || undefined,
    content: row.content,
    contentType: row.content_type || 'text',
    poetryFormat: row.poetry_format || undefined,
    poetryAuthorNote: row.poetry_author_note || undefined,
    imageUrl: row.image_url || undefined,
    imageMeta: row.image_meta_json ? tryJsonParse(row.image_meta_json) : undefined,
    pixelArtData: row.pixel_art_data || undefined,
    pixelArtGrid: row.pixel_art_grid_json ? tryJsonParse(row.pixel_art_grid_json) : undefined,
    createdAt: Number(row.created_at),
    sage: Boolean(row.sage),
    isOp: Boolean(row.is_op),
    replyToPostId: row.reply_to_post_id || undefined,
    repliesToThis: row.replies_to_this_json ? tryJsonParse(row.replies_to_this_json, []) : [],
  };
}

function tryJsonParse(str: string, fallback: any = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
