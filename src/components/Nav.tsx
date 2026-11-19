import { useEffect, useState } from "react";
import { ApertureIcon, KeyRoundIcon, PlusIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import type { Account } from "@/src/api";
import { navigate, setParams, type Route } from "@/src/lib/router";
import { Avatar } from "@/src/components/bits";

export function Nav({ route, account }: { route: Route; account: Account | null }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="g-nav" data-scrolled={scrolled} data-route={route.name}>
      <div className="g-wrap g-nav-in">
        <a className="g-brand" href="#/" onClick={event => { event.preventDefault(); navigate("/"); }} aria-label="iMoments 拾光房间 · 回到探索广场">
          <span className="g-brand-mark"><ApertureIcon width={17} height={17} strokeWidth={2} /></span>
          <span className="g-brand-text">
            <span className="g-brand-en" translate="no">iMoments</span>
            <span className="g-brand-cn">拾光房间</span>
          </span>
        </a>

        <div className="g-nav-actions">
          <button
            type="button"
            className={`g-btn g-btn-ghost${account ? " g-nav-user" : ""}`}
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
                <span className="g-btn-text">登录</span>
              </>
            )}
          </button>
          <button type="button" className="g-btn g-btn-quiet" onClick={() => setParams({ gate: "1" })} title="输入 4 位房间号进入私密房">
            <KeyRoundIcon /><span className="g-btn-text">口令进房</span>
          </button>
          <button
            type="button"
            className="g-btn g-btn-primary"
            onClick={() => {
              if (!account) {
                toast("请先注册或登录拾光账号后再创办活动");
                setParams({ account: "1" });
                return;
              }
              setParams({ create: "1" });
            }}
          >
            <PlusIcon /><span className="g-btn-text">创办活动</span>
          </button>
        </div>
      </div>
    </header>
  );
}
