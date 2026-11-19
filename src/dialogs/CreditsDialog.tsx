import { ExternalLinkIcon, ImageIcon } from "lucide-react";
import { CREDITS } from "@/src/config/credits";
import { DialogShell } from "@/src/dialogs/DialogShell";

export function CreditsDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell
      onClose={onClose} size="md" theme="geek" icon={<ImageIcon />}
      title="示例摄影作品来源" description="样板房间里的 26 张照片为预置示例内容，按原始许可保留署名与来源链接。"
      footer={<><span className="g-dlg-foot-note">你上传的作品版权归你自己所有，站点只按你的展示意图公开。</span><span className="g-spacer" /><button type="button" className="g-btn g-btn-quiet" onClick={onClose}>知道了</button></>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CREDITS.map(credit => (
          <div key={credit.key} style={{ display: "grid", gridTemplateColumns: "74px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "8px 10px", borderRadius: "calc(var(--site-radius) - 4px)", border: "1px solid var(--site-border)", background: "color-mix(in oklab, var(--site-fg) 2%, var(--site-surface))" }}>
            <img src={`/seed/thumb/${credit.key}.jpg`} alt={credit.label} loading="lazy" style={{ width: 74, height: 54, objectFit: "cover", borderRadius: 8, display: "block" }} />
            <div style={{ minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 13 }}>{credit.label}</b>
              <span style={{ fontSize: 11.6, color: "var(--site-muted)" }}>{credit.author} · {credit.license}</span>
            </div>
            <a className="g-btn g-btn-sm g-btn-quiet" href={credit.source} target="_blank" rel="noreferrer noopener">来源<ExternalLinkIcon /></a>
          </div>
        ))}
      </div>
    </DialogShell>
  );
}