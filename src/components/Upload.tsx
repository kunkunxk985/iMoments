import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangleIcon, CheckIcon, HardDriveDownloadIcon, ImagePlusIcon, RefreshCwIcon, ShieldAlertIcon, SparklesIcon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, transfer, type AiJudgeVerdict } from "@/src/api";
import { themeClass, type ThemeId } from "@/src/theme";
import { DialogShell } from "@/src/components/DialogShell";
import { Spinner } from "@/src/components/bits";
import { prepareImage, uploadErrorMessage, type PreparedImage } from "@/src/lib/image";
import { nickname as storedNickname, setNickname } from "@/src/lib/visitor";

type Phase = "idle" | "intent" | "transfer" | "confirm" | "done";
const STEPS: { id: Phase | "prepare"; label: string }[] = [
  { id: "prepare", label: "处理图片" }, { id: "intent", label: "AI 审图与许可" }, { id: "transfer", label: "传输原片" }, { id: "confirm", label: "确认入库" },
];

export function Upload({ slug, roomTitle, code, tags, theme, onClose, onUploaded }: {
  slug: string; roomTitle: string; code: string | null; tags: string[]; theme: ThemeId; onClose: () => void; onUploaded: (id: string) => void;
}) {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [name, setName] = useState(storedNickname());
  const [place, setPlace] = useState("");
  const [tag, setTag] = useState(tags[0] ?? "");
  const [story, setStory] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [verdict, setVerdict] = useState<AiJudgeVerdict | null>(null);
  const [judging, setJudging] = useState(false);
  const [forceKeep, setForceKeep] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recoverId, setRecoverId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const runJudge = useCallback(async (img: PreparedImage, fname: string, nextTag: string, nextPlace: string, nextStory: string) => {
    setJudging(true);
    try {
      const res = await api.aiJudge(slug, code, { title: roomTitle, theme }, {
        tag: nextTag,
        place: nextPlace.trim(),
        story: nextStory.trim(),
        file_name: fname,
        telemetry: img.telemetry,
      });
      setVerdict(res);
    } catch {
      /* ignore transient judge error; server will validate on submit */
    } finally {
      setJudging(false);
    }
  }, [slug, code, roomTitle, theme]);

  const accept = async (file: File | undefined | null) => {
    if (!file) return;
    setPreparing(true); setError(null); setRecoverId(null); setPhase("idle"); setVerdict(null); setForceKeep(false);
    try {
      const next = await prepareImage(file);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = next.preview;
      setPrepared(next); setFileName(file.name);
      void runJudge(next, file.name, tag, place, story);
    } catch (caught) {
      setError(uploadErrorMessage(caught));
    } finally { setPreparing(false); }
  };

  const blockedByAi = !!verdict && (!verdict.allowed || (verdict.off_topic && !forceKeep));
  const valid = !!prepared && !blockedByAi && name.trim().length > 0 && name.trim().length <= 24 && tags.includes(tag) && story.trim().length <= 140 && place.trim().length <= 40;
  const busy = phase === "intent" || phase === "transfer" || phase === "confirm";

  const finish = async (id: string) => {
    setPhase("confirm");
    try {
      await api.complete(id, code);
      setNickname(name);
      setPhase("done");
      onUploaded(id);
      toast.success("瞬间已通过 AI 策展入库，画廊已实时更新");
      window.setTimeout(onClose, 650);
    } catch (caught) {
      setRecoverId(id);
      setError(message(caught));
      setPhase("idle");
    }
  };

  const submit = async () => {
    if (!valid || !prepared || busy) return;
    setError(null); setRecoverId(null);
    setPhase("intent"); setProgress(0.05);

    // Refresh AI caption with final story/place text right before upload
    let activeVerdict = verdict;
    try {
      activeVerdict = await api.aiJudge(slug, code, { title: roomTitle, theme }, {
        tag, place: place.trim(), story: story.trim(), file_name: fileName, telemetry: prepared.telemetry,
      });
      setVerdict(activeVerdict);
      if (!activeVerdict.allowed || (activeVerdict.off_topic && !forceKeep)) {
        setPhase("idle");
        return;
      }
    } catch { /* proceed to server check */ }

    let id: string;
    try {
      const intent = await api.uploadIntent(slug, code, {
        author_name: name.trim(), place: place.trim(), tag, story: story.trim(),
        width: prepared.width, height: prepared.height,
        size: prepared.full.size, thumb_size: prepared.thumb.size, content_type: prepared.full.type,
        keep_original: keepOriginal,
        original_size: keepOriginal ? prepared.original.size : undefined,
        original_width: prepared.originalWidth,
        original_height: prepared.originalHeight,
        original_type: prepared.original.type,
        file_name: fileName,
        telemetry: prepared.telemetry,
        ai_score: activeVerdict?.score,
        ai_caption: activeVerdict?.caption,
        force_keep: forceKeep,
      });
      id = intent.id;
      setPhase("transfer");
      const hasOrigSlot = Boolean(keepOriginal && intent.original?.signedUrl);
      await transfer(intent.full.signedUrl, prepared.full, ratio => setProgress(0.08 + ratio * (hasOrigSlot ? 0.36 : 0.62)));
      await transfer(intent.thumb.signedUrl, prepared.thumb, ratio => setProgress((hasOrigSlot ? 0.44 : 0.70) + ratio * (hasOrigSlot ? 0.16 : 0.22)));
      if (hasOrigSlot && intent.original) {
        await transfer(intent.original.signedUrl, prepared.original, ratio => setProgress(0.60 + ratio * 0.34));
      }
      setProgress(0.95);
    } catch (caught) {
      setError(message(caught));
      setPhase("idle");
      return;
    }
    await finish(id);
  };

  const stepState = (step: string): "done" | "active" | "pending" => {
    const order = ["prepare", "intent", "transfer", "confirm"];
    const current = phase === "done" ? 4 : phase === "idle" ? (prepared ? 1 : 0) : order.indexOf(phase);
    const at = order.indexOf(step);
    if (at < current) return "done";
    if (at === current && phase !== "idle") return "active";
    return "pending";
  };

  const origMb = prepared ? (prepared.original.size / (1024 * 1024)).toFixed(2) : "0";

  return (
    <DialogShell
      onClose={onClose} size="md" theme={theme} icon={<UploadIcon />}
      title="上传瞬间" description={`投递至《${roomTitle}》· AI 裁判将自动检测命题共鸣度并撰写拍立得旁白。`}
      footer={<>
        <span className="g-dlg-foot-note">
          {prepared
            ? (keepOriginal ? `无损原片 ${prepared.originalWidth}×${prepared.originalHeight} (${origMb} MB)` : `浏览图 ${prepared.width}×${prepared.height} (${Math.round(prepared.full.size / 1024)} KB)`)
            : "支持 JPEG / PNG / WebP，原图最高 10 MB。"}
        </span>
        <span className="g-spacer" />
        {recoverId ? (
          <button type="button" className="g-btn g-btn-quiet" disabled={busy} onClick={() => void finish(recoverId)}><RefreshCwIcon />继续完成上传</button>
        ) : null}
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose} disabled={busy}>取消</button>
        <button type="button" className="g-btn g-btn-theme g-btn-lg" disabled={!valid || busy || judging} onClick={() => void submit()}>
          {busy ? <Spinner /> : <UploadIcon />}{busy ? "上传入库中…" : "发布瞬间"}
        </button>
      </>}
    >
      <div className={themeClass(theme)} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {!prepared ? (
          <div
            className="g-drop" data-over={over} role="button" tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }}
            onDragOver={event => { event.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={event => { event.preventDefault(); setOver(false); void accept(event.dataTransfer.files?.[0]); }}
          >
            {preparing ? <Spinner size={26} /> : <ImagePlusIcon />}
            <b>{preparing ? "正在解析画面光影与分辨率…" : "点击选择照片，或直接拖进来"}</b>
            <span>支持保留未压缩原始分辨率原片供下载，同时由 AI 自动校验房间主题契合度。</span>
          </div>
        ) : (
          <div className="g-upload-preview">
            <div className="g-upload-thumb">
              <img src={prepared.preview} alt="待上传瞬间预览" />
              <button type="button" className="g-btn g-btn-sm g-btn-icon g-btn-quiet" aria-label="移除这张图片" disabled={busy}
                onClick={() => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); previewRef.current = null; setPrepared(null); setFileName(""); setVerdict(null); }}>
                <XIcon />
              </button>
            </div>
            <div className="g-upload-fields">
              <div className="g-field">
                <label className="g-label" htmlFor="up-name">拍摄者昵称</label>
                <input id="up-name" className="g-input" value={name} maxLength={24} placeholder="例如：阿柚" onChange={event => setName(event.target.value)} />
              </div>
              <div className="g-field">
                <label className="g-label" htmlFor="up-place">城市或地点坐标<span className="g-label-hint">可选</span></label>
                <input id="up-place" className="g-input" value={place} maxLength={40} placeholder="例如：武汉 · 东湖凌波门" onChange={event => setPlace(event.target.value)} />
              </div>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="g-sr" onChange={event => { void accept(event.target.files?.[0]); event.target.value = ""; }} />

        {prepared ? (
          <>
            {/* AI Topic Judge Live Card */}
            <div className="g-ai-judge" data-state={!verdict ? "loading" : !verdict.allowed ? "blocked" : verdict.off_topic ? "warn" : "ok"}>
              <div className="g-ai-judge-head">
                {judging || !verdict ? <Spinner size={14} /> : !verdict.allowed ? <ShieldAlertIcon /> : verdict.off_topic ? <AlertTriangleIcon /> : <SparklesIcon />}
                <b>
                  {judging || !verdict
                    ? "AI 命题裁判正在审阅画面光影…"
                    : !verdict.allowed
                      ? "AI 安全守门员已拦截"
                      : verdict.off_topic
                        ? `AI 命题偏离提醒 · 共鸣度 ${verdict.score}%`
                        : `AI 命题契合通过 · 共鸣度 ${verdict.score}%`}
                </b>
                <button
                  type="button" className="g-btn g-btn-sm g-btn-ghost" style={{ marginLeft: "auto", padding: "4px 9px" }}
                  disabled={judging || busy}
                  onClick={() => void runJudge(prepared, fileName, tag, place, story)}
                >
                  <RefreshCwIcon width={12} height={12} />刷新旁白
                </button>
              </div>
              {verdict ? (
                <>
                  {verdict.off_topic || !verdict.allowed ? <p className="g-ai-judge-reason">{verdict.reason}</p> : null}
                  {verdict.caption ? <p className="g-ai-judge-caption">✦ 拍立得旁白：「{verdict.caption}」</p> : null}
                  {verdict.off_topic && verdict.allowed ? (
                    <div className="g-ai-judge-actions">
                      <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => inputRef.current?.click()}>换一张契合照片</button>
                      <label className="g-force-check">
                        <input type="checkbox" checked={forceKeep} onChange={e => setForceKeep(e.target.checked)} />
                        <span>仍要强行留存演示（方便测试对比）</span>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="g-field">
              <span className="g-label">所属子标签</span>
              <div className="g-tags" style={{ overflow: "visible", flexWrap: "wrap" }}>
                {tags.map(item => (
                  <button key={item} type="button" className="g-chip g-chip-theme" aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="g-field">
              <label className="g-label" htmlFor="up-story">一句话故事<span className="g-label-hint">{story.trim().length}/140</span></label>
              <textarea
                id="up-story" className="g-textarea" value={story} maxLength={140} rows={2}
                placeholder="这一秒为什么值得被留下来？（写完可点右上角「刷新旁白」让 AI 结合故事重写注脚）"
                onChange={event => setStory(event.target.value)}
              />
            </div>

            {/* Lossless Original Resolution Toggle */}
            <label className="g-orig-toggle">
              <input type="checkbox" checked={keepOriginal} onChange={e => setKeepOriginal(e.target.checked)} disabled={busy} />
              <HardDriveDownloadIcon width={16} height={16} />
              <div>
                <b>保留原始分辨率无损原图</b>
                <span>除 620px 瀑布流缩略图外，额外存储 {prepared.originalWidth}×{prepared.originalHeight} ({origMb} MB) 未压缩原片供灯箱下载</span>
              </div>
            </label>
          </>
        ) : null}

        {busy || phase === "done" ? (
          <div className="g-progress">
            <div className="g-progress-track"><div className="g-progress-bar" style={{ width: `${Math.round((phase === "done" ? 1 : progress) * 100)}%` }} /></div>
            <div className="g-steps">
              {STEPS.map(step => {
                const state = stepState(step.id);
                return <span key={step.id} className="g-step" data-state={state}>{state === "done" ? <CheckIcon /> : state === "active" ? <Spinner size={12} /> : null}{step.label}</span>;
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="g-error" role="alert">
            <XIcon />
            <p>{error}{recoverId ? " 图片已传输完成，只需重新确认入库，不会重复上传。" : ""}</p>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
