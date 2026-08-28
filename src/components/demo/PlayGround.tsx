import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { VizBlock } from "@/components/viz";

interface PlayGroundProps {
  label?: string;
  /** 初始代码（可编辑），浏览器端 JavaScript */
  code: string;
  height?: number;
}

interface LogEntry {
  kind: "log" | "error";
  text: string;
}

/**
 * 在线代码游乐场：本地 iframe 沙箱真实执行，零外部依赖、离线可用。
 * - 代码可编辑，点「运行」后通过 srcdoc iframe 执行，console 被劫持回显
 * - 执行环境与页面同源隔离在沙箱 iframe 中（allow-scripts, 不含 allow-same-origin）
 */
export function PlayGround({ label, code, height = 200 }: PlayGroundProps) {
  const [src, setSrc] = useState(code);
  const [draft, setDraft] = useState(code);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runId, setRunId] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // runId > 0 表示用户点过「运行」；首次挂载只加载沙箱不自动执行
  const pendingCode = useRef<string | null>(null);

  // iframe 加载完成后，若有待执行代码则注入执行
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      if (runId === 0 || pendingCode.current === null) return;
      // srcdoc 沙箱是 opaque origin，targetOrigin 只能 "*"；
      // 消息内容仅是用户在编辑器里写的代码，且 iframe 无 same-origin 权限
      iframe.contentWindow?.postMessage({ type: "noteviz-run", code: pendingCode.current }, "*");
      pendingCode.current = null;
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [src, runId]);

  const run = () => {
    setLogs([]);
    pendingCode.current = draft;
    setSrc(draft);
    setRunId((n) => n + 1);
  };

  const reset = () => {
    setDraft(code);
    setLogs([]);
    setSrc(code);
    setRunId((n) => n + 1);
  };

  // console 劫持脚本：把 iframe 内的 console.* 转发到父页面
  const hookScript =
    `<script>
    (function () {
      var send = function (kind, args) {
        parent.postMessage({ type: "noteviz-log", kind: kind, text: Array.from(args).map(fmt).join(" ") }, "*");
      };
      function fmt(v) {
        if (typeof v === "string") return v;
        if (v instanceof Error) return v.name + ": " + v.message;
        try { return JSON.stringify(v); } catch (e) { return String(v); }
      }
      ["log", "info", "warn", "error"].forEach(function (method) {
        var original = console[method].bind(console);
        console[method] = function () {
          send(method === "error" ? "error" : "log", arguments);
          original.apply(console, arguments);
        };
      });
      window.addEventListener("error", function (e) {
        parent.postMessage({ type: "noteviz-log", kind: "error", text: e.message }, "*");
      });
      window.addEventListener("message", function (e) {
        if (e.data && e.data.type === "noteviz-run") {
          try {
            new Function(e.data.code)();
          } catch (err) {
            parent.postMessage({ type: "noteviz-log", kind: "error", text: err.name + ": " + err.message }, "*");
          }
        }
      });
      parent.postMessage({ type: "noteviz-ready" }, "*");
    })();
  </` + `script>`;

  // 父页面监听日志：仅接受本 Playground 沙箱 iframe 的消息
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (d?.type === "noteviz-log") {
        setLogs((l) => [
          ...l,
          { kind: d.kind === "error" ? "error" : "log", text: String(d.text) },
        ]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${hookScript}</body></html>`;

  return (
    <VizBlock label={label ?? "在线运行 / playground"}>
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-border">
        <div className="flex flex-col border-r border-border">
          <div className="flex h-10 items-center gap-2 border-b border-border bg-surface-2/50 px-3">
            <button
              type="button"
              onClick={run}
              className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:opacity-90"
            >
              <Play size={12} /> 运行
            </button>
            <button
              type="button"
              onClick={reset}
              title="恢复初始代码"
              className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              <RotateCcw size={12} /> 重置
            </button>
            <span className="ml-auto text-[10px] text-muted meta-mono">可编辑</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="resize-none bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-[#e6edf3] outline-none"
            style={{ height }}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex h-10 items-center border-b border-border bg-surface-2/50 px-3 text-xs font-medium text-muted">
            控制台输出
          </div>
          <div
            className="overflow-y-auto bg-[#0d1117] p-3 font-mono text-xs leading-relaxed"
            style={{ height }}
          >
            {logs.length === 0 ? (
              <span className="text-gray-500">// 点击「运行」查看输出</span>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={l.kind === "error" ? "text-[#f85149]" : "text-[#3fb950]"}>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={html + runId}
          sandbox="allow-scripts"
          className="hidden"
          title="sandbox"
        />
      </div>
    </VizBlock>
  );
}
