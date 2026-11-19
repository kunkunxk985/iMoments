import { useMemo, useRef, useState } from "react";
import { CheckIcon, CopyIcon, GiftIcon, GlobeIcon, HeartHandshakeIcon, KeyRoundIcon, LockIcon, PlusIcon, ShuffleIcon, SparklesIcon, TicketIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, type Room } from "@/src/api";
import { MODES, MODE_IDS, THEMES, THEME_IDS, themeClass, type ModeId, type ThemeId, type Visibility } from "@/src/theme";
import { DialogShell } from "@/src/components/DialogShell";
import { Spinner } from "@/src/components/bits";
import { nickname as storedNickname, rememberUnlock, setNickname } from "@/src/lib/visitor";
import { copyText, shareLink } from "@/src/lib/copy";
import { navigate } from "@/src/lib/router";

const IDEAS: { title: string; tagline: string; theme: ThemeId; mode: ModeId; visibility: Visibility }[] = [
  { title: "阳台上的十分钟日落", tagline: "每天给自己十分钟，看光从楼缝里慢慢退场。", theme: "amber", mode: "gentle", visibility: "public" },
  { title: "深夜键盘声与桌面灯光", tagline: "晒出陪你加班的那盏灯、那把键盘和那面墙。", theme: "geek", mode: "ballot", visibility: "public" },
  { title: "楼下那只猫今天心情如何", tagline: "用一张照片记录它今天的表情，五票决定谁是本周猫王。", theme: "ginkgo", mode: "ballot", visibility: "public" },
  { title: "雨夜霓虹里的回家路", tagline: "征集期内票数封存，开奖那一刻才知道谁拍中了今晚。", theme: "neon", mode: "blind", visibility: "public" },
  { title: "周末帐篷外的第一杯咖啡", tagline: "只给一起去的人看的清晨：雾、鸟叫和还温的杯子。", theme: "mint", mode: "ballot", visibility: "private" },
  { title: "全国各地的秋天长什么样", tagline: "银杏、糖炒栗子与街头风衣，交出你城市此刻的秋意证据。", theme: "ginkgo", mode: "gentle", visibility: "public" },
];

const QUICK_SPARKS = ["全国各地的秋天", "宿舍深夜泡面大赏", "秋季草坪音乐节神图墙", "雨夜便利店门口"];

const MODE_ICONS = { gentle: HeartHandshakeIcon, ballot: TicketIcon, blind: GiftIcon } as const;

