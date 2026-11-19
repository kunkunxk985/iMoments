import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, CrownIcon, HeartIcon, KeyRoundIcon, MapPinIcon, Maximize2Icon, MessageCircleIcon, Minimize2Icon, PauseIcon, PlayIcon, SparklesIcon, TicketIcon, TvIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, type Comment, type Moment, type Room } from "@/src/api";
import { medalName, MODES, themeClass } from "@/src/config/theme";
import { copyText, shareLink } from "@/src/lib/copy";
import { Avatar } from "@/src/components/bits";

// Deterministic visual finder matrix badge keyed by room link so stage guests see a crisp scan emblem
function MatrixBadge({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    const grid: boolean[][] = Array.from({ length: 15 }, () => Array(15).fill(false));
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const border = x === 0 || x === 4 || y === 0 || y === 4;
          const center = x === 2 && y === 2;
          grid[oy + y][ox + x] = border || center;
        }
      }
    };
    finder(0, 0); finder(10, 0); finder(0, 10);
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        if ((x < 6 && y < 6) || (x > 8 && y < 6) || (x < 6 && y > 8)) continue;
        h = Math.imul(h ^ (x * 31 + y * 17), 16777619);
        grid[y][x] = (h >>> 3) % 2 === 0;
      }
    }
    return grid;
  }, [seed]);

  return (
    <svg viewBox="0 0 17 17" width="76" height="76" style={{ borderRadius: 10, background: "#fffaf2", padding: 4, flexShrink: 0 }} aria-hidden="true">
      {cells.map((row, y) => row.map((on, x) => on ? <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="0.88" height="0.88" rx="0.18" fill="#18120c" /> : null))}
    </svg>
  );
}

