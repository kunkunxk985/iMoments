import { useEffect, useState, type ReactNode } from "react";
import { CrownIcon, EyeOffIcon, GiftIcon, HeartHandshakeIcon, Loader2Icon, RefreshCwIcon, TicketIcon, TriangleAlertIcon } from "lucide-react";
import { MODES, medalName, type ModeId } from "@/src/config/theme";
import { message } from "@/src/api";

export const AVATAR_PRESETS: Record<string, { label: string; bg: string; glyph: string }> = {
  "preset:sunset": { label: "落日胶片", bg: "linear-gradient(135deg, #ff7a18, #ffb03a)", glyph: "☀" },
  "preset:mint": { label: "山野帐篷", bg: "linear-gradient(135deg, #12805c, #35b87f)", glyph: "⛰" },
  "preset:neon": { label: "霓虹夜行", bg: "linear-gradient(135deg, #7a2bff, #e0409b)", glyph: "✦" },
  "preset:geek": { label: "极客光圈", bg: "linear-gradient(135deg, #0e7fa8, #22b8cf)", glyph: "◈" },
  "preset:ginkgo": { label: "银杏暖金", bg: "linear-gradient(135deg, #d99b0b, #f6d65c)", glyph: "✿" },
  "preset:ink": { label: "暗房黑白", bg: "linear-gradient(135deg, #27221d, #5c5349)", glyph: "◐" },
};

export function Avatar({ name, src, small = false, size }: { name: string; src?: string | null; small?: boolean; size?: number }) {
  const initial = (name || "拾").trim().slice(0, 1).toUpperCase();
  const style = size ? { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) } : undefined;
  const trimmed = typeof src === "string" ? src.trim() : "";

  if (trimmed && (trimmed.startsWith("data:image/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/"))) {
    return (
      <span className={`g-avatar${small ? " g-avatar-sm" : ""} g-avatar-img`} style={style} aria-hidden="true">
        <img src={trimmed} alt="" decoding="async" />
      </span>
    );
  }
  if (trimmed && AVATAR_PRESETS[trimmed]) {
    const preset = AVATAR_PRESETS[trimmed];
    return (
      <span
        className={`g-avatar${small ? " g-avatar-sm" : ""}`}
        style={{ ...style, background: preset.bg, color: "#fffaf2" }}
        aria-hidden="true"
      >
        {preset.glyph}
      </span>
    );
  }
  return <span className={`g-avatar${small ? " g-avatar-sm" : ""}`} style={style} aria-hidden="true">{initial}</span>;
}

export function ModeBadge({ mode, solid = false }: { mode: ModeId; solid?: boolean }) {
  const meta = MODES[mode] ?? MODES.gentle;
  const Icon = mode === "gentle" ? HeartHandshakeIcon : mode === "ballot" ? TicketIcon : GiftIcon;
  return <span className={`g-badge${solid ? " g-badge-solid" : ""}`}><Icon />{meta.name}</span>;
}

export function Medal({ rank }: { rank: number }) {
  if (rank > 3) return null;
  return (
    <span className="g-shot-rank" data-medal={rank} title={medalName(rank)}>
      <CrownIcon />{medalName(rank)}
    </span>
  );
}

export function Ballots({ remaining, total = 5 }: { remaining: number; total?: number }) {
  return (
    <div className="g-ballots" title={`每位用户在本房间共有 ${total} 张选票`}>
      <TicketIcon width={16} height={16} aria-hidden="true" />
      <span className="g-ballots-label">我的选票</span>
      <span className="g-ballots-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => <i key={index} className="g-dot" data-spent={index >= remaining} />)}
      </span>
      <span className="g-ballots-num">{remaining}<small style={{ fontSize: 12, opacity: .7 }}>/{total}</small></span>
      <span className="g-sr">剩余 {remaining} 张选票，共 {total} 张</span>
    </div>
  );
}

export function SealedCount() {
  return <span className="g-sealed-count" title="盲盒开奖模式下，征集期票数封存"><EyeOffIcon />票数封存</span>;
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="g-empty">
      <span className="g-empty-mark">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="g-error" role="alert">
      <TriangleAlertIcon />
      <p>{message(error)}</p>
      <button type="button" className="g-btn g-btn-sm" onClick={onRetry}><RefreshCwIcon />重新加载</button>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2Icon className="g-spin" width={size} height={size} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="g-skeleton-card" aria-hidden="true">
      <div className="g-skeleton-cover" />
      <div className="g-skeleton-lines">
        <div className="g-skeleton-line" style={{ width: "72%" }} />
        <div className="g-skeleton-line" style={{ width: "94%" }} />
        <div className="g-skeleton-line" style={{ width: "46%" }} />
      </div>
    </div>
  );
}

export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

export function lightPhrase(hour: number) {
  if (hour >= 5 && hour < 8) return "晨光刚好，适合收集第一束光";
  if (hour >= 8 && hour < 11) return "上午的光很干净，适合拍桌面";
  if (hour >= 11 && hour < 14) return "正午适合拍影子和线条";
  if (hour >= 14 && hour < 17) return "下午的光开始变软了";
  if (hour >= 17 && hour < 19) return "正是 18:15 的落日时刻";
  if (hour >= 19 && hour < 23) return "夜色与霓虹已经上线";
  return "深夜适合拍屏幕光与台灯";
}

export const clockText = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
