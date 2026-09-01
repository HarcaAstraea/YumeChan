export type ContentType = 'text' | 'poetry' | 'pixel' | 'mixed';

export interface ImageMetadata {
  name: string;
  size: string;
  dimensions: string;
  aspectRatio?: string;
}

export interface Post {
  id: string;
  threadId: string;
  boardId: string;
  author: string;
  tripcode?: string;
  subject?: string;
  content: string;
  contentType: ContentType;
  poetryFormat?: string;
  poetryAuthorNote?: string;
  imageUrl?: string;
  imageMeta?: ImageMetadata;
  pixelArtData?: string; // base64 / dataURL of generated pixel canvas
  pixelArtGrid?: string[][]; // raw pixel colors for re-editing
  createdAt: number;
  sage?: boolean;
  isOp?: boolean;
  replyToPostId?: string;
  repliesToThis?: string[]; // IDs of posts replying to this one
  isDeleted?: boolean; // When true, content is replaced with deletion notice
  deletedByAdmin?: boolean;
  deletedAt?: number;
  originalContentBackup?: string;
}

export interface Thread {
  id: string;
  boardId: string;
  title: string;
  opPost: Post;
  replies: Post[];
  repliesCount: number;
  imagesCount: number;
  lastBumpTime: number;
  createdAt: number;
  isSticky?: boolean;
  isLocked?: boolean;
}

export interface Board {
  id: string;
  slug: string;
  name: string;
  jpName: string;
  description: string;
  icon: string;
  accentColor: string;
  tagline: string;
  rules: string[];
}

export type ViewMode = 'thread-list' | 'catalog' | 'studio' | 'admin';

export interface DeletedPostRecord {
  id: string; // unique record id
  postId: string;
  threadId: string;
  boardId: string;
  postNumberFormatted: string;
  title: string;
  post: Post;
  isOp: boolean;
  deletedAt: number;
  deletedBy: string;
  originalThread?: Thread; // if OP, store the full thread and its replies
}

export type ThemeMode = 'light' | 'dark';
export type PaletteContrast = 'soft' | 'high-contrast';

export interface AppSettings {
  themeMode: ThemeMode;
  contrast: PaletteContrast;
  soundEnabled: boolean;
  autoRefresh: boolean;
  autoRefreshInterval: number; // seconds
  fontMode: 'pixel' | 'smooth';
}

/**
 * Cloudflare D1 and Pages / Workers Environment Interfaces
 */
export interface D1Result<T = any> {
  results?: T[];
  success?: boolean;
  error?: string;
  meta?: Record<string, any>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
  raw<T = any>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}

export interface Env {
  DB: D1Database;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export type PagesFunction<T = Env> = (context: {
  request: Request;
  env: T;
  params: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response>;
