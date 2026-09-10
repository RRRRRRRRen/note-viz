import type { ComponentType } from "react";

export type Difficulty = "入门" | "进阶" | "高级";

/** 笔记类型：决定标题闸门与展示行为（draft 不进任何聚合，仅 URL 直达） */
export type NoteType = "knowledge" | "question" | "practice" | "draft";

export interface NoteMeta {
  title: string;
  description: string;
  type: NoteType;
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
  /**
   * 子节点展示顺序声明（知识面节点上即为笔记 slug 序列，按知识难度与深度排列）。
   * 只影响排序、不渲染序号；未列出的子节点排在已列出的之后（按 slug 字母序）。
   */
  order?: string[];
}
