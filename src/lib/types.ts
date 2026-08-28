import type { ComponentType } from "react";

export type Difficulty = "入门" | "进阶" | "高级";

export interface NoteMeta {
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  updated: string;
}

export type NoteComponent = ComponentType;

export interface NoteEntry {
  slug: string[];
  path: string;
  meta: NoteMeta;
  load: () => Promise<{ default: NoteComponent }>;
}

export interface TaxonomyNode {
  label: string;
  color?: string;
  icon?: string;
  children?: Record<string, TaxonomyNode>;
}

export interface DomainNode {
  slug: string;
  label: string;
  color: string;
  icon: string;
  techs: TechNode[];
}

export interface TechNode {
  slug: string;
  label: string;
  areas: AreaNode[];
}

export interface AreaNode {
  slug: string;
  label: string;
  notes: NoteEntry[];
}

export type ContentPath =
  | { kind: "root" }
  | { kind: "category"; slug: string[]; label: string; color?: string; icon?: string }
  | { kind: "note"; note: NoteEntry };
