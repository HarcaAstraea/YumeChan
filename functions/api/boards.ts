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

// GET /api/boards
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare(
      `SELECT * FROM boards ORDER BY rowid ASC`
    ).bind().all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const boards = results.map((b: any) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      jpName: b.jp_name,
      description: b.description || '',
      icon: b.icon || 'chat',
      accentColor: b.accent_color || '#f472b6',
      tagline: b.tagline || '',
      rules: b.rules ? JSON.parse(b.rules) : [],
    }));

    return new Response(JSON.stringify(boards), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
