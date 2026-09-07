import { PALETTE } from "../palette";
import { VizBlock } from "./core";

/** 版本行为差异块：同一机制在不同版本/环境下的表现（废弃/移除项用红色 #f85149） */
export function VersionNote(props: {
  label?: string;
  /** 底部补充说明 */
  note?: string;
  versions: { range: string; text: string; color?: string }[];
}) {
  return (
    <VizBlock label={props.label ?? "版本差异 / versions"}>
      <ol className="space-y-2.5">
        {props.versions.map((v) => {
          const color = v.color ?? PALETTE.blue;
          return (
            <li key={v.range} className="flex gap-3">
              <span
                className="h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {v.range}
              </span>
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted">{v.text}</span>
            </li>
          );
        })}
      </ol>
      {props.note && (
        <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted">
          {props.note}
        </p>
      )}
    </VizBlock>
  );
}
