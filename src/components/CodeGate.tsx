import { useEffect, useRef, useState } from "react";
import { InfoIcon, KeyRoundIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, type Room } from "@/src/api";
import { DialogShell } from "@/src/components/DialogShell";
import { Spinner } from "@/src/components/bits";
import { rememberUnlock } from "@/src/lib/visitor";
import { navigate } from "@/src/lib/router";

export function CodeGate({ onClose, onUnlocked, initial = "" }: { onClose: () => void; onUnlocked: (room: Room) => void; initial?: string }) {
  const [digits, setDigits] = useState<string[]>(() => (initial.padEnd(4, " ").slice(0, 4).split("").map(char => (char === " " ? "" : char))));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const submit = async (value: string) => {
    if (value.length !== 4 || busy) return;
    setBusy(true); setError(null);
    try {
      const room = await api.unlock(value);
      rememberUnlock(room);
      onUnlocked(room);
      toast.success(`已进入「${room.title}」`);
      onClose();
      navigate(`/r/${room.slug}`);
    } catch (caught) {
      setError(caught);
      setShake(true);
      window.setTimeout(() => setShake(false), 460);
      setDigits(["", "", "", ""]);
      window.setTimeout(() => inputs.current[0]?.focus(), 60);
    } finally { setBusy(false); }
  };

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits]; next[index] = ""; setDigits(next); return;
    }
    const next = [...digits];
    if (clean.length > 1) {
      for (let offset = 0; offset < 4 - index; offset++) next[index + offset] = clean[offset] ?? "";
      setDigits(next);
      const filled = next.join("");
      inputs.current[Math.min(3, index + clean.length)]?.focus();
      if (filled.length === 4) void submit(filled);
      return;
    }
    next[index] = clean;
    setDigits(next);
    if (index < 3) inputs.current[index + 1]?.focus();
    const filled = next.join("");
    if (filled.length === 4) void submit(filled);
  };

  return (
    <DialogShell
      onClose={onClose} size="sm" theme="mint" icon={<KeyRoundIcon />}
      title="输入 4 位房间号" description="私密口令房只对拿到口令的人开放。进入后口令会保存在这台设备上。"
      footer={<>
        <span className="g-dlg-foot-note">分享链接里带口令时会自动解锁。</span>
        <span className="g-spacer" />
        <button type="button" className="g-btn g-btn-quiet" onClick={onClose}>取消</button>
        <button type="button" className="g-btn g-btn-theme" disabled={code.length !== 4 || busy} onClick={() => void submit(code)}>
          {busy ? <Spinner /> : <LockIcon />}{busy ? "正在开门…" : "进入房间"}
        </button>
      </>}
    >
      <div className={shake ? "g-shake" : undefined}>
        <div className="g-code-inputs" role="group" aria-label="4 位房间口令">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={element => { inputs.current[index] = element; }}
              className="g-code-input"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={4}
              value={digit}
              aria-label={`口令第 ${index + 1} 位`}
              onChange={event => setDigit(index, event.target.value)}
              onKeyDown={event => {
                if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
                if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
                if (event.key === "ArrowRight" && index < 3) inputs.current[index + 1]?.focus();
                if (event.key === "Enter") void submit(code);
              }}
              onPaste={event => { event.preventDefault(); setDigit(index, event.clipboardData.getData("text")); }}
            />
          ))}
        </div>
        {error ? <p role="alert" style={{ margin: "10px 0 0", textAlign: "center", fontSize: 12.6, color: "var(--danger)" }}>{message(error)}</p> : null}
        <div className="g-code-hint">
          <InfoIcon />
          <span>只是想先看看效果？测试口令 <b style={{ fontFamily: "var(--font-display)", letterSpacing: ".12em" }}>0507</b> 对应《周末露营与挚友派对实况》。</span>
          <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => { setDigits(["0", "5", "0", "7"]); void submit("0507"); }}>一键填入</button>
        </div>
      </div>
    </DialogShell>
  );
}