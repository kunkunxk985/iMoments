import { useEffect, useMemo, useRef, useState } from "react";
import { CopyIcon, DownloadIcon, ImageIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import type { Moment, Room } from "@/src/api";
import { medalName, MODES, THEMES } from "@/src/theme";
import { DialogShell } from "@/src/components/DialogShell";
import { Spinner } from "@/src/components/bits";
import { copyText, shareLink } from "@/src/lib/copy";

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img_load_failed"));
    img.src = url;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, radius: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  const grad = ctx.createLinearGradient(0, y + h * 0.52, 0, y + h);
  grad.addColorStop(0, "rgba(10, 8, 6, 0)");
  grad.addColorStop(1, "rgba(10, 8, 6, 0.72)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y + h * 0.52, w, h * 0.48);
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export function PosterDialog({
  room, moments, stats, onClose,
}: {
  room: Room;
  moments: Moment[];
  stats: { moments: number; participants: number; likes: number; votes: number | null };
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const selected = useMemo(() => {
    const showsVotes = room.mode === "ballot" || (room.mode === "blind" && room.revealed);
    const sorted = [...moments].sort((a, b) =>
      showsVotes ? ((b.votes ?? 0) - (a.votes ?? 0)) || (b.likes - a.likes) : (b.likes - a.likes)
    );
    if (sorted.length >= 9) return sorted.slice(0, 9);
    if (sorted.length >= 6) return sorted.slice(0, 6);
    if (sorted.length >= 4) return sorted.slice(0, 4);
    return sorted.slice(0, Math.max(1, sorted.length));
  }, [moments, room.mode, room.revealed]);

  const link = shareLink(room.slug, room.code);
  const shareCopy = `我在「iMoments 拾光房间」参与共创主题《${room.title}》！${room.visibility === "private" && room.code ? `输入口令 ${room.code} ` : ""}一起来交出你相册里的神仙瞬间：${link} #2026 Qoder 高校创造力大赛`;

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1200, H = 1620;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const theme = THEMES[room.theme] ?? THEMES.amber;
      // Paper background
      ctx.fillStyle = "#faf6ef";
      ctx.fillRect(0, 0, W, H);

      // Top theme gradient header band
      const topGrad = ctx.createLinearGradient(0, 0, W, 280);
      topGrad.addColorStop(0, theme.stops[0]);
      topGrad.addColorStop(0.58, theme.stops[1]);
      topGrad.addColorStop(1, "#1e1610");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 272);

      // Header text
      ctx.fillStyle = "rgba(255,250,242,0.86)";
      ctx.font = "600 22px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText(`iMoments · 拾光房间  |  ${MODES[room.mode].name}`, 64, 72);

      ctx.fillStyle = "#fffaf2";
      ctx.font = "700 52px 'PingFang SC', 'Hiragino Sans GB', serif";
      ctx.fillText(room.title.slice(0, 18), 64, 148);

      ctx.fillStyle = "rgba(255,250,242,0.9)";
      ctx.font = "400 25px -apple-system, 'PingFang SC', sans-serif";
      const tagLines = wrapLines(ctx, room.tagline, W - 128, 2);
      tagLines.forEach((line, idx) => ctx.fillText(line, 64, 198 + idx * 34));

      // Grid geometry (3x3, 3x2, 2x2, or 1x1)
      const count = selected.length;
      const cols = count >= 6 ? 3 : count >= 4 ? 2 : count === 2 ? 2 : 1;
      const rows = Math.ceil(count / cols);
      const padX = 64, gridTop = 312, gridH = 900, gap = 18;
      const cellW = (W - padX * 2 - gap * (cols - 1)) / cols;
      const cellH = (gridH - gap * (rows - 1)) / rows;

      const loaded = await Promise.all(
        selected.map(m => m.image_url ? loadImg(m.image_url).catch(() => null) : Promise.resolve(null))
      );
      if (cancelled) return;

      const showsVotes = room.mode === "ballot" || (room.mode === "blind" && room.revealed);
      selected.forEach((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padX + col * (cellW + gap);
        const y = gridTop + row * (cellH + gap);
        const img = loaded[idx];
        if (img) {
          drawCover(ctx, img, x, y, cellW, cellH, 20);
        } else {
          ctx.fillStyle = "#e9e0d2";
          ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 20); ctx.fill();
        }

        // Rank badge for top 3
        if (showsVotes && idx < 3) {
          ctx.save();
          ctx.fillStyle = idx === 0 ? "#f6c445" : idx === 1 ? "#dfe5ea" : "#e0a273";
          ctx.beginPath(); ctx.roundRect(x + 14, y + 14, 78, 34, 17); ctx.fill();
          ctx.fillStyle = "#221606";
          ctx.font = "700 18px -apple-system, 'PingFang SC', sans-serif";
          ctx.fillText(medalName(idx + 1), x + 31, y + 37);
          ctx.restore();
        }

        // Author & location label
        ctx.fillStyle = "#fffaf2";
        ctx.font = "600 20px -apple-system, 'PingFang SC', sans-serif";
        const label = `@${item.author_name}${item.place ? ` · ${item.place}` : ""}`.slice(0, 16);
        ctx.fillText(label, x + 16, y + cellH - 18);
      });

      // AI Curator Note box
      const noteY = gridTop + gridH + 34;
      ctx.fillStyle = "#f2ebe0";
      ctx.beginPath(); ctx.roundRect(padX, noteY, W - padX * 2, 164, 22); ctx.fill();
      ctx.fillStyle = theme.stops[0];
      ctx.fillRect(padX, noteY + 26, 6, 112);

      ctx.fillStyle = "#7a5228";
      ctx.font = "700 21px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText("✦ AI 首席策展手记", padX + 28, noteY + 46);

      ctx.fillStyle = "#2d261e";
      ctx.font = "400 22px -apple-system, 'PingFang SC', sans-serif";
      const curatorText = room.ai_curator_note || `收录来自 ${stats.participants} 位创作者的 ${stats.moments} 帧瞬间，累计收获 ${stats.likes} 次温暖共鸣。`;
      const noteLines = wrapLines(ctx, curatorText, W - padX * 2 - 56, 3);
      noteLines.forEach((line, i) => ctx.fillText(line, padX + 28, noteY + 84 + i * 32));

      // Footer bar
      const footY = H - 146;
      ctx.fillStyle = "#1d1712";
      ctx.font = "700 26px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText(
        room.visibility === "private" && room.code
          ? `私密房间口令：${room.code}（输入 4 位口令即可进房共创）`
          : "打开 iMoments 探索广场 · 免密上传你的同题瞬间",
        padX,
        footY + 38
      );
      ctx.fillStyle = "#6e655b";
      ctx.font = "400 20px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText(`${stats.moments} 张作品 · ${stats.participants} 位拍摄者 · ${stats.likes} 次喜欢`, padX, footY + 76);

      // Decorative minimal QR finder mark on right footer
      const qx = W - padX - 96, qy = footY - 4;
      ctx.fillStyle = "#1d1712";
      ctx.beginPath(); ctx.roundRect(qx, qy, 96, 96, 16); ctx.fill();
      ctx.fillStyle = "#fffaf2";
      ctx.font = "700 20px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText("拾光", qx + 28, qy + 44);
      ctx.font = "500 16px -apple-system, 'PingFang SC', sans-serif";
      ctx.fillText("共创展", qx + 24, qy + 72);

      setDataUrl(canvas.toDataURL("image/png"));
      setRendering(false);
    })();
    return () => { cancelled = true; };
  }, [room, selected, stats]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `iMoments-${room.slug}-蒙太奇海报.png`;
    a.click();
    toast.success("高清蒙太奇海报已开始下载");
  };

  return (
    <DialogShell
      onClose={onClose} size="md" theme={room.theme} icon={<ImageIcon />}
      title="跨城蒙太奇分享海报"
      description={`自动精选房间内最高人气的 ${selected.length} 帧代表作与 AI 策展手记合成高清画报，支持直接分享至小红书或朋友圈。`}
      footer={<>
        <button type="button" className="g-btn g-btn-quiet" onClick={async () => toast[await copyText(shareCopy) ? "success" : "error"]("带大赛话题的分享文案已复制")}>
          <CopyIcon />复制传播奖文案
        </button>
        <span className="g-spacer" />
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>关闭</button>
        <button type="button" className="g-btn g-btn-theme g-btn-lg" disabled={rendering || !dataUrl} onClick={download}>
          {rendering ? <Spinner /> : <DownloadIcon />}{rendering ? "正在合成海报…" : "下载高清 PNG 海报"}
        </button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {rendering ? (
          <div className="g-empty" style={{ width: "100%", paddingBlock: 48 }}>
            <Spinner size={26} />
            <p><SparklesIcon width={14} height={14} style={{ verticalAlign: -2 }} /> 正在排版高赞影像切片与 AI 策展手记…</p>
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`${room.title} 蒙太奇分享海报预览`}
            style={{ width: "min(380px, 100%)", height: "auto", borderRadius: 16, boxShadow: "0 24px 60px -24px rgba(15, 11, 7, 0.45)", border: "1px solid var(--site-border)" }}
          />
        ) : null}
      </div>
    </DialogShell>
  );
}
