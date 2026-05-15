import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

type CompressionSettings = {
  format: OutputFormat;
  quality: number;
  maxWidth: number | null;
  maxHeight: number | null;
};

type ImageItem = {
  id: string;
  file: File;
  originalUrl: string;
  originalSize: number;
  originalDimensions?: string;
  outputUrl?: string;
  outputName?: string;
  outputSize?: number;
  outputDimensions?: string;
  status: "processing" | "done" | "error";
  error?: string;
};

type CompressionResult = {
  originalDimensions: string;
  outputDimensions: string;
  outputBlob: Blob;
  outputUrl: string;
  outputName: string;
};

const formatOptions: Array<{ label: string; value: OutputFormat; helper: string }> = [
  {
    label: "JPG",
    value: "image/jpeg",
    helper: "兼容性最好，适合照片，不支持透明背景。",
  },
  {
    label: "PNG",
    value: "image/png",
    helper: "保留透明和清晰边缘，但压缩幅度通常较小。",
  },
  {
    label: "WebP",
    value: "image/webp",
    helper: "网页常见，体积通常更小，也支持透明。",
  },
];

const extensionByFormat: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState("1920");
  const [maxHeight, setMaxHeight] = useState("1920");
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("选择图片后会在浏览器本地压缩，不会上传到服务器。");
  const itemsRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach(releaseItemUrls);
    };
  }, []);

  const settings: CompressionSettings = {
    format,
    quality,
    maxWidth: parseSizeLimit(maxWidth),
    maxHeight: parseSizeLimit(maxHeight),
  };

  const totalOriginal = items.reduce((sum, item) => sum + item.originalSize, 0);
  const totalOutput = items.reduce((sum, item) => sum + (item.outputSize ?? 0), 0);
  const completedCount = items.filter((item) => item.status === "done").length;
  const formatHelper = formatOptions.find((option) => option.value === format)?.helper;

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  async function addFiles(fileList: FileList | null) {
    const imageFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setMessage("没有找到可处理的图片文件。请选择 JPG、PNG 或 WebP 图片。");
      return;
    }

    const newItems: ImageItem[] = imageFiles.map((file) => ({
      id: makeId(),
      file,
      originalUrl: URL.createObjectURL(file),
      originalSize: file.size,
      status: "processing",
    }));

    setItems((current) => [...newItems, ...current]);
    setMessage(`已添加 ${newItems.length} 张图片，正在压缩。`);

    await Promise.all(newItems.map((item) => compressAndStore(item, settings)));
  }

  async function recompressAll() {
    if (items.length === 0) {
      setMessage("先添加图片，再重新压缩。");
      return;
    }

    items.forEach((item) => {
      if (item.outputUrl) {
        URL.revokeObjectURL(item.outputUrl);
      }
    });

    const queuedItems = items.map((item) => ({
      ...item,
      outputUrl: undefined,
      outputName: undefined,
      outputSize: undefined,
      outputDimensions: undefined,
      status: "processing" as const,
      error: undefined,
    }));

    setItems(queuedItems);
    setMessage("正在使用当前参数重新压缩全部图片。");

    await Promise.all(queuedItems.map((item) => compressAndStore(item, settings)));
  }

  async function compressAndStore(item: ImageItem, currentSettings: CompressionSettings) {
    try {
      const result = await compressImage(item.file, currentSettings);

      if (!itemsRef.current.some((currentItem) => currentItem.id === item.id)) {
        URL.revokeObjectURL(result.outputUrl);
        return;
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                originalDimensions: result.originalDimensions,
                outputUrl: result.outputUrl,
                outputName: result.outputName,
                outputSize: result.outputBlob.size,
                outputDimensions: result.outputDimensions,
                status: "done",
                error: undefined,
              }
            : currentItem,
        ),
      );
    } catch (error) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: "error",
                error: error instanceof Error ? error.message : "图片处理失败。",
              }
            : currentItem,
        ),
      );
    }
  }

  function removeItem(id: string) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        releaseItemUrls(target);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function clearAll() {
    items.forEach(releaseItemUrls);
    setItems([]);
    setMessage("已清空图片列表。");
  }

  function downloadItem(item: ImageItem) {
    if (!item.outputUrl || !item.outputName) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = item.outputUrl;
    anchor.download = item.outputName;
    anchor.click();
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Local Image Compressor</p>
          <h1>图片压缩工具</h1>
          <p className="hero-copy">
            批量压缩 JPG、PNG 和 WebP 图片。所有处理都在浏览器本地完成，图片不会离开你的电脑。
          </p>
        </div>
        <div className="privacy-card">
          <span>本地处理</span>
          <strong>0 上传</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel controls">
          <label
            className={isDragging ? "dropzone is-dragging" : "dropzone"}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" multiple onChange={handleInputChange} />
            <span className="drop-icon">+</span>
            <strong>选择或拖拽图片</strong>
            <small>支持 JPG、PNG、WebP，以及浏览器可读取的图片格式</small>
          </label>

          <div className="control-group">
            <label htmlFor="format">导出格式</label>
            <select
              id="format"
              value={format}
              onChange={(event) => setFormat(event.currentTarget.value as OutputFormat)}
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="hint">{formatHelper}</p>
          </div>

          <div className={format === "image/png" ? "control-group is-muted" : "control-group"}>
            <div className="label-row">
              <label htmlFor="quality">压缩质量</label>
              <span>{quality}%</span>
            </div>
            <input
              id="quality"
              type="range"
              min="10"
              max="100"
              step="1"
              value={quality}
              disabled={format === "image/png"}
              onChange={(event) => setQuality(Number(event.currentTarget.value))}
            />
            <p className="hint">
              {format === "image/png"
                ? "PNG 是无损格式，浏览器导出 PNG 时质量滑块不会明显影响体积。"
                : "质量越低体积越小，但图片细节也会减少。"}
            </p>
          </div>

          <div className="dimension-grid">
            <div className="control-group">
              <label htmlFor="maxWidth">最大宽度</label>
              <input
                id="maxWidth"
                type="number"
                min="1"
                placeholder="不限"
                value={maxWidth}
                onChange={(event) => setMaxWidth(event.currentTarget.value)}
              />
            </div>
            <div className="control-group">
              <label htmlFor="maxHeight">最大高度</label>
              <input
                id="maxHeight"
                type="number"
                min="1"
                placeholder="不限"
                value={maxHeight}
                onChange={(event) => setMaxHeight(event.currentTarget.value)}
              />
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="primary" onClick={() => void recompressAll()}>
              重新压缩
            </button>
            <button type="button" className="ghost" onClick={clearAll} disabled={items.length === 0}>
              清空
            </button>
          </div>

          <p className="message">{message}</p>
        </aside>

        <section className="panel results">
          <div className="summary">
            <div>
              <span>图片数量</span>
              <strong>{items.length}</strong>
            </div>
            <div>
              <span>已完成</span>
              <strong>{completedCount}</strong>
            </div>
            <div>
              <span>原始体积</span>
              <strong>{formatBytes(totalOriginal)}</strong>
            </div>
            <div>
              <span>压缩后</span>
              <strong>{formatBytes(totalOutput)}</strong>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <strong>还没有图片</strong>
              <p>拖入几张图片，或点击左侧上传区域开始压缩。</p>
            </div>
          ) : (
            <div className="image-list">
              {items.map((item) => (
                <article className="image-card" key={item.id}>
                  <img src={item.originalUrl} alt={item.file.name} />
                  <div className="image-info">
                    <div>
                      <h2>{item.file.name}</h2>
                      <p>{item.originalDimensions ?? "读取尺寸中"}</p>
                    </div>

                    {item.status === "error" ? (
                      <p className="error">{item.error}</p>
                    ) : (
                      <dl className="metrics">
                        <div>
                          <dt>原图</dt>
                          <dd>{formatBytes(item.originalSize)}</dd>
                        </div>
                        <div>
                          <dt>导出</dt>
                          <dd>{item.outputSize ? formatBytes(item.outputSize) : "处理中"}</dd>
                        </div>
                        <div>
                          <dt>变化</dt>
                          <dd>{item.outputSize ? formatDelta(item.originalSize, item.outputSize) : "-"}</dd>
                        </div>
                        <div>
                          <dt>尺寸</dt>
                          <dd>{item.outputDimensions ?? "-"}</dd>
                        </div>
                      </dl>
                    )}

                    <div className="card-actions">
                      <button
                        type="button"
                        className="primary small"
                        onClick={() => downloadItem(item)}
                        disabled={!item.outputUrl}
                      >
                        下载
                      </button>
                      <button type="button" className="ghost small" onClick={() => removeItem(item.id)}>
                        移除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

async function compressImage(file: File, settings: CompressionSettings): Promise<CompressionResult> {
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (sourceWidth === 0 || sourceHeight === 0) {
    throw new Error("无法读取图片尺寸。");
  }

  const widthScale = settings.maxWidth ? settings.maxWidth / sourceWidth : 1;
  const heightScale = settings.maxHeight ? settings.maxHeight / sourceHeight : 1;
  const scale = Math.min(1, widthScale, heightScale);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 处理图片。");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (settings.format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const quality = settings.format === "image/png" ? undefined : settings.quality / 100;
  const outputBlob = await canvasToBlob(canvas, settings.format, quality);
  const outputUrl = URL.createObjectURL(outputBlob);
  const outputName = makeOutputName(file.name, settings.format);

  return {
    originalDimensions: `${sourceWidth} x ${sourceHeight}`,
    outputDimensions: `${targetWidth} x ${targetHeight}`,
    outputBlob,
    outputUrl,
    outputName,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("浏览器无法读取这张图片。"));
    };

    image.decoding = "async";
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("当前浏览器不支持导出这个格式。"));
        }
      },
      type,
      quality,
    );
  });
}

function parseSizeLimit(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDelta(originalSize: number, outputSize: number) {
  const percent = ((originalSize - outputSize) / originalSize) * 100;
  if (percent >= 0) {
    return `小 ${percent.toFixed(1)}%`;
  }
  return `大 ${Math.abs(percent).toFixed(1)}%`;
}

function makeOutputName(fileName: string, format: OutputFormat) {
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "image";
  return `${baseName}-compressed.${extensionByFormat[format]}`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function releaseItemUrls(item: ImageItem) {
  URL.revokeObjectURL(item.originalUrl);
  if (item.outputUrl) {
    URL.revokeObjectURL(item.outputUrl);
  }
}

export default App;
