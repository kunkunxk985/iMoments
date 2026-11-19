import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { themeClass } from "@/src/theme";

export function DialogShell({
  onClose, title, description, children, footer, size = "md", theme = "amber", icon,
}: {
  onClose: () => void; title: string; description: string; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg"; theme?: string; icon?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="g-dlg-overlay" />
        <DialogPrimitive.Content className={`g-dlg g-dlg-${size} ${themeClass(theme)}`}>
          <div className="g-dlg-head">
            {icon ? <span className="g-empty-mark" style={{ width: 40, height: 40, borderRadius: 12 }}>{icon}</span> : null}
            <div style={{ minWidth: 0 }}>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
            </div>
            <button type="button" className="g-btn g-btn-icon g-btn-ghost g-dlg-close" onClick={onClose} aria-label="关闭弹窗"><XIcon /></button>
          </div>
          <div className="g-dlg-body">{children}</div>
          {footer ? <div className="g-dlg-foot">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
