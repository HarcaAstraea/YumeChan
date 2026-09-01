import React from 'react';
import { PixelIcon } from './PixelIcon';
import { ImageMetadata } from '../types';
import { sound } from '../utils/chiptune';

interface ImageModalProps {
  imageUrl: string;
  metadata?: ImageMetadata;
  title?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, metadata, title, onClose }) => {
  return (
    <div
      id="image-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pixel-box max-w-3xl w-full max-h-[90vh] flex flex-col bg-[var(--bg-card)] overflow-hidden shadow-2xl"
      >
        {/* Modal Window Titlebar */}
        <div className="bg-[var(--window-header)] border-b-2 border-[var(--border-color)] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--window-header-text)] truncate">
            <PixelIcon name="image" size={14} />
            <span className="truncate">{metadata?.name || title || 'Image Viewer'}</span>
          </div>
          <button
            id="close-image-modal-btn"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="pixel-btn p-1 text-xs hover:bg-rose-100"
          >
            <PixelIcon name="close" size={12} />
          </button>
        </div>

        {/* Image Content Container */}
        <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-[#0a0812] relative min-h-[240px]">
          <img
            src={imageUrl}
            alt={metadata?.name || 'Attached media'}
            className="max-h-[68vh] max-w-full object-contain pixel-canvas-grid shadow-lg border border-white/10"
          />
        </div>

        {/* Footer with Metadata and Download */}
        <div className="bg-[var(--bg-surface)] border-t-2 border-[var(--border-color)] px-3 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-3 text-[var(--text-secondary)] font-mono text-[11px]">
            {metadata?.dimensions && <span>Dimensions: {metadata.dimensions}</span>}
            {metadata?.size && <span>Size: {metadata.size}</span>}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={metadata?.name || 'yumechan_image.png'}
              onClick={() => sound.playPostSuccess()}
              className="pixel-btn px-2.5 py-1 text-xs bg-[var(--accent-pink)] text-white font-bold flex items-center gap-1"
            >
              <PixelIcon name="download" size={12} />
              <span>Download File</span>
            </a>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="pixel-btn px-2 py-1 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