export function StageScreen({
  room, moments, ranks, code, stats, onClose,
}: {
  room: Room;
  moments: Moment[];
  ranks: Map<string, number>;
  code: string | null;
  stats: { moments: number; participants: number; likes: number; votes: number | null };
  onClose: () => void;
}) {
  const ordered = useMemo(() => {
    if (room.mode === "ballot" || (room.mode === "blind" && room.revealed)) {
      return [...moments].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || b.likes - a.likes);
    }
    return [...moments].sort((a, b) => b.likes - a.likes || (a.created_at < b.created_at ? 1 : -1));
  }, [moments, room.mode, room.revealed]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [feed, setFeed] = useState<Comment[]>([]);

  const loadFeed = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await api.roomFeed(room.slug, code, moments, signal);
      setFeed(list);
    } catch { /* silent on live screen */ }
  }, [room.slug, code, moments]);

  useEffect(() => {
    const ctrl = new AbortController();
    void loadFeed(ctrl.signal);
    const timer = window.setInterval(() => void loadFeed(), 8_000);
    return () => { ctrl.abort(); window.clearInterval(timer); };
  }, [loadFeed]);

  useEffect(() => {
    if (!playing || ordered.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex(curr => (curr + 1) % ordered.length);
    }, 5_500);
    return () => window.clearInterval(timer);
  }, [playing, ordered.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && ordered.length > 0) setIndex(i => (i - 1 + ordered.length) % ordered.length);
      if (event.key === "ArrowRight" && ordered.length > 0) setIndex(i => (i + 1) % ordered.length);
      if (event.key === " ") { event.preventDefault(); setPlaying(p => !p); }
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [onClose, ordered.length]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* ignore */ }
  };

  const current = ordered[index % Math.max(1, ordered.length)];
  const showsVotes = room.mode === "ballot" || (room.mode === "blind" && room.revealed);
  const top3 = ordered.slice(0, 3);
  const link = shareLink(room.slug, room.code);
  const currentRank = current ? (ranks.get(current.id) ?? null) : null;

  return (
    <div className={`g-stage ${themeClass(room.theme)}`} role="dialog" aria-modal="true" aria-label={`${room.title} · 16:9 现场流光投屏`}>
      <div className="g-stage-aurora" aria-hidden="true" />

      <header className="g-stage-top">
        <span className="g-stage-live"><i />LIVE · 16:9 舞台投屏墙</span>
        <div className="g-stage-title">
          <h2>{room.title}</h2>
          <span>{MODES[room.mode].name} · {stats.moments} 帧瞬间 · {stats.participants} 人共创 · {stats.likes} 次喜欢{stats.votes !== null ? ` · ${stats.votes} 票` : ""}</span>
        </div>
        <div className="g-stage-controls">
          <button type="button" className="g-stage-btn" onClick={() => setPlaying(p => !p)} title="空格键暂停或继续轮播">
            {playing ? <PauseIcon /> : <PlayIcon />}{playing ? "轮播中" : "已暂停"}
          </button>
          <button type="button" className="g-stage-btn" onClick={() => void toggleFullscreen()} title="切换全屏投屏">
            {fullscreen ? <Minimize2Icon /> : <Maximize2Icon />}{fullscreen ? "退出全屏" : "全屏大屏"}
          </button>
          <button type="button" className="g-stage-btn g-stage-close" onClick={onClose} title="返回房间（Esc）">
            <XIcon />退出投屏
          </button>
        </div>
      </header>

      <div className="g-stage-grid">
        {/* Main 16:9 Cinema Stage */}
        <section className="g-stage-main">
          {current ? (
            <div className="g-stage-frame" key={current.id}>
              {current.image_url ? <img className="g-stage-backdrop" src={current.image_url} alt="" aria-hidden="true" /> : null}
              <div className="g-stage-photo-wrap">
                {current.image_url ? <img className="g-stage-photo" src={current.image_url} alt={current.story || current.author_name} /> : null}
              </div>

              <div className="g-stage-badges">
                {showsVotes && currentRank && currentRank <= 3 ? (
                  <span className="g-shot-rank" data-medal={currentRank} style={{ position: "static", fontSize: 13, padding: "6px 13px" }}>
                    <CrownIcon />{medalName(currentRank)}
                  </span>
                ) : null}
                <span className="g-stage-ai-pill"><SparklesIcon />AI 共鸣 {current.ai_score}%</span>
                <span className="g-stage-tag-pill">{current.tag}</span>
              </div>

              {ordered.length > 1 ? (
                <>
                  <button type="button" className="g-stage-arrow" data-dir="prev" aria-label="上一张" onClick={() => setIndex(i => (i - 1 + ordered.length) % ordered.length)}><ChevronLeftIcon /></button>
                  <button type="button" className="g-stage-arrow" data-dir="next" aria-label="下一张" onClick={() => setIndex(i => (i + 1) % ordered.length)}><ChevronRightIcon /></button>
                </>
              ) : null}

              <div className="g-stage-caption">
                <div className="g-stage-author-row">
                  <Avatar name={current.author_name} src={current.author_avatar} />
                  <div>
                    <b>{current.author_name}</b>
                    {current.place ? <span><MapPinIcon />{current.place}</span> : null}
                  </div>
                  <div className="g-stage-counters">
                    <span><HeartIcon fill="currentColor" />{current.likes}</span>
                    {showsVotes && current.votes !== null ? <span className="g-stage-vote-pill"><TicketIcon />{current.votes} 票</span> : null}
                  </div>
                </div>
                {current.story ? <p className="g-stage-story">“{current.story}”</p> : null}
                {current.ai_caption ? <p className="g-stage-ai-note"><SparklesIcon />AI 拍立得旁白：{current.ai_caption}</p> : null}
                <div className="g-stage-dots">
                  {ordered.slice(0, 14).map((m, idx) => (
                    <button key={m.id} type="button" data-active={idx === index} aria-label={`切换到第 ${idx + 1} 张`} onClick={() => setIndex(idx)} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="g-stage-empty">
              <TvIcon />
              <h3>大屏已就绪，等待第一张现场瞬间投递</h3>
              <p>观众打开房间链接上传照片后，大屏将自动实时轮播并滚动热评。</p>
            </div>
          )}
        </section>

        {/* Right Live Podium + Scan Join + Floating Comment Stream */}
        <aside className="g-stage-side">
          <div className="g-stage-join">
            <MatrixBadge seed={link} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="g-stage-side-label">同场实时上墙与投票</span>
              {room.visibility === "private" && room.code ? (
                <div className="g-stage-code"><KeyRoundIcon />口令 <b>{room.code}</b></div>
              ) : (
                <div className="g-stage-pub">公开探索广场 · 免密直达</div>
              )}
              <button type="button" className="g-stage-copy" onClick={async () => toast[await copyText(link) ? "success" : "error"]("投屏房间邀请链接已复制")}>
                <CopyIcon />复制观众参与链接
              </button>
            </div>
          </div>

          <div className="g-stage-podium">
            <div className="g-stage-sec-head">
              <CrownIcon />
              <b>{showsVotes ? "实时三甲荣誉榜" : "高赞共鸣精选"}</b>
            </div>
            {top3.map((item, idx) => (
              <button key={item.id} type="button" className="g-stage-rank-item" data-active={current?.id === item.id} onClick={() => setIndex(ordered.findIndex(m => m.id === item.id))}>
                <span className="g-stage-rank-badge" data-medal={idx + 1}>{idx + 1}</span>
                {item.thumb_url ? <img src={item.thumb_url} alt="" /> : null}
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <b>{item.author_name}</b>
                  <span>{item.place || item.tag}</span>
                </div>
                <strong className="g-stage-rank-num">{showsVotes ? `${item.votes ?? 0} 票` : `${item.likes} 赞`}</strong>
              </button>
            ))}
          </div>

          <div className="g-stage-feed">
            <div className="g-stage-sec-head">
              <MessageCircleIcon />
              <b>实时流光短评墙</b>
              <span>{feed.length} 条</span>
            </div>
            <div className="g-stage-feed-list">
              {feed.length === 0 ? (
                <p style={{ fontSize: 12.5, opacity: 0.65, margin: 0 }}>等待观众在作品下发出第一条走心短评…</p>
              ) : feed.slice(0, 10).map(item => (
                <div key={item.id} className="g-stage-bubble">
                  <div className="g-stage-bubble-top">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Avatar name={item.author_name} src={item.author_avatar} size={18} /><b>{item.author_name}</b></span>
                    <span>#{item.floor}楼</span>
                  </div>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
