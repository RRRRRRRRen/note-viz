import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import langJavascript from "shiki/langs/javascript.mjs";
import langTypescript from "shiki/langs/typescript.mjs";
import themeGithubDark from "shiki/themes/github-dark-default.mjs";

/**
 * 全站唯一 highlighter 单例：core 精简入口 + 显式两语言 + JS 正则引擎。
 * 不从 "shiki" 主入口导入——那会把全量语言包打进 dist（400+ chunk、约 10MB 死重，
 * 而全站 lang 只有 javascript/typescript 两种）。
 */
let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [themeGithubDark],
    langs: [langJavascript, langTypescript],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}
