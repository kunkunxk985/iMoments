import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/src/components/Toaster";
import { api, type Account } from "@/src/api";
import { useRoute, setParams } from "@/src/lib/router";
import { cachedAccount, clearAccountToken, setCachedAccount } from "@/src/lib/visitor";
import { themeClass, plazaThemeFor, type ThemeId } from "@/src/config/theme";
import { Nav } from "@/src/components/Nav";
import { Plaza } from "@/src/pages/Plaza";
import { Room } from "@/src/pages/Room";
import { CreateRoom } from "@/src/dialogs/CreateRoom";
import { CodeGate } from "@/src/dialogs/CodeGate";
import { CreditsDialog } from "@/src/dialogs/CreditsDialog";
import { AccountDialog } from "@/src/dialogs/AccountDialog";

export default function App() {
  const route = useRoute();
  const [theme, setTheme] = useState<ThemeId>("amber");
  const [plazaTheme, setPlazaTheme] = useState<ThemeId>(() => plazaThemeFor(new Date().getHours()));
  const [version, setVersion] = useState(0);
  const [account, setAccount] = useState<Account | null>(() => cachedAccount());
  const [accountStats, setAccountStats] = useState<{ rooms: number; moments: number }>({ rooms: 0, moments: 0 });
  const onTheme = useCallback((next: ThemeId) => setTheme(next), []);
  const bump = useCallback(() => setVersion(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void api.me(controller.signal).then(res => {
      if (res.account) {
        setAccount(res.account);
        setCachedAccount(res.account);
      } else if (cachedAccount()) {
        clearAccountToken();
        setAccount(null);
      }
      setAccountStats(res.stats);
    }).catch(() => { /* keep cached state on transient offline */ });
    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    if (route.name !== "plaza") return;
    const sync = () => setPlazaTheme(plazaThemeFor(new Date().getHours()));
    sync();
    const timer = window.setInterval(sync, 60_000);
    return () => window.clearInterval(timer);
  }, [route.name]);

  useEffect(() => {
    if (route.name === "plaza") document.title = "iMoments · 拾光房间 — 主题瞬间共创与互动打榜";
  }, [route.name]);

  useEffect(() => {
    if (route.params.get("create") === "1" && !account) {
      toast("请先注册或登录拾光账号后再创办活动");
      setParams({ create: null, account: "1" });
    }
  }, [route.params, account]);

  return (
    <div className={`g-shell ${themeClass(route.name === "room" ? theme : plazaTheme)}`}>
      <div className="g-bg" aria-hidden="true" />
      <Nav route={route} account={account} />
      <main className="g-main">
        {route.name === "room" && route.slug
          ? <Room slug={route.slug} route={route} version={version} account={account} onTheme={onTheme} />
          : <Plaza route={route} version={version} account={account} />}
      </main>

      {route.params.get("create") === "1" && account ? <CreateRoom account={account} onClose={() => setParams({ create: null })} onCreated={bump} /> : null}
      {route.params.get("gate") === "1" ? <CodeGate onClose={() => setParams({ gate: null })} onUnlocked={bump} /> : null}
      {route.params.get("credits") === "1" ? <CreditsDialog onClose={() => setParams({ credits: null })} /> : null}
      {route.params.get("account") === "1" ? (
        <AccountDialog
          account={account}
          stats={accountStats}
          onClose={() => setParams({ account: null })}
          onChanged={next => { setAccount(next); bump(); }}
        />
      ) : null}

      <Toaster position="top-center" offset={80} closeButton richColors />
    </div>
  );
}
