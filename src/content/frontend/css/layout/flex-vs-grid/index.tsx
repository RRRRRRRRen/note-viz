import { Conclusion, NoteShell, Prose, QAChain, Section } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        内容沿<strong>一个方向</strong>排 → Flex；内容需要<strong>同时约束行和列</strong> → Grid。
        Grid 先定网格再放内容，Flex 先有内容再分配空间——这是两种相反的布局哲学。
      </Conclusion>

      <Section title="逐段拆解">
        <Prose>
          <p>
            <strong>1. Flex 的弹性分配</strong>：<code>flex-grow / flex-shrink / flex-basis</code>{" "}
            三件套决定剩余空间怎么分、不够空间怎么缩。默认 <code>flex: 0 1 auto</code>
            ——只缩不涨。
          </p>
          <p>
            <strong>2. min-width:auto 陷阱</strong>
            ：Flex 子项默认 <code>min-width: auto</code>
            ，内容再长也不允许收缩到内容宽度以下，长文本会把容器撑爆。解法：<code>min-w-0</code>。
          </p>
          <p>
            <strong>3. Grid 的隐式轨道</strong>：<code>grid-template-columns</code>{" "}
            定义显式轨道，塞不下的项目进入隐式行。 <code>minmax()</code> 与 <code>auto-fill</code>{" "}
            组合可以零媒体查询实现响应式卡片。
          </p>
        </Prose>
        <CodeBlock
          lang="typescript"
          code={`/* 零断点响应式卡片：每列最小 240px，自动填满 */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* 经典圣杯布局：Grid 一行搞定，Flex 要嵌套三层 */
.page {
  display: grid;
  grid-template:
    "header header" auto
    "aside  main" 1fr
    "footer footer" auto
    / 220px 1fr;
}`}
        />
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "子项文字溢出把布局撑爆了？",
              a: "九成是 Flex 子项的 min-width:auto。给该子项加 min-w-0（或 overflow:hidden），让它允许收缩到内容宽度以下。",
            },
            {
              q: "flex:1 和 flex:auto 有什么区别？",
              a: "flex:1 = 1 1 0%，按比例分配且忽略内容宽度；flex:auto = 1 1 auto，先按内容分再分剩余。等宽卡片用前者，内容自适应用后者。",
            },
            {
              q: "Grid 里 margin 和 gap 用哪个？",
              a: "间距永远优先 gap：不产生边缘多余间距、不参与尺寸计算。margin 适合单个项目的偏移而非整体节奏。",
            },
            {
              q: "为什么 justify-content 在 Grid 里行为不同？",
              a: "Flex 的 justify-content 分配的是『主轴上的剩余空间』，Grid 分配的是『网格轨道整体与容器之间』的空间。想让项目在轨道内对齐，要用 justify-items / justify-self。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}
