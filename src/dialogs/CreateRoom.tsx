import { useMemo, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DicesIcon, GiftIcon, GlobeIcon, HeartHandshakeIcon, KeyRoundIcon, LockIcon, PlusIcon, SparklesIcon, TicketIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, type Account, type Room } from "@/src/api";
import { MODES, MODE_IDS, THEMES, THEME_IDS, themeClass, type ModeId, type ThemeId, type Visibility } from "@/src/config/theme";
import { DialogShell } from "@/src/dialogs/DialogShell";
import { Avatar, Spinner } from "@/src/components/bits";
import { nickname as storedNickname, rememberUnlock, setNickname } from "@/src/lib/visitor";
import { copyText, shareLink } from "@/src/lib/copy";
import { navigate } from "@/src/lib/router";

const QUICK_IDEAS = ["全国各地的秋天", "宿舍深夜泡面大赏", "雨夜便利店门口", "桌面与工位灯光", "周末露营抓拍"];
const MODE_ICONS = { gentle: HeartHandshakeIcon, ballot: TicketIcon, blind: GiftIcon } as const;

export function CreateRoom({ account, onClose, onCreated }: { account: Account | null; onClose: () => void; onCreated: (room: Room) => void }) {
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mode, setMode] = useState<ModeId>("gentle");
  const [theme, setTheme] = useState<ThemeId>("amber");
  const [tags, setTags] = useState<string[]>(THEMES.amber.presets);
  const [tagsTouched, setTagsTouched] = useState(false);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(storedNickname());
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState<"fill" | "surprise" | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [created, setCreated] = useState<Room | null>(null);
  const seenTitles = useRef<string[]>([]);
  const key = useRef(crypto.randomUUID());

  const effectiveName = account ? account.display_name : name.trim();
  const tagsValid = tags.length >= 3 && tags.length <= 4 && new Set(tags).size === tags.length && tags.every(tag => tag.length > 0 && tag.length <= 12);
  const valid = title.trim().length > 0 && title.trim().length <= 40 && tagline.trim().length > 0 && tagline.trim().length <= 80 && tagsValid && effectiveName.length > 0 && effectiveName.length <= 24;
  const aiBusy = aiMode !== null;

  const pickTheme = (next: ThemeId) => {
    setTheme(next);
    if (!tagsTouched) setTags(THEMES[next].presets);
  };
  const addTag = (value: string) => {
    const tag = value.trim().slice(0, 12);
    if (!tag) return;
    if (tags.includes(tag)) { toast.error("这个子分栏已经存在了"); return; }
    if (tags.length >= 4) { toast.error("最多 4 个子分栏，先移除一个再加"); return; }
    setTags([...tags, tag]); setTagsTouched(true); setDraft("");
  };

  const runAi = async (opts: { seed?: string; surprise?: boolean }) => {
    if (aiBusy) return;
    const isSurprise = Boolean(opts.surprise);
    const seed = (opts.seed ?? (idea || title)).trim();
    if (!isSurprise && !seed) {
      toast.error("先写几个词说说你想拍什么，或者直接点右上角「AI 随机来个灵感」");
      return;
    }
    setAiMode(isSurprise ? "surprise" : "fill");
    try {
      const vibe = await api.aiVibe(isSurprise ? "" : seed, {
        surprise: isSurprise,
        avoid: seenTitles.current,
      });
      seenTitles.current = [vibe.title, ...seenTitles.current.filter(t => t !== vibe.title)].slice(0, 8);
      setTitle(vibe.title);
      setTagline(vibe.tagline);
      setTheme(vibe.theme);
      setMode(vibe.mode);
      setVisibility(vibe.visibility);
      if (vibe.tags.length >= 3) {
        setTags(vibe.tags.slice(0, 4));
        setTagsTouched(true);
      }
      setAiReason(vibe.reason);
      setAiModel(vibe.model ?? null);
      toast.success(isSurprise ? `AI 现场原创了新选题：「${vibe.title}」` : "AI 已填好标题、导语、赛制与 4 个分栏");
    } catch (caught) {
      toast.error(message(caught));
    } finally {
      setAiMode(null);
    }
  };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      const room = await api.createRoom({
        title: title.trim(), tagline: tagline.trim(), visibility, mode, theme, tags, creator_name: effectiveName,
      }, key.current);
      if (!account) setNickname(name);
      if (room.visibility === "private") rememberUnlock(room);
      setCreated(room);
      onCreated(room);
      toast.success(room.visibility === "private" ? `私密房已创办，口令 ${room.code}` : "房间已出现在公开探索广场");
    } catch (caught) {
      setError(caught);
      toast.error(message(caught));
    } finally { setBusy(false); }
  };

  const previewTags = useMemo(() => tags.slice(0, 4), [tags]);

  if (created) {
    const link = shareLink(created.slug, created.code);
    return (
      <DialogShell
        onClose={onClose} size="md" theme={created.theme} icon={<SparklesIcon />}
        title="房间已经亮灯" description={created.visibility === "private" ? "把口令或分享链接发给一起去的人，他们就能进房上传与投票。" : "房间已公开到探索广场，任何人打开链接都能参与。"}
        footer={<>
          <button type="button" className="g-btn g-btn-ghost" onClick={() => { setCreated(null); setIdea(""); setTitle(""); setTagline(""); setAiReason(null); key.current = crypto.randomUUID(); }}>再创办一个</button>
          <span className="g-spacer" />
          <button type="button" className="g-btn g-btn-quiet" onClick={onClose}>留在广场</button>
          <button type="button" className="g-btn g-btn-primary" onClick={() => { onClose(); navigate(`/r/${created.slug}`); }}>进入房间</button>
        </>}
      >
        <div className="g-result">
          <span className="g-result-mark"><CheckIcon /></span>
          <h3>{created.title}</h3>
          <p>{created.tagline}</p>
          {created.visibility === "private" ? (
            <div className="g-result-codes">
              <div className="g-result-code">
                <span>4 位房间口令</span>
                <b>{created.code}</b>
                <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={async () => toast[await copyText(created.code ?? "") ? "success" : "error"](await copyText(created.code ?? "") ? "口令已复制" : "复制失败，请手动记录")}>
                  <CopyIcon />复制口令
                </button>
              </div>
              <div className="g-result-code">
                <span>房间分享码</span>
                <b style={{ fontSize: 19 }}>{created.share_code}</b>
                <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={async () => toast[await copyText(link) ? "success" : "error"]("分享链接已复制")}>
                  <CopyIcon />复制分享链接
                </button>
              </div>
            </div>
          ) : (
            <div className="g-result-codes" style={{ gridTemplateColumns: "1fr" }}>
              <div className="g-result-code">
                <span>房间链接</span>
                <b style={{ fontSize: 13, letterSpacing: 0, fontFamily: "var(--site-font)", wordBreak: "break-all" }}>{link}</b>
                <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={async () => toast[await copyText(link) ? "success" : "error"]("链接已复制")}>
                  <CopyIcon />复制链接
                </button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12 }}>接下来：上传第一张瞬间，房间就有了封面。</p>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      onClose={onClose} size="lg" theme={theme} icon={<PlusIcon />}
      title="创办拾光活动" description="用 AI 一键生成整套主题方案，或直接填写下方表单。"
      footer={<>
        <span className="g-dlg-foot-note">{valid ? "各项已就绪，点击右侧按钮即可开房。" : account ? "填好活动标题、征集导语，并保留 3–4 个子分栏。" : "填好标题、导语、昵称，并保留 3–4 个子分栏。"}</span>
        <span className="g-spacer" />
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>取消</button>
        <button type="button" className="g-btn g-btn-primary g-btn-lg" disabled={!valid || busy} onClick={submit}>
          {busy ? <Spinner /> : <PlusIcon />}{busy ? "正在开房…" : "立即创办"}
        </button>
      </>}
    >
      <div className="g-create-grid">
        <div className="g-blocks">
          {/* Top Straightforward AI Composer Box */}
          <div className="g-ai-composer">
            <div className="g-ai-composer-top">
              <span className="g-ai-composer-title"><WandSparklesIcon />AI 帮我策划整间画廊</span>
              <button
                type="button"
                className="g-btn g-btn-sm g-btn-quiet"
                disabled={aiBusy}
                onClick={() => void runAi({ surprise: true })}
                title="调用云端大模型实时原创一个全新摄影主题，自动填满下方所有设置"
              >
                {aiMode === "surprise" ? <Spinner size={13} /> : <DicesIcon />}
                {aiMode === "surprise" ? "AI 构思新灵感中…" : "没想好？让 AI 随机来个灵感"}
              </button>
            </div>
            <div className="g-ai-composer-bar">
              <input
                className="g-input"
                value={idea}
                maxLength={50}
                placeholder="用大白话写你想征集什么，例如：下班路上抬头看到的晚霞…"
                aria-label="输入活动想法让 AI 帮填"
                onChange={event => setIdea(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void runAi({}); } }}
              />
              <button
                type="button"
                className="g-btn g-btn-primary"
                disabled={aiBusy || (!idea.trim() && !title.trim())}
                onClick={() => void runAi({})}
              >
                {aiMode === "fill" ? <Spinner size={14} /> : <WandSparklesIcon />}
                {aiMode === "fill" ? "生成方案中…" : "AI 自动填表"}
              </button>
            </div>
            <div className="g-ai-composer-chips">
              <span>点一下直接生成：</span>
              {QUICK_IDEAS.map(spark => (
                <button key={spark} type="button" disabled={aiBusy} onClick={() => { setIdea(spark); void runAi({ seed: spark }); }}>
                  {spark}
                </button>
              ))}
            </div>
            {aiReason ? <p className="g-ai-composer-note">{aiModel ? `由 ${aiModel} 实时生成：` : "已生成："}{aiReason}（下方均可自由修改）</p> : null}
          </div>

          {/* Direct Room Basic Fields */}
          <div className="g-block" style={{ borderTop: 0, paddingTop: 2 }}>
            <div className="g-field">
              <label className="g-label" htmlFor="create-title">活动标题<span className="g-label-hint">{title.trim().length}/40</span></label>
              <input
                id="create-title" className="g-input" value={title} maxLength={40}
                placeholder="例如：城市晚霞收集计划"
                onChange={event => setTitle(event.target.value)}
              />
            </div>
            <div className="g-field" style={{ marginTop: 12 }}>
              <label className="g-label" htmlFor="create-tagline">征集导语<span className="g-label-hint">{tagline.trim().length}/80</span></label>
              <input
                id="create-tagline" className="g-input" value={tagline} maxLength={80}
                placeholder="一句话告诉大家拍什么、什么样的瞬间最打动人…"
                onChange={event => setTagline(event.target.value)}
              />
            </div>
          </div>

          {/* Visibility & Mode */}
          <div className="g-block">
            <div className="g-block-head"><b>谁能进入房间</b><span>公开展示或私密凭码进房</span></div>
            <div className="g-options g-options-2">
              <button type="button" className="g-option" aria-pressed={visibility === "public"} onClick={() => setVisibility("public")}>
                <span className="g-option-title"><GlobeIcon />公开画廊</span>
                <span className="g-option-desc">展示在首页探索广场，任何人打开链接都能参与。</span>
                {visibility === "public" ? <span className="g-option-check"><CheckIcon /></span> : null}
              </button>
              <button type="button" className="g-option" aria-pressed={visibility === "private"} onClick={() => setVisibility("private")}>
                <span className="g-option-title"><LockIcon />私密口令房</span>
                <span className="g-option-desc">自动生成 4 位数字口令与专属分享链接，仅受邀者可见。</span>
                {visibility === "private" ? <span className="g-option-check"><CheckIcon /></span> : null}
              </button>
            </div>
          </div>

          <div className="g-block">
            <div className="g-block-head"><b>作品互动方式</b><span>决定房间是否开启投票榜单</span></div>
            <div className="g-options g-options-3">
              {MODE_IDS.map(id => {
                const Icon = MODE_ICONS[id];
                return (
                  <button key={id} type="button" className="g-option" aria-pressed={mode === id} onClick={() => setMode(id)}>
                    <span className="g-option-title"><Icon />{MODES[id].name}</span>
                    <span className="g-option-desc">{MODES[id].desc}</span>
                    {mode === id ? <span className="g-option-check"><CheckIcon /></span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minimal Theme Accent Dots + Sub-tags */}
          <div className="g-block">
            <div className="g-block-head"><b>点缀色与作品分栏</b><span>{tags.length}/4 个分栏（至少 3 个）</span></div>
            <div className="g-theme-pills" role="radiogroup" aria-label="房间点缀色">
              {THEME_IDS.map(id => (
                <button
                  key={id} type="button"
                  className={`g-theme-pill ${themeClass(id)}`}
                  aria-pressed={theme === id}
                  onClick={() => pickTheme(id)}
                  title={THEMES[id].note}
                >
                  <i aria-hidden="true" />
                  <span>{THEMES[id].name}</span>
                </button>
              ))}
            </div>

            <div className={`g-tagedit ${themeClass(theme)}`} style={{ marginTop: 12 }}>
              {tags.map(tag => (
                <span key={tag} className="g-tag">
                  {tag}
                  <button type="button" className="g-tag-x" aria-label={`移除子分栏 ${tag}`} onClick={() => { setTags(tags.filter(item => item !== tag)); setTagsTouched(true); }}><XIcon /></button>
                </span>
              ))}
              {tags.length < 4 ? (
                <span className="g-tag-input">
                  <input value={draft} maxLength={12} placeholder="添加分栏…" aria-label="新增子分栏" onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(draft); } }} />
                  <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => addTag(draft)} disabled={!draft.trim()}><PlusIcon />添加</button>
                </span>
              ) : null}
            </div>
            {!tagsValid ? <p style={{ margin: "8px 0 0", fontSize: 11.8, color: "var(--danger)" }}>请保留 3–4 个不重复的子分栏，每个不超过 12 个字。</p> : null}
          </div>
        </div>

        <aside className={`g-create-preview ${themeClass(theme)}`}>
          <span className="g-preview-label">广场卡片预览</span>
          <div className="g-preview-card">
            <div className="g-preview-cover"><span>{(title.trim() || "拾").slice(0, 1)}</span></div>
            <div className="g-preview-body">
              <div className="g-card-kicker">
                <span className="g-theme-dot" aria-hidden="true" />
                <span>{MODES[mode].short}</span>
                <span aria-hidden="true">·</span>
                <span>{visibility === "private" ? "口令房" : "公开"}</span>
              </div>
              <b>{title.trim() || "你的活动标题"}</b>
              <p>{tagline.trim() || "征集导语会显示在这里。"}</p>
              <div className="g-card-tags">{previewTags.map(tag => <span key={tag} className="g-tag">{tag}</span>)}</div>
            </div>
          </div>
          {account ? (
            <div className="g-ident-pill">
              <Avatar name={account.display_name} src={account.avatar_url} size={32} />
              <div className="g-ident-meta">
                <b>{account.display_name}</b>
                <span>@{account.handle}</span>
              </div>
              <span className="g-ident-tag">创办者</span>
            </div>
          ) : (
            <div className="g-field">
              <label className="g-label" htmlFor="create-name">你的昵称<span className="g-label-hint">显示为创办者</span></label>
              <input id="create-name" className="g-input" value={name} maxLength={24} placeholder="例如：阿柚" onChange={event => setName(event.target.value)} />
            </div>
          )}
          <p className="g-preview-note">
            {visibility === "private" ? <><KeyRoundIcon width={13} height={13} style={{ verticalAlign: -2 }} /> 创办后自动生成 4 位口令与分享链接。</> : <>创办后立即出现在公开探索广场。</>}
          </p>
          {error ? <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{message(error)}</p> : null}
        </aside>
      </div>
    </DialogShell>
  );
}
