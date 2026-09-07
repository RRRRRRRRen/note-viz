import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PALETTE } from "../palette";
import { VizBlock } from "@/components/viz";
import { DemoButton, ResetButton } from "./LogPanel";

export interface StepThroughStep {
  title: string;
  /** 该步的解说 */
  desc?: string;
  /** 该步的状态快照（自定义 JSX，如队列变化、调用栈图） */
  render?: ReactNode;
  color?: string;
}

/** 步进推演器：动态过程逐步推进 + 每步解说（事件循环单轮 / 递归展开 / 请求生命周期等） */
export function StepThrough(props: {
  label?: string;
  steps: StepThroughStep[];
  /** 自动播放间隔（毫秒），提供时显示播放/暂停按钮 */
  autoMs?: number;
  /** 内容区最小高度（px），减少步骤切换时布局跳动 */
  height?: number;
}) {
  const total = props.steps.length;
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || !props.autoMs) return;
    if (cur >= total - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCur(cur + 1), props.autoMs);
    return () => clearTimeout(timer);
  }, [playing, cur, total, props.autoMs]);

  const step = props.steps[cur];
  if (!step) return null;
  const color = step.color ?? PALETTE.blue;

  return (
    <VizBlock label={props.label ?? "步进推演 / step through"}>
      {/* 步骤圆点：可点击跳转 */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {props.steps.map((s, i) => {
          const c = s.color ?? PALETTE.blue;
          const active = i === cur;
          const done = i < cur;
          return (
            <button
              key={`${s.title}-${i}`}
              type="button"
              onClick={() => {
                setCur(i);
                setPlaying(false);
              }}
              aria-label={`第 ${i + 1} 步：${s.title}`}
              aria-current={active ? "step" : undefined}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-colors"
              style={{
                borderColor: active || done ? c : "var(--border)",
                backgroundColor: active ? c : done ? `${c}1a` : "transparent",
                color: active ? "#fff" : done ? c : "var(--muted)",
              }}
            >
              {i + 1}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-muted">
          {cur + 1} / {total}
        </span>
      </div>

      {/* 当前步内容 */}
      <div className="min-w-0" style={{ minHeight: props.height ?? 88 }}>
        <div className="text-sm font-semibold" style={{ color }}>
          {step.title}
        </div>
        {step.desc && <p className="mt-1 text-xs leading-relaxed text-muted">{step.desc}</p>}
        {step.render && <div className="mt-3">{step.render}</div>}
      </div>

      {/* 控制条 */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        <DemoButton
          variant="outline"
          disabled={cur === 0}
          onClick={() => {
            setPlaying(false);
            setCur(Math.max(0, cur - 1));
          }}
        >
          <ChevronLeft size={13} />
          上一步
        </DemoButton>
        <DemoButton
          disabled={cur >= total - 1}
          onClick={() => {
            setPlaying(false);
            setCur(Math.min(total - 1, cur + 1));
          }}
        >
          下一步
          <ChevronRight size={13} />
        </DemoButton>
        {props.autoMs ? (
          <DemoButton variant={playing ? "danger" : "primary"} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? "暂停" : "自动播放"}
          </DemoButton>
        ) : null}
        <ResetButton
          onClick={() => {
            setPlaying(false);
            setCur(0);
          }}
        />
      </div>
    </VizBlock>
  );
}
