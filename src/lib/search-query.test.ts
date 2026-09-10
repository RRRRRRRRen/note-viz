import { describe, expect, it } from "vitest";
import { runSearch } from "./search-query";
import type { SearchEntryLite } from "./types";

function entry(p: Partial<SearchEntryLite>): SearchEntryLite {
  return { path: "/note/a", title: "", description: "", tags: [], updated: "", text: "", ...p };
}

describe("runSearch", () => {
  const entries = [
    entry({
      path: "/note/1",
      title: "事件循环基础",
      tags: ["JS"],
      description: "描述",
      text: "宏任务微任务",
    }),
    entry({ path: "/note/2", title: "普通笔记", tags: ["事件循环"], description: "", text: "" }),
    entry({ path: "/note/3", title: "闭包", description: "事件循环描述", text: "" }),
  ];

  it("标题命中排在标签/描述命中前", () => {
    const r = runSearch(entries, "事件循环");
    expect(r[0]?.entry.path).toBe("/note/1");
    expect(r.map((x) => x.entry.path)).toContain("/note/2");
    expect(r.map((x) => x.entry.path)).toContain("/note/3");
  });

  it("多 token 是 AND 语义", () => {
    expect(runSearch(entries, "闭包 不存在词")).toHaveLength(0);
    expect(runSearch(entries, "闭包 事件循环")).toHaveLength(1);
  });

  it("空查询返回空", () => {
    expect(runSearch(entries, "")).toEqual([]);
    expect(runSearch(entries, "  ")).toEqual([]);
  });

  it("正文命中生成含命中词的片段", () => {
    const r = runSearch(entries, "宏任务");
    expect(r[0]?.snippet).toContain("宏任务");
  });

  it("结果截断到 12 条", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      entry({ path: `/note/${i}`, title: `线程${i}` }),
    );
    expect(runSearch(many, "线程")).toHaveLength(12);
  });
});
