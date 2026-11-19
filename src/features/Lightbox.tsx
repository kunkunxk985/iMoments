import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, DownloadIcon, ExternalLinkIcon, HeartIcon, LogInIcon, MapPinIcon, MessageCircleIcon, SendIcon, ShieldCheckIcon, SparklesIcon, TicketIcon, Trash2Icon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, timeAgo, type Account, type Comment, type Moment } from "@/src/api";
import { MODES, medalName, themeClass, type ModeId, type ThemeId } from "@/src/config/theme";
import { Avatar, Spinner } from "@/src/components/bits";
import { sha256Blob } from "@/src/lib/image";
import { setParams } from "@/src/lib/router";
import { creditFor } from "@/src/config/credits";

export function Lightbox({
  moments, index, code, mode, revealed, theme, roomTitle, remaining, pending, account,
  onClose, onNavigate, onLike, onVote, onCommentPosted, onDelete,
}: {
  moments: Moment[]; index: number; code: string | null; mode: ModeId; revealed: boolean; theme: ThemeId; roomTitle: string;
  remaining: number; pending: Set<string>; account: Account | null;
  onClose: () => void; onNavigate: (id: string) => void; onLike: (id: string) => void; onVote: (id: string, cast: boolean) => void;
  onCommentPosted: (id: string) => void; onDelete?: (id: string) => Promise<void>;
}) {
  const moment = moments[index];
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reassembledUrl, setReassembledUrl] = useState<string | null>(null);
  const [reassembledVerified, setReassembledVerified] = useState(false);
  const [assemblingLabel, setAssemblingLabel] = useState<string | null>(null);
  const blobUrlCache = useRef<Map<string, { url: string; ext: string; verified: boolean }>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const id = moment?.id;

  useEffect(() => () => {
    for (const entry of blobUrlCache.current.values()) URL.revokeObjectURL(entry.url);
    blobUrlCache.current.clear();
  }, []);

  const loadComments = useCallback(async (signal?: AbortSignal) => {
    if (!id) return;
    try {
      const next = await api.comments(id, code, signal);
      setComments(next); setError(null);
    } catch (caught) {
      if ((caught as Error)?.name === "AbortError") return;
      setError(caught);
    } finally { setLoading(false); }
  }, [id, code]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setZoom(false); setConfirmDelete(false); setAssemblingLabel(null);
    const cached = id ? blobUrlCache.current.get(id) : undefined;
    setReassembledUrl(cached?.url ?? null);
    setReassembledVerified(Boolean(cached?.verified));
    void loadComments(controller.signal);
    return () => controller.abort();
  }, [id, loadComments]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadComments(); }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadComments]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowLeft" && index > 0) onNavigate(moments[index - 1].id);
      if (event.key === "ArrowRight" && index < moments.length - 1) onNavigate(moments[index + 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, moments, onNavigate]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [comments.length]);

  if (!moment) return null;
  const sealed = mode === "blind" && !revealed;
  const canVote = mode !== "gentle";
  const busy = pending.has(moment.id);
  const credit = creditFor(moment.seed_key);
  const showsVotes = mode === "ballot" || (mode === "blind" && revealed);
  const origTarget = moment.original_chunked ? reassembledUrl : (moment.original_url || moment.image_url);

  const assembleChunkedOriginal = async (): Promise<{ url: string; ext: string; verified: boolean } | null> => {
    const existing = blobUrlCache.current.get(moment.id);
    if (existing) return existing;
    if (assemblingLabel) return null;
    try {
      setAssemblingLabel("正在加载原图…");
      const manifest = await api.originalParts(moment.id, code);
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < manifest.parts.length; i++) {
        setAssemblingLabel(`正在加载原图 (${Math.round(((i + 0.5) / manifest.parts.length) * 100)}%)…`);
        const res = await fetch(manifest.parts[i].signedUrl, { credentials: "same-origin" });
        if (!res.ok) throw new Error("chunk_download_failed");
        buffers.push(await res.arrayBuffer());
      }
      const blob = new Blob(buffers, { type: manifest.content_type || "image/jpeg" });
      let verified = false;
      if (manifest.sha256) {
        const computed = await sha256Blob(blob);
        if (computed !== manifest.sha256) throw new Error("sha256_mismatch");
        verified = true;
      }
      const ext = manifest.content_type === "image/png" ? "png" : manifest.content_type === "image/webp" ? "webp" : "jpg";
      const url = URL.createObjectURL(blob);
      const entry = { url, ext, verified };
      blobUrlCache.current.set(moment.id, entry);
      setReassembledUrl(url);
      setReassembledVerified(verified);
      toast.success("原图已就绪");
      return entry;
    } catch (caught) {
      toast.error(caught instanceof Error && caught.message === "sha256_mismatch" ? "原片校验不一致，请重试" : "无损原片拉取失败，请重试");
      return null;
    } finally {
      setAssemblingLabel(null);
    }
  };

  const handleZoomToggle = async () => {
    if (!zoom && moment.original_chunked && !reassembledUrl) {
      const entry = await assembleChunkedOriginal();
      if (!entry) return;
    }
    setZoom(value => !value);
  };

  const handleChunkedDownload = async () => {
    const entry = await assembleChunkedOriginal();
    if (!entry) return;
    const a = document.createElement("a");
    a.href = entry.url;
    a.download = `iMoments-${moment.author_name}-${moment.id.slice(0, 6)}.${entry.ext}`;
    a.click();
  };

  const post = async () => {
    if (!account) {
      toast("请先注册或登录拾光账号后再盖楼短评");
      setParams({ m: null, account: "1" });
      return;
    }
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const comment = await api.postComment(moment.id, code, { author_name: account.display_name, body });
      setComments(current => [...current, comment]);
      setDraft("");
      onCommentPosted(moment.id);
      toast.success(`已盖到第 ${comment.floor} 层`);
    } catch (caught) {
      toast.error(message(caught));
    } finally { setPosting(false); }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="g-dlg-overlay" style={{ background: "transparent", backdropFilter: "none" }} />
        <DialogPrimitive.Content className={`g-lb ${themeClass(theme)}`}>
          <DialogPrimitive.Title className="g-sr">{roomTitle} · {moment.author_name} 的瞬间大图</DialogPrimitive.Title>
          <DialogPrimitive.Description className="g-sr">{moment.story || "摄影作品详情、点赞、选票与短评"}</DialogPrimitive.Description>

          <div className="g-lb-stage">
            <div className="g-lb-bar">
              <span className="g-lb-count">{String(index + 1).padStart(2, "0")} / {String(moments.length).padStart(2, "0")}</span>
              <span style={{ fontSize: 12.6, opacity: .78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roomTitle}</span>
              {reassembledVerified ? (
                <span className="g-badge g-badge-dark" style={{ marginLeft: 6, color: "#a8e6c1", borderColor: "rgba(168,230,193,0.4)" }}>
                  <ShieldCheckIcon />原图
                </span>
              ) : null}
              <span style={{ marginLeft: "auto" }} />
              <button type="button" className="g-btn g-btn-icon g-btn-ghost" onClick={onClose} aria-label="关闭大图（Esc）"><XIcon /></button>
            </div>
            <div className="g-lb-canvas" data-zoom={zoom}>
              {moment.image_url ? (
                <img
                  key={`${moment.id}-${zoom && origTarget ? "orig" : "full"}`}
                  src={zoom && origTarget ? origTarget : moment.image_url}
                  alt={moment.story || `${moment.author_name} 的摄影作品`}
                  onClick={() => void handleZoomToggle()}
                  title={zoom ? "点击回到适应窗口" : "点击查看无损原始尺寸"}
                  decoding="async"
                />
              ) : <p style={{ color: "#f6efe4" }}>这张作品的图片暂时不可用。</p>}
            </div>
            {index > 0 ? <button type="button" className="g-lb-nav" data-dir="prev" aria-label="上一张" onClick={() => onNavigate(moments[index - 1].id)}><ChevronLeftIcon /></button> : null}
            {index < moments.length - 1 ? <button type="button" className="g-lb-nav" data-dir="next" aria-label="下一张" onClick={() => onNavigate(moments[index + 1].id)}><ChevronRightIcon /></button> : null}
            <div className="g-lb-tools">
              <button type="button" className="g-btn g-btn-sm" disabled={Boolean(assemblingLabel)} onClick={() => void handleZoomToggle()}>
                {assemblingLabel ? <Spinner size={13} /> : zoom ? <ZoomOutIcon /> : <ZoomInIcon />}
                {assemblingLabel ? assemblingLabel : zoom ? "适应窗口" : "查看原图"}
              </button>
              {moment.original_chunked ? (
                <button type="button" className="g-btn g-btn-sm" disabled={Boolean(assemblingLabel)} onClick={() => void handleChunkedDownload()}>
                  {assemblingLabel ? <Spinner size={13} /> : <DownloadIcon />}
                  下载原图 ({moment.original_width}×{moment.original_height})
                </button>
              ) : origTarget ? (
                <a
                  className="g-btn g-btn-sm"
                  href={origTarget}
                  download={`iMoments-${moment.author_name}-${moment.id.slice(0, 6)}.jpg`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <DownloadIcon />
                  {moment.has_original
                    ? `下载原图 (${moment.original_width}×${moment.original_height})`
                    : `打开高清图 (${moment.width}×${moment.height})`}
                </a>
              ) : null}
              {moment.image_url ? <a className="g-btn g-btn-sm" href={reassembledUrl || moment.image_url} target="_blank" rel="noreferrer noopener"><ExternalLinkIcon />新标签查看</a> : null}
              {credit ? <a className="g-btn g-btn-sm" href={credit.source} target="_blank" rel="noreferrer noopener" title={`${credit.author} · ${credit.license}`}>示例图来源</a> : null}
              {moment.can_delete && onDelete ? (
                confirmDelete ? (
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button type="button" className="g-btn g-btn-sm" disabled={deleting} onClick={() => setConfirmDelete(false)}>取消</button>
                    <button
                      type="button" className="g-btn g-btn-sm g-btn-danger" disabled={deleting}
                      style={{ background: "rgba(192, 57, 43, 0.9)", color: "#fff", borderColor: "transparent" }}
                      onClick={async () => {
                        setDeleting(true);
                        try { await onDelete(moment.id); } finally { setDeleting(false); setConfirmDelete(false); }
                      }}
                    >
                      {deleting ? <Spinner size={13} /> : <Trash2Icon />}{deleting ? "删除中…" : "确认删除"}
                    </button>
                  </span>
                ) : (
                  <button type="button" className="g-btn g-btn-sm" onClick={() => setConfirmDelete(true)} title="删除自己上传的作品">
                    <Trash2Icon />删除作品
                  </button>
                )
              ) : null}
              <span className="g-lb-hint">← → 切换 · Esc 关闭</span>
            </div>
          </div>

          <aside className="g-lb-panel">
            <div className="g-lb-panel-head">
              <div className="g-lb-author">
                <Avatar name={moment.author_name} src={moment.author_avatar} />
                <div style={{ minWidth: 0 }}>
                  <b>{moment.author_name}</b>
                  <span>{moment.place ? <><MapPinIcon />{moment.place} · </> : null}{timeAgo(moment.created_at)}</span>
                </div>
                {showsVotes && moment.rank && moment.rank <= 3 ? (
                  <span className="g-shot-rank" data-medal={moment.rank} style={{ position: "static", marginLeft: "auto" }}><CrownIcon />{medalName(moment.rank)}</span>
                ) : null}
              </div>
              <p className="g-lb-story">{moment.story || "这位拍摄者没有留下文字，让照片自己说话。"}</p>
              {moment.ai_caption ? (
                <div className="g-lb-ai-box">
                  <div className="g-lb-ai-head"><SparklesIcon /><b>AI 画面注脚</b></div>
                  <p>{moment.ai_caption}</p>
                </div>
              ) : null}
              <div className="g-lb-meta">
                <span className="g-tag">{moment.tag}</span>
                <span className="g-badge">{MODES[mode].name}</span>
                {sealed ? <span className="g-badge"><TicketIcon />票数封存中</span> : null}
              </div>
            </div>

            <div className="g-lb-actions">
              <button type="button" className="g-lb-big" data-on={moment.liked} disabled={busy} aria-pressed={moment.liked} onClick={() => onLike(moment.id)}>
                <HeartIcon fill={moment.liked ? "currentColor" : "none"} />{moment.liked ? "已喜欢" : "喜欢"} · {moment.likes}
              </button>
              {canVote ? (
                <button
                  type="button" className="g-lb-big g-lb-big-vote" data-on={moment.voted}
                  disabled={busy || (!moment.voted && remaining <= 0)}
                  aria-pressed={moment.voted}
                  onClick={() => onVote(moment.id, !moment.voted)}
                  title={moment.voted ? "撤回这张选票，选票会回到你的票夹" : remaining > 0 ? "投出宝贵的一票" : "5 张选票已用完"}
                >
                  <TicketIcon />{moment.voted ? "已投 · 点击撤回" : "投出一票"}{!sealed && moment.votes !== null ? ` · ${moment.votes}` : ""}
                </button>
              ) : (
                <span className="g-badge" title={MODES.gentle.rule}><HeartIcon />温柔共赏 · 不排名</span>
              )}
              {canVote ? <span className="g-lb-remaining"><TicketIcon width={13} height={13} />剩 {remaining}/5 票</span> : null}
            </div>

            <div className="g-lb-comments" ref={listRef}>
              <div className="g-lb-comments-head"><MessageCircleIcon width={14} height={14} />走心短评 · 盖楼<span>{comments.length} 层</span></div>
              {loading && !comments.length ? <p className="g-comment-empty"><Spinner size={13} /> 正在读取短评…</p> : null}
              {error && !comments.length ? <p className="g-comment-empty" role="alert">{message(error)} <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => void loadComments()}>重试</button></p> : null}
              {!loading && !comments.length && !error ? <p className="g-comment-empty">还没有人说话。第一层楼留给最被打动的那个人。</p> : null}
              {comments.map(comment => (
                <div key={comment.id} className="g-comment">
                  <Avatar name={comment.author_name} src={comment.author_avatar} small />
                  <div className="g-comment-body">
                    <div className="g-comment-top">
                      <b>{comment.author_name}</b>
                      <span className="g-comment-floor">#{comment.floor}</span>
                      <span className="g-comment-time">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="g-comment-text">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="g-composer">
              {account ? (
                <>
                  <div className="g-composer-row">
                    <textarea
                      className="g-textarea" value={draft} maxLength={300} rows={2}
                      placeholder="写一句走心的短评，盖一层楼…" aria-label="短评内容"
                      onChange={event => setDraft(event.target.value)}
                      onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void post(); } }}
                    />
                  </div>
                  <div className="g-composer-foot">
                    <span className="g-composer-ident">
                      <Avatar name={account.display_name} src={account.avatar_url} size={20} />
                      <b>{account.display_name}</b>
                      <span>· {draft.trim().length}/300</span>
                    </span>
                    <button type="button" className="g-btn g-btn-sm g-btn-theme" disabled={!draft.trim() || posting} onClick={() => void post()}>
                      {posting ? <Spinner /> : <SendIcon />}{posting ? "盖楼中…" : "盖楼"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="g-composer-foot" style={{ padding: "4px 0" }}>
                  <span>游客只读模式 · 登录后可点赞、投票与盖楼</span>
                  <button type="button" className="g-btn g-btn-sm g-btn-theme" onClick={() => setParams({ m: null, account: "1" })}>
                    <LogInIcon />登录 / 注册
                  </button>
                </div>
              )}
            </div>
          </aside>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
