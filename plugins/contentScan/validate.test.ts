import { describe, expect, it } from "vitest";
import { resolveTaxonomyNode, validateMetaSource } from "./validate";

const base = `title: "git 的三个区是怎么分工的？",
description: "描述",
type: "knowledge",
difficulty: "入门",
tags: ["Git"],
updated: "2026-09-10",`;

describe("validateMetaSource", () => {
  it("六字段齐全的 knowledge 笔记通过", () => {
    expect(validateMetaSource(base)).toEqual([]);
  });

  it("缺字段被点名", () => {
    const errors = validateMetaSource(base.replace('tags: ["Git"],\n', ""));
    expect(errors).toContain('缺少必填字段 "tags"');
  });

  it("type 枚举外取值报错", () => {
    const errors = validateMetaSource(base.replace('"knowledge"', '"tutorial"'));
    expect(errors.some((e) => e.includes("type 非法"))).toBe(true);
  });

  it("question 类型必须问句标题", () => {
    const src = base
      .replace('"knowledge"', '"question"')
      .replace("git 的三个区是怎么分工的？", "git 三区分工机制");
    expect(validateMetaSource(src).some((e) => e.includes("必须是问句"))).toBe(true);
  });

  it("knowledge 允许陈述式标题", () => {
    expect(
      validateMetaSource(base.replace("git 的三个区是怎么分工的？", "git 三区分工机制")),
    ).toEqual([]);
  });

  it("draft 免标题检查", () => {
    const src = base.replace('"knowledge"', '"draft"').replace("git 的三个区是怎么分工的？", "x");
    expect(validateMetaSource(src)).toEqual([]);
  });

  it("超长标题报错", () => {
    const long = "超".repeat(26);
    const errors = validateMetaSource(base.replace("git 的三个区是怎么分工的？", long));
    expect(errors.some((e) => e.includes("超过 25"))).toBe(true);
  });
});

describe("resolveTaxonomyNode", () => {
  it("合法路径解析到知识面节点", () => {
    const r = resolveTaxonomyNode(["devtools", "git", "basics"]);
    expect(r.node?.label).toBeTruthy();
  });

  it("缺失段返回段名", () => {
    const r = resolveTaxonomyNode(["devtools", "nonexistent", "x"]);
    expect(r.missing).toBe("nonexistent");
  });
});
