import React from 'react';
import { PixelIcon } from './PixelIcon';

interface PoetryDisplayProps {
  content: string;
  format?: string;
  authorNote?: string;
  authorName?: string;
}

export const PoetryDisplay: React.FC<PoetryDisplayProps> = ({
  content,
  authorNote,
  authorName = 'Anonymous',
}) => {
  const lines = content.split('\n');

  return (
    <div className="my-2.5 p-3.5 bg-[var(--bg-card-alt)] border-2 border-[var(--border-color)] relative overflow-hidden shadow-xs">
      {/* Header bar for poetry post */}
      <div className="flex items-center justify-between text-xs border-b border-[var(--border-color)] pb-1.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-[var(--accent-pink)] font-bold">
          <PixelIcon name="poetry" size={14} />
          <span className="text-[11px] uppercase tracking-wider">
            Poetry & Verses
          </span>
        </div>
      </div>

      {/* Poetry Content Area */}
      <div className="space-y-0.5 my-2.5 text-sm sm:text-base leading-relaxed pl-3.5 border-l-3 border-[var(--accent-pink)] italic">
        {lines.map((line, idx) => (
          <p key={idx} className="text-[var(--text-primary)] whitespace-pre-wrap min-h-[1.3em]">
            {line || '\u00A0'}
          </p>
        ))}
      </div>

      {/* Author Note / Commentary */}
      {authorNote && (
        <div className="mt-2.5 pt-1.5 border-t border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] flex items-start gap-1">
          <span className="opacity-70 font-mono font-bold">Note:</span>
          <span className="italic">{authorNote}</span>
        </div>
      )}

      {/* Signature */}
      <div className="mt-2 text-right text-[10px] text-[var(--text-muted)] font-mono">
        — By: <span className="font-bold text-[var(--text-secondary)]">{authorName}</span>
      </div>
    </div>
  );
};

