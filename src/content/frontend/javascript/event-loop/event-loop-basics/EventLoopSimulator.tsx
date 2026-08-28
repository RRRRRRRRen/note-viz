import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TaskKind = "macro" | "micro";

interface Task {
  id: number;
  label: string;
  kind: TaskKind;
}

interface Step {
  running: string | null;
  callStack: string[];
  macros: Task[];
  micros: Task[];
  console: string[];
  phase: "idle" | "run-task" | "drain-micro" | "tick";
}

const SCENARIOS: Record<string, { macros: Task[]; micros: Task[]; steps: SimStep[] }> = {
  demo: {
    macros: [
      { id: 1, label: "setTimeout A", kind: "macro" },
      { id: 2, label: "setTimeout B", kind: "macro" },
    ],
    micros: [{ id: 3, label: "Promise.then A", kind: "micro" }],
    steps: [
      { log: "脚本开始：同步代码入栈" },
      { callStack: ["main()"], running: "同步代码 console.log(1)" },
      { log: "1" },
      { running: "同步代码 new Promise(executor)" },
      {
        log: "executor 同步执行 → 微任务 then 入队",
        micros: [{ id: 3, label: "Promise.then A", kind: "micro" }],
      },
      {
        running: "同步代码 setTimeout(A,0)",
        macros: [
          { id: 1, label: "setTimeout A", kind: "macro" },
          { id: 2, label: "setTimeout B", kind: "macro" },
        ],
      },
      { log: "宏任务 A、B 入队（延时 0 也要等下一轮）" },
      { running: "同步代码 console.log(2)" },
      { log: "2" },
      { callStack: [], phase: "drain-micro" },
      { log: "调用栈清空 → 清空微任务队列" },
      { running: "Promise.then A", callStack: ["Promise.then A"] },
      { log: "3 (微任务)" },
      { callStack: [], micros: [], phase: "tick" },
      { log: "本轮事件循环结束，取下一个宏任务" },
      {
        running: "setTimeout A",
        callStack: ["setTimeout A"],
        macros: [{ id: 2, label: "setTimeout B", kind: "macro" }],
      },
      { log: "A (宏任务)" },
      { callStack: [], phase: "drain-micro" },
      { log: "宏任务执行完 → 再次清微任务（空）" },
      { running: "setTimeout B", callStack: ["setTimeout B"], macros: [] },
      { log: "B (宏任务)" },
      { callStack: [], phase: "idle" },
      { log: "完成 ✅ 输出顺序：1 2 3 A B" },
    ],
  },
};

interface SimStep {
  running?: string | null;
  callStack?: string[];
  macros?: Task[];
  micros?: Task[];
  log?: string;
  phase?: Step["phase"];
}

export default function EventLoopSimulator() {
  const [scenario] = useState<keyof typeof SCENARIOS>("demo");
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<Step>({
    running: null,
    callStack: [],
    macros: SCENARIOS.demo!.macros,
    micros: SCENARIOS.demo!.micros,
    console: [],
    phase: "idle",
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setPlaying(false);
    setStepIndex(0);
    setView({
      running: null,
      callStack: [],
      macros: SCENARIOS.demo!.macros,
      micros: SCENARIOS.demo!.micros,
      console: [],
      phase: "idle",
    });
  }, []);

  const applyStep = useCallback((i: number) => {
    const sc = SCENARIOS.demo!;
    if (i >= sc.steps.length) {
      setPlaying(false);
      return;
    }
    const s = sc.steps[i]!;
    setView((v) => ({
      running: s.running !== undefined ? s.running : v.running,
      callStack: s.callStack ?? (s.running !== undefined ? [] : v.callStack),
      macros: s.macros ?? v.macros,
      micros: s.micros ?? v.micros,
      console: s.log ? [...v.console, s.log] : v.console,
      phase: s.phase ?? v.phase,
    }));
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1;
      applyStep(n);
      if (n >= SCENARIOS.demo!.steps.length) setPlaying(false);
      return n;
    });
  }, [applyStep]);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(next, 900);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [playing, next]);

  const sc = SCENARIOS[scenario]!;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">事件循环模拟器</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={stepIndex >= sc.steps.length}
            className="rounded bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-40"
          >
            {playing ? "暂停" : "播放"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={stepIndex >= sc.steps.length}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            单步
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        <Queue
          title="调用栈"
          items={view.callStack.map((c, i) => ({ id: i, label: c }))}
          accent="#f59e0b"
        />
        <Queue title="微任务队列" items={view.micros} accent="#8b5cf6" />
        <Queue title="宏任务队列" items={view.macros} accent="#3b82f6" />
      </div>

      <div className="border-t border-border px-4 py-2">
        <div className="mb-1 text-xs font-medium text-muted-foreground">控制台</div>
        <div className="max-h-28 min-h-12 overflow-y-auto rounded bg-[#0d1117] p-2 font-mono text-xs text-green-400">
          {view.console.length === 0 ? (
            <span className="text-gray-500">// 点击播放或单步执行</span>
          ) : (
            view.console.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

function Queue(props: { title: string; items: { id: number; label: string }[]; accent: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 text-xs font-semibold" style={{ color: props.accent }}>
        {props.title}
      </div>
      <div className="flex min-h-20 flex-col gap-1.5">
        <AnimatePresence>
          {props.items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="truncate rounded px-2 py-1 font-mono text-[11px]"
              style={{ backgroundColor: `${props.accent}1a`, color: props.accent }}
            >
              {t.label}
            </motion.div>
          ))}
        </AnimatePresence>
        {props.items.length === 0 && <span className="text-[11px] text-muted-foreground">空</span>}
      </div>
    </div>
  );
}
