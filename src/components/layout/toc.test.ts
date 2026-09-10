// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { TOC_HEADING_SELECTOR } from "@/components/note";
import { extractHeadings, slugify } from "./Toc";

describe("slugify", () => {
  it("中文保留、符号折叠为连字符、统一小写", () => {
    expect(slugify("执行循环：从 URL 到像素", new Set())).toBe("执行循环-从-url-到像素");
  });

  it("重复 slug 加数字后缀", () => {
    const used = new Set(["结论"]);
    expect(slugify("结论", used)).toBe("结论-2");
  });
});

describe("extractHeadings", () => {
  it("提取 h2/h3 与追问链短标签并写回 id", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h2 data-toc>执行循环</h2>
      <div data-toc-item=""><h3 class="sr-only">① 热身 · 问题一</h3></div>
      <h3 data-toc>微任务队列</h3>
    `;
    const items = extractHeadings(div);
    expect(items.map((i) => i.title)).toEqual(["执行循环", "① 热身 · 问题一", "微任务队列"]);
    expect(items[0]?.level).toBe(2);
    expect(items[1]?.level).toBe(3);
    expect(div.querySelector("h2")?.id).toBeTruthy();
  });

  it("重复提取不产生重复 id（used 种子逻辑）", () => {
    const div = document.createElement("div");
    div.innerHTML = `<h2 data-toc>结论</h2><h3 data-toc>结论</h3>`;
    const first = extractHeadings(div);
    const again = extractHeadings(div);
    expect(again.map((i) => i.id)).toEqual(first.map((i) => i.id));
    const ids = first.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("选择器常量包含追问链契约（与 qa.tsx 的 data-toc-item 结构对齐）", () => {
    expect(TOC_HEADING_SELECTOR).toContain("[data-toc-item] > h3");
  });
});
