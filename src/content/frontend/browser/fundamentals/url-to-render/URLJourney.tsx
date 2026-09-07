import { useEffect, useRef, useState } from "react";

interface Stage {
  label: string;
  phase: "解析" | "网络" | "缓存" | "渲染";
  log: string;
}

const STAGES: Stage[] = [
  { label: "URL 解析", phase: "解析", log: "补全协议与路径，检查 HSTS 列表，判断是否升级 HTTPS" },
  {
    label: "Self 检查",
    phase: "缓存",
    log: "查 Service Worker 与磁盘 URL 缓存——命中则跳过整个网络阶段",
  },
  {
    label: "DNS 解析",
    phase: "网络",
    log: "浏览器缓存 → 系统 → 运营商 → 根/顶级/权威服务器，拿到 IP",
  },
  { label: "TCP 握手", phase: "网络", log: "SYN → SYN+ACK → ACK，一个 RTT 建立连接" },
  {
    label: "TLS 握手",
    phase: "网络",
    log: "校验证书 + 交换会话密钥（TLS 1.3 一次往返，1.2 要两次）",
  },
  {
    label: "强缓存判断",
    phase: "缓存",
    log: "Cache-Control max-age 未过期 → 直接用本地副本，跳到渲染",
  },
  {
    label: "协商缓存",
    phase: "缓存",
    log: "带 If-None-Match 问服务器：未变回 304 复用，变了回 200 新内容",
  },
  { label: "响应到达", phase: "网络", log: "TTFB 首字节到手，HTML 开始流式传输" },
  {
    label: "解析 HTML",
    phase: "渲染",
    log: "逐 token 建 DOM 树；CSS 建 CSSOM；同步 JS 会阻塞解析",
  },
  { label: "渲染树", phase: "渲染", log: "可见节点 + 计算样式（display:none 不进树，伪元素会进）" },
  { label: "布局 Layout", phase: "渲染", log: "计算每个节点的几何位置与大小——代价最高的阶段之一" },
  { label: "绘制 Paint", phase: "渲染", log: "生成绘制指令列表，分层填充像素" },
  {
    label: "合成 Composite",
    phase: "渲染",
    log: "层上传 GPU 拼出最终画面 → 首屏出现，开始下一帧循环",
  },
];

const PHASE_COLOR: Record<Stage["phase"], string> = {
  解析: "#1677ff",
  网络: "#f59e0b",
  缓存: "#8b5cf6",
  渲染: "#3fb950",
};

export default function URLJourney() {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setStep((s) => {
          if (s >= STAGES.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 850);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [playing]);

  useEffect(() => {
    const box = logBoxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [step]);

  const atEnd = step >= STAGES.length - 1;
  const current = step >= 0 ? STAGES[step] : null;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted">
          URL 旅程模拟器 —— 逐阶段点亮从输入到首屏的全链路
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (atEnd) setStep(0);
              setPlaying((p) => !p);
            }}
            className="rounded bg-accent px-2.5 py-1 text-xs text-accent-foreground"
          >
            {playing ? "暂停" : "播放"}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, STAGES.length - 1))}
            disabled={atEnd}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-40"
          >
            单步
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStep(-1);
            }}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
          >
            重置
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 p-4">
        {STAGES.map((s, i) => {
          const color = PHASE_COLOR[s.phase];
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
              className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                active
                  ? "font-bold"
                  : done
                    ? "border-transparent"
                    : "border-border text-muted hover:text-foreground"
              }`}
              style={
                active
                  ? { backgroundColor: color, color: "#fff", borderColor: color }
                  : done
                    ? { backgroundColor: `${color}1a`, color }
                    : undefined
              }
            >
              {i + 1}. {s.label}
            </button>
          );
        })}
      </div>

      {current && (
        <div className="px-4 pb-3">
          <div
            className="rounded-md px-3 py-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: `${PHASE_COLOR[current.phase]}0d` }}
          >
            <span
              className="mr-2 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{ backgroundColor: PHASE_COLOR[current.phase], color: "#fff" }}
            >
              {current.phase}
            </span>
            <span className="font-semibold" style={{ color: PHASE_COLOR[current.phase] }}>
              {current.label}
            </span>
            <span className="ml-2 text-muted">{current.log}</span>
          </div>
        </div>
      )}

      <div className="border-t border-border px-4 py-3">
        <div className="mb-1 text-xs font-medium text-muted">过程日志</div>
        <div
          ref={logBoxRef}
          className="h-32 overflow-y-auto rounded bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-green-400"
        >
          {step < 0 ? (
            <span className="text-gray-500">{"// 点击播放，或直接点任意阶段跳转"}</span>
          ) : (
            STAGES.slice(0, step + 1).map((s, i) => (
              <div key={s.label}>
                [{String(i + 1).padStart(2, "0")}] {s.label} —— {s.log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
