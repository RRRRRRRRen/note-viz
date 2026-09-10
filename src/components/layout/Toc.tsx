import { useEffect, useState } from "react";
import { flashHeading, TOC_HEADING_SELECTOR } from "@/components/note";

export interface TocItem {
  id: string;
  title: string;
  /** 标题层级：2 = h2 大节，3 = h3 小节 */
  level: 2 | 3;
}

interface TocProps {
  /** 渲染笔记正文的容器 ref，从中提取 h2/h3 生成大纲 */
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

/** 从容器中提取 h2/h3 标题与追问链条目、写入 id，供大纲导航使用 */
export function extractHeadings(container: HTMLElement): TocItem[] {
  const used = new Set<string>();
  const items: TocItem[] = [];
  container.querySelectorAll(TOC_HEADING_SELECTOR).forEach((el) => {
    const title = el.textContent?.trim();
    if (!title) return;
    let id = el.id;
    if (!id) {
      // 优先用外层 data-toc-item 容器的 id（追问链条目），否则自身生成
      const owner = el.closest("[data-toc-item]") as HTMLElement | null;
      if (owner && owner.id) {
        id = owner.id;
      } else {
        id = slugify(title, used);
        const target = owner ?? el;
        target.id = id;
      }
    }
    // 已有 id 也要登记进 used，避免重复提取时 slugify 撞出重复 id
    used.add(id);
    items.push({ id, title, level: el.tagName === "H2" ? 2 : 3 });
  });
  return items;
}

/**
 * 笔记大纲导航：fixed 悬浮于右侧、随滚动实时高亮当前小节、h2/h3 分级缩进展示。
 * 长大纲超出高度时自动滚动，保证活动项始终可见。
 */
export function Toc({ containerRef, resetKey }: TocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // 提取标题。笔记组件经 Suspense 异步挂载，可能晚于本 effect 首跑——
  // 靠 MutationObserver 监听容器子树，内容挂载后再补提取；拿到非空大纲即停听。
  useEffect(() => {
    setItems([]);
    setActiveId("");
    const el = containerRef.current;
    if (!el) return;
    let timer = 0;
    let done = false;
    const extract = () => {
      timer = 0;
      const next = extractHeadings(el);
      done = next.length > 0;
      if (done) observer.disconnect();
      setItems(next);
    };
    const schedule = () => {
      if (!timer) timer = window.setTimeout(extract, 100);
    };
    const observer = new MutationObserver(() => {
      if (!done) schedule();
    });
    observer.observe(el, { childList: true, subtree: true });
    schedule();
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // scrollspy：滚动容器每帧检测「阅读线」（视口 1/3 处）压在哪个小节上
  useEffect(() => {
    if (items.length === 0) return;
    // 滚动容器优先取内容列自身（双栏布局下内容列独立滚动），回退到 main
    const scroller =
      containerRef.current && containerRef.current.scrollHeight > containerRef.current.clientHeight
        ? containerRef.current
        : (containerRef.current?.closest("main") as HTMLElement | null);
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

  // 活动项变化时，把大纲滚动到可见位置（仅滚大纲自己，不用 scrollIntoView 避免波及祖先）
  useEffect(() => {
    if (!activeId) return;
    const nav = document.getElementById("toc-nav");
    const el = nav?.querySelector(`[data-toc-id="${CSS.escape(activeId)}"]`) as HTMLElement | null;
    const box = nav;
    if (!el || !box) return;
    const elTop = el.offsetTop - box.offsetTop;
    if (elTop < box.scrollTop) {
      box.scrollTop = elTop;
    } else if (elTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = elTop + el.offsetHeight - box.clientHeight;
    }
  }, [activeId, items]);

  if (items.length === 0) return null;

  // 计算滚动容器（内容列），把目标小节滚到「阅读线」位置。
  // 不用 scrollIntoView：它会连带滚动 html/body 等被裁剪的祖先，把固定顶栏卷出视口。
  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    const scroller =
      containerRef.current && containerRef.current.scrollHeight > containerRef.current.clientHeight
        ? containerRef.current
        : (containerRef.current?.closest("main") as HTMLElement | null);
    if (!target || !scroller) return;
    const lineOffset = scroller.clientHeight / 3;
    const top =
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      lineOffset;
    scroller.scrollTo({ top: Math.max(top, 0), behavior: "auto" });
  };

  const jump = (id: string) => {
    scrollToSection(id);
    // 瞬时定位，目标已就位，立即高亮
    flashHeading(id);
  };

  return (
    <nav id="toc-nav" aria-label="大纲" className="h-full w-full overflow-y-auto py-7 pl-6 pr-2">
      <div className="mb-3 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        本页大纲
      </div>
      <ul className="space-y-px border-l border-border">
        {items.map((item, i) => {
          const active = item.id === activeId;
          const isSub = item.level === 3;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => jump(item.id)}
                className={`-ml-px block w-full border-l-2 py-1 pr-1 text-left text-[11px] leading-snug transition-all ${
                  isSub ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-accent font-medium text-foreground"
                    : "border-transparent text-muted hover:border-border hover:text-foreground"
                } ${active ? "" : "opacity-80"}`}
              >
                {!isSub && (
                  <span className="mr-1.5 text-[10px] text-muted meta-mono">
                    {String(numberOf(items, i)).padStart(2, "0")}
                  </span>
                )}
                {item.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** h2 大节的序号（h3 小节不编号） */
function numberOf(items: TocItem[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index; i++) {
    if (items[i]!.level === 2) n++;
  }
  return n;
}
