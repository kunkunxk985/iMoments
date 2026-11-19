// Browser-side image processor + lightweight visual telemetry extractor for AI topic resonance check.
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE = 10 * 1024 * 1024; // platform Storage per-object ceiling (10 MiB)
const FULL_EDGE = 1600;
const THUMB_EDGE = 620;

export type ImageTelemetry = {
  warmth: number;
  coolness: number;
  greenness: number;
  brightness: number;
  saturation: number;
  uiFlatness: number;
};

export type PreparedImage = {
  full: Blob;
  thumb: Blob;
  original: File;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  preview: string;
  telemetry: ImageTelemetry;
};

function fit(width: number, height: number, edge: number) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function load(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* fall through to <img> decoding */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode_failed"));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function draw(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("encode_failed")), "image/jpeg", quality);
  });
}

function extractTelemetry(source: CanvasImageSource): ImageTelemetry {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { warmth: 0.4, coolness: 0.3, greenness: 0.25, brightness: 0.5, saturation: 0.35, uiFlatness: 0.1 };
  ctx.drawImage(source, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const total = size * size;
  let warmSum = 0, coolSum = 0, greenSum = 0, lumSum = 0, satSum = 0, flatCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = max === 0 ? 0 : (max - min) / max;
    lumSum += lum;
    satSum += sat;
    if (r > b + 0.08 && (r + g) * 0.5 > b) warmSum += 1;
    if (b > r + 0.06) coolSum += 1;
    if (g >= r && g > b + 0.04) greenSum += 1;
    if (i >= 4) {
      const dr = Math.abs(data[i] - data[i - 4]);
      const dg = Math.abs(data[i + 1] - data[i - 3]);
      const db = Math.abs(data[i + 2] - data[i - 2]);
      if (dr + dg + db < 4) flatCount += 1;
    }
  }
  return {
    warmth: Number((warmSum / total).toFixed(3)),
    coolness: Number((coolSum / total).toFixed(3)),
    greenness: Number((greenSum / total).toFixed(3)),
    brightness: Number((lumSum / total).toFixed(3)),
    saturation: Number((satSum / total).toFixed(3)),
    uiFlatness: Number((flatCount / (total - 1)).toFixed(3)),
  };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED.includes(file.type)) throw new Error("unsupported_type");
  if (file.size > MAX_SOURCE) throw new Error("source_too_large");
  const { source, width, height, close } = await load(file);
  try {
    if (!width || !height) throw new Error("decode_failed");
    const fullSize = fit(width, height, FULL_EDGE);
    const thumbSize = fit(width, height, THUMB_EDGE);
    const telemetry = extractTelemetry(source);
    const full = await draw(source, fullSize.width, fullSize.height, 0.86);
    const thumb = await draw(source, thumbSize.width, thumbSize.height, 0.74);
    return {
      full,
      thumb,
      original: file,
      width: fullSize.width,
      height: fullSize.height,
      originalWidth: width,
      originalHeight: height,
      preview: URL.createObjectURL(thumb),
      telemetry,
    };
  } finally { close(); }
}

export function uploadErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  return ({
    unsupported_type: "只支持 JPEG、PNG 或 WebP 图片。",
    source_too_large: "原图超过 10 MB（站点存储单文件上限），请先压缩后再上传。",
    decode_failed: "这张图片无法在浏览器里解码，换一张试试。",
    canvas_unavailable: "当前浏览器无法处理图片，请更换浏览器。",
    encode_failed: "图片压缩失败，请重试或换一张。",
  } as Record<string, string>)[code] ?? "图片处理失败，请重试。";
}
