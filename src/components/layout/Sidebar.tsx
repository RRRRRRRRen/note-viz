import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { domainTree } from "@/lib/registry";

export default function Sidebar({ domainSlug }: { domainSlug: string }) {
  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  const domain = domainTree(domainSlug);
  const scrollRef = useRef<HTMLElement>(null);
  if (!domain) return null;

  const notePath = location.pathname.startsWith("/note/")
    ? location.pathname
    : `/note/${segs.slice(0, 4).join("/")}`;

  return (
    <aside
      ref={scrollRef}
      className="sticky top-14 h-[calc(100vh-56px)] w-72 shrink-0 overflow-y-auto border-r border-border px-4 py-6"
    >
      <div className="mb-5 px-2 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        知识导航 / {domain.label}
      </div>
      {domain.techs.map((tech) => (
        <TechSection
          key={tech.slug}
          color={domain.color}
          tech={tech}
          segs={segs}
          notePath={notePath}
        />
      ))}
    </aside>
  );
}

import type { TechNode } from "@/lib/types";

function TechSection(props: { color: string; tech: TechNode; segs: string[]; notePath: string }) {
  const { color, tech, segs, notePath } = props;
  const techSlug = segs[0] === "note" ? segs[2] : segs[1];
  const techActive = techSlug === tech.slug;
  const [open, setOpen] = useState(techActive);

  // 路径切换到本技术下时自动展开；切到别的技术时收起
  useEffect(() => {
    if (techActive) setOpen(true);
  }, [techActive]);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 py-2 text-[11px] font-bold tracking-[0.1em] text-foreground uppercase"
      >
        <Link
          to={
            techSlug ? `/${segs[0] === "note" ? segs[1] : segs[0]}/${tech.slug}` : `/${tech.slug}`
          }
          onClick={(e) => e.stopPropagation()}
          className="hover:text-accent"
        >
          {tech.label}
        </Link>
        <ChevronRight
          size={14}
          className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="mb-3 space-y-2">
          {tech.areas.map((area) => (
            <AreaGroup key={area.slug} color={color} area={area} segs={segs} notePath={notePath} />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaGroup(props: {
  color: string;
  area: { slug: string; label: string; notes: { path: string; meta: { title: string } }[] };
  segs: string[];
  notePath: string;
}) {
  const { color, area, segs, notePath } = props;
  const idx = segs[0] === "note" ? 3 : 2;
  const areaActive = segs[idx] === area.slug;
  const containsCurrent = area.notes.some((n) => n.path === notePath);
  const [open, setOpen] = useState(areaActive || containsCurrent);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // 折叠区跟随当前路径自动展开
  useEffect(() => {
    if (areaActive || containsCurrent) setOpen(true);
  }, [areaActive, containsCurrent]);

  // 当前笔记滚动到侧栏可视区
  useEffect(() => {
    if (notePath && activeRef.current) {
      const timer = setTimeout(() => {
        activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [notePath]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex min-h-[38px] w-full items-center gap-2 rounded-md border border-transparent px-2.5 text-left text-[13px] transition-colors hover:bg-surface-2 ${
          areaActive || containsCurrent ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="truncate">{area.label}</span>
        <span className="ml-auto rounded border border-border px-1.5 py-px text-[10px] text-muted meta-mono">
          {area.notes.length}
        </span>
      </button>
      {open && (
        <div className="mt-0.5 mb-1 ml-4 border-l border-border pl-2">
          {area.notes.map((n) => {
            const active = n.path === notePath;
            return (
              <Link
                key={n.path}
                ref={active ? activeRef : undefined}
                to={n.path}
                className={`flex items-center gap-2 border-l border-border px-2 py-1 text-xs ${
                  active
                    ? "-ml-px border-l-2 font-medium text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                style={active ? { borderColor: color } : undefined}
              >
                <span className="truncate">{n.meta.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
