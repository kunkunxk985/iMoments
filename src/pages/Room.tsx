import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, CameraIcon, CopyIcon, EyeIcon, GiftIcon, HeartIcon, ImageIcon, KeyRoundIcon, LayoutGridIcon, LinkIcon, LockIcon, RefreshCwIcon, Trash2Icon, TrophyIcon, TvIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, timeAgo, type Account, type Moment, type RoomView } from "@/src/api";
import { MODES, THEMES, themeClass, type ThemeId } from "@/src/config/theme";
import { navigate, setParams, type Route } from "@/src/lib/router";
import { codeFor, forgetUnlock, rememberUnlock } from "@/src/lib/visitor";
import { copyText, shareLink } from "@/src/lib/copy";
import { Avatar, Ballots, Empty, ErrorState, Spinner } from "@/src/components/bits";
import { Gallery } from "@/src/features/Gallery";
import { CuratorAwardBox, Leaderboard } from "@/src/features/Leaderboard";
import { Lightbox } from "@/src/features/Lightbox";
import { Upload } from "@/src/dialogs/Upload";
import { StageScreen } from "@/src/features/StageScreen";
import { PosterDialog } from "@/src/dialogs/PosterDialog";

export function Room({ slug, route, version, account, onTheme }: { slug: string; route: Route; version: number; account: Account | null; onTheme: (theme: ThemeId) => void }) {
  const [data, setData] = useState<RoomView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [locked, setLocked] = useState(false);
  const view = route.params.get("view") === "rank" ? "rank" : "gallery";
  const setView = (next: "gallery" | "rank") => setParams({ view: next === "rank" ? "rank" : null });
  const [tag, setTag] = useState<string>("all");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [generatingAward, setGeneratingAward] = useState(false);
  const urlCode = route.params.get("code");
  const code = codeFor(slug) ?? urlCode;
  const openId = route.params.get("m");
  const uploadOpen = route.params.get("upload") === "1";
  const stageOpen = route.params.get("stage") === "1";
  const posterOpen = route.params.get("poster") === "1";
  const autoTried = useRef<string | null>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const node = heroBgRef.current;
        if (node) node.style.transform = `translate3d(0, ${Math.min(window.scrollY, 700) * 0.16}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, [slug]);

  const load = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await api.room(slug, codeFor(slug) ?? urlCode, signal);
      setData(next); setError(null); setLocked(false);
      onTheme(next.room.theme);
    } catch (caught) {
      if ((caught as Error)?.name === "AbortError") return;
      if ((caught as { code?: string })?.code === "room_locked") { setLocked(true); setError(null); }
      else setError(caught);
    } finally { if (!silent) setLoading(false); }
  }, [slug, urlCode, onTheme]);

  useEffect(() => {
    const controller = new AbortController();
    setTag("all"); setData(null); setLocked(false);
    void load(controller.signal);
    return () => controller.abort();
  }, [load, version]);

  useEffect(() => {
    if (!locked || !urlCode || autoTried.current === urlCode) return;
    autoTried.current = urlCode;
    void (async () => {
      try {
        const room = await api.unlock(urlCode);
        rememberUnlock(room);
        toast.success(`口令正确，已进入「${room.title}」`);
        setLocked(false);
        void load();
      } catch (caught) { toast.error(message(caught)); }
    })();
  }, [locked, urlCode, load]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !locked) void load(undefined, true); }, 12_000);
    const onFocus = () => { if (document.visibilityState === "visible" && !locked) void load(undefined, true); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [load, locked]);

  const patch = useCallback((id: string, changes: Partial<Moment>) => {
    setData(current => current ? { ...current, moments: current.moments.map(moment => moment.id === id ? { ...moment, ...changes } : moment) } : current);
  }, []);
  const mark = useCallback((id: string, on: boolean) => {
    setPending(current => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });
  }, []);

  const guardLogin = useCallback((action: string) => {
    if (account) return true;
    toast(`请先注册或登录拾光账号后再${action}`);
    setParams({ account: "1", upload: null });
    return false;
  }, [account]);

  useEffect(() => {
    if (uploadOpen && !account) {
      toast("请先注册或登录拾光账号后再上传瞬间");
      setParams({ upload: null, account: "1" });
    }
  }, [uploadOpen, account]);

  const toggleLike = useCallback(async (id: string) => {
    if (!guardLogin("点赞")) return;
    const current = data?.moments.find(moment => moment.id === id);
    if (!current || pending.has(id)) return;
    const liked = !current.liked;
    mark(id, true);
    patch(id, { liked, likes: Math.max(0, current.likes + (liked ? 1 : -1)) });
    try {
      const result = await api.like(id, code);
      patch(id, { liked: result.liked, likes: result.likes });
    } catch (caught) {
      patch(id, { liked: current.liked, likes: current.likes });
      toast.error(message(caught));
    } finally { mark(id, false); }
  }, [guardLogin, data, pending, code, mark, patch]);

  const castVote = useCallback(async (id: string, cast: boolean) => {
    if (!guardLogin(cast ? "投票" : "撤回选票")) return;
    const current = data?.moments.find(moment => moment.id === id);
    if (!current || pending.has(id)) return;
    if (cast && (data?.me.remaining ?? 0) <= 0) { toast.error("你在这个房间的 5 张选票已用完，可以先撤回一张再投。"); return; }
    mark(id, true);
    patch(id, { voted: cast, votes: current.votes === null ? null : Math.max(0, current.votes + (cast ? 1 : -1)) });
    setData(state => state ? { ...state, me: { ...state.me, remaining: Math.max(0, state.me.remaining + (cast ? -1 : 1)), used: Math.max(0, state.me.used + (cast ? 1 : -1)) } } : state);
    try {
      const result = await api.vote(id, code, cast);
      patch(id, { voted: result.voted, votes: result.votes });
      setData(state => state ? { ...state, me: { ...state.me, remaining: result.remaining, used: 5 - result.remaining } } : state);
      toast.success(cast ? "选票已投出，榜单实时更新" : "选票已撤回，回到你的票夹");
    } catch (caught) {
      patch(id, { voted: current.voted, votes: current.votes });
      setData(state => state ? { ...state, me: { ...state.me, remaining: Math.max(0, state.me.remaining + (cast ? 1 : -1)), used: Math.max(0, state.me.used + (cast ? -1 : 1)) } } : state);
      toast.error(message(caught));
    } finally { mark(id, false); }
  }, [guardLogin, data, pending, code, mark, patch]);

  const room = data?.room;
  useEffect(() => {
    if (room) document.title = `${room.title} · iMoments 拾光房间`;
  }, [room?.title]);
  const moments = data?.moments ?? [];
  const showsVotes = !!room && (room.mode === "ballot" || (room.mode === "blind" && room.revealed));
  const ranks = useMemo(() => {
    const map = new Map<string, number>();
    if (!showsVotes) return map;
    [...moments].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || b.likes - a.likes || (a.created_at < b.created_at ? -1 : 1))
      .forEach((moment, index) => map.set(moment.id, index + 1));
    return map;
  }, [moments, showsVotes]);
  const filtered = useMemo(() => {
    const list = tag === "all" ? moments : moments.filter(moment => moment.tag === tag);
    return [...list].sort((a, b) => Number(Boolean(a.seed_key)) - Number(Boolean(b.seed_key)));
  }, [moments, tag]);
  const lightboxList = filtered.some(moment => moment.id === openId) ? filtered : moments;
  const lightboxIndex = lightboxList.findIndex(moment => moment.id === openId);
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const moment of moments) counts.set(moment.tag, (counts.get(moment.tag) ?? 0) + 1);
    return counts;
  }, [moments]);

  const reveal = async () => {
    if (!guardLogin("开奖揭晓")) return;
    if (!room || revealing) return;
    setRevealing(true);
    try {
      await api.reveal(room.slug, code);
      setConfirmReveal(false);
      toast.success("已开奖！票数与榜单现在对所有人公开");
      void load();
    } catch (caught) { toast.error(message(caught)); }
    finally { setRevealing(false); }
  };

  const generateAward = async () => {
    if (!guardLogin("生成 AI 颁奖词")) return;
    if (!room || generatingAward) return;
    setGeneratingAward(true);
    try {
      const note = await api.aiAward(room.slug, code, { title: room.title, mode: room.mode, revealed: room.revealed, moments });
      setData(curr => curr ? { ...curr, room: { ...curr.room, ai_curator_note: note } } : curr);
      toast.success("AI 首席颁奖词已更新并保存");
    } catch (caught) {
      toast.error(message(caught));
    } finally {
      setGeneratingAward(false);
    }
  };

  const deleteMoment = async (id: string) => {
    try {
      await api.deleteMoment(id, code);
      setData(curr => {
        if (!curr) return curr;
        const nextMoments = curr.moments.filter(m => m.id !== id);
        return {
          ...curr,
          moments: nextMoments,
          room: { ...curr.room, moment_count: Math.max(0, curr.room.moment_count - 1) },
          stats: { ...curr.stats, moments: nextMoments.length },
        };
      });
      setParams({ m: null });
      toast.success("作品已删除");
    } catch (caught) {
      toast.error(message(caught));
    }
  };

  const deleteRoom = async () => {
    if (!room || deletingRoom) return;
    setDeletingRoom(true);
    try {
      await api.deleteRoom(room.slug, code);
      forgetUnlock(room.slug);
      toast.success("活动房间已删除");
      navigate("/");
    } catch (caught) {
      toast.error(message(caught));
    } finally {
      setDeletingRoom(false);
      setConfirmDeleteRoom(false);
    }
  };

  if (locked) {
    return (
      <div className="g-wrap g-room-body">
        <Empty
          icon={<LockIcon />}
          title="这是一间私密口令房"
          text="房间内容只对拿到 4 位口令的人开放。输入口令后即可上传瞬间、点赞、投票与盖楼；口令会保存在这台设备上。"
          action={<>
            <button type="button" className="g-btn g-btn-theme" onClick={() => setParams({ gate: "1" })}><KeyRoundIcon />输入 4 位口令</button>
            <button type="button" className="g-btn g-btn-ghost" onClick={() => navigate("/")}><ArrowLeftIcon />回到探索广场</button>
          </>}
        />
        <p style={{ textAlign: "center", fontSize: 12.4, color: "var(--site-muted)", marginTop: 14 }}>想先看看效果？测试口令 0507 对应《周末露营与挚友派对实况》。</p>
      </div>
    );
  }

  if (error && !data) {
    return <div className="g-wrap g-room-body"><ErrorState error={error} onRetry={() => void load()} /></div>;
  }
  if (!room || !data) {
    return (
      <div className="g-wrap g-room-body">
        <div className="g-empty"><span className="g-empty-mark"><Spinner size={24} /></span><h3>正在打开房间…</h3><p>读取房间信息、作品画廊与你的选票状态。</p></div>
      </div>
    );
  }

  const theme = THEMES[room.theme] ?? THEMES.amber;
  const link = shareLink(room.slug, room.code);
  const actions = {
    onOpen: (id: string) => setParams({ m: id }),
    onLike: (id: string) => void toggleLike(id),
    onVote: (id: string, cast: boolean) => void castVote(id, cast),
    pending,
  };

  return (
    <div className={themeClass(room.theme)}>
      <section className="g-hero">
        <div className="g-hero-bg" ref={heroBgRef} />
        <div className="g-wrap g-hero-in">
          <div className="g-hero-top">
            <button type="button" className="g-hero-back" onClick={() => navigate("/")}><ArrowLeftIcon />探索广场</button>
            <span className="g-hero-kicker">
              <span className="g-theme-dot" aria-hidden="true" />
              {room.visibility === "private" ? "私密口令房" : "公开画廊"} · {MODES[room.mode].name} · {theme.name}
            </span>
          </div>
          <div className="g-hero-grid">
            <div>
              <h1>{room.title}</h1>
              <p className="g-hero-tagline">{room.tagline}</p>
              <div className="g-hero-meta">
                <span className="g-hero-creator"><Avatar name={room.creator_name} src={room.creator_avatar} size={20} /><b>{room.creator_name}</b> 创办</span>
                <span className="g-stat-sep" aria-hidden="true">/</span>
                <span><b>{data.stats.moments}</b> 幅作品</span>
                <span className="g-stat-sep" aria-hidden="true">/</span>
                <span><b>{data.stats.likes}</b> 喜欢</span>
                <span className="g-stat-sep" aria-hidden="true">/</span>
                {data.stats.votes !== null ? <span><b>{data.stats.votes}</b> 选票</span> : <span>票数封存中</span>}
                <span className="g-stat-sep" aria-hidden="true">/</span>
                <span>{data.stats.participants} 位拍摄者 · {timeAgo(room.created_at)}</span>
              </div>
              <p className="g-hero-rule">{MODES[room.mode].rule}</p>
            </div>
            <div className="g-hero-side">
              {room.mode !== "gentle" && account ? <Ballots remaining={data.me.remaining} /> : null}
              <div className="g-hero-actions">
                <button type="button" className="g-btn g-btn-primary g-btn-lg" onClick={() => { if (guardLogin("上传瞬间")) setParams({ upload: "1", m: null }); }}><CameraIcon />上传瞬间</button>
                <button type="button" className="g-btn g-btn-stage" onClick={() => setParams({ stage: "1", m: null })} title="开启 16:9 现场流光投屏大屏">
                  <TvIcon />16:9 投屏
                </button>
                <button type="button" className="g-btn g-btn-ghost g-btn-icon" title="重新同步房间数据" aria-label="重新同步房间数据" onClick={() => void load()}><RefreshCwIcon /></button>
              </div>
              <div className="g-share">
                {room.visibility === "private" ? (
                  <button type="button" className="g-code-pill" title="点击复制 4 位口令" onClick={async () => toast[await copyText(room.code ?? "") ? "success" : "error"]("口令已复制")}>
                    <KeyRoundIcon />{room.code}<CopyIcon />
                  </button>
                ) : null}
                <button type="button" className="g-btn g-btn-sm g-btn-ghost" onClick={() => setParams({ poster: "1", m: null })}>
                  <ImageIcon />九宫格海报
                </button>
                <button type="button" className="g-btn g-btn-sm g-btn-ghost" onClick={async () => toast[await copyText(link) ? "success" : "error"](room.visibility === "private" ? "分享链接已复制，对方打开即自动解锁" : "房间链接已复制")}>
                  <LinkIcon />{room.visibility === "private" ? "复制分享链接" : "复制链接"}
                </button>
                {room.is_creator ? (
                  confirmDeleteRoom ? (
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" className="g-btn g-btn-sm g-btn-ghost" disabled={deletingRoom} onClick={() => setConfirmDeleteRoom(false)}>取消</button>
                      <button type="button" className="g-btn g-btn-sm g-btn-danger" disabled={deletingRoom} onClick={() => void deleteRoom()}>
                        {deletingRoom ? <Spinner size={12} /> : <Trash2Icon />}{deletingRoom ? "删除中…" : "确认删除"}
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="g-btn g-btn-sm g-btn-ghost g-btn-danger" onClick={() => setConfirmDeleteRoom(true)} title="删除这个活动房间">
                      <Trash2Icon />删除活动
                    </button>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="g-subbar">
        <div className="g-wrap g-subbar-in">
          <div className="g-tags" role="group" aria-label="子分栏筛选">
            <button type="button" className="g-chip g-chip-theme" aria-pressed={tag === "all"} onClick={() => setTag("all")}>全部<span className="g-chip-count">{moments.length}</span></button>
            {room.tags.map(item => (
              <button key={item} type="button" className="g-chip g-chip-theme" aria-pressed={tag === item} onClick={() => setTag(item)}>
                {item}<span className="g-chip-count">{tagCounts.get(item) ?? 0}</span>
              </button>
            ))}
          </div>
          {room.mode !== "gentle" ? (
            <div className="g-viewswitch" role="group" aria-label="视图切换">
              <button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}><LayoutGridIcon />画廊</button>
              <button type="button" aria-pressed={view === "rank"} onClick={() => setView("rank")}><TrophyIcon />荣誉榜单</button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="g-wrap g-room-body">
        {room.mode === "blind" && !room.revealed ? (
          <div className="g-sealed">
            <span className="g-sealed-icon"><GiftIcon /></span>
            <div>
              <h3>盲盒征集期 · 票数封存中</h3>
              <p>现在投票不会显示具体票数，避免跟风。任何人都可以发起揭晓；开奖后金银铜与完整榜单立刻公开。</p>
            </div>
            {confirmReveal ? (
              <span style={{ display: "inline-flex", gap: 8, marginLeft: "auto" }}>
                <button type="button" className="g-btn g-btn-sm g-btn-ghost" onClick={() => setConfirmReveal(false)}>再等等</button>
                <button type="button" className="g-btn g-btn-sm g-btn-theme" disabled={revealing} onClick={() => void reveal()}>{revealing ? <Spinner /> : <EyeIcon />}{revealing ? "开奖中…" : "确认揭晓"}</button>
              </span>
            ) : (
              <button type="button" className="g-btn g-btn-theme" onClick={() => { if (guardLogin("开奖揭晓")) setConfirmReveal(true); }}><EyeIcon />开奖揭晓</button>
            )}
          </div>
        ) : null}

        {error ? <div style={{ marginBottom: 16 }}><ErrorState error={error} onRetry={() => void load()} /></div> : null}

        {moments.length === 0 ? (
          <Empty
            icon={<CameraIcon />}
            title="这个房间还没有作品"
            text="上传第一张瞬间：选择照片、子标签和一句话故事，它会立刻成为房间封面，并出现在所有人的画廊里。"
            action={<button type="button" className="g-btn g-btn-theme g-btn-lg" onClick={() => { if (guardLogin("上传瞬间")) setParams({ upload: "1" }); }}><CameraIcon />上传第一张瞬间</button>}
          />
        ) : view === "gallery" || room.mode === "gentle" ? (
          <>
            <div style={{ marginBottom: 18 }}>
              <CuratorAwardBox note={room.ai_curator_note} generating={generatingAward} onGenerate={() => void generateAward()} mode={room.mode} count={moments.length} />
            </div>
            <Gallery moments={filtered} ranks={ranks} mode={room.mode} revealed={room.revealed} remaining={data.me.remaining} actions={actions} />
          </>
        ) : (
          <Leaderboard
            moments={moments} mode={room.mode} revealed={room.revealed}
            curatorNote={room.ai_curator_note} generatingAward={generatingAward} onGenerateAward={() => void generateAward()}
            onOpen={actions.onOpen}
          />
        )}

        <footer className="g-foot">
          <span>
            {room.is_creator ? "你是这个房间的创办者。" : `由 ${room.creator_name} 创办。`}
            作品、AI 旁白、选票与短评保存在站点共享数据库与文件存储中，多人跨设备同步。
          </span>
          <button type="button" className="g-btn g-btn-sm g-btn-ghost" style={{ marginLeft: "auto" }} onClick={() => setParams({ credits: "1" })}><ImageIcon />示例图来源</button>
        </footer>
      </div>

      {uploadOpen && account ? (
        <Upload
          slug={room.slug} roomTitle={room.title} code={code} tags={room.tags} theme={room.theme} account={account}
          onClose={() => setParams({ upload: null })}
          onUploaded={id => { void load(); setParams({ upload: null, m: id }); }}
        />
      ) : null}

      {stageOpen ? (
        <StageScreen
          room={room} moments={moments} ranks={ranks} code={code} stats={data.stats}
          onClose={() => setParams({ stage: null })}
        />
      ) : null}

      {posterOpen ? (
        <PosterDialog
          room={room} moments={moments} stats={data.stats}
          onClose={() => setParams({ poster: null })}
        />
      ) : null}

      {lightboxIndex >= 0 ? (
        <Lightbox
          moments={lightboxList} index={lightboxIndex} code={code} mode={room.mode} revealed={room.revealed}
          theme={room.theme} roomTitle={room.title} remaining={data.me.remaining} pending={pending} account={account}
          onClose={() => setParams({ m: null })}
          onNavigate={id => setParams({ m: id })}
          onLike={actions.onLike} onVote={actions.onVote}
          onCommentPosted={id => {
            const current = data.moments.find(moment => moment.id === id);
            if (current) patch(id, { comment_count: current.comment_count + 1 });
          }}
          onDelete={deleteMoment}
        />
      ) : null}
    </div>
  );
}
