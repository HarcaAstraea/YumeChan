// Cloudflare Pages Function: /api/threads/[id]
// Handles GET (fetch thread and its replies) and DELETE

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const threadId = params.id as string;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 Database binding DB not found' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const threadRes = await env.DB.prepare('SELECT * FROM threads WHERE id = ?').bind(threadId).first();
    if (!threadRes) {
      return new Response(JSON.stringify({ error: 'Thread not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const postsRes = await env.DB.prepare(
      'SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC'
    ).bind(threadId).all();

    const posts = (postsRes.results as any[]).map(formatPostFromRow);
    const opPost = posts.find((p) => p.isOp) || posts[0];
    const replies = posts.filter((p) => !p.isOp);

    const thread = {
      id: threadRes.id,
      boardId: threadRes.board_id,
      title: threadRes.title,
      opPost: opPost || null,
      replies: replies,
      repliesCount: threadRes.replies_count || replies.length,
      imagesCount: threadRes.images_count,
      lastBumpTime: threadRes.last_bump_time,
      createdAt: threadRes.created_at,
      isSticky: Boolean(threadRes.is_sticky),
      isLocked: Boolean(threadRes.is_locked),
    };

    return new Response(JSON.stringify({ success: true, thread }), {
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
