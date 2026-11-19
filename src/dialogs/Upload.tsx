import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangleIcon, CheckIcon, HardDriveDownloadIcon, ImagePlusIcon, RefreshCwIcon, ShieldAlertIcon, SparklesIcon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, transfer, type Account, type AiJudgeVerdict } from "@/src/api";
import { themeClass, type ThemeId } from "@/src/config/theme";
import { DialogShell } from "@/src/dialogs/DialogShell";
import { Avatar, Spinner } from "@/src/components/bits";
import { MAX_SINGLE_ORIGINAL, prepareImage, sha256Blob, sliceOriginal, uploadErrorMessage, type PreparedImage } from "@/src/lib/image";
import { nickname as storedNickname, setNickname } from "@/src/lib/visitor";

type Phase = "idle" | "intent" | "transfer" | "confirm" | "done";
const STEPS: { id: Phase | "prepare"; label: string }[] = [
  { id: "prepare", label: "处理图片" }, { id: "intent", label: "准备上传" }, { id: "transfer", label: "上传照片" }, { id: "confirm", label: "保存入库" },
];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read_failed"));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

export function Upload({ slug, roomTitle, code, tags, theme, account, onClose, onUploaded }: {
  slug: string; roomTitle: string; code: string | null; tags: string[]; theme: ThemeId; account: Account | null; onClose: () => void; onUploaded: (id: string) => void;
}) {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [thumbDataUrl, setThumbDataUrl] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [name, setName] = useState(storedNickname());
  const [place, setPlace] = useState("");
  const [tag, setTag] = useState(tags[0] ?? "");
  const [story, setStory] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [verdict, setVerdict] = useState<AiJudgeVerdict | null>(null);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoverId, setRecoverId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const needsChunking = !!prepared && prepared.original.size > MAX_SINGLE_ORIGINAL;

  const runJudge = useCallback(async (imgDataUrl: string, fname: string, nextTag: string, nextPlace: string, nextStory: string) => {
    setJudging(true);
    setJudgeError(null);
    try {
      const res = await api.aiJudge(slug, code, { title: roomTitle, theme }, {
        tag: nextTag,
        place: nextPlace.trim(),
        story: nextStory.trim(),
        file_name: fname,
        image_data_url: imgDataUrl,
      });
      setVerdict(res);
    } catch (caught) {
      setVerdict(null);
      setJudgeError(message(caught));
    } finally {
      setJudging(false);
    }
  }, [slug, code, roomTitle, theme]);

  const accept = async (file: File | undefined | null) => {
    if (!file) return;
    setPreparing(true); setError(null); setRecoverId(null); setPhase("idle"); setVerdict(null); setJudgeError(null); setStatusLabel("");
    try {
      const next = await prepareImage(file);
      const dataUrl = await blobToDataUrl(next.thumb);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = next.preview;
      setPrepared(next); setThumbDataUrl(dataUrl); setFileName(file.name);
      void runJudge(dataUrl, file.name, tag, place, story);
    } catch (caught) {
      setError(uploadErrorMessage(caught));
    } finally { setPreparing(false); }
  };

  const effectiveName = account ? account.display_name : name.trim();
  const blockedByAi = !!verdict && !verdict.allowed;
  const valid = !!prepared && !blockedByAi && effectiveName.length > 0 && effectiveName.length <= 24 && tags.includes(tag) && story.trim().length <= 140 && place.trim().length <= 40;
  const busy = phase === "intent" || phase === "transfer" || phase === "confirm";

  const finish = async (id: string) => {
    setPhase("confirm");
    setStatusLabel("正在保存…");
    try {
      await api.complete(id, code);
      if (!account) setNickname(name);
      setPhase("done");
      setStatusLabel("");
      onUploaded(id);
      toast.success("瞬间已发布");
      window.setTimeout(onClose, 650);
    } catch (caught) {
      setRecoverId(id);
      setError(message(caught));
      setPhase("idle");
      setStatusLabel("");
    }
  };

  const submit = async () => {
    if (!valid || !prepared || busy) return;
    setError(null); setRecoverId(null);
    setPhase("intent"); setProgress(0.05);

    let chunks: Blob[] | null = null;
    let origSha256: string | undefined;
    if (keepOriginal && needsChunking) {
      setStatusLabel("正在准备原图…");
      origSha256 = await sha256Blob(prepared.original);
      chunks = sliceOriginal(prepared.original);
    }

    let id: string;
    try {
      const intent = await api.uploadIntent(slug, code, {
        author_name: effectiveName, place: place.trim(), tag, story: story.trim(),
        width: prepared.width, height: prepared.height,
        size: prepared.full.size, thumb_size: prepared.thumb.size, content_type: prepared.full.type,
        keep_original: keepOriginal,
        original_size: keepOriginal ? prepared.original.size : undefined,
        original_width: prepared.originalWidth,
        original_height: prepared.originalHeight,
        original_type: prepared.original.type,
        original_parts: chunks ? chunks.map(c => c.size) : undefined,
        original_sha256: origSha256,
        file_name: fileName,
        ai_score: verdict?.score,
        ai_caption: verdict?.caption,
        force_keep: true,
      });
      id = intent.id;
      setPhase("transfer");
      const hasSingleOrig = Boolean(keepOriginal && intent.original?.signedUrl);
      const hasChunkedOrig = Boolean(keepOriginal && chunks && intent.original_parts && intent.original_parts.length === chunks.length);
      const origWeight = hasChunkedOrig ? 0.68 : hasSingleOrig ? 0.34 : 0;
      const fullWeight = hasChunkedOrig ? 0.16 : hasSingleOrig ? 0.36 : 0.62;
      const thumbWeight = hasChunkedOrig ? 0.06 : hasSingleOrig ? 0.16 : 0.22;

      setStatusLabel("正在上传照片…");
      await transfer(intent.full.signedUrl, prepared.full, ratio => setProgress(0.06 + ratio * fullWeight));
      await transfer(intent.thumb.signedUrl, prepared.thumb, ratio => setProgress(0.06 + fullWeight + ratio * thumbWeight));

      if (hasSingleOrig && intent.original) {
        setStatusLabel("正在上传原图…");
        const base = 0.06 + fullWeight + thumbWeight;
        await transfer(intent.original.signedUrl, prepared.original, ratio => setProgress(base + ratio * origWeight));
      } else if (hasChunkedOrig && chunks && intent.original_parts) {
        setStatusLabel("正在上传原图…");
        const base = 0.06 + fullWeight + thumbWeight;
        const step = origWeight / chunks.length;
        for (let idx = 0; idx < chunks.length; idx++) {
          await transfer(intent.original_parts[idx].signedUrl, chunks[idx], ratio => setProgress(base + (idx + ratio) * step));
        }
      }
      setProgress(0.96);
    } catch (caught) {
      setError(message(caught));
      setPhase("idle");
      setStatusLabel("");
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
      title="上传瞬间" description={`投递至《${roomTitle}》`}
      footer={<>
        <span className="g-dlg-foot-note">
          {prepared
            ? (keepOriginal
              ? `原图 ${prepared.originalWidth}×${prepared.originalHeight} · ${origMb} MB`
              : `标准图 ${prepared.width}×${prepared.height} · ${Math.round(prepared.full.size / 1024)} KB`)
            : "支持 JPEG / PNG / WebP，最高 60 MB 原图"}
        </span>
        <span className="g-spacer" />
        {recoverId ? (
          <button type="button" className="g-btn g-btn-quiet" disabled={busy} onClick={() => void finish(recoverId)}><RefreshCwIcon />继续完成上传</button>
        ) : null}
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose} disabled={busy}>取消</button>
        <button type="button" className="g-btn g-btn-theme g-btn-lg" disabled={!valid || busy} onClick={() => void submit()}>
          {busy ? <Spinner /> : <UploadIcon />}{busy ? "发布中…" : "发布瞬间"}
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
            <b>{preparing ? "正在读取照片…" : "点击选择照片，或直接拖进来"}</b>
            <span>支持 JPEG / PNG / WebP，最高 60 MB 原图</span>
          </div>
        ) : (
          <div className="g-upload-preview">
            <div className="g-upload-thumb">
              <img src={prepared.preview} alt="待上传瞬间预览" />
              <button type="button" className="g-btn g-btn-sm g-btn-icon g-btn-quiet" aria-label="移除这张图片" disabled={busy}
                onClick={() => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); previewRef.current = null; setPrepared(null); setThumbDataUrl(""); setFileName(""); setVerdict(null); setJudgeError(null); }}>
                <XIcon />
              </button>
            </div>
            <div className="g-upload-fields">
              {account ? (
                <div className="g-ident-pill">
                  <Avatar name={account.display_name} src={account.avatar_url} size={34} />
                  <div className="g-ident-meta">
                    <b>{account.display_name}</b>
                    <span>@{account.handle}</span>
                  </div>
                  <span className="g-ident-tag">已同步账号身份</span>
                </div>
              ) : (
                <div className="g-field">
                  <label className="g-label" htmlFor="up-name">拍摄者昵称</label>
                  <input id="up-name" className="g-input" value={name} maxLength={24} placeholder="例如：阿柚" onChange={event => setName(event.target.value)} />
                </div>
              )}
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
            {/* Real Vision AI Card */}
            <div className="g-ai-judge" data-state={judging ? "loading" : !verdict ? "ok" : !verdict.allowed ? "blocked" : verdict.off_topic ? "warn" : "ok"}>
              <div className="g-ai-judge-head">
                {judging ? <Spinner size={14} /> : verdict && !verdict.allowed ? <ShieldAlertIcon /> : verdict?.off_topic ? <AlertTriangleIcon /> : <SparklesIcon />}
                <b>
                  {judging
                    ? "AI 正在看图解读画面…"
                    : verdict && !verdict.allowed
                      ? "内容安全提醒"
                      : verdict?.off_topic
                        ? "AI 看图提醒：画面似乎与主题不太相符"
                        : verdict?.caption
                          ? `AI 画面注脚${verdict.model ? ` · ${verdict.model}` : ""}`
                          : "AI 看图暂未响应，可直接发布"}
                </b>
                <button
                  type="button" className="g-btn g-btn-sm g-btn-ghost" style={{ marginLeft: "auto", padding: "4px 9px" }}
                  disabled={judging || busy || !thumbDataUrl}
                  onClick={() => void runJudge(thumbDataUrl, fileName, tag, place, story)}
                >
                  <RefreshCwIcon width={12} height={12} />重新解读
                </button>
              </div>
              {judgeError && !judging ? <p className="g-ai-judge-reason">{judgeError}</p> : null}
              {verdict ? (
                <>
                  {verdict.reason ? <p className="g-ai-judge-reason">{verdict.reason}</p> : null}
                  {verdict.caption ? <p className="g-ai-judge-caption">「{verdict.caption}」</p> : null}
                </>
              ) : null}
            </div>

            <div className="g-field">
              <span className="g-label">所属子标签</span>
              <div className="g-tags" style={{ overflow: "visible", flexWrap: "wrap", flex: "none", alignItems: "center" }}>
                {tags.map(item => (
                  <button key={item} type="button" className="g-chip g-chip-theme" aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="g-field">
              <label className="g-label" htmlFor="up-story">一句话故事<span className="g-label-hint">{story.trim().length}/140</span></label>
              <textarea
                id="up-story" className="g-textarea" value={story} maxLength={140} rows={2}
                placeholder="这一秒为什么值得被留下来？（写完可点上方「重新解读」结合故事生成注脚）"
                onChange={event => setStory(event.target.value)}
              />
            </div>

            {/* Clean Original Quality Toggle — chunking & integrity stay silent under the hood */}
            <label className="g-orig-toggle">
              <input type="checkbox" checked={keepOriginal} onChange={e => setKeepOriginal(e.target.checked)} disabled={busy} />
              <HardDriveDownloadIcon width={16} height={16} />
              <div>
                <b>保留原图</b>
                <span>{origMb} MB · 保留原始画质供灯箱查看与下载</span>
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
              {statusLabel ? <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--deep)", fontWeight: 600 }}>{statusLabel}</span> : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="g-error" role="alert">
            <XIcon />
            <p>{error}{recoverId ? " 图片已上传，点击「继续完成上传」即可。" : ""}</p>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
