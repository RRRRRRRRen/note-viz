import { VizBlock } from "@/components/viz";

export interface DiffLine {
  type: "add" | "del" | "keep";
  code: string;
}

/** 代码增删对照：GitHub diff 风格行底色 + 前缀（展示一次改动/修复的前后差异） */
export function DiffBlock(props: { label?: string; caption?: string; lines: DiffLine[] }) {
  return (
    <VizBlock label={props.label ?? "改动对照 / diff"}>
      {props.caption && (
        <div className="mb-2 text-[10px] tracking-[0.08em] text-muted meta-mono">
          {props.caption}
        </div>
      )}
      <pre className="overflow-x-auto rounded-md bg-[#0d1117] p-0 font-mono text-[12px] leading-relaxed text-[#e6edf3]">
        {props.lines.map((l, i) => {
          const add = l.type === "add";
          const del = l.type === "del";
          return (
            <div
              key={i}
              className={`flex gap-2 px-3 ${add ? "bg-[#3fb9501f]" : del ? "bg-[#f851491f]" : ""}`}
            >
              <span
                className={`w-3 shrink-0 select-none ${
                  add ? "text-[#3fb950]" : del ? "text-[#f85149]" : "text-[#484f58]"
                }`}
              >
                {add ? "+" : del ? "−" : " "}
              </span>
              <span className="whitespace-pre">{l.code === "" ? " " : l.code}</span>
            </div>
          );
        })}
      </pre>
    </VizBlock>
  );
}
