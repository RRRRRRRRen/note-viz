import { notes } from "virtual:content-registry";
import type { NoteEntry, TaxonomyNode } from "./types";
import { taxonomy } from "../content/taxonomy";

export { notes };

export function noteByPath(path: string): NoteEntry | undefined {
  return notes.find((n) => n.path === path);
}

export interface AreaTree {
  slug: string;
  label: string;
  notes: NoteEntry[];
}

export interface TechTree {
  slug: string;
  label: string;
  areas: AreaTree[];
}

export interface DomainTree {
  slug: string;
  label: string;
  color: string;
  icon: string;
  techs: TechTree[];
}

function notesUnder(prefix: string[], exact: boolean): NoteEntry[] {
  return notes.filter(
    (n) =>
      n.slug.length === (exact ? prefix.length + 1 : n.slug.length) &&
      prefix.every((p, i) => n.slug[i] === p) &&
      n.slug.length > prefix.length,
  );
}

function buildTree(): DomainTree[] {
  return Object.entries(taxonomy).map(([domainSlug, domain]) => ({
    slug: domainSlug,
    label: domain.label,
    color: domain.color ?? "#1677ff",
    icon: domain.icon ?? "Globe",
    techs: Object.entries(domain.children ?? {}).map(([techSlug, tech]) => ({
      slug: techSlug,
      label: tech.label,
      areas: Object.entries(tech.children ?? {}).map(([areaSlug, area]) => ({
        slug: areaSlug,
        label: area.label,
        notes: notesUnder([domainSlug, techSlug, areaSlug], true),
      })),
    })),
  }));
}

export const domainTrees: DomainTree[] = buildTree();

export function domainTree(slug: string): DomainTree | undefined {
  return domainTrees.find((d) => d.slug === slug);
}

export function latestNotes(count: number): NoteEntry[] {
  return [...notes].sort((a, b) => b.meta.updated.localeCompare(a.meta.updated)).slice(0, count);
}

export interface CategoryChild {
  slug: string;
  label: string;
  color?: string;
  icon?: string;
}

export interface CategoryContext {
  slug: string[];
  label: string;
  color?: string;
  icon?: string;
  childCategories: CategoryChild[];
  notes: NoteEntry[];
}

function toChild(slug: string, node: TaxonomyNode): CategoryChild {
  return {
    slug,
    label: node.label,
    ...(node.color !== undefined ? { color: node.color } : {}),
    ...(node.icon !== undefined ? { icon: node.icon } : {}),
  };
}

export function categoryContext(slugParts: string[]): CategoryContext | undefined {
  let node: TaxonomyNode | undefined;
  let children: Record<string, TaxonomyNode> = taxonomy;
  let label = "";
  let color: string | undefined;
  let icon: string | undefined;
  const resolved: string[] = [];

  for (const part of slugParts) {
    const next = children[part];
    if (!next) return undefined;
    node = next;
    label = next.label;
    color = next.color;
    icon = next.icon;
    resolved.push(part);
    children = (next.children ?? {}) as Record<string, TaxonomyNode>;
  }

  if (!node) {
    return {
      slug: [],
      label: "全部内容",
      childCategories: Object.entries(taxonomy).map(([slug, n]) => toChild(slug, n)),
      notes: [],
    };
  }

  return {
    slug: resolved,
    label,
    ...(color !== undefined ? { color } : {}),
    ...(icon !== undefined ? { icon } : {}),
    childCategories: Object.entries(children).map(([slug, n]) => toChild(slug, n)),
    notes: notesUnder(resolved, false),
  };
}

export function breadcrumbParts(slugParts: string[]): { slug: string; label: string }[] {
  const out: { slug: string; label: string }[] = [];
  let children: Record<string, TaxonomyNode> = taxonomy;
  for (const part of slugParts) {
    const node = children[part];
    if (!node) break;
    out.push({ slug: part, label: node.label });
    children = (node.children ?? {}) as Record<string, TaxonomyNode>;
  }
  return out;
}
