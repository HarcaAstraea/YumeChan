import React from 'react';

export type PixelIconType =
  | 'boards'
  | 'new-post'
  | 'palette'
  | 'catalog'
  | 'search'
  | 'sound-on'
  | 'sound-off'
  | 'sun'
  | 'moon'
  | 'contrast'
  | 'refresh'
  | 'pin'
  | 'lock'
  | 'heart'
  | 'sakura'
  | 'dice'
  | 'image'
  | 'poetry'
  | 'reply'
  | 'sage'
  | 'sparkles'
  | 'trash'
  | 'bucket'
  | 'eraser'
  | 'eyedropper'
  | 'symmetry'
  | 'download'
  | 'close'
  | 'chat'
  | 'check';

interface PixelIconProps {
  name: PixelIconType;
  className?: string;
  size?: number;
}

export const PixelIcon: React.FC<PixelIconProps> = ({ name, className = '', size = 16 }) => {
  // Pure 16x16 SVG pixel rendering with crisp edges (shape-rendering="crispEdges")
  const renderIconContent = () => {
    switch (name) {
      case 'boards':
        return (
          <>
            {/* Floppy Disk */}
            <rect x="2" y="2" width="12" height="12" fill="currentColor" fillOpacity="0.3" />
            <rect x="2" y="2" width="12" height="1" fill="currentColor" />
            <rect x="2" y="13" width="12" height="1" fill="currentColor" />
            <rect x="2" y="2" width="1" height="12" fill="currentColor" />
            <rect x="13" y="2" width="1" height="12" fill="currentColor" />
            <rect x="4" y="3" width="7" height="4" fill="currentColor" fillOpacity="0.8" />
            <rect x="5" y="4" width="2" height="2" fill="var(--bg-card, #fff)" />
            <rect x="4" y="8" width="8" height="4" fill="var(--bg-card, #fff)" />
            <rect x="5" y="9" width="6" height="1" fill="currentColor" />
            <rect x="5" y="11" width="4" height="1" fill="currentColor" />
          </>
        );

      case 'new-post':
        return (
          <>
            {/* Pixel Quill / Stylus */}
            <rect x="11" y="2" width="3" height="3" fill="currentColor" />
            <rect x="9" y="4" width="3" height="3" fill="currentColor" fillOpacity="0.8" />
            <rect x="7" y="6" width="3" height="3" fill="currentColor" fillOpacity="0.8" />
            <rect x="5" y="8" width="3" height="3" fill="currentColor" fillOpacity="0.6" />
            <rect x="3" y="10" width="3" height="3" fill="currentColor" fillOpacity="0.5" />
            <rect x="2" y="13" width="2" height="2" fill="currentColor" />
            <rect x="2" y="14" width="1" height="1" fill="var(--accent-pink, #f472b6)" />
          </>
        );

      case 'palette':
        return (
          <>
            {/* Artist Palette */}
            <rect x="4" y="2" width="8" height="2" fill="currentColor" />
            <rect x="2" y="4" width="12" height="7" fill="currentColor" fillOpacity="0.2" />
            <rect x="2" y="4" width="2" height="7" fill="currentColor" />
            <rect x="12" y="4" width="2" height="7" fill="currentColor" />
            <rect x="4" y="11" width="8" height="3" fill="currentColor" />
            {/* Pastel Color dabs */}
            <rect x="4" y="5" width="2" height="2" fill="#f472b6" />
            <rect x="7" y="4" width="2" height="2" fill="#60a5fa" />
            <rect x="10" y="5" width="2" height="2" fill="#34d399" />
            <rect x="9" y="8" width="2" height="2" fill="#fbbf24" />
          </>
        );

      case 'catalog':
        return (
          <>
            {/* 4-square grid */}
            <rect x="2" y="2" width="5" height="5" fill="currentColor" />
            <rect x="3" y="3" width="3" height="3" fill="var(--bg-card, #fff)" />
            <rect x="9" y="2" width="5" height="5" fill="currentColor" />
            <rect x="10" y="3" width="3" height="3" fill="var(--bg-card, #fff)" />
            <rect x="2" y="9" width="5" height="5" fill="currentColor" />
            <rect x="3" y="10" width="3" height="3" fill="var(--bg-card, #fff)" />
            <rect x="9" y="9" width="5" height="5" fill="currentColor" />
            <rect x="10" y="10" width="3" height="3" fill="var(--bg-card, #fff)" />
          </>
        );

      case 'search':
        return (
          <>
            {/* Magnifying Glass */}
            <rect x="4" y="2" width="6" height="1" fill="currentColor" />
            <rect x="3" y="3" width="1" height="6" fill="currentColor" />
            <rect x="10" y="3" width="1" height="6" fill="currentColor" />
            <rect x="4" y="9" width="6" height="1" fill="currentColor" />
            <rect x="5" y="4" width="4" height="4" fill="currentColor" fillOpacity="0.25" />
            <rect x="9" y="9" width="2" height="2" fill="currentColor" />
            <rect x="11" y="11" width="2" height="2" fill="currentColor" />
            <rect x="13" y="13" width="2" height="2" fill="currentColor" />
          </>
        );

      case 'sound-on':
        return (
          <>
            {/* Speaker with sound waves */}
            <rect x="2" y="6" width="3" height="4" fill="currentColor" />
            <rect x="5" y="4" width="2" height="8" fill="currentColor" />
            <rect x="7" y="2" width="2" height="12" fill="currentColor" />
            <rect x="11" y="4" width="1" height="2" fill="currentColor" />
            <rect x="12" y="6" width="1" height="4" fill="currentColor" />
            <rect x="11" y="10" width="1" height="2" fill="currentColor" />
            <rect x="14" y="2" width="1" height="3" fill="currentColor" />
            <rect x="15" y="5" width="1" height="6" fill="currentColor" />
            <rect x="14" y="11" width="1" height="3" fill="currentColor" />
          </>
        );

      case 'sound-off':
        return (
          <>
            <rect x="2" y="6" width="3" height="4" fill="currentColor" />
            <rect x="5" y="4" width="2" height="8" fill="currentColor" />
            <rect x="7" y="2" width="2" height="12" fill="currentColor" />
            {/* X marks */}
            <rect x="11" y="6" width="1" height="1" fill="#ef4444" />
            <rect x="12" y="7" width="1" height="1" fill="#ef4444" />
            <rect x="13" y="8" width="1" height="1" fill="#ef4444" />
            <rect x="12" y="9" width="1" height="1" fill="#ef4444" />
            <rect x="11" y="10" width="1" height="1" fill="#ef4444" />
            <rect x="13" y="6" width="1" height="1" fill="#ef4444" />
            <rect x="11" y="10" width="1" height="1" fill="#ef4444" />
          </>
        );

      case 'sun':
        return (
          <>
            <rect x="6" y="2" width="4" height="1" fill="#fbbf24" />
            <rect x="6" y="13" width="4" height="1" fill="#fbbf24" />
            <rect x="2" y="6" width="1" height="4" fill="#fbbf24" />
            <rect x="13" y="6" width="1" height="4" fill="#fbbf24" />
            <rect x="5" y="5" width="6" height="6" fill="#f59e0b" />
            <rect x="6" y="6" width="4" height="4" fill="#fef08a" />
          </>
        );

      case 'moon':
        return (
          <>
            <rect x="5" y="2" width="5" height="2" fill="#c084fc" />
            <rect x="3" y="4" width="4" height="2" fill="#c084fc" />
            <rect x="2" y="6" width="4" height="4" fill="#c084fc" />
            <rect x="3" y="10" width="4" height="2" fill="#c084fc" />
            <rect x="5" y="12" width="5" height="2" fill="#c084fc" />
            <rect x="12" y="4" width="2" height="2" fill="#fbcfe8" />
            <rect x="13" y="9" width="1" height="1" fill="#fbcfe8" />
          </>
        );

      case 'contrast':
        return (
          <>
            <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="2" y="2" width="6" height="12" fill="currentColor" />
            <rect x="8" y="2" width="6" height="12" fill="none" />
            <rect x="4" y="7" width="2" height="2" fill="var(--bg-card, #fff)" />
            <rect x="10" y="7" width="2" height="2" fill="currentColor" />
          </>
        );

      case 'refresh':
        return (
          <>
            <rect x="5" y="2" width="6" height="2" fill="currentColor" />
            <rect x="11" y="4" width="2" height="4" fill="currentColor" />
            <rect x="9" y="4" width="4" height="2" fill="currentColor" />
            <rect x="11" y="2" width="2" height="2" fill="currentColor" />
            <rect x="5" y="12" width="6" height="2" fill="currentColor" />
            <rect x="3" y="8" width="2" height="4" fill="currentColor" />
            <rect x="3" y="10" width="4" height="2" fill="currentColor" />
            <rect x="3" y="12" width="2" height="2" fill="currentColor" />
          </>
        );

      case 'pin':
        return (
          <>
            <rect x="5" y="2" width="6" height="3" fill="#f43f5e" />
            <rect x="6" y="5" width="4" height="4" fill="#e11d48" />
            <rect x="4" y="9" width="8" height="2" fill="#be123c" />
            <rect x="7" y="11" width="2" height="4" fill="currentColor" />
          </>
        );

      case 'lock':
        return (
          <>
            <rect x="5" y="2" width="6" height="2" fill="currentColor" />
            <rect x="4" y="4" width="2" height="3" fill="currentColor" />
            <rect x="10" y="4" width="2" height="3" fill="currentColor" />
            <rect x="3" y="7" width="10" height="7" fill="#fbbf24" />
            <rect x="7" y="9" width="2" height="3" fill="#78350f" />
          </>
        );

      case 'heart':
        return (
          <>
            <rect x="3" y="3" width="4" height="4" fill="#f472b6" />
            <rect x="9" y="3" width="4" height="4" fill="#f472b6" />
            <rect x="2" y="4" width="12" height="4" fill="#f472b6" />
            <rect x="3" y="8" width="10" height="3" fill="#f472b6" />
            <rect x="5" y="11" width="6" height="2" fill="#f472b6" />
            <rect x="7" y="13" width="2" height="2" fill="#f472b6" />
            <rect x="4" y="4" width="2" height="2" fill="#fce7f3" />
          </>
        );

      case 'sakura':
        return (
          <>
            <rect x="7" y="2" width="2" height="2" fill="#f472b6" />
            <rect x="5" y="4" width="6" height="3" fill="#f472b6" />
            <rect x="2" y="7" width="12" height="2" fill="#f472b6" />
            <rect x="5" y="9" width="6" height="3" fill="#f472b6" />
            <rect x="7" y="12" width="2" height="2" fill="#f472b6" />
            <rect x="7" y="7" width="2" height="2" fill="#fef08a" />
          </>
        );

      case 'image':
        return (
          <>
            <rect x="2" y="2" width="12" height="12" fill="currentColor" fillOpacity="0.15" />
            <rect x="2" y="2" width="12" height="1" fill="currentColor" />
            <rect x="2" y="13" width="12" height="1" fill="currentColor" />
            <rect x="2" y="2" width="1" height="12" fill="currentColor" />
            <rect x="13" y="2" width="1" height="12" fill="currentColor" />
            {/* Sun in picture */}
            <rect x="4" y="4" width="2" height="2" fill="#fbbf24" />
            {/* Mountain */}
            <rect x="4" y="10" width="3" height="3" fill="#34d399" />
            <rect x="7" y="8" width="4" height="5" fill="#10b981" />
            <rect x="10" y="11" width="3" height="2" fill="#059669" />
          </>
        );

      case 'poetry':
        return (
          <>
            {/* Scroll paper */}
            <rect x="3" y="2" width="10" height="12" fill="currentColor" fillOpacity="0.2" />
            <rect x="3" y="2" width="10" height="1" fill="currentColor" />
            <rect x="3" y="13" width="10" height="1" fill="currentColor" />
            <rect x="3" y="2" width="1" height="12" fill="currentColor" />
            <rect x="12" y="2" width="1" height="12" fill="currentColor" />
            {/* Japanese tategaki lines */}
            <rect x="10" y="4" width="1" height="6" fill="#f43f5e" />
            <rect x="7" y="4" width="1" height="7" fill="currentColor" />
            <rect x="5" y="5" width="1" height="5" fill="currentColor" />
          </>
        );

      case 'reply':
        return (
          <>
            <rect x="4" y="4" width="2" height="2" fill="currentColor" />
            <rect x="2" y="6" width="2" height="2" fill="currentColor" />
            <rect x="4" y="8" width="2" height="2" fill="currentColor" />
            <rect x="6" y="6" width="5" height="2" fill="currentColor" />
            <rect x="11" y="8" width="2" height="4" fill="currentColor" />
          </>
        );

      case 'sage':
        return (
          <>
            {/* Sprout */}
            <rect x="3" y="4" width="3" height="2" fill="#34d399" />
            <rect x="4" y="6" width="3" height="2" fill="#10b981" />
            <rect x="10" y="4" width="3" height="2" fill="#34d399" />
            <rect x="9" y="6" width="3" height="2" fill="#10b981" />
            <rect x="7" y="6" width="2" height="8" fill="#047857" />
          </>
        );

      case 'sparkles':
        return (
          <>
            <rect x="7" y="2" width="2" height="6" fill="#fbbf24" />
            <rect x="5" y="4" width="6" height="2" fill="#fbbf24" />
            <rect x="7" y="4" width="2" height="2" fill="#fef08a" />
            <rect x="12" y="9" width="1" height="3" fill="#f472b6" />
            <rect x="11" y="10" width="3" height="1" fill="#f472b6" />
            <rect x="2" y="11" width="1" height="3" fill="#60a5fa" />
            <rect x="1" y="12" width="3" height="1" fill="#60a5fa" />
          </>
        );

      case 'bucket':
        return (
          <>
            <rect x="4" y="4" width="6" height="6" fill="currentColor" fillOpacity="0.4" />
            <rect x="3" y="3" width="7" height="2" fill="currentColor" />
            <rect x="3" y="9" width="7" height="2" fill="currentColor" />
            <rect x="10" y="8" width="2" height="2" fill="#60a5fa" />
            <rect x="12" y="10" width="2" height="4" fill="#3b82f6" />
          </>
        );

      case 'eraser':
        return (
          <>
            <rect x="8" y="2" width="4" height="4" fill="#f472b6" />
            <rect x="5" y="5" width="4" height="4" fill="#fbcfe8" />
            <rect x="2" y="8" width="4" height="4" fill="currentColor" />
            <rect x="3" y="12" width="5" height="2" fill="currentColor" />
          </>
        );

      case 'eyedropper':
        return (
          <>
            <rect x="11" y="2" width="3" height="3" fill="#f472b6" />
            <rect x="8" y="5" width="3" height="3" fill="currentColor" />
            <rect x="5" y="8" width="3" height="3" fill="currentColor" />
            <rect x="2" y="11" width="3" height="3" fill="currentColor" fillOpacity="0.5" />
            <rect x="2" y="14" width="1" height="1" fill="#f43f5e" />
          </>
        );

      case 'symmetry':
        return (
          <>
            <rect x="2" y="4" width="4" height="8" fill="#60a5fa" />
            <rect x="7" y="1" width="2" height="14" fill="currentColor" fillOpacity="0.4" strokeDasharray="2" />
            <rect x="10" y="4" width="4" height="8" fill="#60a5fa" />
          </>
        );

      case 'download':
        return (
          <>
            <rect x="7" y="2" width="2" height="7" fill="currentColor" />
            <rect x="5" y="7" width="6" height="2" fill="currentColor" />
            <rect x="6" y="9" width="4" height="1" fill="currentColor" />
            <rect x="7" y="10" width="2" height="1" fill="currentColor" />
            <rect x="2" y="12" width="12" height="2" fill="currentColor" />
          </>
        );

      case 'trash':
        return (
          <>
            <rect x="4" y="2" width="8" height="2" fill="currentColor" />
            <rect x="2" y="4" width="12" height="2" fill="currentColor" />
            <rect x="3" y="6" width="10" height="8" fill="currentColor" fillOpacity="0.3" />
            <rect x="3" y="6" width="1" height="8" fill="currentColor" />
            <rect x="12" y="6" width="1" height="8" fill="currentColor" />
            <rect x="3" y="13" width="10" height="1" fill="currentColor" />
            <rect x="6" y="8" width="1" height="4" fill="currentColor" />
            <rect x="9" y="8" width="1" height="4" fill="currentColor" />
          </>
        );

      case 'close':
        return (
          <>
            <rect x="3" y="3" width="2" height="2" fill="currentColor" />
            <rect x="5" y="5" width="2" height="2" fill="currentColor" />
            <rect x="7" y="7" width="2" height="2" fill="currentColor" />
            <rect x="9" y="9" width="2" height="2" fill="currentColor" />
            <rect x="11" y="11" width="2" height="2" fill="currentColor" />
            <rect x="11" y="3" width="2" height="2" fill="currentColor" />
            <rect x="9" y="5" width="2" height="2" fill="currentColor" />
            <rect x="5" y="9" width="2" height="2" fill="currentColor" />
            <rect x="3" y="11" width="2" height="2" fill="currentColor" />
          </>
        );

      case 'dice':
        return (
          <>
            <rect x="2" y="2" width="12" height="12" fill="currentColor" fillOpacity="0.2" />
            <rect x="2" y="2" width="12" height="1" fill="currentColor" />
            <rect x="2" y="13" width="12" height="1" fill="currentColor" />
            <rect x="2" y="2" width="1" height="12" fill="currentColor" />
            <rect x="13" y="2" width="1" height="12" fill="currentColor" />
            {/* Pips */}
            <rect x="4" y="4" width="2" height="2" fill="currentColor" />
            <rect x="10" y="4" width="2" height="2" fill="currentColor" />
            <rect x="7" y="7" width="2" height="2" fill="#f43f5e" />
            <rect x="4" y="10" width="2" height="2" fill="currentColor" />
            <rect x="10" y="10" width="2" height="2" fill="currentColor" />
          </>
        );

      case 'chat':
        return (
          <>
            <rect x="2" y="3" width="12" height="8" fill="currentColor" fillOpacity="0.2" />
            <rect x="2" y="3" width="12" height="1" fill="currentColor" />
            <rect x="2" y="10" width="12" height="1" fill="currentColor" />
            <rect x="2" y="3" width="1" height="8" fill="currentColor" />
            <rect x="13" y="3" width="1" height="8" fill="currentColor" />
            <rect x="4" y="11" width="3" height="2" fill="currentColor" />
            <rect x="3" y="13" width="2" height="1" fill="currentColor" />
            <rect x="4" y="6" width="8" height="1" fill="currentColor" />
            <rect x="4" y="8" width="5" height="1" fill="currentColor" />
          </>
        );

      case 'check':
        return (
          <>
            <rect x="12" y="3" width="2" height="2" fill="#10b981" />
            <rect x="10" y="5" width="2" height="2" fill="#10b981" />
            <rect x="8" y="7" width="2" height="2" fill="#10b981" />
            <rect x="6" y="9" width="2" height="2" fill="#10b981" />
            <rect x="4" y="7" width="2" height="2" fill="#10b981" />
            <rect x="2" y="5" width="2" height="2" fill="#10b981" />
          </>
        );

      default:
        return <rect x="2" y="2" width="12" height="12" fill="currentColor" />;
    }
  };

  return (
    <svg
      id={`pixel-icon-${name}`}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      className={`inline-block shrink-0 transition-transform ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderIconContent()}
    </svg>
  );
};
