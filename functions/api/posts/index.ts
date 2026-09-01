// Cloudflare Pages Function: /api/posts
// Handles POST (create reply to existing thread)

interface Env {
  DB: D1Database;
}

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
    const { threadId, reply } = body;

    if (!threadId || !reply) {
      return new Response(JSON.stringify({ error: 'Missing threadId or reply data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasImage = Boolean(reply.imageUrl || reply.pixelArtData);
    const now = reply.createdAt || Date.now();
    const isSage = Boolean(reply.sage);

    const statements: any[] = [];

    // 1. Insert Reply Post
    statements.push(
      env.DB.prepare(
        `INSERT INTO posts (
          id, thread_id, board_id, author, tripcode, subject, content,
          content_type, poetry_format, poetry_author_note, image_url,
          image_meta_json, pixel_art_data, pixel_art_grid_json, created_at,
          sage, is_op, reply_to_post_id, replies_to_this_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '[]')`
      ).bind(
        reply.id,
        threadId,
        reply.boardId,
        reply.author || 'Anonymous',
        reply.tripcode || null,
        reply.subject || null,
        reply.content || '',
        reply.contentType || 'text',
        reply.poetryFormat || null,
        reply.poetryAuthorNote || null,
        reply.imageUrl || null,
        reply.imageMeta ? JSON.stringify(reply.imageMeta) : null,
        reply.pixelArtData || null,
        reply.pixelArtGrid ? JSON.stringify(reply.pixelArtGrid) : null,
        now,
        isSage ? 1 : 0,
        reply.replyToPostId || null
      )
    );

    // 2. Update Thread: increment replies count, image count, and update last_bump_time if not sage
    if (isSage) {
      statements.push(
        env.DB.prepare(
          `UPDATE threads 
           SET replies_count = replies_count + 1,
               images_count = images_count + ?
           WHERE id = ?`
        ).bind(hasImage ? 1 : 0, threadId)
      );
    } else {
      statements.push(
        env.DB.prepare(
          `UPDATE threads 
           SET replies_count = replies_count + 1,
               images_count = images_count + ?,
               last_bump_time = ?
           WHERE id = ?`
        ).bind(hasImage ? 1 : 0, now, threadId)
      );
    }

    // 3. If this reply quotes a target post, update replies_to_this_json on target post
    if (reply.replyToPostId) {
      const targetPost = await env.DB.prepare('SELECT id, replies_to_this_json FROM posts WHERE id = ?').bind(reply.replyToPostId).first();
      if (targetPost) {
        let existingList: string[] = [];
        try {
          existingList = JSON.parse(targetPost.replies_to_this_json as string) || [];
        } catch {}
        if (!existingList.includes(reply.id)) {
          existingList.push(reply.id);
          statements.push(
            env.DB.prepare('UPDATE posts SET replies_to_this_json = ? WHERE id = ?')
              .bind(JSON.stringify(existingList), reply.replyToPostId)
          );
        }
      }
    }

    await env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true, replyId: reply.id }), {
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
