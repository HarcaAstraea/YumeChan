import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/chiptune';

interface PixelArtStudioProps {
  onExportToPost?: (dataUrl: string, grid: string[][]) => void;
  onClose?: () => void;
  initialGrid?: string[][];
}

const PALETTES = {
  'Sakura Pastel': [
    '#ffffff', '#fdf2f8', '#fce7f3', '#fbcfe8', '#f472b6', '#ec4899', '#db2777', '#831843',
    '#fef08a', '#fbbf24', '#f59e0b', '#60a5fa', '#38bdf8', '#34d399', '#c084fc', '#372f38',
  ],
  'PC-98 Mint': [
    '#000000', '#064e3b', '#047857', '#10b981', '#34d399', '#a7f3d0', '#ecfdf5', '#ffffff',
    '#78350f', '#d97706', '#fbbf24', '#4338ca', '#6366f1', '#a855f7', '#e11d48', '#94a3b8',
  ],
  'GameBoy Nostalgia': [
    '#0f380f', '#306230', '#8bac0f', '#9bbc0f', '#062626', '#144646', '#2d6d6d', '#61a3a3',
    '#2b1810', '#593020', '#8c4e32', '#d98960', '#1c1929', '#3b3554', '#786d99', '#d4cde6',
  ],
  'Vapor Sunset': [
    '#1e1b4b', '#4338ca', '#7c3aed', '#c084fc', '#f472b6', '#fb7185', '#fda4af', '#fff1f2',
    '#0e7490', '#06b6d4', '#67e8f9', '#fde047', '#f97316', '#fb923c', '#fdba74', '#ffffff',
  ],
  'Midnight Neon': [
    '#09080e', '#19152b', '#3b2866', '#7e22ce', '#c084fc', '#f43f5e', '#fb7185', '#ffe4e6',
    '#0891b2', '#22d3ee', '#a5f3fc', '#15803d', '#4ade80', '#bbf7d0', '#facc15', '#f8fafc',
  ],
};

const STAMPS = [
  { name: 'Heart', pattern: [[1,1],[1,2],[2,0],[2,3],[3,0],[3,3],[4,1],[4,2],[5,2]] },
  { name: 'Star', pattern: [[2,2],[1,2],[3,2],[2,1],[2,3],[0,2],[4,2],[2,0],[2,4]] },
  { name: 'Sakura', pattern: [[1,2],[2,1],[2,2],[2,3],[3,2],[0,2],[2,0],[4,2],[2,4]] },
];

