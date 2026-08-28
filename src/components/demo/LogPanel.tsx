import type { ReactNode } from "react";

interface LogPanelProps {
  logs: string[];
  placeholder?: string;
  className?: string;
  children?: ReactNode;
}

export function LogPanel({
  logs,
  placeholder = "// 点击运行查看输出",
  className,
  children,
}: LogPanelProps) {
  return (
    <div>
      {children}
      <div
        className={`rounded bg-[#0d1117] p-2 font-mono text-xs text-green-400 ${className ?? "mt-3 min-h-12"}`}
      >
        {logs.length === 0 ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : (
          logs.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>
    </div>
  );
}

export function DemoButton(props: {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
}) {
  const { onClick, children, variant = "primary", disabled } = props;
  const styles: Record<string, string> = {
    primary: "bg-accent text-accent-foreground",
    outline: "border border-accent text-accent",
    danger: "border border-danger text-danger",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1.5 text-xs disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
    >
      重置
    </button>
  );
}
