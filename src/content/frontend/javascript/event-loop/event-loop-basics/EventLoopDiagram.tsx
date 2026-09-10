import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCw } from "lucide-react";
import { VizBlock } from "@/components/viz";

const C = { stack: "#f59e0b", micro: "#8b5cf6", macro: "#3b82f6", render: "#3fb950" };

function Box(props: {
  step: number;
  title: string;
  color: string;
  lines: string[];
  loop?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col justify-center gap-1.5 rounded-lg border p-3"
      style={{ borderColor: `${props.color}88`, backgroundColor: `${props.color}12` }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white"
          style={{ backgroundColor: props.color }}
        >
          {props.step}
        </span>
        <span className="text-sm font-semibold" style={{ color: props.color }}>
          {props.title}
        </span>
      </div>
      {props.lines.map((l) => (
        <div key={l} className="pl-6.5 text-[11px] leading-snug text-muted">
          {l}
        </div>
      ))}
      {props.loop && (
        <div
          className="mt-0.5 flex items-center gap-1 border-t pt-1.5 text-[10px] font-medium"
          style={{ color: props.color, borderColor: `${props.color}44` }}
        >
          <RotateCw size={11} className="shrink-0" />
          <span>{props.loop}</span>
        </div>
      )}
    </motion.div>
  );
}

function HArrow(props: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2">
      <span className="whitespace-nowrap text-[10px] leading-none text-muted">{props.label}</span>
      <ArrowRight size={15} className="text-muted" />
    </div>
  );
}

function VLabel(props: { main: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      <ArrowDown size={15} className="text-muted" />
      <span className="text-center text-[10px] leading-tight text-muted">{props.main}</span>
      {props.sub && (
        <span className="text-center text-[10px] leading-tight text-muted">{props.sub}</span>
      )}
    </div>
  );
}

/** 事件循环全景图：调用栈 + 双队列容器 + 渲染检查，按顺时针环读一轮 */
export default function EventLoopDiagram() {
  return (
    <VizBlock label="事件循环全景 / event loop" color="#1677ff">
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-[600px] items-stretch"
          style={{ gridTemplateColumns: "1fr auto 1fr auto 1fr" }}
        >
          {/* 第一行：宏任务队列 → 调用栈 → 微任务队列 */}
          <div style={{ gridArea: "1 / 1 / 2 / 2" }}>
            <Box
              step={1}
              title="宏任务队列"
              color={C.macro}
              lines={["每轮只取 1 个", "执行完回去清微任务"]}
            />
          </div>
          <div style={{ gridArea: "1 / 2 / 2 / 3" }} className="flex items-center">
            <HArrow label="取 1 个" />
          </div>
          <div style={{ gridArea: "1 / 3 / 2 / 4" }}>
            <Box
              step={2}
              title="调用栈"
              color={C.stack}
              lines={["同步代码在这里跑", "栈清空 = 推进信号"]}
            />
          </div>
          <div style={{ gridArea: "1 / 4 / 2 / 5" }} className="flex items-center">
            <HArrow label="产生微任务" />
          </div>
          <div style={{ gridArea: "1 / 5 / 2 / 6" }}>
            <Box
              step={3}
              title="微任务队列"
              color={C.micro}
              lines={["栈清空后整体清空"]}
              loop="执行中新增的仍在本轮插队"
            />
          </div>

          {/* 第二行：微任务清空后下行到渲染 */}
          <div style={{ gridArea: "2 / 5 / 3 / 6" }}>
            <VLabel main="队列已空" />
          </div>

          {/* 第三行：渲染检查（横跨右三列），回边沿左缘回到宏任务队列 */}
          <div style={{ gridArea: "3 / 1 / 4 / 2" }}>
            <div className="flex flex-col items-center gap-0.5 py-1.5">
              <ArrowUp size={15} className="text-muted" />
              <span className="text-[10px] leading-tight text-muted">下一轮</span>
            </div>
          </div>
          <div style={{ gridArea: "3 / 2 / 4 / 3" }} className="flex items-center justify-center">
            <ArrowLeft size={15} className="text-muted" />
          </div>
          <div style={{ gridArea: "3 / 3 / 4 / 6" }}>
            <Box
              step={4}
              title="渲染检查"
              color={C.render}
              lines={["每轮都检查，是否绘制由浏览器定", "requestAnimationFrame 回调在这里执行"]}
            />
          </div>
        </div>
      </div>
    </VizBlock>
  );
}
