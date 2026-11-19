import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { api, type Account } from "@/src/api";
import { useRoute, setParams } from "@/src/lib/router";
import { cachedAccount, clearAccountToken, setCachedAccount } from "@/src/lib/visitor";
import { themeClass, plazaThemeFor, type ThemeId } from "@/src/theme";
import { Nav } from "@/src/components/Nav";
import { Plaza } from "@/src/components/Plaza";
import { Room } from "@/src/components/Room";
import { CreateRoom } from "@/src/components/CreateRoom";
import { CodeGate } from "@/src/components/CodeGate";
import { CreditsDialog } from "@/src/components/CreditsDialog";
import { AccountDialog } from "@/src/components/AccountDialog";

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

  return (
    <div className={`g-shell ${themeClass(route.name === "room" ? theme : plazaTheme)}`}>
      <div className="g-bg" aria-hidden="true" />
      <Nav route={route} account={account} />
      <main className="g-main">
        {route.name === "room" && route.slug
          ? <Room slug={route.slug} route={route} version={version} onTheme={onTheme} />
          : <Plaza route={route} version={version} />}
      </main>

      {route.params.get("create") === "1" ? <CreateRoom onClose={() => setParams({ create: null })} onCreated={bump} /> : null}
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
