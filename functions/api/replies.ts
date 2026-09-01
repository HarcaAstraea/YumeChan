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

// GET /api/replies?thread=th-xyz
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const threadId = searchParams.get('thread');

  if (!threadId) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { results } = await context.env.DB.prepare(
      `SELECT * FROM replies WHERE thread_id = ? ORDER BY created_at ASC`
    ).bind(threadId).all();

    const replies = (results || []).map((r: any) => ({
      id: r.id,
      threadId: r.thread_id,
      author: r.author || 'Anonymous',
      tripcode: r.tripcode || undefined,
      comment: r.comment,
      imageUrl: r.image_url || undefined,
      pixelArtMatrix: r.pixel_art_matrix ? JSON.parse(r.pixel_art_matrix) : undefined,
      createdAt: r.created_at,
    }));

    return new Response(JSON.stringify(replies), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/replies
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json() as any;
    const id = 'rep-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO replies (id, thread_id, author, tripcode, comment, image_url, pixel_art_matrix, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        data.threadId,
        data.author || 'Anonymous',
        data.tripcode || null,
        data.comment,
        data.imageUrl || null,
        data.pixelArtMatrix ? JSON.stringify(data.pixelArtMatrix) : null,
        now
      ),
      context.env.DB.prepare(
        `UPDATE threads SET reply_count = reply_count + 1, bumped_at = ? WHERE id = ?`
      ).bind(now, data.threadId),
    ]);

    return new Response(JSON.stringify({
      success: true,
      reply: {
        id,
        threadId: data.threadId,
        author: data.author || 'Anonymous',
        tripcode: data.tripcode || undefined,
        comment: data.comment,
        imageUrl: data.imageUrl || undefined,
        pixelArtMatrix: data.pixelArtMatrix || undefined,
        createdAt: now,
      }
    }), {
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
