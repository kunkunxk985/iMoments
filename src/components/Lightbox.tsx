import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, DownloadIcon, ExternalLinkIcon, HeartIcon, MapPinIcon, MessageCircleIcon, SendIcon, SparklesIcon, TicketIcon, Trash2Icon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "radix-ui";
import { api, message, timeAgo, type Comment, type Moment } from "@/src/api";
import { MODES, medalName, themeClass, type ModeId, type ThemeId } from "@/src/theme";
import { Avatar, Spinner } from "@/src/components/bits";
import { nickname as storedNickname, setNickname } from "@/src/lib/visitor";
import { creditFor } from "@/src/credits";

export function Lightbox({
  moments, index, code, mode, revealed, theme, roomTitle, remaining, pending,
  onClose, onNavigate, onLike, onVote, onCommentPosted, onDelete,
}: {
  moments: Moment[]; index: number; code: string | null; mode: ModeId; revealed: boolean; theme: ThemeId; roomTitle: string;
  remaining: number; pending: Set<string>;
  onClose: () => void; onNavigate: (id: string) => void; onLike: (id: string) => void; onVote: (id: string, cast: boolean) => void;
  onCommentPosted: (id: string) => void; onDelete?: (id: string) => Promise<void>;
}) {
  const moment = moments[index];
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(storedNickname());
  const [posting, setPosting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const id = moment?.id;

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
    setLoading(true); setZoom(false); setConfirmDelete(false);
    void loadComments(controller.signal);
    return () => controller.abort();
  }, [loadComments]);

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
  const origTarget = moment.original_url || moment.image_url;

  const post = async () => {
    const body = draft.trim();
    if (!body || !name.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await api.postComment(moment.id, code, { author_name: name.trim(), body });
      setNickname(name);
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
              <span style={{ marginLeft: "auto" }} />
              <button type="button" className="g-btn g-btn-icon g-btn-ghost" onClick={onClose} aria-label="关闭大图（Esc）"><XIcon /></button>
            </div>
            <div className="g-lb-canvas" data-zoom={zoom}>
              {moment.image_url ? (
                <img
                  key={moment.id}
                  src={zoom && origTarget ? origTarget : moment.image_url}
                  alt={moment.story || `${moment.author_name} 的摄影作品`}
                  onClick={() => setZoom(value => !value)}
                  title={zoom ? "点击回到适应窗口" : "点击查看原始尺寸"}
                  decoding="async"
                />
              ) : <p style={{ color: "#f6efe4" }}>这张作品的图片暂时不可用。</p>}
            </div>
            {index > 0 ? <button type="button" className="g-lb-nav" data-dir="prev" aria-label="上一张" onClick={() => onNavigate(moments[index - 1].id)}><ChevronLeftIcon /></button> : null}
            {index < moments.length - 1 ? <button type="button" className="g-lb-nav" data-dir="next" aria-label="下一张" onClick={() => onNavigate(moments[index + 1].id)}><ChevronRightIcon /></button> : null}
            <div className="g-lb-tools">
              <button type="button" className="g-btn g-btn-sm" onClick={() => setZoom(value => !value)}>
                {zoom ? <ZoomOutIcon /> : <ZoomInIcon />}{zoom ? "适应窗口" : "原始尺寸"}
              </button>
              {origTarget ? (
                <a
                  className="g-btn g-btn-sm"
                  href={origTarget}
                  download={`iMoments-${moment.author_name}-${moment.id.slice(0, 6)}.jpg`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <DownloadIcon />
                  {moment.has_original
                    ? `下载无损原图 (${moment.original_width}×${moment.original_height})`
                    : `打开高清大图 (${moment.width}×${moment.height})`}
                </a>
              ) : null}
              {moment.image_url ? <a className="g-btn g-btn-sm" href={moment.image_url} target="_blank" rel="noreferrer noopener"><ExternalLinkIcon />新标签查看</a> : null}
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
                  <div className="g-lb-ai-head"><SparklesIcon /><b>AI 拍立得旁白</b><span>共鸣度 {moment.ai_score}%</span></div>
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
              <div className="g-composer-row">
                <input className="g-input g-composer-name" value={name} maxLength={24} placeholder="你的昵称" aria-label="短评昵称" onChange={event => setName(event.target.value)} />
                <textarea
                  className="g-textarea" value={draft} maxLength={300} rows={2}
                  placeholder="写一句走心的短评，盖一层楼…" aria-label="短评内容"
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void post(); } }}
                />
              </div>
              <div className="g-composer-foot">
                <span>{draft.trim().length}/300 · ⌘/Ctrl + Enter 发送</span>
                <button type="button" className="g-btn g-btn-sm g-btn-theme" disabled={!draft.trim() || !name.trim() || posting} onClick={() => void post()}>
                  {posting ? <Spinner /> : <SendIcon />}{posting ? "盖楼中…" : "盖楼"}
                </button>
              </div>
            </div>
          </aside>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
