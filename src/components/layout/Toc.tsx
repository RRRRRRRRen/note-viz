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

  // scrollspy：监听滚动容器，高亮当前可视小节
  useEffect(() => {
    if (items.length === 0) return;
    const scrollRoot = containerRef.current?.closest("main") ?? document.body;
    const observer = new IntersectionObserver(
      (entries) => {
        // 取视口中最后进入的小节（更贴近阅读位置）
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        } else {
          // 都不在视口时：滚动位置之后的第一节
          const all = items
            .map((i) => document.getElementById(i.id))
            .filter((el): el is HTMLElement => el !== null);
          const next = all.find((el) => el.getBoundingClientRect().top > 0);
          if (next) setActiveId(next.id);
        }
      },
      { root: scrollRoot instanceof Element ? scrollRoot : null, rootMargin: "-10% 0px -70% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, containerRef]);

  if (items.length === 0) return null;

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="大纲"
      className="sticky top-0 max-h-[calc(100vh-92px)] overflow-y-auto py-7 pl-6"
    >
      <div className="mb-3 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        本页大纲
      </div>
      <ul className="space-y-0.5 border-l border-border">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => jump(item.id)}
                className={`-ml-px block w-full border-l-2 py-1 pl-3 text-left text-xs leading-snug transition-colors ${
                  active
                    ? "border-accent font-medium text-foreground"
                    : "border-transparent text-muted hover:border-border hover:text-foreground"
                }`}
              >
                {item.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
