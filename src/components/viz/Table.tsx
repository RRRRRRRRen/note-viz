import type { ReactNode } from "react";
import { VizBlock } from "./core";

/** 数据驱动的统一样式表格：API 参考 / 配置项 / 多对象属性明细 */
export function Table(props: { label?: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <VizBlock label={props.label ?? "明细 / table"}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {props.head.map((h) => (
                <th
                  key={h}
                  className="border-b border-border bg-surface px-3 py-2 text-left font-semibold whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 align-top text-muted first:text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VizBlock>
  );
}
