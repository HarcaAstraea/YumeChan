import React, { useState, useRef } from 'react';
import { Board, ContentType, Post, Thread, ImageMetadata } from '../types';
import { generateTripcode } from '../utils/textParser';
import { PixelIcon } from './PixelIcon';
import { PixelArtStudio } from './PixelArtStudio';
import { sound } from '../utils/chiptune';
import { createRetroPixelArtSvg } from '../utils/initialData';
import {
  KAOMOJI_PRESETS,
  KAOMOJI_CATEGORIES,
  STICKER_PRESETS,
  CUTE_SYMBOL_PRESETS,
} from '../utils/stickersAndKaomoji';

interface NewPostModalProps {
  boards: Board[];
  activeBoardId: string;
  targetThreadId?: string; // If provided, replying to an existing thread
  targetThreadTitle?: string;
  initialQuotePostId?: string;
  initialPixelArtData?: string;
  onClose: () => void;
  onSubmitPost: (data: {
    boardId: string;
    threadId?: string;
    title?: string;
    author: string;
    tripcode?: string;
    subject?: string;
    content: string;
    contentType: ContentType;
    poetryFormat?: string;
    poetryAuthorNote?: string;
    imageUrl?: string;
    imageMeta?: ImageMetadata;
    pixelArtData?: string;
    sage?: boolean;
    replyToPostId?: string;
  }) => Promise<boolean | void> | void;
}

const PRESET_PIXEL_ILLUSTRATIONS = [
  { id: 'sakura_tree', name: 'Sakura Petals', type: 'sakura_tree' },
  { id: 'pc98', name: 'PC-98 Desktop', type: 'pc98' },
  { id: 'ramen', name: 'Miso Ramen', type: 'ramen' },
  { id: 'gameboy', name: 'Retro GameBoy', type: 'gameboy' },
  { id: 'cat', name: 'Chibi Cat', type: 'cat' },
];

