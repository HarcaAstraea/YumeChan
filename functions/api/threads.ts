interface Env {
  DB: D1Database;
}

interface D1Database {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      all: <T = any>() => Promise<{ results?: T[] }>;
      run: () => Promise<{ success: boolean }>;
    };
  };
  batch: (statements: any[]) => Promise<any[]>;
}

type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  params: Record<string, string>;
}) => Promise<Response>;

// GET /api/threads?board=yume
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const boardId = searchParams.get('board');

  try {
    let query = `SELECT * FROM threads`;
    const params: string[] = [];

    if (boardId) {
      query += ` WHERE board_id = ?`;
      params.push(boardId);
    }
    query += ` ORDER BY is_sticky DESC, bumped_at DESC LIMIT 100`;

    const { results } = await context.env.DB.prepare(query).bind(...params).all();

    const threads = (results || []).map((t: any) => ({
      id: t.id,
      boardId: t.board_id,
      title: t.title,
      createdAt: t.created_at,
      bumpedAt: t.bumped_at,
      isSticky: Boolean(t.is_sticky),
      isLocked: Boolean(t.is_locked),
      replyCount: t.reply_count || 0,
      opPost: {
        id: 'op-' + t.id,
        threadId: t.id,
        author: t.author || 'Anonymous',
        tripcode: t.tripcode || undefined,
        comment: t.comment,
        imageUrl: t.image_url || undefined,
        pixelArtMatrix: t.pixel_art_matrix ? JSON.parse(t.pixel_art_matrix) : undefined,
        createdAt: t.created_at,
      },
      replies: [],
    }));

    return new Response(JSON.stringify(threads), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/threads
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json() as any;
    const id = 'th-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    await context.env.DB.prepare(
      `INSERT INTO threads (id, board_id, title, author, tripcode, comment, image_url, pixel_art_matrix, created_at, bumped_at, is_sticky, is_locked, reply_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      data.boardId,
      data.title,
      data.author || 'Anonymous',
      data.tripcode || null,
      data.comment,
      data.imageUrl || null,
      data.pixelArtMatrix ? JSON.stringify(data.pixelArtMatrix) : null,
      now,
      now,
      data.isSticky ? 1 : 0,
      0,
      0
    ).run();

    return new Response(JSON.stringify({ success: true, id, createdAt: now, bumpedAt: now }), {
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
