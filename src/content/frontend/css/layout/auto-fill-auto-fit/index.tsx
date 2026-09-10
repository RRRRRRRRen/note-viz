import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import AutoFitDemo from "./AutoFitDemo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        两者的<strong>列数计算完全相同</strong>——都由 <code>minmax</code> 下限和容器宽度决定；
        唯一差别在「项目数少于列数」时对空重复轨道的处理：<strong>auto-fill 保留空轨道占位</strong>
        ，项目宽度稳定；<strong>auto-fit 把空轨道塌缩为 0</strong>
        ，现有项目拉伸铺满整行。项目填满所有列时二者逐像素等价。响应式卡片流的首选写法是{" "}
        <code>repeat(auto-fill, minmax(240px, 1fr))</code>——零断点、零 JS。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "Flex 还是 Grid：一维流与二维网格？",
            to: "/note/frontend/css/layout/flex-vs-grid",
          },
        ]}
      >
        <code>repeat</code>、<code>minmax</code> 与 fr 轨道的基本语义在布局选型篇的 Grid
        深拆小节有总览，本篇聚焦 auto-repeat 这一个机制的精确行为。
      </Prerequisite>

      <Heading level={2} title="列数是算出来的，不是写出来的" />
      <Paragraph>
        <code>repeat(auto-fill, minmax(240px, 1fr))</code> 的执行过程：引擎用「下限 240px + gap」
        去试除容器宽度，取不溢出的最大整数列数；每列上限是
        1fr，剩余空间再均分给所有列。列数随容器宽度自动增减——
        <strong>没有任何媒体查询参与</strong>，也不需要 JS 测量。关键认知是：auto-repeat 的列数在
        <strong>轨道定义阶段</strong>就已确定，跟项目有几个、内容多宽都无关。
      </Paragraph>
      <Paragraph>
        <code>minmax</code> 的两个分量各管一段：下限是列的<strong>最低保障</strong>（至少
        240px），1fr 是<strong>剩余空间的分配比例</strong>（先保底、后均分）。下限写{" "}
        <code>auto</code> 或 <code>min-content</code> 是常见错误——轨道会被最宽的内容撑破，
        等分随之失效（这与 Flex 的 <code>min-width: auto</code> 是同一套自动最小尺寸协议）；
        下限请给固定值或 0。
      </Paragraph>

      <CodeBlock
        code={`/* 零断点响应式卡片流的标配写法 */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
/* 容器 1000px、gap 16px：(1000 + 16) / (240 + 16) ≈ 3.96 → 3 列 */
/* 每列先拿 240px 保底，剩余 488px 由 1fr 均分 */`}
      />

      <Heading level={2} title="差别只在空轨道：保留还是塌缩" />
      <Paragraph>
        空轨道指放置完成后<strong>没有任何项目落入</strong>的重复轨道。auto-fill
        保留它们继续占位：每个项目守着自己那份 1fr 列宽，数量变化时项目宽度稳定；auto-fit 把空轨道
        <strong>塌缩为 0</strong>（两侧 gap 一并折叠），省出来的空间被 1fr
        重新均分，现有项目拉伸铺满整行。
      </Paragraph>
      <SpecQuote source="MDN · repeat() · auto-fit">
        The auto-fit value behaves the same as auto-fill, except that after placing the grid items
        any empty repeated tracks are collapsed. A collapsed track is treated as having a single
        fixed track sizing function of 0px, and the gutters on either side collapse.
      </SpecQuote>
      <Paragraph>
        注意塌缩发生的阶段：它在<strong>布局的轨道定义阶段</strong>由引擎完成，纯 CSS 行为——「只有 1
        个项目却铺满一行」不是媒体查询魔法，是空轨道塌缩后的自然结果。
        而项目数不少于列数时不存在空轨道，auto-fill 与 auto-fit 的渲染逐像素相同。
      </Paragraph>

      <AutoFitDemo />

      <CompareTable
        label="对比 / auto-fill vs auto-fit"
        left={{
          title: "auto-fill",
          color: PALETTE.blue,
          points: [
            "空轨道：保留占位，轨道照常计宽",
            "项目宽度：稳定，不随项目数变化",
            "显式 line 号定位：安全，轨道线都在",
            "适用：项目数不定的列表，宽度一致性优先",
          ],
        }}
        right={{
          title: "auto-fit",
          color: PALETTE.purple,
          points: [
            "空轨道：塌缩为 0，两侧 gap 折叠",
            "项目宽度：拉伸铺满剩余空间",
            "显式 line 号定位：危险，可能掉进 0 宽轨道",
            "适用：项目少而大，展示效果优先",
          ],
        }}
      />

      <Heading level={2} title="选型与各自的坑" />
      <Paragraph>
        选型只看一个问题：<strong>项目数少时，你要「列宽稳定」还是「铺满整行」</strong>
        。内容列表、卡片流这类「宽度一致 = 秩序感」的场景选 auto-fill；英雄区、标签行、
        少量大卡这类「少时更要气场」的场景选 auto-fit。写法上最常见的错误是用媒体查询手写断点列数
        ——auto-repeat 本来就是为替代它而生的。
      </Paragraph>

      <DoDont
        label="响应式列数 / responsive columns"
        dont={{
          code: `/* 手写断点：每个断点都要维护 */
.cards { grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
}`,
          note: "断点间宽度仍会浪费，断点数值与内容无关——纯手工响应式",
        }}
        do={{
          code: `.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}`,
          note: "一行声明：列数随容器自适应，240px 下限保证可读性",
        }}
      />
      <Paragraph>
        三个高频坑：<strong>其一</strong>，gap 参与列数计算——容器宽在临界值 ±1px
        时列数增减，项目宽度整体跳变，做宽度过渡动画时会观察到抖动，属预期行为而非 bug；
        <strong>其二</strong>，auto-fit 配显式定位（<code>grid-column: 3</code>
        ）时，项目会落进塌缩后的 0 宽轨道——线号照常计数、轨道宽 0，元素肉眼不可见；
        <strong>其三</strong>，minmax 下限写 <code>min-content</code> 或 <code>auto</code>
        ，内容一宽轨道就破格等分。
      </Paragraph>

      <DoDont
        label="显式定位 / line number"
        dont={{
          code: `.gallery { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
.gallery .feature { grid-column: 3; }
/* 项目只有 1 个时：第 2、3 条轨道已塌缩为 0 */`,
          note: "塌缩轨道的线号仍在，feature 被塞进 0 宽轨道——渲染了但看不见",
        }}
        do={{
          code: `/* 需要显式定位 → 用 auto-fill，轨道永在 */
.gallery { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
.gallery .feature { grid-column: 3; }`,
          note: "auto-fill 不塌缩轨道，显式 line 号定位始终落在真实列上",
        }}
      />
      <MemoryCard keyword="auto-repeat 口诀" color={PALETTE.purple}>
        列数计算相同，差别只在空轨道：<strong>auto-fill 保留占位</strong>（宽度稳定），
        <strong>auto-fit 折叠空轨道</strong>（现有项目铺满）。项目填满时等价；需要显式 line
        号定位就锁死 auto-fill。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "auto-fill 和 auto-fit 算出的列数什么时候不一样？",
            intent: "热身题，先把「列数不同」这个最常见的误解拆掉——两者的差异根本不在列数上。",
            depth: 2,
            a: "永远一样。两者用同一套规则计算重复次数：以 minmax 下限加 gap 试除容器宽，取不溢出的最大整数——这一步不涉及项目数量。差异出现在放置之后：auto-fill 保留没有项目的空轨道，auto-fit 把空轨道塌缩为 0 并折叠两侧 gap。",
            bonus:
              "规范还规定计算重复次数时轨道尺寸会向下取整到浏览器指定的最小值（如 1px），避免除零——这就是极窄容器下列数至少为 1 的来源。",
          },
          {
            q: "只有 1 个项目时 auto-fit 为什么能铺满整行？塌缩发生在哪个阶段？",
            intent:
              "考塌缩的执行时机——能答出「轨道定义阶段、纯 CSS」说明理解了布局流水线，而不是背「一个占位一个填充」。",
            depth: 3,
            a: "轨道定义阶段就完成了：引擎先按 auto-fill 的规则生成全部轨道并放置项目，随后把没有项目的重复轨道塌缩为 0px、折叠两侧 gap，剩余空间由 1fr 重新均分——单项目自然铺满整行。全程纯 CSS，没有媒体查询、没有 JS 参与。",
            bonus:
              "极端情况：所有重复轨道都为空时可以全部塌缩——这也是「空网格不占位」的写法依据；塌缩只作用于 auto-repeat 生成的重复轨道，显式声明的轨道不会被折。",
          },
          {
            q: "minmax(240px, 1fr) 的两个分量各管什么？下限能写 min-content 吗？",
            intent:
              "考 minmax 与 fr 的精确语义——答出「下限保底、1fr 均分」是及格线，指出自动最小尺寸的坑才是加分层。",
            depth: 3,
            a: "下限是每列的最低保障（240px 保底），1fr 是剩余空间的分配比例——引擎先扣掉所有保底，再把剩余空间按 fr 均分。下限不建议写 min-content 或 auto：轨道会被最宽的内容撑破，等分失效。要弹性用固定值或 0——minmax(0, 1fr) 就是对「下限钉到 0」的标准写法。",
            bonus:
              "这与 Flex 子项的 min-width:auto 是同一套自动最小尺寸协议的两副面孔：minmax(0, 1fr) 之于 Grid，正如 min-w-0 之于 Flex。",
          },
          {
            q: "auto-fit 网格里写了 grid-column: 3 的元素，最终渲染到哪了？",
            intent:
              "考塌缩轨道与显式线号的交互——这是 auto-fit 最隐蔽的坑，答出「轨道还在、宽为 0」才算读过规范行为。",
            depth: 4,
            a: "塌缩不删除轨道：被折叠的轨道以 0px 的固定尺寸留在轨道列表里，线号照常计数。所以 grid-column: 3 定位仍指向第 3 条线之间——只是那列可能宽 0、两侧 gap 也折叠了，元素被挤压成不可见或贴在缝隙里。需要显式 line 号定位的场景应该用 auto-fill（轨道永远真实存在），或改用命名区域避开裸线号。",
            bonus:
              "调试线索：DevTools 的 Grid 面板能直接看到 0 宽轨道与折叠后的 gap；getComputedStyle 读 gridTemplateColumns 也会把塌缩轨道显示为 0px——本篇的实测 demo 用的正是这一点。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Flex 还是 Grid：一维流与二维网格？",
            to: "/note/frontend/css/layout/flex-vs-grid",
            description: "回到布局全景：两种引擎的选型决策树、对齐体系与典型场景的标杆写法。",
          },
          {
            title: "flex 子项为什么压不到预期宽度？",
            to: "/note/frontend/css/layout/flex-shrink-min-width",
            description: "同知识面的另一条深拆线：加权收缩算法与 min-width:auto 自动最小尺寸协议。",
          },
        ]}
      />
    </NoteShell>
  );
}
