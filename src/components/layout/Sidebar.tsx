import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { domainTree } from "@/lib/registry";

export default function Sidebar() {
  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  const domainSlug = segs[0];
  const domain = domainSlug ? domainTree(domainSlug) : undefined;
  if (!domain) return null;

  const notePath = `/note/${segs.slice(0, 4).join("/")}`;

  return (
    <aside className="sticky top-14 h-[calc(100vh-56px)] w-72 shrink-0 overflow-y-auto border-r border-border px-4 py-6">
      <div className="mb-5 px-2 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
        知识导航 / {domain.label}
      </div>
      {domain.techs.map((tech) => (
        <TechSection
          key={tech.slug}
          domainSlug={domain.slug}
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

function TechSection(props: {
  domainSlug: string;
  color: string;
  tech: TechNode;
  segs: string[];
  notePath: string;
}) {
  const { domainSlug, color, tech, segs, notePath } = props;
  const techActive = segs[1] === tech.slug;
  const [open, setOpen] = useState(techActive);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 py-2 text-[11px] font-bold tracking-[0.1em] text-foreground uppercase"
      >
        <Link
          to={`/${domainSlug}/${tech.slug}`}
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
            <AreaGroup
              key={area.slug}
              domainSlug={domainSlug}
              techSlug={tech.slug}
              color={color}
              area={area}
              segs={segs}
              notePath={notePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaGroup(props: {
  domainSlug: string;
  techSlug: string;
  color: string;
  area: { slug: string; label: string; notes: { path: string; meta: { title: string } }[] };
  segs: string[];
  notePath: string;
}) {
  const { domainSlug, techSlug, color, area, segs, notePath } = props;
  const areaActive = segs[2] === area.slug;
  const [open, setOpen] = useState(areaActive || area.notes.some((n) => n.path === notePath));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex min-h-[38px] w-full items-center gap-2 rounded-md border border-transparent px-2.5 text-left text-[13px] transition-colors hover:bg-surface-2 ${
          areaActive ? "text-foreground" : "text-muted hover:text-foreground"
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
          <Link
            to={`/${domainSlug}/${techSlug}/${area.slug}`}
            className={`block rounded px-2 py-1 text-xs text-muted hover:text-foreground ${
              areaActive && notePath === `/note/${segs.slice(0, 4).join("/")}` ? "" : ""
            }`}
          >
            <span className="text-accent">›</span> 模块总览
          </Link>
          {area.notes.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`flex items-center gap-2 border-l border-border px-2 py-1 text-xs ${
                n.path === notePath
                  ? "-ml-px border-l-2 font-medium text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
              style={n.path === notePath ? { borderColor: color } : undefined}
            >
              <span className="truncate">{n.meta.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
