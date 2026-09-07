import { PALETTE } from "../palette";
import { VizBlock } from "./core";

export interface MemField {
  name: string;
  /** 字面值（如 "0"、"[1,2,3]"、"<native code>"） */
  value?: string;
  /** 引用指向同图内另一个对象的 id，渲染为与目标同色的 chip */
  refTo?: string;
  color?: string;
}

export interface MemObject {
  id: string;
  label: string;
  /** 所属 region id */
  region: string;
  fields?: MemField[];
  color?: string;
  /** GC 不可达：虚线边框 + 降透明度 */
  unreachable?: boolean;
}

export interface MemRegion {
  id: string;
  title: string;
  desc?: string;
  /** column = 纵向堆叠（调用栈帧）；wrap = 自由换行（堆对象） */
  layout?: "column" | "wrap";
  color?: string;
}

/**
 * 内存布局图：栈/堆区域 + 对象框 + 引用指向。
 * 引用以彩色 chip 表示指向（与目标对象同色，悬停显示目标名），
 * 不画跨区箭头——保证响应式布局下不脆断。
 */
export function MemoryMap(props: {
  label?: string;
  regions: MemRegion[];
  objects: MemObject[];
  /** 底部补充说明（如「灰色虚线对象不可达，可被 GC 回收」） */
  note?: string;
}) {
  const objectById = new Map(props.objects.map((o) => [o.id, o] as const));
  return (
    <VizBlock label={props.label ?? "内存布局 / memory"}>
      <div className={`grid gap-3 ${props.regions.length > 1 ? "md:grid-cols-2" : ""}`}>
        {props.regions.map((region) => {
          const color = region.color ?? PALETTE.orange;
          const items = props.objects.filter((o) => o.region === region.id);
          return (
            <div key={region.id} className="rounded-lg border border-dashed border-border p-3">
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold" style={{ color }}>
                  {region.title}
                </span>
                {region.desc && <span className="text-[10px] text-muted">{region.desc}</span>}
              </div>
              <div
                className={
                  region.layout === "column" ? "flex flex-col gap-1.5" : "flex flex-wrap gap-1.5"
                }
              >
                {items.map((obj) => (
                  <MemObjectCard key={obj.id} obj={obj} objectById={objectById} />
                ))}
              </div>
              {items.length === 0 && <p className="text-[11px] text-muted">（空）</p>}
            </div>
          );
        })}
      </div>
      {props.note && (
        <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-muted">
          {props.note}
        </p>
      )}
    </VizBlock>
  );
}

function MemObjectCard({
  obj,
  objectById,
}: {
  obj: MemObject;
  objectById: Map<string, MemObject>;
}) {
  const color = obj.color ?? PALETTE.blue;
  return (
    <div
      className={`min-w-36 rounded-md border bg-background px-2.5 py-1.5 ${
        obj.unreachable ? "border-dashed opacity-50" : ""
      }`}
      style={{ borderColor: `${color}55` }}
    >
      <div className="font-mono text-[11px] font-bold" style={{ color }}>
        {obj.label}
      </div>
      {obj.fields && obj.fields.length > 0 && (
        <dl className="mt-1 space-y-0.5">
          {obj.fields.map((f) => {
            const target = f.refTo ? objectById.get(f.refTo) : undefined;
            const refColor = f.color ?? target?.color ?? PALETTE.purple;
            return (
              <div key={f.name} className="flex items-center gap-1.5 text-[11px] leading-tight">
                <dt className="shrink-0 font-mono text-muted">{f.name}:</dt>
                <dd className="min-w-0">
                  {f.refTo ? (
                    <span
                      className="inline-block max-w-full truncate rounded border px-1 font-mono text-[10px]"
                      style={{
                        borderColor: `${refColor}66`,
                        backgroundColor: `${refColor}0f`,
                        color: refColor,
                      }}
                      title={target ? `引用 → ${target.label}` : `引用 → ${f.refTo}`}
                    >
                      → {target?.label ?? f.refTo}
                    </span>
                  ) : (
                    <span className="font-mono text-foreground">{f.value}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
