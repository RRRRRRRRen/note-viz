import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PALETTE } from "./palette";

/** 聚合页页头：eyebrow + 图标 + 标题 + 元信息行（分类页/标签页共用；首页是 hero 形态不套用） */
export function PageHeader(props: {
  eyebrow: string;
  title: ReactNode;
  icon?: LucideIcon;
  color?: string;
  meta?: ReactNode;
}) {
  const color = props.color ?? PALETTE.blue;
  const Icon = props.icon;
  return (
    <header className="mb-6">
      <p className="eyebrow">{props.eyebrow}</p>
      <h1 className="flex items-center gap-3 text-3xl leading-tight font-semibold">
        {Icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <Icon size={18} />
          </span>
        )}
        {props.title}
      </h1>
      {props.meta && <p className="mt-2 text-[13px] text-muted">{props.meta}</p>}
    </header>
  );
}
