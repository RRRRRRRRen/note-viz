import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

/** 通用折叠区块：完整推导、次要变体等细节默认收起，感兴趣再展开（主线内容不许用这个） */
export function Collapsible(props: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-surface px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-surface-2"
      >
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {props.title}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm leading-relaxed">
          {props.children}
        </div>
      )}
    </div>
  );
}