export const PixelArtStudio: React.FC<PixelArtStudioProps> = ({
  onExportToPost,
  onClose,
  initialGrid,
}) => {
  const [gridSize, setGridSize] = useState<16 | 24 | 32>(16);
  const [paletteName, setPaletteName] = useState<keyof typeof PALETTES>('Sakura Pastel');
  const [selectedColor, setSelectedColor] = useState<string>(PALETTES['Sakura Pastel'][4]);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'bucket' | 'eyedropper'>('pen');
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Initialize Canvas Grid (2D array of colors)
  const createEmptyGrid = (size: number): string[][] => {
    return Array(size).fill(null).map(() => Array(size).fill('transparent'));
  };

  const [grid, setGrid] = useState<string[][]>(() => {
    if (initialGrid && initialGrid.length > 0) {
      return initialGrid;
    }
    return createEmptyGrid(16);
  });

  const [history, setHistory] = useState<string[][][]>([]);
  const isMouseDown = useRef<boolean>(false);

  const colors = PALETTES[paletteName];

  // Canvas resize handler
  const handleSizeChange = (newSize: 16 | 24 | 32) => {
    sound.playClick();
    setGridSize(newSize);
    setGrid(createEmptyGrid(newSize));
    setHistory([]);
  };

  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), grid.map((row) => [...row])]);
  }, [grid]);

  const undo = () => {
    if (history.length === 0) return;
    sound.playClick();
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGrid(previous);
  };

  // Flood fill algorithm
  const floodFill = (startRow: number, startCol: number, targetColor: string, replaceColor: string) => {
    if (targetColor === replaceColor) return;
    const newGrid = grid.map((r) => [...r]);
    const queue: [number, number][] = [[startRow, startCol]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      if (newGrid[r][c] !== targetColor) continue;

      newGrid[r][c] = replaceColor;

      queue.push([r + 1, c]);
      queue.push([r - 1, c]);
      queue.push([r, c + 1]);
      queue.push([r, c - 1]);
    }

    setGrid(newGrid);
  };

  const applyPixelAction = (row: number, col: number) => {
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return;

    if (tool === 'eyedropper') {
      const currentColor = grid[row][col];
      if (currentColor && currentColor !== 'transparent') {
        setSelectedColor(currentColor);
        sound.playPixelPlink(1.2);
        setTool('pen');
      }
      return;
    }

    if (tool === 'bucket') {
      saveHistory();
      sound.playPixelPlink(0.8);
      const target = grid[row][col];
      floodFill(row, col, target, selectedColor);
      return;
    }

    const fillVal = tool === 'eraser' ? 'transparent' : selectedColor;

    setGrid((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[row][col] = fillVal;

      if (symmetry) {
        const mirrorCol = gridSize - 1 - col;
        copy[row][mirrorCol] = fillVal;
      }
      return copy;
    });

    sound.playPixelPlink(0.9 + (col / gridSize) * 0.4);
  };

  const handleCellMouseDown = (row: number, col: number) => {
    isMouseDown.current = true;
    saveHistory();
    applyPixelAction(row, col);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isMouseDown.current && (tool === 'pen' || tool === 'eraser')) {
      applyPixelAction(row, col);
    }
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Export to high-res PNG dataURL with pixel-art sharp scaling
  const generatePngDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    const scale = 16; // 16x upscale for crisp display
    canvas.width = gridSize * scale;
    canvas.height = gridSize * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const color = grid[r][c];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }
    return canvas.toDataURL('image/png');
  };

  const handleExport = () => {
    sound.playPostSuccess();
    const dataUrl = generatePngDataUrl();
    if (onExportToPost) {
      onExportToPost(dataUrl, grid);
    }
  };

  const handleDownload = () => {
    sound.playPostSuccess();
    const dataUrl = generatePngDataUrl();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `yume_pixel_${Date.now()}.png`;
    a.click();
  };

  const clearCanvas = () => {
    sound.playClick();
    saveHistory();
    setGrid(createEmptyGrid(gridSize));
  };

  const applyStamp = (pattern: number[][]) => {
    sound.playPostSuccess();
    saveHistory();
    const newGrid = grid.map((r) => [...r]);
    const offsetR = Math.floor((gridSize - 6) / 2);
    const offsetC = Math.floor((gridSize - 6) / 2);

    pattern.forEach(([r, c]) => {
      const targetR = offsetR + r;
      const targetC = offsetC + c;
      if (targetR >= 0 && targetR < gridSize && targetC >= 0 && targetC < gridSize) {
        newGrid[targetR][targetC] = selectedColor;
      }
    });

    setGrid(newGrid);
  };

  return (
    <div id="pixel-art-studio" className="pixel-box p-3 sm:p-5 max-w-4xl mx-auto my-4">
      {/* Studio Header */}
      <div className="bg-[var(--window-header)] border-b-2 border-[var(--border-color)] -mt-3 sm:-mt-5 -mx-3 sm:-mx-5 px-3 py-2 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PixelIcon name="palette" size={18} className="text-[var(--accent-pink)]" />
          <span className="font-bold text-sm tracking-wider text-[var(--window-header-text)]">
            ドット絵工房 ★ 16-BIT PIXEL ART STUDIO
          </span>
        </div>
        {onClose && (
          <button
            id="close-studio-btn"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="pixel-btn p-1 text-xs"
            title="Close studio"
          >
            <PixelIcon name="close" size={12} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Canvas & Drawing Area */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Canvas Toolbar Top */}
          <div className="w-full flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span>Size:</span>
              {[16, 24, 32].map((s) => (
                <button
                  key={s}
                  id={`canvas-size-${s}`}
                  onClick={() => handleSizeChange(s as 16 | 24 | 32)}
                  className={`pixel-btn px-2 py-0.5 text-xs ${
                    gridSize === s ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}
                >
                  {s}x{s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="toggle-canvas-grid"
                onClick={() => setShowGrid(!showGrid)}
                className={`pixel-btn px-2 py-0.5 text-xs ${showGrid ? 'bg-[var(--accent-mint)] text-slate-900' : ''}`}
                title="Toggle grid overlay"
              >
                Grid
              </button>
              <button
                id="undo-canvas-btn"
                onClick={undo}
                disabled={history.length === 0}
                className="pixel-btn px-2 py-0.5 text-xs disabled:opacity-40"
                title="Undo (Z)"
              >
                Undo
              </button>
              <button
                id="clear-canvas-btn"
                onClick={clearCanvas}
                className="pixel-btn px-2 py-0.5 text-xs text-rose-500 hover:bg-rose-50"
                title="Clear canvas"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Interactive Grid Canvas */}
          <div
            id="pixel-grid-container"
            className={`pixel-box p-2 bg-[#fcfcfc] dark:bg-[#12101a] select-none touch-none inline-block border-2 shadow-md ${
              gridSize === 16 ? 'max-w-[340px]' : gridSize === 24 ? 'max-w-[380px]' : 'max-w-[420px]'
            }`}
            style={{
              cursor: tool === 'eyedropper' ? 'crosshair' : tool === 'bucket' ? 'cell' : 'pointer',
            }}
          >
            <div
              className="grid gap-[1px] bg-slate-300 dark:bg-slate-700"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(78vw, 320px)',
                height: 'min(78vw, 320px)',
              }}
            >
              {grid.map((rowArr, rIdx) =>
                rowArr.map((color, cIdx) => {
                  const isTransparent = color === 'transparent';
                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      id={`pixel-cell-${rIdx}-${cIdx}`}
                      onMouseDown={() => handleCellMouseDown(rIdx, cIdx)}
                      onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                      className={`relative aspect-square transition-colors ${
                        showGrid ? 'outline-[0.5px] outline-black/10 dark:outline-white/10' : ''
                      }`}
                      style={{
                        backgroundColor: isTransparent ? undefined : color,
                        backgroundImage: isTransparent
                          ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #cbd5e1 0% 50%) 50% / 8px 8px'
                          : undefined,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Live Preview & Stamp Presets */}
          <div className="w-full mt-3 flex items-center justify-between gap-3 text-xs bg-[var(--bg-surface)] p-2 border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] opacity-75">1x Scale:</span>
              <div className="w-8 h-8 pixel-box-sm bg-white dark:bg-slate-900 flex items-center justify-center p-0.5">
                <img
                  src={generatePngDataUrl()}
                  alt="preview"
                  className="w-full h-full object-contain pixel-canvas-grid"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="font-bold text-[10px] opacity-75 mr-1">Stamps:</span>
              {STAMPS.map((st) => (
                <button
                  key={st.name}
                  onClick={() => applyStamp(st.pattern)}
                  className="pixel-btn px-1.5 py-0.5 text-[10px] bg-[var(--bg-card)]"
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tools, Palette, and Export Buttons */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tool Selection */}
          <div className="pixel-box-sm p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--text-secondary)] flex items-center gap-1">
              <PixelIcon name="new-post" size={12} />
              <span>Tools & Mode</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                id="tool-pen"
                onClick={() => {
                  sound.playClick();
                  setTool('pen');
                }}
                className={`pixel-btn p-2 text-xs flex flex-col items-center gap-1 ${
                  tool === 'pen' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <PixelIcon name="new-post" size={16} />
                <span>Pencil</span>
              </button>

              <button
                id="tool-eraser"
                onClick={() => {
                  sound.playClick();
                  setTool('eraser');
                }}
                className={`pixel-btn p-2 text-xs flex flex-col items-center gap-1 ${
                  tool === 'eraser' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <PixelIcon name="eraser" size={16} />
                <span>Eraser</span>
              </button>

              <button
                id="tool-bucket"
                onClick={() => {
                  sound.playClick();
                  setTool('bucket');
                }}
                className={`pixel-btn p-2 text-xs flex flex-col items-center gap-1 ${
                  tool === 'bucket' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <PixelIcon name="bucket" size={16} />
                <span>Fill</span>
              </button>

              <button
                id="tool-eyedropper"
                onClick={() => {
                  sound.playClick();
                  setTool('eyedropper');
                }}
                className={`pixel-btn p-2 text-xs flex flex-col items-center gap-1 ${
                  tool === 'eyedropper' ? 'bg-[var(--border-strong)] text-white font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <PixelIcon name="eyedropper" size={16} />
                <span>Picker</span>
              </button>
            </div>

            {/* Symmetry Toggle */}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border-color)] pt-2 text-xs">
              <span className="flex items-center gap-1">
                <PixelIcon name="symmetry" size={14} />
                <span>Mirror Symmetry (X-Axis)</span>
              </span>
              <button
                id="toggle-symmetry-btn"
                onClick={() => {
                  sound.playClick();
                  setSymmetry(!symmetry);
                }}
                className={`pixel-btn px-2 py-0.5 text-xs ${symmetry ? 'bg-[var(--accent-mint)] text-slate-900 font-bold' : 'bg-[var(--bg-card)] text-[var(--text-primary)]'}`}
              >
                {symmetry ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Color Palette Selection */}
          <div className="pixel-box-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                <PixelIcon name="palette" size={12} />
                <span>16-Color Palette</span>
              </h4>
              <select
                id="palette-selector"
                value={paletteName}
                onChange={(e) => {
                  sound.playClick();
                  setPaletteName(e.target.value as keyof typeof PALETTES);
                  setSelectedColor(PALETTES[e.target.value as keyof typeof PALETTES][4]);
                }}
                className="pixel-input text-[11px] px-1.5 py-0.5"
              >
                {Object.keys(PALETTES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-8 gap-1.5 p-1 bg-[var(--bg-surface)] border border-[var(--border-color)]">
              {colors.map((c, i) => {
                const isSelected = selectedColor.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={`${c}-${i}`}
                    id={`palette-color-${i}`}
                    onClick={() => {
                      setSelectedColor(c);
                      sound.playPixelPlink(0.8 + (i / 16));
                      if (tool === 'eraser') setTool('pen');
                    }}
                    className={`aspect-square w-full rounded-xs border transition-transform ${
                      isSelected ? 'ring-2 ring-[var(--accent-pink)] scale-110 z-10 border-white' : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                );
              })}
            </div>

            {/* Selected Color Display */}
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 border-2 border-[var(--border-strong)] shadow-xs"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="font-mono text-[11px]">{selectedColor.toUpperCase()}</span>
              </div>

              {/* Custom HEX Picker */}
              <label className="text-[10px] opacity-80 cursor-pointer flex items-center gap-1 hover:text-[var(--accent-pink)]">
                <span>Custom:</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-4 h-4 p-0 border-0 cursor-pointer bg-transparent"
                />
              </label>
            </div>
          </div>

          {/* Export / Attach Actions */}
          <div className="flex flex-col gap-2">
            {onExportToPost && (
              <button
                id="export-to-post-btn"
                onClick={handleExport}
                className="pixel-btn bg-[var(--accent-pink)] hover:bg-[var(--accent-cherry)] text-white py-2 px-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_var(--border-strong)]"
              >
                <PixelIcon name="new-post" size={16} />
                <span>Attach to Post</span>
              </button>
            )}

            <button
              id="download-pixel-png-btn"
              onClick={handleDownload}
              className="pixel-btn bg-[var(--bg-surface)] py-1.5 px-3 text-xs flex items-center justify-center gap-2"
            >
              <PixelIcon name="download" size={14} />
              <span>Save PNG File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
