import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, FlowChart } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, Timeline } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        内容沿<strong>一个方向</strong>排 → Flex；需要<strong>同时约束行和列</strong> → Grid。 Grid
        先定网格再放内容（layout-out），Flex 先有内容再分配空间（content-out）——两种相反的布局哲学。
        拿不准时记住经验法则：<strong>组件内部的一维排列用 Flex，页面骨架与二维网格用 Grid</strong>
        ；嵌套组合（外 Grid 内 Flex）是常态而非妥协。两个引擎共有的第一坑是
        <strong>自动最小尺寸</strong>：Flex 解法 <code>min-w-0</code>，Grid 解法{" "}
        <code>minmax(0, 1fr)</code>。
      </Conclusion>

      <Heading level={2} title="两种布局哲学：content-out vs layout-out" />
      <Paragraph>
        Flexbox 是<strong>一维</strong>布局：项目沿一条主轴排布，<code>flex-wrap</code>{" "}
        虽然能换行，但换出的每一行都是一条<strong>独立主轴</strong>
        ——行与行之间如何对齐、列是否要跨行看齐，Flex 一概不管。Grid 是<strong>二维</strong>
        布局：先用 <code>grid-template</code> 把行列轨道定死，再把内容放进格子里，行列天然构成体系。
      </Paragraph>
      <Paragraph>
        这决定了两者完全相反的工作顺序：Flex 是 content-out——先有内容，再看空间怎么分；Grid 是
        layout-out——先有网格，再决定内容放哪。理解这一点，「为什么 Grid 做页面骨架更舒服、Flex
        做组件内部更顺手」就不言自明了。
      </Paragraph>

      <CompareTable
        label="心智模型 / mental model"
        left={{
          title: "Flex = 一维流（content-out）",
          color: PALETTE.purple,
          points: [
            "先有内容，再沿主轴分配空间",
            "只管一条轴：wrap 后每行独立，行间关系不归它管",
            "项目尺寸驱动布局（flex-basis 以内容为基准）",
            "适合：组件内部、工具条、导航栏、表单行",
          ],
        }}
        right={{
          title: "Grid = 二维网格（layout-out）",
          color: PALETTE.blue,
          points: [
            "先定行列轨道，内容填进格子",
            "行列同时约束：跨行跨列、行间对齐成体系",
            "轨道驱动布局（grid-template 先行）",
            "适合：页面骨架、卡片网格、需要行间看齐的场景",
          ],
        }}
      />
      <MemoryCard keyword="拿不准时的经验法则" color={PALETTE.blue}>
        组件内部一维排列 → Flex；页面骨架、卡片网格、跨行对齐 → Grid；两者都要 → 外 Grid 定骨架、内
        Flex 排细节。<strong>选型不是二选一，是分工。</strong>
      </MemoryCard>

      <Heading level={2} title="Flex 深拆：弹性三件套的分配算法" />
      <Paragraph>
        <code>flex-grow / flex-shrink / flex-basis</code> 三件套的默认值是 <code>0 1 auto</code>
        ——只缩不涨。真正决定布局的是浏览器内部的分配顺序：先定基准，再算剩余，最后按弹性分派。
      </Paragraph>

      <Timeline
        label="弹性分配算法 / flex algorithm"
        steps={[
          { label: "定基准 basis", sub: "auto = 内容尺寸", color: PALETTE.blue },
          { label: "算剩余空间", sub: "容器 − Σbasis", color: PALETTE.orange },
          { label: "正剩余 → grow", sub: "按 grow 比例分", color: PALETTE.green },
          { label: "负剩余 → shrink", sub: "shrink × basis 加权", color: PALETTE.red },
          { label: "min/max 夹逼", sub: "触边冻结，二次分配", color: PALETTE.purple },
        ]}
      />
      <Paragraph>
        关键在第四步：<strong>收缩不是等比压缩</strong>。每项承担的收缩量 = 溢出量 × (shrink ×
        basis) ÷ 权重和——shrink 是缩放意愿，basis 是加权基数。这道公式的完整推导、逐项账本与 min/max
        夹逼-冻结迭代，见文末延伸阅读的收缩专题篇。
      </Paragraph>
      <Paragraph>
        收缩失灵还有一道更隐蔽的闸门：flex 子项默认 <code>min-width: auto</code> 的
        <strong>自动最小尺寸</strong>——子项拒绝收缩到自身 min-content
        以下（图片这类替换元素则是固有尺寸）， 长内容直接把容器撑爆、shrink 看似失效。协议细节与{" "}
        <code>min-w-0</code> 解法链同样收进收缩专题篇，本篇不再展开。
      </Paragraph>
      <Paragraph>
        顺带把最容易混的两个缩写掰开：<code>flex: 1</code> 是 <code>1 1 0%</code>
        ——基准归零、纯按 grow 比例分，内容宽度完全不影响结果；<code>flex: auto</code> 是{" "}
        <code>1 1 auto</code>
        ——先按内容分，剩余再均分。等宽卡片、工具条用前者；内容自适应、不想忽略内容差异时用后者。
      </Paragraph>

      <DoDont
        label="等宽分派 / equal split"
        dont={{
          code: `.card { flex: auto; }
/* 三张卡片内容长短不一 */
/* → 宽度跟着内容走，参差不齐 */`,
          note: "flex:auto 以内容为基准：内容差异直接写进宽度，等宽场景翻车",
        }}
        do={{
          code: `.card { flex: 1; }
/* = flex: 1 1 0% */
/* → basis 归零，纯按比例等分 */`,
          note: "flex:1 忽略内容宽度，剩余空间纯按 grow 比例分配",
        }}
      />

      <Heading level={2} title="Grid 深拆：轨道、fr 与命名区域" />
      <Paragraph>
        <code>grid-template-columns</code> 定义<strong>显式轨道</strong>
        ；塞不进显式轨道的项目会掉进
        <strong>隐式行/列</strong>（由 <code>grid-auto-rows</code> 等控制尺寸）。fr
        的准确语义不是「等分单位」，而是「<strong>剩余空间分配比例</strong>
        」：浏览器先满足非弹性部分（px、auto、内容约束），剩余空间才按 fr 比例分。所以{" "}
        <code>200px 1fr 1fr</code> 是「先扣 200px，余下对半」，而不是三等分。
      </Paragraph>
      <Paragraph>
        fr 最大的红利是与 <code>repeat</code>、<code>minmax</code> 组合出
        <strong>零媒体查询</strong>的响应式网格——auto-fill 与 auto-fit
        的精确差异（空轨道保留还是塌缩）单独成篇实测讲解，见文末延伸阅读。另一个杀手锏是{" "}
        <code>grid-template-areas</code>
        ：用带名字的字符串直接画出页面骨架，圣杯布局一行搞定，Flex 要嵌套三层才能做到。
      </Paragraph>

      <CodeBlock
        code={`/* 经典圣杯布局：网格区域即图纸 */
.page {
  display: grid;
  grid-template:
    "header header" auto
    "aside  main" 1fr
    "footer footer" auto
    / 220px 1fr;
}`}
      />

      <Heading level={2} title="Grid 的同款坑：1fr 也会溢出" />
      <Paragraph>
        Flex 有 min-width:auto，Grid 有一模一样的孪生问题：<code>1fr</code> 轨道的默认最小尺寸是{" "}
        <code>auto</code>，即<strong>轨道内所有项目 min-content 的最大值</strong>
        。往格子里塞一个长单词或宽表格，轨道被撑破，<code>repeat(3, 1fr)</code>{" "}
        的「等分」瞬间失效——而且和 Flex 一样，页面不报错，只是布局悄悄走样。
      </Paragraph>
      <Paragraph>
        解法与 Flex 同源（它们本来就是同一套自动最小尺寸协议的两副面孔）：把 fr 的隐形下限显式钉到
        0——<code>minmax(0, 1fr)</code>；或者给子项加 <code>min-w-0</code>
        。分栏布局（如「侧栏 + 内容区」）几乎永远应该写 <code>minmax(0, 1fr)</code> 而不是裸{" "}
        <code>1fr</code>，这是 Grid 时代的肌肉记忆。
      </Paragraph>

      <DoDont
        label="等分轨道 / fr track"
        dont={{
          code: `.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
}
/* 内容区出现长 URL → 轨道被撑破 */`,
          note: "裸 1fr 的最小尺寸是 auto：内容一长，轨道不再等分",
        }}
        do={{
          code: `.layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
}
/* 下限钉到 0，等分不再受内容要挟 */`,
          note: "minmax(0, 1fr) 与 Flex 的 min-w-0 异曲同工，分栏场景的默认写法",
        }}
      />
      <MemoryCard keyword="同源陷阱：自动最小尺寸" color={PALETTE.red}>
        Flex 的 <code>min-w-0</code> 和 Grid 的 <code>minmax(0, 1fr)</code> 是同一个问题的两副面孔：
        <strong>子项/轨道默认拒绝收缩到内容以下</strong>
        。任何收缩或等分失效，先怀疑隐形下限，解法都是显式把下限钉到 0。
      </MemoryCard>

      <Heading level={2} title="对齐体系：同一属性，两套语义" />
      <Paragraph>
        Flex 只有两条轴：<code>justify-*</code> 管<strong>主轴</strong>、<code>align-*</code> 管
        <strong>交叉轴</strong>（换 <code>writing-mode</code> 或 <code>flex-direction</code>{" "}
        会换轴，属性名不变语义变）。Grid 则是行列各一套、每套三层： <code>-content</code> 管
        <strong>轨道组与容器之间</strong>、<code>-items</code> 管<strong>项目在格子内</strong>、
        <code>-self</code> 单项覆盖——共 3×2 个属性，粒度细得多。
      </Paragraph>
      <Paragraph>
        最常见的困惑正是层次错位：Grid 里写了 <code>justify-content: center</code>{" "}
        项目却没在格子里居中——因为它居中的是「整组轨道」，项目在轨道内的对齐要用{" "}
        <code>justify-items</code> / <code>justify-self</code>。间距同理：格点系统里永远优先{" "}
        <code>gap</code>——它不参与项目尺寸计算、不产生首尾多余间距；<code>margin</code>{" "}
        留给单项偏移和 auto 吸收剩余空间（如导航栏右贴：<code>margin-left: auto</code>）。
      </Paragraph>

      <CompareTable
        label="对齐三层 / alignment"
        left={{
          title: "Flex：两轴两族",
          color: PALETTE.purple,
          points: [
            "justify-* 沿主轴、align-* 沿交叉轴",
            "-content 分配轴上的剩余/溢出空间（多行时 align-content 才生效）",
            "align-items / align-self 管交叉轴上的项目对齐",
            "主轴/交叉轴随 flex-direction 变化（column 时主轴即块方向），属性名不变",
          ],
        }}
        right={{
          title: "Grid：两轴三层",
          color: PALETTE.blue,
          points: [
            "-content：轨道组 vs 容器（分布整组轨道）",
            "-items：项目在格子内的默认对齐",
            "-self：单个项目覆盖",
            "justify-* 沿行内轴（行内方向）、align-* 沿块轴（块方向），固定不变，行列各一套",
          ],
        }}
      />

      <DoDont
        label="对齐层次 / alignment layers"
        dont={{
          code: `.grid {
  display: grid;
  grid-template-columns: repeat(3, 160px);
  justify-content: center; /* 想让项目在格子里居中 */
}
/* 动的是整组轨道，项目纹丝不动 */`,
          note: "justify-content 面向轨道组与容器之间的空间，管不着项目在格子内的位置",
        }}
        do={{
          code: `.grid {
  display: grid;
  grid-template-columns: repeat(3, 160px);
  justify-items: center; /* 每个项目在自己格子内居中 */
}`,
          note: "-items / -self 才管格子内的项目对齐；-content 永远面向轨道组",
        }}
      />

      <Heading level={2} title="经典场景与选型决策" />
      <Paragraph>
        把前面所有机制收拢成一棵决策树，日常选型基本可以在十秒内完成——记住「外 Grid 内
        Flex」的组合才是常态：
      </Paragraph>

      <FlowChart
        label="选型决策 / decision"
        height={300}
        data={{
          direction: "TB",
          nodes: [
            { id: "start", label: "需要同时约束行和列吗？", color: PALETTE.orange },
            { id: "grid", label: "页面骨架 / 卡片网格 / 跨行对齐 → Grid", color: PALETTE.blue },
            {
              id: "flex",
              label: "组件内一维排列（工具条/导航/表单行）→ Flex",
              color: PALETTE.purple,
            },
            { id: "both", label: "外 Grid 定骨架，内 Flex 排细节", color: PALETTE.green },
          ],
          edges: [
            { source: "start", target: "grid", label: "要（二维约束）" },
            { source: "start", target: "flex", label: "不要（一维流）" },
            { source: "grid", target: "both", label: "格子里还有内容要排" },
            { source: "flex", target: "both", label: "组件要放进骨架格子" },
          ],
        }}
      />
      <Paragraph>
        典型场景逐个过一遍：<strong>导航栏、工具条</strong>是一维流，Flex 最顺手，右侧菜单用{" "}
        <code>margin-left: auto</code> 一行解决；<strong>卡片流</strong>
        数量不定又要换行对齐，auto-fill + minmax 零断点搞定；<strong>页面骨架</strong>
        （头/侧栏/主体/脚）行列同时约束，grid-template-areas 一图胜千言；<strong>表单行</strong>
        （label + input）一维排布，Flex；<strong>sticky footer</strong> 用 Grid 的{" "}
        <code>auto 1fr auto</code> 三行轨道，中段自动撑满。场景对上了，写法基本是唯一的：
      </Paragraph>

      <CodeBlock
        code={`/* 导航栏：一维流，右侧菜单 auto margin 顶到最右 */
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav .spacer { margin-left: auto; }

/* 卡片流：数量不定、自动换行、零断点 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* sticky footer：三行轨道，中段自动撑满 */
.page {
  display: grid;
  min-height: 100vh;
  grid-template-rows: auto 1fr auto;
}`}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "flex-basis 和 width 到底谁说了算？column 方向呢？",
            intent:
              "热身题，看你是否把 basis 背成「优先级更高的 width」——它的本质是主轴尺寸，不是横坐标属性。",
            depth: 2,
            a: "basis 是「主轴方向的基准尺寸」，width 只是横坐标的属性名。flex-direction: row 时 basis 覆盖 width（basis 为 auto 才回落到 width）；column 时 basis 管的是 height，width 退居交叉轴。所以「basis 优先于 width」的背法只在 row 方向成立——本质是 basis 永远描述主轴，换方向它就换属性。",
            bonus:
              "完整的尺寸决定链：min/max 始终最外层夹逼；内层是 basis（auto 时依次回落到 width/height、再回落到 content）。",
          },
          {
            q: "flex:1 和 flex:auto 都是 grow/shrink 全开，差在哪？等宽卡片该用哪个？",
            intent:
              "考三件套缩写的精确展开——背过「flex:1 等分」的人，多半说不出 auto 分支的基准语义。",
            depth: 3,
            a: "flex:1 展开是 1 1 0%——基准归零，空间纯按 grow 比例分，内容宽度完全不参与结果；flex:auto 是 1 1 auto——先按各自内容的基准分，剩余空间再均分。等宽卡片、工具条要「无视内容差异」用 flex:1；想让内容长短保留进宽度的自适应项用 flex:auto。",
            bonus:
              "flex:1 的项 basis 为 0，收缩权重 shrink × basis 也是 0——它从不参与收缩分摊，容器超载时被挤压的是它的邻居。",
          },
          {
            q: "flex-wrap 换行之后，行与行之间的对齐和间距归谁管？",
            intent:
              "考「一维」二字的落地：wrap 出的多行到底是不是网格、能不能跨行看齐——答「align-items」的直接出局。",
            depth: 3,
            a: "归 align-content——但只在容器真的换行出多条 flex line 时才生效，单行容器里它是无效属性。行内分布用 justify-content、行间分布用 align-content。wrap 后的每一行都是独立主轴，项目在不同行之间如何跨行看齐 Flex 一概不管——需要这种二维关系，就该换 Grid。",
            bonus:
              "常见的坑：容器高度富余时给单行 flex 写 align-content: center 毫无反应——先确认是否真的多行，单行内对齐用 align-items。",
          },
          {
            q: "margin:auto 为什么在 Flex 里能居中，在普通 block 布局里不行？",
            intent:
              "考「auto margin = 吸收剩余空间」这个分配本质——理解它，justify-content 与 auto margin 的优先级就全通了。",
            depth: 4,
            a: "margin 上的 auto 语义是「把该方向的剩余空间分给我」。普通 block 布局垂直方向没有「分配剩余空间」这个动作（块从上往下流），auto 退化为 0；Flex/Grid 是分配式布局，剩余空间先被 auto margin 吃掉，剩下的才轮到 justify-content——所以 auto margin 的优先级高于对齐属性。导航栏「右侧菜单」的 margin-left:auto 正是这个机制：把左边的剩余空间全部吃掉，自己贴到最右。",
            bonus:
              "推论：justify-content:center 与 margin:auto 并存时，auto margin 先分；Grid 里 auto margin 在项目所在轨道内分配，同样优先于 align/justify。",
          },
          {
            q: "subgrid 和 container queries 分别解决什么问题？它们怎么改变 Flex/Grid 分工？",
            intent:
              "收尾题看技术雷达——停留在「都能用」的人，答不出各自针对的痛点与「骨架响应容器、组件响应格子」的组合关系。",
            depth: 4,
            a: "subgrid 解决「嵌套网格轨道不一致」：子网格继承父级的轨道定义，「每张卡片的标题行跨卡片对齐」不再靠魔法数字凑；container queries 解决「组件只能看视口脸色」：组件按容器宽度而非视口宽度响应，真正成为自包含单元。两者与「组件内部 Flex、页面骨架 Grid」的分工天然契合——骨架响应容器、组件响应自己的格子。",
            bonus:
              "@container 查询前要先给容器声明 container-type（inline-size 最常用）；subgrid 的主要约束是兼容面——落地前查兼容性，渐进增强不阻塞主路径。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "flex 子项为什么压不到预期宽度？",
            to: "/note/frontend/css/layout/flex-shrink-min-width",
            description:
              "加权收缩公式的完整推导与 min-width:auto 自动最小尺寸协议——本篇收缩两段的深拆版。",
          },
          {
            title: "auto-fill 和 auto-fit 差在哪？",
            to: "/note/frontend/css/layout/auto-fill-auto-fit",
            description: "auto-repeat 的精确行为：空轨道保留 vs 塌缩的真实渲染实测与选型场景。",
          },
          {
            title: "为什么改一个样式会引发重排：回流与重绘",
            to: "/note/frontend/browser/fundamentals/reflow-repaint",
            description: "布局算完之后的成本线：脏位标记、失效传播与布局抖动的引擎机制。",
          },
        ]}
      />
    </NoteShell>
  );
}
