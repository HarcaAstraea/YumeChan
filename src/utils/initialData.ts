import { Board, Thread } from '../types';

export const BOARDS: Board[] = [
  {
    id: 'yume',
    slug: 'yume',
    name: 'General Thread',
    jpName: 'ハニベリ',
    description: 'Haniberry Thread',
    icon: 'sparkles',
    accentColor: '#f472b6',
    tagline: ' ✧.* A Safe place for your thoughts ⋆.ೃ࿔*:･ ',
    rules: ['Be gentle and cozy to everyone', 'Please keep it chill and respectful with no slurs, trolling, or any hurtful remarks please T^T', 'All anonymous voices welcome ^^'],
  },
  {
    id: 'uta',
    slug: 'uta',
    name: 'Poetry',
    jpName: '歌',
    description: 'Poetry, Quotes, Sweet Verses',
    icon: 'poetry',
    accentColor: '#a78bfa',
    tagline: '⋆˙⟡♡ Show us your magical words ♫',
    rules: ['Embrace rhythm and seasonal mood', 'Vertical poem layout enabled', 'Critique verse with kindness'],
  },
  {
    id: 'mimi',
    slug: 'mimi',
    name: 'Vents and Rants',
    jpName: '耳',
    description: 'Prolly your thoughts every midnight',
    icon: 'chat',
    accentColor: '#fb7185',
    tagline: '୨୧ Know that you will never be alone ˚₊‧꒰ა ☆ ໒꒱ ‧₊˚',
    rules: ['Venting, rants, and honest confessions welcome', 'Support fellow anons — no toxic harassment', 'Let off steam freely in a safe retro space'],
  },
];

// Helper to create inline SVG data URL for retro pixel art illustrations
export function createRetroPixelArtSvg(type: string): string {
  let svgContent = '';
  if (type === 'sakura_tree') {
    svgContent = `
      <rect width="64" height="64" fill="#fdf2f8"/>
      <rect x="28" y="36" width="8" height="24" fill="#78350f"/>
      <rect x="24" y="44" width="4" height="12" fill="#78350f"/>
      <rect x="36" y="40" width="6" height="8" fill="#78350f"/>
      <rect x="16" y="16" width="32" height="24" fill="#f472b6" rx="4"/>
      <rect x="12" y="20" width="40" height="16" fill="#fbcfe8" rx="2"/>
      <rect x="20" y="12" width="24" height="12" fill="#f472b6"/>
      <rect x="8" y="24" width="8" height="8" fill="#fbcfe8"/>
      <rect x="48" y="24" width="8" height="8" fill="#f472b6"/>
      <rect x="18" y="22" width="4" height="4" fill="#fff"/>
      <rect x="34" y="18" width="4" height="4" fill="#fff"/>
      <rect x="42" y="26" width="4" height="4" fill="#fff"/>
      <rect x="22" y="58" width="6" height="2" fill="#f472b6"/>
      <rect x="40" y="56" width="4" height="2" fill="#fbcfe8"/>
    `;
  } else if (type === 'pc98') {
    svgContent = `
      <rect width="64" height="64" fill="#ecfdf5"/>
      <rect x="10" y="8" width="44" height="34" fill="#9ca3af" rx="2"/>
      <rect x="14" y="12" width="36" height="26" fill="#064e3b"/>
      <rect x="18" y="16" width="28" height="3" fill="#34d399"/>
      <rect x="18" y="22" width="20" height="2" fill="#a7f3d0"/>
      <rect x="18" y="26" width="24" height="2" fill="#6ee7b7"/>
      <rect x="18" y="30" width="12" height="2" fill="#34d399"/>
      <rect x="26" y="42" width="12" height="6" fill="#6b7280"/>
      <rect x="6" y="48" width="52" height="10" fill="#cbd5e1" rx="2"/>
      <rect x="10" y="51" width="34" height="4" fill="#64748b"/>
      <rect x="46" y="50" width="8" height="6" fill="#475569"/>
    `;
  } else if (type === 'ramen') {
    svgContent = `
      <rect width="64" height="64" fill="#fffbeb"/>
      <ellipse cx="32" cy="38" rx="22" ry="18" fill="#f59e0b"/>
      <ellipse cx="32" cy="36" rx="20" ry="14" fill="#fef3c7"/>
      <ellipse cx="32" cy="36" rx="18" ry="12" fill="#b45309"/>
      <rect x="22" y="32" width="20" height="4" fill="#fde68a"/>
      <circle cx="26" cy="32" r="5" fill="#fff"/>
      <circle cx="26" cy="32" r="3" fill="#f97316"/>
      <rect x="36" y="28" width="10" height="8" fill="#78350f" rx="1"/>
      <rect x="20" y="12" width="4" height="24" fill="#92400e" transform="rotate(-20 20 12)"/>
      <rect x="24" y="10" width="4" height="26" fill="#92400e" transform="rotate(-20 24 10)"/>
    `;
  } else if (type === 'gameboy') {
    svgContent = `
      <rect width="64" height="64" fill="#f0fdf4"/>
      <rect x="12" y="6" width="40" height="52" fill="#d1d5db" rx="4"/>
      <rect x="16" y="10" width="32" height="26" fill="#4b5563" rx="2"/>
      <rect x="20" y="14" width="24" height="18" fill="#84cc16"/>
      <rect x="24" y="18" width="16" height="4" fill="#3f6212"/>
      <rect x="26" y="24" width="12" height="4" fill="#3f6212"/>
      <circle cx="18" cy="22" r="1" fill="#ef4444"/>
      <rect x="18" y="42" width="10" height="4" fill="#374151"/>
      <rect x="21" y="39" width="4" height="10" fill="#374151"/>
      <circle cx="44" cy="42" r="3" fill="#ec4899"/>
      <circle cx="38" cy="46" r="3" fill="#ec4899"/>
    `;
  } else {
    // Cute pixel cat
    svgContent = `
      <rect width="64" height="64" fill="#fdf4ff"/>
      <polygon points="18,14 26,14 18,24" fill="#f472b6"/>
      <polygon points="46,14 38,14 46,24" fill="#f472b6"/>
      <ellipse cx="32" cy="32" rx="18" ry="14" fill="#fae8ff"/>
      <ellipse cx="32" cy="32" rx="16" ry="12" fill="#ffffff"/>
      <circle cx="26" cy="30" r="3" fill="#4c1d95"/>
      <circle cx="38" cy="30" r="3" fill="#4c1d95"/>
      <circle cx="25" cy="29" r="1" fill="#fff"/>
      <circle cx="37" cy="29" r="1" fill="#fff"/>
      <polygon points="32,34 30,36 34,36" fill="#f472b6"/>
      <rect x="16" y="32" width="6" height="1" fill="#c084fc"/>
      <rect x="16" y="35" width="6" height="1" fill="#c084fc"/>
      <rect x="42" y="32" width="6" height="1" fill="#c084fc"/>
      <rect x="42" y="35" width="6" height="1" fill="#c084fc"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" style="shape-rendering:crispEdges;image-rendering:pixelated;">${svgContent}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_THREADS: Thread[] = [];
