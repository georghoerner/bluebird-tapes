import { useState, useRef, useCallback } from 'react';
import { Terminal, Box, Separator } from '../components/Terminal';

// Character sets ordered by perceived density (dark to light)
const CHAR_SETS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  simple: ' .-+*#',
  binary: ' █',
};

type CharSetKey = keyof typeof CHAR_SETS;

interface AsciiChar {
  char: string;
  fgColor: string;
  bgColor: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Get brightness from RGB (0-255)
function getBrightness(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b);
}

// RGB to CSS color string
function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

// K-means clustering for color quantization
function kMeansCluster(colors: RGB[], k: number, iterations: number = 10): RGB[] {
  if (colors.length === 0) return [];
  if (colors.length <= k) return colors;

  // Initialize centroids randomly from existing colors
  let centroids: RGB[] = [];
  const used = new Set<number>();
  while (centroids.length < k && centroids.length < colors.length) {
    const idx = Math.floor(Math.random() * colors.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push({ ...colors[idx] });
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Assign colors to nearest centroid
    const clusters: RGB[][] = Array.from({ length: k }, () => []);

    for (const color of colors) {
      let minDist = Infinity;
      let nearestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = Math.sqrt(
          Math.pow(color.r - centroids[i].r, 2) +
          Math.pow(color.g - centroids[i].g, 2) +
          Math.pow(color.b - centroids[i].b, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      clusters[nearestIdx].push(color);
    }

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        centroids[i] = {
          r: Math.round(clusters[i].reduce((sum, c) => sum + c.r, 0) / clusters[i].length),
          g: Math.round(clusters[i].reduce((sum, c) => sum + c.g, 0) / clusters[i].length),
          b: Math.round(clusters[i].reduce((sum, c) => sum + c.b, 0) / clusters[i].length),
        };
      }
    }
  }

  return centroids;
}

// Find nearest color from palette
function findNearestColor(color: RGB, palette: RGB[]): RGB {
  let minDist = Infinity;
  let nearest = palette[0];

  for (const pColor of palette) {
    const dist = Math.sqrt(
      Math.pow(color.r - pColor.r, 2) +
      Math.pow(color.g - pColor.g, 2) +
      Math.pow(color.b - pColor.b, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = pColor;
    }
  }
  return nearest;
}

export function AsciiGenerator() {
  const [textWidth, setTextWidth] = useState(80);
  const [charSet, setCharSet] = useState<CharSetKey>('standard');
  const [colorQuantNum, setColorQuantNum] = useState(8);
  const [bgQuantNum, setBgQuantNum] = useState(4);
  const [asciiOutput, setAsciiOutput] = useState<AsciiChar[][] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useBgColors, setUseBgColors] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const processImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate character aspect ratio (typical monospace is ~2:1 height:width)
    const charAspect = 2;

    // Calculate cell dimensions
    const cellWidth = Math.ceil(img.width / textWidth);
    const cellHeight = Math.ceil(cellWidth * charAspect);

    // Adjust canvas to fit exact cells
    const cols = textWidth;
    const rows = Math.ceil(img.height / cellHeight);

    canvas.width = cols * cellWidth;
    canvas.height = rows * cellHeight;

    // Draw image scaled to canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const chars = CHAR_SETS[charSet];
    const result: AsciiChar[][] = [];
    const allFgColors: RGB[] = [];
    const allBgColors: RGB[] = [];
    const cellData: { brightness: number; avgColor: RGB; darkColor: RGB }[][] = [];

    // First pass: collect all cell data
    for (let row = 0; row < rows; row++) {
      cellData[row] = [];
      for (let col = 0; col < cols; col++) {
        let totalR = 0, totalG = 0, totalB = 0;
        let darkR = 0, darkG = 0, darkB = 0;
        let totalBrightness = 0;
        let pixelCount = 0;
        let darkCount = 0;

        // Sample pixels in this cell
        for (let y = row * cellHeight; y < (row + 1) * cellHeight && y < canvas.height; y++) {
          for (let x = col * cellWidth; x < (col + 1) * cellWidth && x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const brightness = getBrightness(r, g, b);

            totalR += r;
            totalG += g;
            totalB += b;
            totalBrightness += brightness;
            pixelCount++;

            // Track darker pixels for background
            if (brightness < 128) {
              darkR += r;
              darkG += g;
              darkB += b;
              darkCount++;
            }
          }
        }

        const avgColor: RGB = {
          r: Math.round(totalR / pixelCount),
          g: Math.round(totalG / pixelCount),
          b: Math.round(totalB / pixelCount),
        };

        const darkColor: RGB = darkCount > 0 ? {
          r: Math.round(darkR / darkCount),
          g: Math.round(darkG / darkCount),
          b: Math.round(darkB / darkCount),
        } : { r: 0, g: 0, b: 0 };

        cellData[row][col] = {
          brightness: totalBrightness / pixelCount,
          avgColor,
          darkColor,
        };

        allFgColors.push(avgColor);
        if (useBgColors) {
          allBgColors.push(darkColor);
        }
      }
    }

    // Quantize colors
    const fgPalette = kMeansCluster(allFgColors, colorQuantNum);
    const bgPalette = useBgColors ? kMeansCluster(allBgColors, bgQuantNum) : [{ r: 0, g: 0, b: 0 }];

    // Second pass: generate ASCII with quantized colors
    for (let row = 0; row < rows; row++) {
      result[row] = [];
      for (let col = 0; col < cols; col++) {
        const { brightness, avgColor, darkColor } = cellData[row][col];

        // Map brightness to character
        const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
        const char = chars[charIdx];

        // Quantize colors
        const fgColor = findNearestColor(avgColor, fgPalette);
        const bgColor = useBgColors ? findNearestColor(darkColor, bgPalette) : { r: 0, g: 0, b: 0 };

        result[row][col] = {
          char,
          fgColor: rgbToCss(fgColor),
          bgColor: rgbToCss(bgColor),
        };
      }
    }

    setAsciiOutput(result);
    setIsProcessing(false);
  }, [textWidth, charSet, colorQuantNum, bgQuantNum, useBgColors]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setAsciiOutput(null);
    };
    img.src = URL.createObjectURL(file);
  };

  const loadExampleImage = (filename: string) => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setAsciiOutput(null);
    };
    img.src = `/ascii/example_images/${filename}`;
  };

  const copyToClipboard = () => {
    if (!asciiOutput) return;
    // Copy plain text version
    const text = asciiOutput.map(row => row.map(c => c.char).join('')).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <Terminal>
      <Box title="ASCII IMAGE GENERATOR v0.1">
        <p className="text-dim mb-4">
          Convert images to colored ASCII art with character + background colors.
        </p>

        <Separator />

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1">Text Width (characters)</label>
            <input
              type="number"
              value={textWidth}
              onChange={(e) => setTextWidth(Math.max(10, Math.min(200, parseInt(e.target.value) || 80)))}
              className="w-full"
              min={10}
              max={200}
            />
          </div>

          <div>
            <label className="block mb-1">Character Set</label>
            <select
              value={charSet}
              onChange={(e) => setCharSet(e.target.value as CharSetKey)}
              className="w-full"
            >
              {Object.keys(CHAR_SETS).map(key => (
                <option key={key} value={key}>{key}: {CHAR_SETS[key as CharSetKey]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">FG Color Quantization</label>
            <input
              type="number"
              value={colorQuantNum}
              onChange={(e) => setColorQuantNum(Math.max(2, Math.min(32, parseInt(e.target.value) || 8)))}
              className="w-full"
              min={2}
              max={32}
            />
          </div>

          <div>
            <label className="block mb-1">BG Color Quantization</label>
            <input
              type="number"
              value={bgQuantNum}
              onChange={(e) => setBgQuantNum(Math.max(1, Math.min(16, parseInt(e.target.value) || 4)))}
              className="w-full"
              min={1}
              max={16}
              disabled={!useBgColors}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="useBgColors"
              checked={useBgColors}
              onChange={(e) => setUseBgColors(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="useBgColors">Use Background Colors</label>
          </div>
        </div>

        <Separator />

        {/* Image upload */}
        <div className="mb-4">
          <label className="block mb-2">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full"
          />
        </div>

        {/* Example images */}
        <div className="mb-4">
          <label className="block mb-2">Or load example image:</label>
          <div className="flex gap-2 flex-wrap">
            {['Appomattox.png', 'CompanyChief.png', 'MountedSerjants.png', 'NodeTeam.png'].map(name => (
              <button
                key={name}
                onClick={() => loadExampleImage(name)}
                className="text-sm"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Process button */}
        {imageLoaded && (
          <button
            onClick={processImage}
            disabled={isProcessing}
            className="mb-4"
          >
            {isProcessing ? 'Processing...' : 'Generate ASCII'}
          </button>
        )}

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <Separator />

        {/* ASCII Output */}
        {asciiOutput && (
          <div>
            <div className="flex gap-2 mb-2">
              <button onClick={copyToClipboard} className="text-sm">
                Copy Plain Text
              </button>
            </div>
            <div className="overflow-auto border border-[var(--terminal-dim)] p-2 bg-black">
              <pre
                ref={outputRef}
                style={{
                  fontFamily: "'IBM VGA', 'Courier New', monospace",
                  fontSize: '12px',
                  lineHeight: '1',
                  whiteSpace: 'pre',
                }}
              >
                {asciiOutput.map((row, rowIdx) => (
                  <div key={rowIdx} style={{ height: '12px' }}>
                    {row.map((cell, colIdx) => (
                      <span
                        key={colIdx}
                        style={{
                          color: cell.fgColor,
                          backgroundColor: useBgColors ? cell.bgColor : 'transparent',
                        }}
                      >
                        {cell.char}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        )}
      </Box>
    </Terminal>
  );
}
