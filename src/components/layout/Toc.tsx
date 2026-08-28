import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  title: string;
}

interface TocProps {
  /** 渲染笔记正文的容器 ref，从中提取 h2 生成大纲 */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 内容切换时重置（传 note.path 即可） */
  resetKey: string;
}

function slugify(text: string, used: Set<string>): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  let id = base || "section";
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** 从容器中提取 h2 标题、写入 id，供大纲导航使用 */
export function extractHeadings(container: HTMLElement): TocItem[] {
  const used = new Set<string>();
  const items: TocItem[] = [];
  container.querySelectorAll("h2[data-toc]").forEach((el) => {
    const title = el.textContent?.trim();
    if (!title) return;
    let id = el.id;
    if (!id) {
      id = slugify(title, used);
      el.id = id;
    }
    items.push({ id, title });
  });
  return items;
}

/**
 * 笔记大纲导航：fixed 悬浮于右侧、随滚动实时高亮当前小节。
 * 长大纲超出高度时自动滚动，保证活动项始终可见。
 */
export function Toc({ containerRef, resetKey }: TocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // 内容渲染完成后提取标题
  useEffect(() => {
    setItems([]);
    setActiveId("");
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (el) setItems(extractHeadings(el));
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // scrollspy：滚动容器每帧检测「阅读线」（视口 1/3 处）压在哪个小节上
  useEffect(() => {
    if (items.length === 0) return;
    const scroller = containerRef.current?.closest("main");
    if (!scroller) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const line = scroller.getBoundingClientRect().top + scroller.clientHeight / 3;
      let current = items[0]!.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = item.id;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items, containerRef]);

  // 活动项变化时，把大纲滚动到可见位置
  useEffect(() => {
    if (!activeId) return;
    const nav = document.getElementById("toc-nav");
    nav?.querySelector(`[data-toc-id="${CSS.escape(activeId)}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeId, items]);

  if (items.length === 0) return null;

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      id="toc-nav"
      aria-label="大纲"
      className="fixed right-6 top-[140px] z-10 max-h-[calc(100vh-200px)] w-52 overflow-y-auto"
    >
      <div className="mb-3 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        本页大纲
      </div>
      <ul className="space-y-0.5 border-l border-border">
        {items.map((item, i) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => jump(item.id)}
                className={`-ml-px block w-full border-l-2 py-1 pl-3 text-left text-xs leading-snug transition-all ${
                  active
                    ? "border-accent font-medium text-foreground"
                    : "border-transparent text-muted hover:border-border hover:text-foreground"
                } ${active ? "" : "opacity-80"}`}
              >
                <span className="mr-1.5 text-[10px] text-muted meta-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
