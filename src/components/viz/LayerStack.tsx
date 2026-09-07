import { motion } from "framer-motion";
import { PALETTE } from "../palette";
import { VizBlock } from "./core";

export interface LayerStackLayer {
  name: string;
  desc?: string;
  color?: string;
  /** 强调当前讲解的层（边框加粗 + 底色加深） */
  emphasis?: boolean;
}

/** 层级堆叠图：自上而下的分层结构（调用栈 / 渲染管线 / 协议栈 / 缓存层级） */
export function LayerStack(props: {
  label?: string;
  /** 图内说明行（如「自上而下依次执行」） */
  title?: string;
  layers: LayerStackLayer[];
  /** 渲染方向：top-down = layers[0] 在最上（默认）；bottom-up = layers[0] 在最下 */
  direction?: "top-down" | "bottom-up";
}) {
  return (
    <VizBlock label={props.label ?? "层级图 / layers"}>
      {props.title && (
        <div className="mb-3 text-[10px] tracking-[0.08em] text-muted meta-mono">{props.title}</div>
      )}
      <div
        className={`flex gap-1.5 ${props.direction === "bottom-up" ? "flex-col-reverse" : "flex-col"}`}
      >
        {props.layers.map((layer, i) => {
          const color = layer.color ?? PALETTE.blue;
          return (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, y: -6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="rounded-lg border px-3.5 py-2.5"
              style={{
                borderColor: layer.emphasis ? color : `${color}44`,
                borderWidth: layer.emphasis ? 2 : 1,
                backgroundColor: `${color}${layer.emphasis ? "1f" : "0d"}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold" style={{ color }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={layer.emphasis ? { color } : undefined}
                >
                  {layer.name}
                </span>
              </div>
              {layer.desc && (
                <p className="mt-1 text-xs leading-relaxed text-muted">{layer.desc}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </VizBlock>
  );
}
