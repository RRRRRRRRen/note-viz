import { notes } from "virtual:content-registry";
import type { NoteEntry, TaxonomyNode } from "./types";
import { taxonomy } from "../content/taxonomy";

export { notes };

export function noteByPath(path: string): NoteEntry | undefined {
  return notes.find((n) => n.path === path);
}

export interface DomainTree {
  slug: string;
  label: string;
  color: string;
  icon: string;
  techs: {
    slug: string;
    label: string;
    areas: {
      slug: string;
      label: string;
      notes: NoteEntry[];
    }[];
  }[];
}

function buildTree(): DomainTree[] {
  const trees: DomainTree[] = [];
  for (const [domainSlug, domain] of Object.entries(taxonomy)) {
    const techs: DomainTree["techs"] = [];
    for (const [techSlug, tech] of Object.entries(domain.children ?? {})) {
      const areas: DomainTree["techs"][number]["areas"] = [];
      for (const [areaSlug, area] of Object.entries(tech.children ?? {})) {
        const prefix = [domainSlug, techSlug, areaSlug];
        const areaNotes = notes.filter(
          (n) => n.slug.length === 4 && prefix.every((p, i) => n.slug[i] === p),
        );
        areas.push({ slug: areaSlug, label: area.label, notes: areaNotes });
      }
      techs.push({ slug: techSlug, label: tech.label, areas });
    }
    trees.push({
      slug: domainSlug,
      label: domain.label,
      color: domain.color ?? "#3b82f6",
      icon: domain.icon ?? "Globe",
      techs,
    });
  }
  return trees;
}

export const domainTrees: DomainTree[] = buildTree();

export function domainTree(slug: string): DomainTree | undefined {
  return domainTrees.find((d) => d.slug === slug);
}

export function latestNotes(count: number): NoteEntry[] {
  return [...notes].sort((a, b) => b.meta.updated.localeCompare(a.meta.updated)).slice(0, count);
}

export interface CategoryContext {
  taxonomyNode: TaxonomyNode;
  slug: string[];
  label: string;
  color?: string;
  icon?: string;
  childCategories: { slug: string; label: string; color?: string; icon?: string }[];
  notes: NoteEntry[];
}

export function categoryContext(slugParts: string[]): CategoryContext | undefined {
  let node: TaxonomyNode | undefined;
  const children: Record<string, TaxonomyNode> = taxonomy;
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
  }

  if (!node) {
    return {
      taxonomyNode: { label: "全部内容", children: taxonomy },
      slug: [],
      label: "全部内容",
      childCategories: Object.entries(taxonomy).map(([slug, n]) => ({
        slug,
        label: n.label,
        ...(n.color !== undefined ? { color: n.color } : {}),
        ...(n.icon !== undefined ? { icon: n.icon } : {}),
      })),
      notes: [],
    };
  }

  const childEntries = Object.entries(node.children ?? {});
  const prefix = resolved;
  const ownNotes = notes.filter(
    (n) => n.slug.length === prefix.length + 1 && prefix.every((p, i) => n.slug[i] === p),
  );
  const descendantNotes = notes.filter(
    (n) => n.slug.length > prefix.length + 1 && prefix.every((p, i) => n.slug[i] === p),
  );

  return {
    taxonomyNode: node,
    slug: resolved,
    label,
    ...(color !== undefined ? { color } : {}),
    ...(icon !== undefined ? { icon } : {}),
    childCategories: childEntries.map(([slug, n]) => ({
      slug,
      label: n.label,
      ...(n.color !== undefined ? { color: n.color } : {}),
      ...(n.icon !== undefined ? { icon: n.icon } : {}),
    })),
    notes: [...ownNotes, ...descendantNotes],
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

export function noteCategoryPath(note: NoteEntry): string[] {
  return note.slug.slice(0, 3);
}