export function CreateRoom({ onClose, onCreated }: { onClose: () => void; onCreated: (room: Room) => void }) {
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
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [created, setCreated] = useState<Room | null>(null);
  const key = useRef(crypto.randomUUID());
  const ideaIndex = useRef(Math.floor(Math.random() * IDEAS.length));

  const tagsValid = tags.length >= 3 && tags.length <= 4 && new Set(tags).size === tags.length && tags.every(tag => tag.length > 0 && tag.length <= 12);
  const valid = title.trim().length > 0 && title.trim().length <= 40 && tagline.trim().length > 0 && tagline.trim().length <= 80 && tagsValid && name.trim().length > 0 && name.trim().length <= 24;

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
  const surprise = () => {
    ideaIndex.current = (ideaIndex.current + 1) % IDEAS.length;
    const idea = IDEAS[ideaIndex.current];
    setTitle(idea.title); setTagline(idea.tagline); setTheme(idea.theme); setMode(idea.mode);
    setVisibility(idea.visibility); setTags(THEMES[idea.theme].presets); setTagsTouched(false);
    setAiReason(null);
  };

  const runAiVibe = async (seedOverride?: string) => {
    const seed = (seedOverride ?? title).trim() || QUICK_SPARKS[Math.floor(Math.random() * QUICK_SPARKS.length)];
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const vibe = await api.aiVibe(seed);
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
      toast.success("AI 造景完成：已为你配齐导语、主题色与子分栏");
    } catch (caught) {
      toast.error(message(caught));
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      const room = await api.createRoom({
        title: title.trim(), tagline: tagline.trim(), visibility, mode, theme, tags, creator_name: name.trim(),
      }, key.current);
      setNickname(name);
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
          <button type="button" className="g-btn g-btn-ghost" onClick={() => { setCreated(null); setTitle(""); setTagline(""); setAiReason(null); key.current = crypto.randomUUID(); }}>再创办一个</button>
          <span className="g-spacer" />
          <button type="button" className="g-btn g-btn-quiet" onClick={onClose}>留在广场</button>
          <button type="button" className="g-btn g-btn-theme" onClick={() => { onClose(); navigate(`/r/${created.slug}`); }}>进入房间</button>
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
      title="创办拾光活动" description="输入任意一句话点「AI 一键造景」，或手动自由组装四块房间积木。"
      footer={<>
        <span className="g-dlg-foot-note">{valid ? "配置完成，随时可以开房。" : "填写标题、导语、昵称，并保留 3–4 个子分栏。"}</span>
        <span className="g-spacer" />
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>取消</button>
        <button type="button" className="g-btn g-btn-primary g-btn-lg" disabled={!valid || busy} onClick={submit}>
          {busy ? <Spinner /> : <PlusIcon />}{busy ? "正在开房…" : "立即创办"}
        </button>
      </>}
    >
      <div className="g-create-grid">
        <div className="g-blocks">
          <div className="g-block">
            <div className="g-block-head"><b>活动标题与 AI 一句话造景</b><span>{title.trim().length}/40 · {tagline.trim().length}/80</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div className="g-field">
                <label className="g-label" htmlFor="create-title">输入一句话想法或标题</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="create-title" className="g-input" value={title} maxLength={40}
                    placeholder="例如：宿舍深夜泡面大赏 / 全国各地的秋天"
                    onChange={event => setTitle(event.target.value)}
                    onKeyDown={event => { if (event.key === "Enter" && !tagline.trim()) { event.preventDefault(); void runAiVibe(); } }}
                  />
                  <button
                    type="button" className="g-btn g-btn-theme" disabled={aiBusy}
                    onClick={() => void runAiVibe()}
                    title="由 AI 根据标题自动生成征集导语、推荐赛制、主题色与 4 个子分栏"
                  >
                    {aiBusy ? <Spinner size={14} /> : <WandSparklesIcon />}{aiBusy ? "造景中…" : "AI 一键造景"}
                  </button>
                </div>
              </div>

              <div className="g-presets" style={{ marginTop: -2 }}>
                <span style={{ fontSize: 11.4, color: "var(--site-muted)", alignSelf: "center" }}>试试一句话造景：</span>
                {QUICK_SPARKS.map(spark => (
                  <button key={spark} type="button" disabled={aiBusy} onClick={() => { setTitle(spark); void runAiVibe(spark); }}>
                    ✦ {spark}
                  </button>
                ))}
              </div>

              {aiReason ? (
                <div className="g-ai-banner">
                  <SparklesIcon />
                  <span>{aiReason}</span>
                </div>
              ) : null}

              <div className="g-field">
                <label className="g-label" htmlFor="create-tagline">一句话征集导语</label>
                <input id="create-tagline" className="g-input" value={tagline} maxLength={80} placeholder="告诉大家可以拍什么、为什么值得拍" onChange={event => setTagline(event.target.value)} />
              </div>
              <button type="button" className="g-btn g-btn-sm g-btn-quiet" style={{ alignSelf: "flex-start" }} onClick={surprise}>
                <ShuffleIcon />随机换个灵感模板
              </button>
            </div>
          </div>

          <div className="g-block">
            <div className="g-block-head"><span className="g-block-no">1</span><b>空间边界</b><span>谁能看见这个房间</span></div>
            <div className="g-options g-options-2">
              <button type="button" className="g-option" aria-pressed={visibility === "public"} onClick={() => setVisibility("public")}>
                <span className="g-option-title"><GlobeIcon />公开到探索广场</span>
                <span className="g-option-desc">出现在首页卡片网格，任何人都能进入、上传与互动。</span>
                {visibility === "public" ? <span className="g-option-check"><CheckIcon /></span> : null}
              </button>
              <button type="button" className="g-option" aria-pressed={visibility === "private"} onClick={() => setVisibility("private")}>
                <span className="g-option-title"><LockIcon />设为私密口令房</span>
                <span className="g-option-desc">自动生成不重复的 4 位房间号与分享码，凭口令进入。</span>
                {visibility === "private" ? <span className="g-option-check"><CheckIcon /></span> : null}
              </button>
            </div>
          </div>

          <div className="g-block">
            <div className="g-block-head"><span className="g-block-no">2</span><b>互动赛制</b><span>作品之间如何相处</span></div>
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

          <div className="g-block">
            <div className="g-block-head"><span className="g-block-no">3</span><b>房间视觉主题色</b><span>渐变会用在房头、徽章与按钮</span></div>
            <div className="g-swatches">
              {THEME_IDS.map(id => (
                <button key={id} type="button" className={`g-swatch ${themeClass(id)}`} aria-pressed={theme === id} onClick={() => pickTheme(id)} title={THEMES[id].note}>
                  <span className="g-swatch-chip" />
                  <span>{THEMES[id].name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="g-block">
            <div className="g-block-head"><span className="g-block-no">4</span><b>子分栏标签</b><span>{tags.length}/4 · 至少 3 个</span></div>
            <div className={`g-tagedit ${themeClass(theme)}`}>
              {tags.map(tag => (
                <span key={tag} className="g-tag">
                  {tag}
                  <button type="button" className="g-tag-x" aria-label={`移除子分栏 ${tag}`} onClick={() => { setTags(tags.filter(item => item !== tag)); setTagsTouched(true); }}><XIcon /></button>
                </span>
              ))}
              {tags.length < 4 ? (
                <span className="g-tag-input">
                  <input value={draft} maxLength={12} placeholder="新增子分栏" aria-label="新增子分栏" onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(draft); } }} />
                  <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => addTag(draft)} disabled={!draft.trim()}><PlusIcon />加入</button>
                </span>
              ) : null}
            </div>
            {!tagsTouched ? (
              <div className="g-presets">
                <span style={{ fontSize: 11.4, color: "var(--site-muted)", alignSelf: "center" }}>主题推荐：</span>
                {THEMES[theme].presets.map(tag => <button key={tag} type="button" onClick={() => { setTags(THEMES[theme].presets); setTagsTouched(true); }}>{tag}</button>)}
              </div>
            ) : null}
            {!tagsValid ? <p style={{ margin: "9px 0 0", fontSize: 11.8, color: "var(--danger)" }}>请保留 3–4 个不重复的子分栏，每个不超过 12 个字。</p> : null}
          </div>
        </div>

        <aside className={`g-create-preview ${themeClass(theme)}`}>
          <span className="g-preview-label">实时预览</span>
          <div className="g-preview-card">
            <div className="g-preview-cover"><span>{(title.trim() || "拾").slice(0, 1)}</span></div>
            <div className="g-preview-body">
              <b>{title.trim() || "你的活动标题"}</b>
              <p>{tagline.trim() || "一句话征集导语会显示在这里。"}</p>
              <div className="g-card-tags">{previewTags.map(tag => <span key={tag} className="g-tag">{tag}</span>)}</div>
              <div className="g-card-foot" style={{ paddingTop: 10 }}>
                <span>{MODES[mode].short}</span>
                <span>{visibility === "private" ? "口令房" : "公开"}</span>
                <span className="g-card-enter">{THEMES[theme].name}</span>
              </div>
            </div>
          </div>
          <div className="g-field">
            <label className="g-label" htmlFor="create-name">你的昵称<span className="g-label-hint">显示为创办者</span></label>
            <input id="create-name" className="g-input" value={name} maxLength={24} placeholder="例如：阿柚" onChange={event => setName(event.target.value)} />
          </div>
          <p className="g-preview-note">
            {visibility === "private" ? <><KeyRoundIcon width={13} height={13} style={{ verticalAlign: -2 }} /> 创办后自动生成不重复的 4 位口令与分享码。</> : <>公开房间会立刻出现在探索广场卡片网格中。</>}
            <br />{MODES[mode].rule}
          </p>
          {error ? <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{message(error)}</p> : null}
        </aside>
      </div>
    </DialogShell>
  );
}
