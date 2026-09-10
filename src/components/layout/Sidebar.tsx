import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Search, X } from "lucide-react";
import { domainTree } from "@/lib/registry";
import type { TechTree } from "@/lib/registry";
import { MarkText } from "@/components/mark";

export default function Sidebar({ domainSlug }: { domainSlug: string }) {
  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  const domain = domainTree(domainSlug);
  const scrollRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  if (!domain) return null;

  // 过滤模式：按笔记标题筛树，命中为空的枝整枝剪掉
  const techs = q
    ? domain.techs
        .map((tech) => ({
          ...tech,
          areas: tech.areas
            .map((area) => ({
              ...area,
              notes: area.notes.filter((n) => n.meta.title.toLowerCase().includes(q)),
            }))
            .filter((area) => area.notes.length > 0),
        }))
        .filter((tech) => tech.areas.length > 0)
    : domain.techs;
  const matchCount = q
    ? techs.reduce((acc, t) => acc + t.areas.reduce((a, ar) => a + ar.notes.length, 0), 0)
    : 0;

  const notePath = location.pathname.startsWith("/note/")
    ? location.pathname
    : `/note/${segs.slice(0, 4).join("/")}`;

  return (
    <aside
      ref={scrollRef}
      className="h-full w-72 shrink-0 overflow-y-auto border-r border-border px-4 py-6"
    >
      <div className="mb-5 px-2 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        知识导航 / {domain.label}
      </div>
      <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
        <Search size={13} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="过滤笔记标题…"
          aria-label="过滤侧栏笔记"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="清除过滤"
            className="shrink-0 text-muted transition-colors hover:text-foreground"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {q !== "" && matchCount === 0 && (
        <div className="px-2 text-xs text-muted">没有标题匹配「{query.trim()}」的笔记</div>
      )}
      {techs.map((tech) => (
        <TechSection
          key={tech.slug}
          tech={tech}
          segs={segs}
          notePath={notePath}
          forceOpen={q !== ""}
          {...(q !== "" ? { highlightTokens: [query.trim()] } : {})}
        />
      ))}
    </aside>
  );
}

function TechSection(props: {
  tech: TechTree;
  segs: string[];
  notePath: string;
  forceOpen?: boolean;
  highlightTokens?: string[];
}) {
  const { tech, segs, notePath } = props;
  const idx = segs[0] === "note" ? 2 : 1;
  const techSlug = segs[idx];
  const techActive = techSlug === tech.slug;
  const [open, setOpen] = useState(techActive);
  const expanded = props.forceOpen || open;

  // 路径切换到本技术下时自动展开；切到别的技术时收起
  useEffect(() => {
    if (techActive) setOpen(true);
  }, [techActive]);

  return (
    <div className="mb-4">
      {/* 整行都是展开热区，与下方分组头一致 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={expanded}
        className="flex min-h-[32px] w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
      >
        <ChevronRight
          size={13}
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span className="text-[11px] font-bold tracking-[0.1em] text-foreground uppercase">
          {tech.label}
        </span>
      </button>
      {expanded && (
        <div className="mb-2 space-y-2">
          {tech.areas.map((area: TechTree["areas"][number]) => (
            <AreaGroup
              key={area.slug}
              area={area}
              segs={segs}
              notePath={notePath}
              {...(props.forceOpen !== undefined ? { forceOpen: props.forceOpen } : {})}
              {...(props.highlightTokens !== undefined
                ? { highlightTokens: props.highlightTokens }
                : {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaGroup(props: {
  area: { slug: string; label: string; notes: { path: string; meta: { title: string } }[] };
  segs: string[];
  notePath: string;
  forceOpen?: boolean;
  highlightTokens?: string[];
}) {
  const { area, segs, notePath } = props;
  const idx = segs[0] === "note" ? 3 : 2;
  const areaActive = segs[idx] === area.slug;
  const containsCurrent = area.notes.some((n) => n.path === notePath);
  const [open, setOpen] = useState(areaActive || containsCurrent);
  const expanded = props.forceOpen || open;
  const activeRef = useRef<HTMLAnchorElement>(null);

  // 折叠区跟随当前路径自动展开
  useEffect(() => {
    if (areaActive || containsCurrent) setOpen(true);
  }, [areaActive, containsCurrent]);

  // 当前笔记滚动到侧栏可视区（只滚侧栏盒子，不用 scrollIntoView 避免波及被裁剪的祖先）
  useEffect(() => {
    if (notePath && activeRef.current) {
      const timer = setTimeout(() => {
        const el = activeRef.current;
        const box = el?.closest("aside");
        if (!el || !box) return;
        const elTop = el.offsetTop - box.offsetTop;
        if (elTop < box.scrollTop) {
          box.scrollTop = elTop;
        } else if (elTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
          box.scrollTop = elTop + el.offsetHeight - box.clientHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [notePath]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={expanded}
        className={`flex min-h-[38px] w-full items-center gap-2 rounded-md border border-transparent px-2.5 text-left text-[13px] transition-colors hover:bg-surface-2 ${
          areaActive || containsCurrent ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span className="min-w-0">{area.label}</span>
        <span className="ml-auto shrink-0 rounded border border-border px-1.5 py-px text-[10px] text-muted meta-mono">
          {area.notes.length}
        </span>
      </button>
      {expanded && (
        <div className="mt-1 mb-2 ml-4 space-y-1">
          {area.notes.map((n) => {
            const active = n.path === notePath;
            return (
              <Link
                key={n.path}
                ref={active ? activeRef : undefined}
                to={n.path}
                className={`block rounded-md px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-accent/15 font-medium text-foreground"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {props.highlightTokens === undefined ? (
                  n.meta.title
                ) : (
                  <MarkText text={n.meta.title} tokens={props.highlightTokens} />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
