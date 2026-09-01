-- ==============================================================================
-- Cloudflare D1 Seed Data for YumeChan Board
-- Seeds the 3 primary retro pastel boards (No example posts)
-- ==============================================================================

INSERT OR IGNORE INTO boards (id, slug, name, jp_name, description, icon, accent_color, tagline, rules_json, created_at)
VALUES 
(
  'yume',
  'yume',
  'General Thread',
  'ゆめ総合',
  'General discussion, casual banter, pastel daydreams, and midnight chill',
  'sparkles',
  '#f472b6',
  '夜のひとやすみ ★ General discussion lounge',
  '["Be gentle and cozy to all anons", "Kaomoji and casual banter encouraged (｡•̀ᴗ-)✧", "All anonymous voices welcome"]',
  1700000000
),
(
  'uta',
  'uta',
  'Poetry',
  '歌・俳句',
  'Japanese vertical stanzas, 5-7-5 haikus, lyrical lines, and micro-verse',
  'poetry',
  '#a78bfa',
  '言葉の花びら ★ Petals of quiet verse',
  '["Embrace rhythm and seasonal mood", "Vertical poem layout enabled", "Critique verse with kindness"]',
  1700000000
),
(
  'mimi',
  'mimi',
  'Vents and Rants',
  '耳の部屋 (愚痴)',
  'Midnight vents, honest rants, letting off steam, and finding a supportive listening ear',
  'chat',
  '#fb7185',
  '静かに耳を傾ける ★ A safe listening ear for midnight thoughts',
  '["Venting, rants, and honest confessions welcome", "Support fellow anons — no toxic harassment", "Let off steam freely in a safe retro space"]',
  1700000000
);
