import { useEffect, useState } from "react";
import { ApertureIcon, KeyRoundIcon, PlusIcon, UserIcon } from "lucide-react";
import type { Account } from "@/src/api";
import { MODES, MODE_IDS } from "@/src/theme";
import { navigate, setParams, type Route } from "@/src/lib/router";
import { Avatar, clockText, lightPhrase, useNow } from "@/src/components/bits";

export function Nav({ route, account }: { route: Route; account: Account | null }) {
  const [scrolled, setScrolled] = useState(false);
  const now = useNow(20_000);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const active = route.name === "plaza" ? route.params.get("mode") ?? "all" : null;

  return (
    <header className="g-nav" data-scrolled={scrolled}>
      <div className="g-wrap g-nav-in">
        <a className="g-brand" href="#/" onClick={event => { event.preventDefault(); navigate("/"); }} aria-label="iMoments 拾光房间 · 回到探索广场">
          <span className="g-brand-mark"><ApertureIcon width={19} height={19} color="#fff8ec" strokeWidth={2.1} /></span>
          <span className="g-brand-text">
            <span className="g-brand-en">iMoments</span>
            <span className="g-brand-cn">拾光房间</span>
          </span>
        </a>

        <nav className="g-nav-filters" aria-label="公开房间分类筛选">
          <button type="button" className="g-chip" aria-pressed={active === "all"} onClick={() => navigate("/", {})}>全部房间</button>
          {MODE_IDS.map(id => (
            <button key={id} type="button" className="g-chip" aria-pressed={active === id} onClick={() => navigate("/", { mode: id })}>
              {MODES[id].name}
            </button>
          ))}
        </nav>

        <span className="g-clock" title={lightPhrase(now.getHours())}>此刻 {clockText(now)}</span>

        <div className="g-nav-actions">
          <button
            type="button"
            className={`g-btn g-btn-quiet${account ? " g-nav-user" : ""}`}
            onClick={() => setParams({ account: "1" })}
            title={account ? `我的拾光身份：${account.display_name} (@${account.handle})` : "注册或登录拾光账号，跨设备同步唯一 ID、头像与选票"}
          >
            {account ? (
              <>
                <Avatar name={account.display_name} src={account.avatar_url} size={22} />
                <span className="g-btn-text">{account.display_name}</span>
              </>
            ) : (
              <>
                <UserIcon />
                <span className="g-btn-text">登录 / 账号</span>
              </>
            )}
          </button>
          <button type="button" className="g-btn g-btn-quiet" onClick={() => setParams({ gate: "1" })} title="输入 4 位房间号进入私密房">
            <KeyRoundIcon /><span className="g-btn-text">口令进房</span>
          </button>
          <button type="button" className="g-btn g-btn-primary" onClick={() => setParams({ create: "1" })}>
            <PlusIcon /><span className="g-btn-text">创办拾光活动</span>
          </button>
        </div>
      </div>
    </header>
  );
}
