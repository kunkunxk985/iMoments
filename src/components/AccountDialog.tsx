import { useRef, useState } from "react";
import { CameraIcon, CheckIcon, CopyIcon, LogInIcon, LogOutIcon, ShieldCheckIcon, SparklesIcon, UserIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { api, message, type Account } from "@/src/api";
import { DialogShell } from "@/src/components/DialogShell";
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
  const [tab, setTab] = useState<"login" | "register">("register");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(account?.display_name ?? storedNickname());
  const [avatarUrl, setAvatarUrl] = useState(account?.avatar_url ?? "preset:sunset");
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
      toast.success("自定义头像已裁剪就绪");
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
          avatar_url: avatarUrl,
          bio: bio.trim(),
          unlocked_codes: codes,
        });
        setAccountToken(res.token);
        setCachedAccount(res.account);
        onChanged(res.account);
        toast.success(`欢迎加入拾光房间！你的专属 ID：${res.account.uid}`);
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
        toast.success(`欢迎回来，${res.account.display_name}（已跨设备同步身份与选票）`);
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
      toast.success("头像与昵称已更新，所有房间与作品展示已同步");
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
    toast.success("已退出登录，当前恢复本机访客模式");
    setBusy(false);
    onClose();
  };

  const avatarPicker = (
    <div className="g-avatar-picker">
      <div className="g-avatar-preview-wrap">
        <Avatar name={displayName || handle || "拾"} src={avatarUrl} size={64} />
        <button type="button" className="g-btn g-btn-sm g-btn-quiet" onClick={() => fileRef.current?.click()}>
          <CameraIcon />上传自定义头像
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
            <Avatar name={item.label} src={key} size={34} />
          </button>
        ))}
        <button
          type="button" className="g-avatar-preset-btn"
          aria-pressed={avatarUrl === ""} title="使用昵称首字"
          onClick={() => setAvatarUrl("")}
        >
          <Avatar name={displayName || "拾"} src="" size={34} />
        </button>
      </div>
    </div>
  );

  if (account) {
    return (
      <DialogShell
        onClose={onClose} size="md" theme="amber" icon={<UserIcon />}
        title="我的拾光身份"
        description="手机与电脑登录同一个账号，即可跨设备同步唯一 ID、5 张选票、私密房口令以及全站头像与昵称。"
        footer={<>
          <button type="button" className="g-btn g-btn-ghost g-btn-danger" disabled={busy} onClick={() => void logout()}>
            <LogOutIcon />退出登录
          </button>
          <span className="g-spacer" />
          <button type="button" className="g-btn g-btn-quiet" onClick={onClose}>取消</button>
          <button type="button" className="g-btn g-btn-theme" disabled={busy || !displayName.trim()} onClick={() => void saveProfile()}>
            {busy ? <Spinner /> : <CheckIcon />}{busy ? "保存中…" : "保存资料"}
          </button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="g-profile-card">
            <Avatar name={displayName || account.display_name} src={avatarUrl} size={52} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 16 }}>{displayName || account.display_name}</b>
                <span className="g-uid-pill">@{account.handle} · {account.uid}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--site-muted)" }}>
                已创办 {stats.rooms} 个活动 · 上传 {stats.moments} 帧瞬间 · 同步 {account.unlocked_codes.length} 个私密房
              </span>
            </div>
            <button
              type="button" className="g-btn g-btn-sm g-btn-quiet"
              onClick={async () => toast[await copyText(`@${account.handle} (${account.uid})`) ? "success" : "error"]("专属身份 ID 已复制")}
            >
              <CopyIcon />复制 ID
            </button>
          </div>

          <div className="g-field">
            <span className="g-label">自定义头像<span className="g-label-hint">显示在活动卡片、照片与短评中</span></span>
            {avatarPicker}
          </div>

          <div className="g-field">
            <label className="g-label" htmlFor="prof-name">昵称<span className="g-label-hint">{displayName.trim().length}/24</span></label>
            <input id="prof-name" className="g-input" value={displayName} maxLength={24} placeholder="大家在房间里看到的名字" onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div className="g-field">
            <label className="g-label" htmlFor="prof-bio">个性签名<span className="g-label-hint">可选 · {bio.trim().length}/60</span></label>
            <input id="prof-bio" className="g-input" value={bio} maxLength={60} placeholder="例如：落日收集者 / 胶片重度爱好者" onChange={e => setBio(e.target.value)} />
          </div>

          {error ? <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--danger)" }}>{error}</p> : null}
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      onClose={onClose} size="md" theme="amber" icon={tab === "register" ? <UserPlusIcon /> : <LogInIcon />}
      title={tab === "register" ? "创建专属拾光账号" : "登录拾光账号"}
      description="一个唯一 ID 打通电脑与手机：跨设备同步头像、昵称、5 张选票与私密房，修改资料后全站作品实时同步。"
      footer={<>
        <span className="g-dlg-foot-note">不登录也可免密浏览；登录即可拥有跨设备唯一 ID。</span>
        <span className="g-spacer" />
        <button type="button" className="g-btn g-btn-ghost" onClick={onClose}>稍后再说</button>
        <button
          type="button" className="g-btn g-btn-primary g-btn-lg"
          disabled={busy || !handle.trim() || password.length < 6 || (tab === "register" && !displayName.trim())}
          onClick={() => void submitAuth()}
        >
          {busy ? <Spinner /> : tab === "register" ? <SparklesIcon /> : <LogInIcon />}
          {busy ? "处理中…" : tab === "register" ? "注册并同步身份" : "立即登录"}
        </button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <div className="g-auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "register"} onClick={() => { setTab("register"); setError(null); }}>
            <UserPlusIcon />新用户注册
          </button>
          <button type="button" role="tab" aria-selected={tab === "login"} onClick={() => { setTab("login"); setError(null); }}>
            <LogInIcon />已有账号登录
          </button>
        </div>

        {tab === "register" ? (
          <div className="g-field">
            <span className="g-label">选择或上传你的专属头像</span>
            {avatarPicker}
          </div>
        ) : null}

        <div className="g-field">
          <label className="g-label" htmlFor="auth-handle">唯一账号 ID（登录名）<span className="g-label-hint">3–20 位小写字母/数字/下划线</span></label>
          <input
            id="auth-handle" className="g-input" value={handle} maxLength={20} autoComplete="username"
            placeholder="例如：ayou_2026 或 ikun"
            onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
          />
        </div>

        {tab === "register" ? (
          <div className="g-field">
            <label className="g-label" htmlFor="auth-display">展示昵称<span className="g-label-hint">显示在活动与照片卡片上</span></label>
            <input
              id="auth-display" className="g-input" value={displayName} maxLength={24}
              placeholder="例如：阿柚"
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
        ) : null}

        <div className="g-field">
          <label className="g-label" htmlFor="auth-pass">密码<span className="g-label-hint">至少 6 位，用于跨设备登录</span></label>
          <input
            id="auth-pass" type="password" className="g-input" value={password} maxLength={64}
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            placeholder="请输入 6 位以上密码"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submitAuth(); }}
          />
        </div>

        <div className="g-ai-banner" style={{ marginTop: 2 }}>
          <ShieldCheckIcon />
          <span>密码采用 PBKDF2-SHA256 加盐加密存储；同一账号在手机和电脑登录共享同一份 5 票配额与作品归属。</span>
        </div>

        {error ? <p role="alert" style={{ margin: 0, fontSize: 12.6, color: "var(--danger)" }}>{error}</p> : null}
      </div>
    </DialogShell>
  );
}
