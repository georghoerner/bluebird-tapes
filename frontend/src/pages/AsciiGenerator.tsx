import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Terminal, Box, Separator } from '../components/Terminal';
import { createGpuSsimMatcher, checkWebGpuSupport, type GpuSsimMatcher, type GpuDiagnostics } from '../utils/gpuSsim';

// Algorithm types
type AlgorithmType = 'brightness' | 'structure';

// Character sets ordered by perceived density (dark to light) - for brightness mode
const CHAR_SETS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  simple: ' .-+*#',
  binary: ' █',
};

type CharSetKey = keyof typeof CHAR_SETS;

// Characters for structure matching - curated CP437/WebPlus set
const STRUCTURE_CHARS_RAW = '☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌▌▐ɑϐᴦᴨ∑ơµᴛɸϴΩẟ∞∅∈∩≡±≥≤⌠⌡÷≈°∙·√ⁿ² ¡¢£¤¥¦§¨©ª«¬-®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƒơƷǺǻǼǽǾǿȘșȚțɑɸˆˇˉ˘˙˚˛˜˝;΄΅Ά·ΈΉΊΌΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϐϴЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяѐёђѓєѕіїјљњћќѝўџҐґ־אבגדהוזחטיךכלםמןנסעףפץצקרשתװױײ׳״ᴛᴦᴨẀẁẂẃẄẅẟỲỳ‐‒–—―‗\'\'‚‛""„‟†‡•…‧‰′″‵‹›‼‾‿⁀⁄⁔⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₁₂₃₄₅₆₇₈₉₊₋₣₤₧₪€℅ℓ№™Ω℮⅐⅑⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞←↑→↓↔↕↨∂∅∆∈∏∑−∕∙√∞∟∩∫≈≠≡≤≥⊙⌀⌂⌐⌠⌡─│┌┐└┘├┤┬┴┼═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬■□▪▫▬▲►▼◄◊○●◘◙◦☺☻☼♀♂♠♣♥♦♪♫✓ﬁﬂ';
// Deduplicate and convert to array
const STRUCTURE_CHARS = [...new Set(STRUCTURE_CHARS_RAW.split(''))];

// Character template cache
interface CharTemplate {
  char: string;
  data: number[]; // Grayscale values 0-255
  width: number;
  height: number;
}

// SSIM calculation for two grayscale arrays
function calculateSSIM(img1: number[], img2: number[]): number {
  if (img1.length !== img2.length || img1.length === 0) return 0;

  const n = img1.length;

  // Calculate means
  let mean1 = 0, mean2 = 0;
  for (let i = 0; i < n; i++) {
    mean1 += img1[i];
    mean2 += img2[i];
  }
  mean1 /= n;
  mean2 /= n;

  // Calculate variances and covariance
  let var1 = 0, var2 = 0, covar = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = img1[i] - mean1;
    const diff2 = img2[i] - mean2;
    var1 += diff1 * diff1;
    var2 += diff2 * diff2;
    covar += diff1 * diff2;
  }
  var1 /= n;
  var2 /= n;
  covar /= n;

  // SSIM constants (for 8-bit images)
  const L = 255;
  const k1 = 0.01, k2 = 0.03;
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;

  // SSIM formula
  const numerator = (2 * mean1 * mean2 + c1) * (2 * covar + c2);
  const denominator = (mean1 ** 2 + mean2 ** 2 + c1) * (var1 + var2 + c2);

  return numerator / denominator;
}

