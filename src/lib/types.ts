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
