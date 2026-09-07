import { AlertOctagon, AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { PALETTE } from "../palette";

export type CalloutKind = "info" | "tip" | "warning" | "danger";

const KIND: Record<CalloutKind, { icon: typeof Info; color: string; label: string }> = {
  info: { icon: Info, color: PALETTE.blue, label: "提示" },
  tip: { icon: Lightbulb, color: PALETTE.green, label: "技巧" },
  warning: { icon: AlertTriangle, color: PALETTE.orange, label: "注意" },
  danger: { icon: AlertOctagon, color: PALETTE.red, label: "危险" },
};

/** 四态提示框：正文里的"提示 / 技巧 / 注意 / 危险"类语义块（轻语义块，不计入可视化密度） */
export function Callout(props: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const kind = props.kind ?? "info";
  const { icon: Icon, color, label } = KIND[kind];
  return (
    <aside
      className="my-4 rounded-lg border border-border border-l-4 bg-surface/60 px-4 py-3"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color }}>
        <Icon size={14} />
        {props.title ?? label}
      </div>
      <div className="mt-1.5 text-sm leading-relaxed">{props.children}</div>
    </aside>
  );
}
