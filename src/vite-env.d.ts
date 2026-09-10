declare module "virtual:content-registry" {
  import type { NoteEntry } from "../lib/types";
  export const notes: NoteEntry[];
}

declare module "virtual:search-index" {
  export interface SearchEntryLite {
    path: string;
    title: string;
    description: string;
    tags: string[];
    updated: string;
    text: string;
  }
  export const searchEntries: SearchEntryLite[];
}

declare module "virtual:backlinks" {
  /** 键为目标笔记 path，值为引用它的笔记 path 列表 */
  export const backlinks: Record<string, string[]>;
}