export const NewPostModal: React.FC<NewPostModalProps> = ({
  boards,
  activeBoardId,
  targetThreadId,
  targetThreadTitle,
  initialQuotePostId,
  initialPixelArtData,
  onClose,
  onSubmitPost,
}) => {
  const isReply = !!targetThreadId;

  const [selectedBoardId, setSelectedBoardId] = useState<string>(activeBoardId);
  const [rawAuthor, setRawAuthor] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [contentType, setContentType] = useState<ContentType>(initialPixelArtData ? 'pixel' : 'text');
  const [poetryFormat, setPoetryFormat] = useState<string>('stanza');
  const [poetryAuthorNote, setPoetryAuthorNote] = useState<string>('');
  const [content, setContent] = useState<string>(() => {
    if (initialQuotePostId) {
      return `>>${initialQuotePostId}\n`;
    }
    return '';
  });

  const [sage, setSage] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMetadata | null>(() => {
    if (initialPixelArtData) {
      return {
        name: 'exported_pixel_art.png',
        size: '14.2 KB',
        dimensions: '64x64',
      };
    }
    return null;
  });
  const [pixelArtData, setPixelArtData] = useState<string | null>(initialPixelArtData || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPixelStudio, setShowPixelStudio] = useState<boolean>(false);
  const [showKaomoji, setShowKaomoji] = useState<boolean>(false);
  const [showStickers, setShowStickers] = useState<boolean>(false);
  const [showCuteSymbols, setShowCuteSymbols] = useState<boolean>(false);
  const [activeKaomojiCat, setActiveKaomojiCat] = useState<string>('All');
  const [showPresetGallery, setShowPresetGallery] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Live parsed tripcode preview
  const tripPreview = generateTripcode(rawAuthor);

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playClick();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setUploadedImage(result);
        setImageMeta({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          dimensions: `${img.width}x${img.height}`,
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetPixel = (type: string, name: string) => {
    sound.playClick();
    const svgData = createRetroPixelArtSvg(type);
    setUploadedImage(svgData);
    setImageMeta({
      name: `${type}.png`,
      size: '12.8 KB',
      dimensions: '64x64',
    });
    setShowPresetGallery(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim() && !uploadedImage && !pixelArtData) {
      sound.playClick();
      return;
    }

    const { author, tripcode } = generateTripcode(rawAuthor);

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmitPost({
        boardId: selectedBoardId,
        threadId: targetThreadId,
        title: !isReply ? subject || content.slice(0, 30) : undefined,
        subject: subject.trim() || undefined,
        author,
        tripcode,
        content,
        contentType: poetryFormat && contentType === 'poetry' ? 'poetry' : pixelArtData ? 'pixel' : contentType,
        poetryFormat: contentType === 'poetry' ? poetryFormat : undefined,
        poetryAuthorNote: poetryAuthorNote.trim() || undefined,
        imageUrl: uploadedImage || undefined,
        imageMeta: imageMeta || undefined,
        pixelArtData: pixelArtData || undefined,
        sage,
        replyToPostId: initialQuotePostId,
      });
      sound.playPostSuccess();
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err?.message || 'Failed to submit post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    sound.playClick();
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = content;
    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const insertGreentext = () => {
    insertAtCursor('\n> ');
  };

  const insertKaomoji = (k: string) => {
    insertAtCursor(k);
  };

  const insertSticker = (s: string) => {
    insertAtCursor(s);
  };

  const insertSpoiler = () => {
    insertAtCursor('[spoiler]secret[/spoiler]');
  };

  return (
    <div
      id="new-post-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--bg-card)] border-4 border-[var(--border-strong)] shadow-[8px_8px_0px_var(--border-strong)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 font-mono"
      >
        {/* Title Header */}
        <div className="bg-[var(--window-header)] border-b-4 border-[var(--border-color)] px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[var(--accent-cherry)] border border-[var(--border-strong)] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rotate-45 opacity-70" />
            </div>
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[var(--window-header-text)]">
              {isReply ? `REPLY STATION :: THREAD (${targetThreadTitle || targetThreadId})` : 'NEW THREAD COMPOSER'}
            </span>
          </div>
          <button
            id="close-composer-btn"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="pixel-btn px-2 py-0.5 text-xs font-bold border-2 border-[var(--border-strong)] shadow-[1px_1px_0px_var(--border-strong)]"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-5 space-y-3.5">
          {/* Target Board & Options */}
          {!isReply && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] shrink-0 w-24">
                Target Board:
              </label>
              <select
                id="select-post-board"
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="pixel-input text-xs px-2 py-1 flex-1 w-full sm:w-auto"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    /{b.slug}/ - {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Author Name + Live Tripcode Preview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] shrink-0 w-24">
              Name / Trip:
            </label>
            <div className="flex-1 w-full flex items-center gap-2">
              <input
                id="post-author-input"
                type="text"
                value={rawAuthor}
                onChange={(e) => setRawAuthor(e.target.value)}
                placeholder="Anonymous (or Name#secretTrip)"
                className="pixel-input text-xs px-2.5 py-1.5 flex-1 w-full"
              />
              {/* Tripcode Preview badge */}
              <div className="shrink-0 text-[10px] text-[var(--text-secondary)] font-mono bg-[var(--bg-surface)] px-2 py-1 border border-[var(--border-color)]">
                <span>As: </span>
                <span className="font-bold text-[var(--text-primary)]">{tripPreview.author}</span>
                {tripPreview.tripcode && (
                  <span className="text-[var(--accent-pink)] font-bold ml-1">
                    {tripPreview.tripcode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] shrink-0 w-24">
              Subject:
            </label>
            <input
              id="post-subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isReply ? 'Optional reply subject' : 'Thread title / Subject'}
              className="pixel-input text-xs px-2.5 py-1.5 flex-1 w-full"
            />
          </div>

          {/* Content Mode Switcher */}
          <div className="flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2 text-xs">
            <span className="text-[var(--text-muted)] text-[11px] mr-1">Mode:</span>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setContentType('text');
              }}
              className={`pixel-btn px-2 py-1 text-xs flex items-center gap-1 ${
                contentType === 'text' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <PixelIcon name="new-post" size={12} />
              <span>Standard Text</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setContentType('poetry');
              }}
              className={`pixel-btn px-2 py-1 text-xs flex items-center gap-1 ${
                contentType === 'poetry' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <PixelIcon name="poetry" size={12} />
              <span>Poetry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowPixelStudio(true);
              }}
              className={`pixel-btn px-2 py-1 text-xs flex items-center gap-1 ${
                pixelArtData ? 'bg-[var(--accent-mint)] text-slate-900 font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <PixelIcon name="palette" size={12} />
              <span>{pixelArtData ? 'Pixel Art Attached ✓' : 'Draw Pixel Art'}</span>
            </button>
          </div>

          {/* If Poetry mode selected: Format Options */}
          {contentType === 'poetry' && (
            <div className="p-2.5 bg-[var(--accent-pink-soft)] border border-[var(--border-color)] space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <PixelIcon name="poetry" size={14} className="text-[var(--accent-pink)]" />
                <span className="font-bold text-[var(--text-primary)]">Poetry Note / Inspiration:</span>
              </div>
              <input
                type="text"
                value={poetryAuthorNote}
                onChange={(e) => setPoetryAuthorNote(e.target.value)}
                placeholder="Author commentary or inspiration note (optional)"
                className="pixel-input text-xs px-2 py-1 w-full"
              />
            </div>
          )}

          {/* Quick Helper Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={insertGreentext}
                className="pixel-btn px-1.5 py-0.5 text-[10px] text-[var(--greentext)] font-bold"
                title="Insert greentext line"
              >
                &gt;greentext
              </button>
              <button
                type="button"
                onClick={insertSpoiler}
                className="pixel-btn px-1.5 py-0.5 text-[10px]"
                title="Insert spoiler tags"
              >
                [spoiler]
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowKaomoji(!showKaomoji);
                  if (showStickers) setShowStickers(false);
                }}
                className={`pixel-btn px-1.5 py-0.5 text-[10px] flex items-center gap-1 ${
                  showKaomoji
                    ? 'bg-[var(--accent-pink)] text-white font-bold'
                    : 'bg-[var(--bg-card)]'
                }`}
              >
                <span>Kaomoji (✿)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowStickers(!showStickers);
                  if (showKaomoji) setShowKaomoji(false);
                  if (showCuteSymbols) setShowCuteSymbols(false);
                }}
                className={`pixel-btn px-1.5 py-0.5 text-[10px] flex items-center gap-1 ${
                  showStickers
                    ? 'bg-[var(--accent-pink)] text-white font-bold'
                    : 'bg-[var(--bg-card)]'
                }`}
              >
                <span>Emoji 🌸</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowCuteSymbols(!showCuteSymbols);
                  if (showKaomoji) setShowKaomoji(false);
                  if (showStickers) setShowStickers(false);
                }}
                className={`pixel-btn px-1.5 py-0.5 text-[10px] flex items-center gap-1 ${
                  showCuteSymbols
                    ? 'bg-[var(--accent-pink)] text-white font-bold'
                    : 'bg-[var(--bg-card)]'
                }`}
              >
                <span>Cute Symbols ୨ৎ</span>
              </button>
            </div>

            {/* Sage Option */}
            <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sage}
                onChange={(e) => setSage(e.target.checked)}
                className="rounded-xs"
              />
              <PixelIcon name="sage" size={12} />
              <span>sage (Do not bump thread)</span>
            </label>
          </div>

          {/* Kaomoji Quick Picker Dropdown */}
          {showKaomoji && (
            <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-strong)] space-y-2 text-xs shadow-[2px_2px_0px_var(--border-strong)]">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border-color)] pb-1.5">
                <span className="font-bold text-[11px] text-[var(--accent-pink)]">KAOMOJI SELECTOR</span>
                <div className="flex flex-wrap gap-1">
                  {['All', ...KAOMOJI_CATEGORIES.map((c) => c.name)].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveKaomojiCat(cat)}
                      className={`px-1.5 py-0.5 text-[10px] border ${
                        activeKaomojiCat === cat
                          ? 'bg-[var(--border-strong)] text-white font-bold'
                          : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-0.5">
                {(activeKaomojiCat === 'All'
                  ? KAOMOJI_PRESETS
                  : KAOMOJI_CATEGORIES.find((c) => c.name === activeKaomojiCat)?.items || KAOMOJI_PRESETS
                ).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => insertKaomoji(k)}
                    className="pixel-btn px-2 py-0.5 text-[11px] hover:bg-[var(--accent-pink-soft)] hover:border-[var(--accent-pink)]"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Quick Picker Dropdown */}
          {showStickers && (
            <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-strong)] space-y-2 text-xs shadow-[2px_2px_0px_var(--border-strong)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                <span className="font-bold text-[11px] text-[var(--accent-pink)]">EMOJI SELECTOR (🌸)</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Click to insert</span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {STICKER_PRESETS.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    type="button"
                    onClick={() => insertSticker(s)}
                    className="pixel-btn w-8 h-8 flex items-center justify-center text-base bg-[var(--bg-card)] hover:bg-[var(--accent-pink-soft)] hover:border-[var(--accent-pink)] border border-[var(--border-color)] shadow-[1px_1px_0px_var(--border-color)] hover:scale-110 transition-transform active:scale-95"
                    title={`Insert ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cute Symbols Quick Picker Dropdown */}
          {showCuteSymbols && (
            <div className="p-2 bg-[var(--bg-surface)] border-2 border-[var(--border-strong)] space-y-2 text-xs shadow-[2px_2px_0px_var(--border-strong)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                <span className="font-bold text-[11px] text-[var(--accent-pink)]">CUTE SYMBOLS SELECTOR (୨ৎ)</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Click to insert</span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {CUTE_SYMBOL_PRESETS.map((sym, idx) => (
                  <button
                    key={`${sym}-${idx}`}
                    type="button"
                    onClick={() => insertSticker(sym)}
                    className="pixel-btn px-2.5 py-1 text-xs font-mono font-bold bg-[var(--bg-card)] hover:bg-[var(--accent-pink-soft)] hover:border-[var(--accent-pink)] border border-[var(--border-color)] shadow-[1px_1px_0px_var(--border-color)] text-[var(--text-primary)] transition-transform active:scale-95"
                    title={`Insert ${sym}`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Textarea */}
          <div>
            <textarea
              id="post-content-textarea"
              ref={textareaRef}
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                contentType === 'poetry'
                  ? 'Write your poem, verses, or poetic thoughts here...'
                  : 'Type your message here...'
              }
              className="pixel-input w-full p-2.5 text-xs sm:text-sm font-mono leading-relaxed"
            />
          </div>

          {/* Media Attachments Bar */}
          <div className="pixel-box-sm p-2.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PixelIcon name="image" size={14} className="text-[var(--accent-pink)]" />
                <span className="font-bold text-[var(--text-secondary)]">Image Attachment:</span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pixel-btn px-2 py-1 text-xs flex items-center gap-1"
                >
                  <PixelIcon name="image" size={12} />
                  <span>Choose File...</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresetGallery(!showPresetGallery)}
                  className="pixel-btn px-2 py-1 text-xs flex items-center gap-1 bg-[var(--bg-surface)]"
                >
                  <PixelIcon name="dice" size={12} />
                  <span>Preset Retro Sprites</span>
                </button>
              </div>
            </div>

            {/* Preset Pixel Sprite Selector */}
            {showPresetGallery && (
              <div className="grid grid-cols-5 gap-2 p-2 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                {PRESET_PIXEL_ILLUSTRATIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetPixel(preset.type, preset.name)}
                    className="pixel-btn p-1 flex flex-col items-center gap-1 text-[10px] hover:bg-white dark:hover:bg-slate-800"
                  >
                    <img
                      src={createRetroPixelArtSvg(preset.type)}
                      alt={preset.name}
                      className="w-10 h-10 object-contain pixel-canvas-grid"
                    />
                    <span className="truncate w-full text-center">{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Attached Image or Pixel Art Preview Badge */}
            {(uploadedImage || pixelArtData) && (
              <div className="flex items-center justify-between bg-[var(--bg-card-alt)] p-2 border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 pixel-box-sm bg-white dark:bg-slate-900 flex items-center justify-center p-0.5">
                    <img
                      src={pixelArtData || uploadedImage!}
                      alt="attachment"
                      className="w-full h-full object-contain pixel-canvas-grid"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-[11px]">
                      {pixelArtData ? 'Custom 16-bit Canvas Drawing' : imageMeta?.name || 'Uploaded Image'}
                    </div>
                    {imageMeta && (
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {imageMeta.dimensions} ({imageMeta.size})
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setUploadedImage(null);
                    setImageMeta(null);
                    setPixelArtData(null);
                  }}
                  className="pixel-btn px-2 py-0.5 text-xs text-rose-500 hover:bg-rose-50"
                >
                  <PixelIcon name="trash" size={12} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="p-2 bg-rose-950/40 border border-rose-500 text-rose-300 text-xs font-mono flex items-center gap-2">
              <span className="font-bold">⚠ ERROR:</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="pixel-btn px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="submit-post-btn"
              disabled={isSubmitting || (!content.trim() && !uploadedImage && !pixelArtData)}
              className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white px-5 py-1.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-[2px_2px_0px_var(--border-strong)]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <PixelIcon name="new-post" size={14} />
                  <span>{isReply ? '۶ৎ Post Reply' : '۶ৎ Create Thread'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Embedded Pixel Art Studio Drawer */}
        {showPixelStudio && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-3 overflow-y-auto">
            <div className="max-w-3xl w-full">
              <PixelArtStudio
                onClose={() => setShowPixelStudio(false)}
                onExportToPost={(dataUrl) => {
                  setPixelArtData(dataUrl);
                  setImageMeta({
                    name: 'custom_pixel_art.png',
                    size: '14.2 KB',
                    dimensions: '64x64',
                  });
                  setShowPixelStudio(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