// Render a character to grayscale array
function renderCharToGrayscale(
  char: string,
  width: number,
  height: number,
  fontFamily: string
): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Clear with black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Draw character in white
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${height}px ${fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(char, 0, 0);

  // Extract grayscale values
  const imageData = ctx.getImageData(0, 0, width, height);
  const grayscale: number[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    // Use luminance formula
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    grayscale.push(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return grayscale;
}

// Pre-render all structure characters
function buildCharTemplates(
  chars: string[],
  width: number,
  height: number,
  fontFamily: string
): CharTemplate[] {
  return chars.map(char => ({
    char,
    data: renderCharToGrayscale(char, width, height, fontFamily),
    width,
    height,
  }));
}

interface AsciiChar {
  char: string;
  fgColor: string;
  bgColor: string;
  transparent?: boolean; // True if cell is mostly transparent
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

const FONT_FAMILY = "'IBM VGA Plus', 'IBM VGA', 'Courier New', monospace";

export function AsciiGenerator() {
  const [textWidth, setTextWidth] = useState(80);
  const [charSet, setCharSet] = useState<CharSetKey>('standard');
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('brightness');
  const [colorQuantNum, setColorQuantNum] = useState(8);
  const [bgQuantNum, setBgQuantNum] = useState(4);
  const [asciiOutput, setAsciiOutput] = useState<AsciiChar[][] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useBgColors, setUseBgColors] = useState(true);
  const [imageWidth, setImageWidth] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourcePreviewRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  // Calculate cell dimensions from image width and textWidth
  const cellWidth = imageWidth > 0 ? Math.ceil(imageWidth / textWidth) : 0;
  const cellHeight = cellWidth * 2; // 2:1 aspect ratio

  // Pre-render character templates at cell size (memoized, rebuilds when cell size changes)
  const charTemplates = useMemo(() => {
    if (typeof document === 'undefined' || cellWidth === 0 || cellHeight === 0) return [];
    console.log(`Building templates at ${cellWidth}x${cellHeight}`);
    return buildCharTemplates(STRUCTURE_CHARS, cellWidth, cellHeight, FONT_FAMILY);
  }, [cellWidth, cellHeight]);

  // GPU matcher reference
  const gpuMatcherRef = useRef<GpuSsimMatcher | null>(null);
  const [gpuStatus, setGpuStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [gpuDiagnostics, setGpuDiagnostics] = useState<GpuDiagnostics | null>(null);

  // Check WebGPU support on mount
  useEffect(() => {
    checkWebGpuSupport().then(diag => {
      setGpuDiagnostics(diag);
      console.log('WebGPU diagnostics:', diag);
    });
  }, []);

  // Initialize GPU matcher when templates change
  useEffect(() => {
    if (charTemplates.length === 0 || cellWidth === 0 || cellHeight === 0) return;

    // Cleanup previous matcher
    if (gpuMatcherRef.current) {
      gpuMatcherRef.current.destroy();
      gpuMatcherRef.current = null;
    }

    // Create flat template array for GPU
    const pixelsPerCell = cellWidth * cellHeight;
    const templateData = new Float32Array(charTemplates.length * pixelsPerCell);
    for (let i = 0; i < charTemplates.length; i++) {
      templateData.set(charTemplates[i].data, i * pixelsPerCell);
    }

    // Initialize GPU matcher
    setGpuStatus('checking');
    createGpuSsimMatcher(templateData, charTemplates.length, pixelsPerCell)
      .then((matcher) => {
        if (matcher) {
          gpuMatcherRef.current = matcher;
          setGpuStatus('available');
          console.log('GPU SSIM matcher ready');
        } else {
          setGpuStatus('unavailable');
          console.log('GPU not available, using CPU fallback');
        }
      })
      .catch((err) => {
        setGpuStatus('unavailable');
        console.warn('GPU matcher init failed:', err);
      });

    return () => {
      if (gpuMatcherRef.current) {
        gpuMatcherRef.current.destroy();
        gpuMatcherRef.current = null;
      }
    };
  }, [charTemplates, cellWidth, cellHeight]);

  const processImage = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || cellWidth === 0) return;

    setIsProcessing(true);

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const useStructure = algorithm === 'structure';

    // Use component-level cell dimensions
    const cols = textWidth;
    const rows = Math.ceil(img.height / cellHeight);
    const pixelsPerCell = cellWidth * cellHeight;

    canvas.width = cols * cellWidth;
    canvas.height = rows * cellHeight;

    // Clear canvas (don't fill with black - let transparency show through)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const chars = CHAR_SETS[charSet];
    const result: AsciiChar[][] = [];
    const allFgColors: RGB[] = [];
    const allBgColors: RGB[] = [];
    const cellData: { brightness: number; avgColor: RGB; darkColor: RGB; grayscale: number[]; isTransparent: boolean }[][] = [];

    // For GPU: collect all grayscale data in flat array
    const allGrayscale = useStructure ? new Float32Array(rows * cols * pixelsPerCell) : null;

    // Transparency threshold: if average alpha is below this, consider cell transparent
    const ALPHA_THRESHOLD = 128;

    // First pass: collect all cell data
    for (let row = 0; row < rows; row++) {
      cellData[row] = [];
      for (let col = 0; col < cols; col++) {
        let totalR = 0, totalG = 0, totalB = 0, totalAlpha = 0;
        let darkR = 0, darkG = 0, darkB = 0;
        let totalBrightness = 0;
        let pixelCount = 0;
        let darkCount = 0;
        let opaquePixelCount = 0;
        const grayscale: number[] = [];

        // Sample pixels in this cell
        for (let y = row * cellHeight; y < (row + 1) * cellHeight && y < canvas.height; y++) {
          for (let x = col * cellWidth; x < (col + 1) * cellWidth && x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            const brightness = getBrightness(r, g, b);

            totalAlpha += a;
            pixelCount++;

            // Only count opaque/semi-opaque pixels for color calculations
            if (a > 0) {
              totalR += r;
              totalG += g;
              totalB += b;
              totalBrightness += brightness;
              opaquePixelCount++;
              grayscale.push(brightness);

              // Track darker pixels for background
              if (brightness < 128) {
                darkR += r;
                darkG += g;
                darkB += b;
                darkCount++;
              }
            } else {
              // Transparent pixel - push 0 for grayscale (will show as empty)
              grayscale.push(0);
            }
          }
        }

        const avgAlpha = totalAlpha / pixelCount;
        const isTransparent = avgAlpha < ALPHA_THRESHOLD;

        const avgColor: RGB = opaquePixelCount > 0 ? {
          r: Math.round(totalR / opaquePixelCount),
          g: Math.round(totalG / opaquePixelCount),
          b: Math.round(totalB / opaquePixelCount),
        } : { r: 0, g: 0, b: 0 };

        const darkColor: RGB = darkCount > 0 ? {
          r: Math.round(darkR / darkCount),
          g: Math.round(darkG / darkCount),
          b: Math.round(darkB / darkCount),
        } : { r: 0, g: 0, b: 0 };

        cellData[row][col] = {
          brightness: opaquePixelCount > 0 ? totalBrightness / opaquePixelCount : 0,
          avgColor,
          darkColor,
          grayscale,
          isTransparent,
        };

        // Copy to flat array for GPU
        if (allGrayscale && grayscale.length === pixelsPerCell) {
          const cellIdx = row * cols + col;
          allGrayscale.set(grayscale, cellIdx * pixelsPerCell);
        }

        // Only add to color palettes if not transparent
        if (!isTransparent) {
          allFgColors.push(avgColor);
          if (useBgColors) {
            allBgColors.push(darkColor);
          }
        }
      }
    }

    // Quantize colors
    const fgPalette = kMeansCluster(allFgColors, colorQuantNum);
    const bgPalette = useBgColors ? kMeansCluster(allBgColors, bgQuantNum) : [{ r: 0, g: 0, b: 0 }];

    // GPU or CPU matching for structure mode
    let gpuResults: Uint32Array | null = null;
    if (useStructure && gpuMatcherRef.current && allGrayscale) {
      console.time('GPU SSIM matching');
      try {
        gpuResults = await gpuMatcherRef.current.match(allGrayscale, pixelsPerCell);
        console.timeEnd('GPU SSIM matching');
      } catch (err) {
        console.warn('GPU matching failed, falling back to CPU:', err);
      }
    }

    // Second pass: generate ASCII with quantized colors
    for (let row = 0; row < rows; row++) {
      result[row] = [];
      for (let col = 0; col < cols; col++) {
        const { brightness, avgColor, darkColor, grayscale, isTransparent } = cellData[row][col];
        const cellIdx = row * cols + col;

        // Handle transparent cells
        if (isTransparent) {
          result[row][col] = {
            char: ' ',
            fgColor: 'transparent',
            bgColor: 'transparent',
            transparent: true,
          };
          continue;
        }

        let char: string;

        if (useStructure && charTemplates.length > 0) {
          if (gpuResults) {
            // Use GPU results
            char = STRUCTURE_CHARS[gpuResults[cellIdx]] || ' ';
          } else if (grayscale.length > 0) {
            // CPU fallback: compare cell directly with templates
            let bestSSIM = -1;
            let bestChar = ' ';

            for (const template of charTemplates) {
              const ssim = calculateSSIM(grayscale, template.data);
              if (ssim > bestSSIM) {
                bestSSIM = ssim;
                bestChar = template.char;
              }
            }
            char = bestChar;
          } else {
            char = ' ';
          }
        } else {
          // Brightness mode: map brightness to character
          const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
          char = chars[charIdx];
        }

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

    // Copy to preview canvas
    if (previewCanvasRef.current) {
      const previewCtx = previewCanvasRef.current.getContext('2d');
      if (previewCtx) {
        previewCanvasRef.current.width = canvas.width;
        previewCanvasRef.current.height = canvas.height;
        previewCtx.drawImage(canvas, 0, 0);
      }
    }

    setAsciiOutput(result);
    setIsProcessing(false);
  }, [textWidth, charSet, algorithm, colorQuantNum, bgQuantNum, useBgColors, charTemplates, cellWidth, cellHeight]);

  // Auto-update when parameters change (debounced)
  useEffect(() => {
    if (!imageLoaded || !imageRef.current) return;

    const timeoutId = setTimeout(() => {
      processImage();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [textWidth, charSet, algorithm, colorQuantNum, bgQuantNum, useBgColors, imageLoaded, processImage]);

  // Draw image to the source preview canvas
  const drawSourcePreview = useCallback((img: HTMLImageElement) => {
    if (!sourcePreviewRef.current) return;
    const ctx = sourcePreviewRef.current.getContext('2d');
    if (!ctx) return;

    // Scale to reasonable preview size (max 300px height)
    const maxHeight = 300;
    const scale = Math.min(1, maxHeight / img.height);
    const previewWidth = Math.round(img.width * scale);
    const previewHeight = Math.round(img.height * scale);

    sourcePreviewRef.current.width = previewWidth;
    sourcePreviewRef.current.height = previewHeight;
    ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageWidth(img.width);
      setImageLoaded(true);
      setAsciiOutput(null);
      drawSourcePreview(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const loadExampleImage = (filename: string) => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageWidth(img.width);
      setImageLoaded(true);
      setAsciiOutput(null);
      drawSourcePreview(img);
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
            <label className="block mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              className="w-full"
            >
              <option value="brightness">Brightness (fast)</option>
              <option value="structure">Structure SSIM (slow)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Text Width (characters)</label>
            <input
              type="number"
              value={textWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setTextWidth(val);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value) || 80;
                setTextWidth(Math.max(10, Math.min(200, val)));
              }}
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
              disabled={algorithm === 'structure'}
            >
              {Object.keys(CHAR_SETS).map(key => (
                <option key={key} value={key}>{key}: {CHAR_SETS[key as CharSetKey]}</option>
              ))}
            </select>
            {algorithm === 'structure' && (
              <span className="text-dim text-xs">Uses {STRUCTURE_CHARS.length} curated chars</span>
            )}
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

          {/* GPU status indicator */}
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="mr-2">GPU:</span>
              {gpuStatus === 'checking' && <span className="text-dim">Checking...</span>}
              {gpuStatus === 'available' && <span className="text-green-500">● Available</span>}
              {gpuStatus === 'unavailable' && <span className="text-red-500">○ Unavailable</span>}
            </div>
            {gpuDiagnostics && gpuStatus === 'unavailable' && (
              <div className="text-xs text-dim mt-1">
                {gpuDiagnostics.error || 'GPU not available'}
              </div>
            )}
            {gpuDiagnostics?.adapterInfo && gpuStatus === 'available' && (
              <div className="text-xs text-dim mt-1">
                {gpuDiagnostics.adapterInfo.vendor} {gpuDiagnostics.adapterInfo.architecture}
              </div>
            )}
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

        {/* Source image preview (shown immediately on load) */}
        {imageLoaded && (
          <div className="mb-4">
            <div className="text-dim text-xs mb-1">
              Source Image ({imageWidth}x{imageRef.current?.height || 0}px)
              {isProcessing && <span className="ml-2 text-bright">Processing...</span>}
            </div>
            <canvas
              ref={sourcePreviewRef}
              style={{
                display: 'block',
                maxHeight: '300px',
                width: 'auto',
                border: '1px solid var(--terminal-dim)',
              }}
            />
          </div>
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
            <div className="flex gap-4">
            {/* ASCII output */}
            <div className="overflow-auto border border-[var(--terminal-dim)] p-2 bg-black flex-1">
              <pre
                ref={outputRef}
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: '16px',
                  lineHeight: '1',
                  whiteSpace: 'pre',
                }}
              >
                {asciiOutput.map((row, rowIdx) => (
                  <div key={rowIdx} style={{ height: '16px' }}>
                    {row.map((cell, colIdx) => (
                      <span
                        key={colIdx}
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          color: cell.transparent ? 'transparent' : cell.fgColor,
                          backgroundColor: cell.transparent ? 'transparent' : (useBgColors ? cell.bgColor : 'transparent'),
                        }}
                      >
                        {cell.char}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>
            {/* Original image preview (right side, scaled down) */}
            <div className="shrink-0">
              <div className="text-dim text-xs mb-1">Original</div>
              <canvas
                ref={previewCanvasRef}
                style={{
                  display: 'block',
                  maxHeight: '400px',
                  width: 'auto',
                  imageRendering: 'pixelated',
                  border: '1px solid var(--terminal-dim)',
                }}
              />
            </div>
            </div>
          </div>
        )}
      </Box>
    </Terminal>
  );
}
