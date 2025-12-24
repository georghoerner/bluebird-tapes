/**
 * Image to ASCII processor using node-canvas
 * Ported from frontend AsciiGenerator.tsx
 */

import { createCanvas, loadImage, type Image } from 'canvas';
import type { AsciiChar } from './formatConverter';

// Character sets ordered by perceived density (dark to light)
export const CHAR_SETS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  simple: ' .-+*#',
  binary: ' █',
} as const;

export type CharSetKey = keyof typeof CHAR_SETS;

interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ProcessOptions {
  width: number;
  charSet: CharSetKey;
  fgQuant: number;
  bgQuant: number;
  useBgColors: boolean;
}

/**
 * Get brightness from RGB (0-255)
 */
function getBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * RGB to CSS color string
 */
function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * K-means clustering for color quantization
 */
function kMeansCluster(colors: RGB[], k: number, iterations: number = 10): RGB[] {
  if (colors.length === 0) return [];
  if (colors.length <= k) return colors;

  // Initialize centroids randomly from existing colors
  let centroids: RGB[] = [];
  const used = new Set<number>();

  // Use deterministic seeding for reproducibility
  const seed = colors.length;
  let seedVal = seed;
  const pseudoRandom = () => {
    seedVal = (seedVal * 1103515245 + 12345) & 0x7fffffff;
    return seedVal / 0x7fffffff;
  };

  while (centroids.length < k && centroids.length < colors.length) {
    const idx = Math.floor(pseudoRandom() * colors.length);
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

/**
 * Find nearest color from palette
 */
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

/**
 * Process an image and convert to ASCII characters
 */
export async function processImage(
  imagePath: string,
  options: ProcessOptions
): Promise<AsciiChar[][]> {
  const { width: textWidth, charSet, fgQuant, bgQuant, useBgColors } = options;

  // Load image
  const img: Image = await loadImage(imagePath);

  // Calculate character aspect ratio (typical monospace is ~2:1 height:width)
  const charAspect = 2;

  // Calculate cell dimensions
  const cellWidth = Math.ceil(img.width / textWidth);
  const cellHeight = Math.ceil(cellWidth * charAspect);

  // Calculate grid dimensions
  const cols = textWidth;
  const rows = Math.ceil(img.height / cellHeight);

  // Create canvas and draw image
  const canvas = createCanvas(cols * cellWidth, rows * cellHeight);
  const ctx = canvas.getContext('2d');

  // Fill with black and draw scaled image
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const chars = CHAR_SETS[charSet];
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
  const fgPalette = kMeansCluster(allFgColors, fgQuant);
  const bgPalette = useBgColors ? kMeansCluster(allBgColors, bgQuant) : [{ r: 0, g: 0, b: 0 }];

  // Second pass: generate ASCII with quantized colors
  const result: AsciiChar[][] = [];

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

  return result;
}
