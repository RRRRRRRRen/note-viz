import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackProvider,
  useSandpackNavigation,
} from "@codesandbox/sandpack-react";
import { Play } from "lucide-react";
import { VizBlock } from "@/components/viz";

interface PlayGroundProps {
  label?: string;
  /** 初始代码（可编辑） */
  code: string;
  /** sandpack 预设：node / vanilla 等 */
  template?: "node" | "vanilla";
  /** 编辑器高度（px） */
  height?: number;
}

/** 编辑器工具栏：显式「运行」按钮 */
function Toolbar() {
  const { refresh } = useSandpackNavigation();
  return (
    <div className="flex items-center gap-2 border-b border-border px-3" style={{ height: 40 }}>
      <button
        type="button"
        onClick={() => refresh()}
        className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:opacity-90"
      >
        <Play size={12} /> 运行
      </button>
      <span className="ml-auto text-[10px] text-muted meta-mono">可编辑 · 修改后点运行</span>
    </div>
  );
}

/**
 * 在线代码游乐场：可编辑代码 + 真实执行 + 控制台输出（Sandpack 驱动）。
 * 依赖 codesandbox CDN runner，需要网络。
 */
export function PlayGround({ label, code, template = "node", height = 260 }: PlayGroundProps) {
  return (
    <VizBlock label={label ?? "在线运行 / playground"}>
      <SandpackProvider
        template={template}
        theme="dark"
        files={{ "/index.js": code }}
        options={{ externalResources: ["https://unpkg.com/@codesandbox/sandpack-client@2"] }}
      >
        <SandpackLayout style={{ background: "transparent" }}>
          <div style={{ flex: 1.4, minWidth: 0 }}>
            <Toolbar />
            <SandpackCodeEditor showLineNumbers showTabs={false} style={{ height }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex h-10 items-center border-b border-border px-3 text-xs font-medium text-muted">
              控制台输出
            </div>
            <SandpackConsole showHeader={false} style={{ height, maxHeight: height + 120 }} />
          </div>
        </SandpackLayout>
      </SandpackProvider>
      <p className="mt-2 text-[11px] text-muted">
        左侧代码可直接编辑，点击「运行」执行，输出实时显示在右侧控制台。
      </p>
    </VizBlock>
  );
}
