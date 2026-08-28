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

  const notePath = `/${segs.join("/")}`;

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-border px-3 py-4">
      {domain.techs.map((tech) => {
        const techActive = segs[1] === tech.slug;
        return (
          <section key={tech.slug} className="mb-4">
            <Link
              to={`/${domain.slug}/${tech.slug}`}
              className="inline-block rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: techActive ? `${domain.color}1a` : undefined,
                color: techActive ? domain.color : "var(--color-muted-foreground)",
                border: `1px solid ${techActive ? domain.color : "var(--color-border)"}`,
              }}
            >
              {tech.label}
            </Link>
            <div className="mt-2 space-y-1">
              {tech.areas.map((area) => {
                const areaActive = segs[2] === area.slug;
                return (
                  <AreaGroup
                    key={area.slug}
                    label={area.label}
                    domainSlug={domain.slug}
                    techSlug={tech.slug}
                    areaSlug={area.slug}
                    active={areaActive}
                    notePath={notePath}
                    notes={area.notes.map((n) => ({
                      path: n.path,
                      title: n.meta.title,
                    }))}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

function AreaGroup(props: {
  label: string;
  domainSlug: string;
  techSlug: string;
  areaSlug: string;
  active: boolean;
  notePath: string;
  notes: { path: string; title: string }[];
}) {
  const [open, setOpen] = useState(
    props.active || props.notes.some((n) => n.path === props.notePath),
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm ${
          props.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? "rotate-90" : undefined}`}
        />
        {props.label}
      </button>
      {open && (
        <div className="ml-3 border-l border-border pl-2">
          <Link
            to={`/${props.domainSlug}/${props.techSlug}/${props.areaSlug}`}
            className="block rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            全部笔记
          </Link>
          {props.notes.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`block truncate rounded px-2 py-1 text-xs hover:text-foreground ${
                n.path === props.notePath
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted-foreground"
              }`}
            >
              {n.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
