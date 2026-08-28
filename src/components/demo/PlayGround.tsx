import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
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
            <SandpackCodeEditor showLineNumbers showTabs={false} style={{ height }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SandpackConsole showHeader={false} style={{ height, maxHeight: height + 120 }} />
          </div>
        </SandpackLayout>
      </SandpackProvider>
      <p className="mt-2 text-[11px] text-muted">
        左侧代码可直接编辑，点击编辑器右上角刷新运行，输出实时显示在右侧控制台。
      </p>
    </VizBlock>
  );
}
