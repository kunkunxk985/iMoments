import { useCallback, useEffect, useMemo, useState } from "react";
import { CompassIcon, FlameIcon, KeyRoundIcon, LockIcon, PlusIcon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, type Account, type Plaza as PlazaData } from "@/src/api";
import { MODES, MODE_IDS, type ModeId } from "@/src/config/theme";
import { setParams, type Route } from "@/src/lib/router";
import { unlockedRooms } from "@/src/lib/visitor";
import { Empty, ErrorState, SkeletonCard, clockText, lightPhrase, useNow } from "@/src/components/bits";
import { RoomCard } from "@/src/components/RoomCard";

type Sort = "hot" | "new";

export function Plaza({ route, version, account }: { route: Route; version: number; account: Account | null }) {
  const openCreate = () => {
    if (!account) {
      toast("请先注册或登录拾光账号后再创办活动");
      setParams({ account: "1" });
      return;
    }
    setParams({ create: "1" });
  };
  const [data, setData] = useState<PlazaData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("hot");
  const [query, setQuery] = useState("");
  const now = useNow(30_000);
  const mode = (route.params.get("mode") ?? "all") as ModeId | "all";

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await api.plaza(unlockedRooms().map(row => row.code), signal);
      setData(next); setError(null);
    } catch (caught) {
      if ((caught as Error)?.name === "AbortError") return;
      setError(caught);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    return () => controller.abort();
  }, [load, version]);

  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); window.clearInterval(timer); };
  }, [load]);

  const rooms = useMemo(() => {
    const all = data?.rooms ?? [];
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? all.filter(room => [room.title, room.tagline, room.creator_name, ...room.tags].join(" ").toLowerCase().includes(needle))
      : all;
    const filtered = mode === "all" ? matched : matched.filter(room => room.mode === mode);
    return [...filtered].sort((a, b) => sort === "new"
      ? Date.parse(b.created_at) - Date.parse(a.created_at)
      : (b.moment_count - a.moment_count) || (Date.parse(b.created_at) - Date.parse(a.created_at)));
  }, [data, mode, sort, query]);

  return (
    <div className="g-wrap g-plaza">
      <div className="g-masthead">
        <div>
          <span className="g-eyebrow">Editorial Gallery · {clockText(now)}</span>
          <h1>公开探索广场</h1>
          <p>
            每一间房都是一次主题摄影策展。{lightPhrase(now.getHours())}，选一间走进去，留下此刻的光。
          </p>
        </div>
        <div className="g-stats" aria-label="广场概览">
          <span className="g-stat-inline"><b>{data?.stats.rooms ?? "—"}</b> 间画廊</span>
          <span className="g-stat-sep" aria-hidden="true">/</span>
          <span className="g-stat-inline"><b>{data?.stats.moments ?? "—"}</b> 幅瞬间</span>
          {data?.unlocked.length ? (
            <>
              <span className="g-stat-sep" aria-hidden="true">/</span>
              <span className="g-stat-inline"><b>{data.unlocked.length}</b> 间已解锁</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="g-toolbar">
        <button type="button" className="g-chip" aria-pressed={mode === "all"} onClick={() => setParams({ mode: null })}>全部</button>
        {MODE_IDS.map(id => (
          <button key={id} type="button" className="g-chip" aria-pressed={mode === id} onClick={() => setParams({ mode: id })}>
            {MODES[id].name}
            <span className="g-chip-count">{(data?.rooms ?? []).filter(room => room.mode === id).length}</span>
          </button>
        ))}
        <span className="g-toolbar-spacer" />
        <span className="g-search">
          <SearchIcon />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、导语或子分栏" aria-label="搜索公开房间" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="清空搜索"><XIcon /></button> : null}
        </span>
        <label className="g-sr" htmlFor="plaza-sort">排序方式</label>
        <select id="plaza-sort" className="g-select" value={sort} onChange={event => setSort(event.target.value as Sort)}>
          <option value="hot">按作品热度</option>
          <option value="new">按创办时间</option>
        </select>
        <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => setParams({ gate: "1" })}><KeyRoundIcon />口令进私密房</button>
      </div>

      {error && !data ? <ErrorState error={error} onRetry={() => { setLoading(true); void load(); }} /> : null}

      {loading && !data ? (
        <div className="g-grid">{Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}</div>
      ) : rooms.length ? (
        <div className="g-grid">
          {rooms.map((room, index) => <RoomCard key={room.id} room={room} index={index} />)}
        </div>
      ) : !error ? (
        <Empty
          icon={<CompassIcon />}
          title={query.trim() ? `没有匹配「${query.trim()}」的房间` : mode === "all" ? "广场还没有房间" : `还没有「${MODES[mode as ModeId]?.name ?? ""}」赛制的房间`}
          text={query.trim() ? "换个关键词，或清空搜索看看全部公开房间。也可以自己创办一个正好叫这个名字的房间。" : "创办一个拾光活动只要十秒：写一句征集导语，选好空间边界、互动赛制、主题色和子分栏，房间立刻出现在这里。"}
          action={query.trim()
            ? <button type="button" className="g-btn g-btn-quiet" onClick={() => setQuery("")}><XIcon />清空搜索</button>
            : <button type="button" className="g-btn g-btn-primary" onClick={openCreate}><PlusIcon />创办拾光活动</button>}
        />
      ) : null}

      {data?.unlocked.length ? (
        <section className="g-strip">
          <div className="g-strip-head">
            <LockIcon width={16} height={16} />
            <h2>已解锁的私密房</h2>
            <span>口令保存在这台设备上，换设备需重新输入</span>
          </div>
          <div className="g-strip-row">
            {data.unlocked.map((room, index) => <RoomCard key={room.id} room={room} index={index} />)}
          </div>
        </section>
      ) : null}

      <footer className="g-foot">
        <SparklesIcon width={15} height={15} />
        <span>
          预置的 5 个样板房间（落日、工位、流浪猫、下班路、露营派对）含示例摄影作品与热评，方便第一次打开就有内容可看；
          你创办的房间、上传的照片、点赞、选票与短评都写入站点共享数据库与文件存储，多人跨设备打开同一链接即可同步互动。
        </span>
        {import.meta.env.DEV ? (
          <span className="g-local">
            <FlameIcon />本地预览 · 内存数据
            <a href="/__local/" style={{ marginLeft: 4 }}>测试控制台</a>
          </span>
        ) : null}
        <button type="button" className="g-btn g-btn-sm g-btn-ghost" style={{ marginLeft: "auto" }} onClick={openCreate}>
          <PlusIcon />创办拾光活动
        </button>
      </footer>
    </div>
  );
}