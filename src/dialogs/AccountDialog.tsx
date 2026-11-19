import { useRef, useState } from "react";
import { CameraIcon, CheckIcon, CopyIcon, LogInIcon, LogOutIcon, UserIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, type Account } from "@/src/api";
import { DialogShell } from "@/src/dialogs/DialogShell";
import { AVATAR_PRESETS, Avatar, Spinner } from "@/src/components/bits";
import { clearAccountToken, nickname as storedNickname, setAccountToken, setCachedAccount, unlockedRooms } from "@/src/lib/visitor";
import { copyText } from "@/src/lib/copy";

async function cropAvatarFile(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("请上传 JPEG、PNG 或 WebP 格式的头像图片");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("无法读取这张图片"));
      el.src = url;
    });
    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器不支持头像裁剪");
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length > 52000) return canvas.toDataURL("image/jpeg", 0.65);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AccountDialog({
  account, stats, onClose, onChanged,
}: {
  account: Account | null;
  stats: { rooms: number; moments: number };
  onClose: () => void;
  onChanged: (next: Account | null) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(account?.display_name ?? storedNickname());
  const [avatarUrl, setAvatarUrl] = useState(account?.avatar_url ?? "");
  const [bio, setBio] = useState(account?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await cropAvatarFile(file);
      setAvatarUrl(dataUrl);
      toast.success("头像已就绪");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "头像处理失败");
    }
  };

  const submitAuth = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    const codes = unlockedRooms().map(r => r.code);
    try {
      if (tab === "register") {
        const res = await api.register({
          handle: handle.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          avatar_url: "",
          bio: "",
          unlocked_codes: codes,
        });
        setAccountToken(res.token);
        setCachedAccount(res.account);
        onChanged(res.account);
        toast.success(`欢迎加入，${res.account.display_name}`);
        onClose();
      } else {
        const res = await api.login({
          handle: handle.trim().toLowerCase(),
          password,
          unlocked_codes: codes,
        });
        setAccountToken(res.token);
        setCachedAccount(res.account);
        onChanged(res.account);
        toast.success(`欢迎回来，${res.account.display_name}`);
        onClose();
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!account || busy || !displayName.trim()) return;
    setBusy(true); setError(null);
    try {
      const updated = await api.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
      });
      setCachedAccount(updated);
      onChanged(updated);
      toast.success("资料已更新");
      onClose();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try { await api.logout(); } catch { /* ignore */ }
    clearAccountToken();
    onChanged(null);
    toast.success("已退出登录，当前为游客只读模式");
    setBusy(false);
    onClose();
  };

  if (account) {
    return (
      <DialogShell
        onClose={onClose} size="md" theme="amber" icon={<UserIcon />}
        title="我的账号"
        description="修改昵称与头像后，所有作品与短评同步更新。"
        footer={<>
          <button type="button" className="g-btn g-btn-ghost g-btn-danger" disabled={busy} onClick={() => void logout()}>
            <LogOutIcon />退出登录
          </button>
          <span className="g-spacer" />
          <button type="button" className="g-btn g-btn-quiet" onClick={onClose}>取消</button>
          <button type="button" className="g-btn g-btn-primary" disabled={busy || !displayName.trim()} onClick={() => void saveProfile()}>
            {busy ? <Spinner /> : <CheckIcon />}{busy ? "保存中…" : "保存"}
          </button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="g-profile-card">
            <Avatar name={displayName || account.display_name} src={avatarUrl} size={48} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 15.5 }}>{displayName || account.display_name}</b>
                <span className="g-uid-pill">@{account.handle}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--site-muted)" }}>
                {stats.rooms} 个活动 · {stats.moments} 幅作品
              </span>
            </div>
            <button
              type="button" className="g-btn g-btn-sm g-btn-quiet"
              onClick={async () => toast[await copyText(`@${account.handle}`) ? "success" : "error"]("账号已复制")}
            >
              <CopyIcon />复制
            </button>
          </div>

          <div className="g-field">
            <span className="g-label">头像</span>
            <div className="g-avatar-picker">
              <div className="g-avatar-preview-wrap">
                <Avatar name={displayName || handle || "拾"} src={avatarUrl} size={56} />
                <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => fileRef.current?.click()}>
                  <CameraIcon />上传头像
                </button>
                <input
                  ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="g-sr"
                  onChange={e => { void pickAvatar(e.target.files?.[0]); e.target.value = ""; }}
                />
              </div>
              <div className="g-avatar-presets">
                {Object.entries(AVATAR_PRESETS).map(([key, item]) => (
                  <button
                    key={key} type="button" className="g-avatar-preset-btn"
                    aria-pressed={avatarUrl === key} title={item.label}
                    onClick={() => setAvatarUrl(key)}
                  >
                    <Avatar name={item.label} src={key} size={32} />
                  </button>
                ))}
                <button
                  type="button" className="g-avatar-preset-btn"
                  aria-pressed={avatarUrl === ""} title="使用昵称首字"
                  onClick={() => setAvatarUrl("")}
                >
                  <Avatar name={displayName || "拾"} src="" size={32} />
                </button>
              </div>
            </div>
          </div>

          <div className="g-field">
            <label className="g-label" htmlFor="prof-name">昵称<span className="g-label-hint">{displayName.trim().length}/24</span></label>
            <input id="prof-name" className="g-input" value={displayName} maxLength={24} placeholder="在画廊中展示的名字" onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div className="g-field">
            <label className="g-label" htmlFor="prof-bio">简介<span className="g-label-hint">可选 · {bio.trim().length}/60</span></label>
            <input id="prof-bio" className="g-input" value={bio} maxLength={60} placeholder="一句话介绍自己" onChange={e => setBio(e.target.value)} />
          </div>

          {error ? <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--danger)" }}>{error}</p> : null}
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      onClose={onClose} size="sm" theme="amber" icon={tab === "register" ? <UserPlusIcon /> : <LogInIcon />}
      title={tab === "register" ? "注册账号" : "登录"}
      description="登录后可创办活动、上传作品与互动。"
      footer={<>
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>取消</button>
        <span className="g-spacer" />
        <button
          type="button" className="g-btn g-btn-primary"
          disabled={busy || !handle.trim() || password.length < 6 || (tab === "register" && !displayName.trim())}
          onClick={() => void submitAuth()}
        >
          {busy ? <Spinner /> : null}
          {busy ? "请稍候…" : tab === "register" ? "注册" : "登录"}
        </button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="g-auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "login"} onClick={() => { setTab("login"); setError(null); }}>
            登录
          </button>
          <button type="button" role="tab" aria-selected={tab === "register"} onClick={() => { setTab("register"); setError(null); }}>
            注册
          </button>
        </div>

        <div className="g-field">
          <label className="g-label" htmlFor="auth-handle">账号</label>
          <input
            id="auth-handle" className="g-input" value={handle} maxLength={20} autoComplete="username" spellCheck={false}
            placeholder="字母、数字或下划线（3–20 位）"
            onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
          />
        </div>

        {tab === "register" ? (
          <div className="g-field">
            <label className="g-label" htmlFor="auth-display">昵称</label>
            <input
              id="auth-display" className="g-input" value={displayName} maxLength={24}
              placeholder="在画廊中展示的名字"
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
        ) : null}

        <div className="g-field">
          <label className="g-label" htmlFor="auth-pass">密码</label>
          <input
            id="auth-pass" type="password" className="g-input" value={password} maxLength={64}
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            placeholder="至少 6 位密码"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submitAuth(); }}
          />
        </div>

        {error ? <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--danger)" }}>{error}</p> : null}
      </div>
    </DialogShell>
  );
}
