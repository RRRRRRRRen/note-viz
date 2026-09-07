import { Fragment } from "react";
import { Kbd } from "@/components/note";
import { VizBlock } from "./core";

/** 快捷键速查表：按键组合（内部用 Kbd 渲染）+ 说明 */
export function ShortcutTable(props: { label?: string; rows: { keys: string[]; desc: string }[] }) {
  return (
    <VizBlock label={props.label ?? "快捷键 / shortcuts"}>
      <table className="w-full text-xs">
        <tbody>
          {props.rows.map((row, ri) => (
            <tr key={`${row.desc}-${ri}`} className="border-b border-border last:border-0">
              <td className="w-2/5 py-2 pr-3 align-top whitespace-nowrap">
                {row.keys.map((k, i) => (
                  <Fragment key={`${row.desc}-${k}-${i}`}>
                    {i > 0 && <span className="mx-1 text-muted">+</span>}
                    <Kbd>{k}</Kbd>
                  </Fragment>
                ))}
              </td>
              <td className="py-2 align-top text-muted">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </VizBlock>
  );
}
