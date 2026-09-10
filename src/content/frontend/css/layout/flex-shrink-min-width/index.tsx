import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { CrossRef, DoDont, MemoryCard, Prerequisite, SpecQuote, Table } from "@/components/viz";
import FlexShrinkSimulator from "./FlexShrinkSimulator";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        flex 子项压不到预期宽度，是三道闸门依次拦截的结果：
        <strong>
          基准（basis）定尺寸 → 加权收缩（shrink × basis，不是等比压缩）→ min-width:auto
          自动最小尺寸
        </strong>
        。前两道按公式可预测——每项收缩量 = 溢出 × (shrink × basis) ÷ 权重和；第三道是隐形下限：子项
        <strong>拒绝收缩到 min-content 以下</strong>
        ，长内容直接把布局撑爆。诊断顺序同理：先手算加权，再查 <code>min-w-0</code>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "Flex 还是 Grid：一维流与二维网格？",
            to: "/note/frontend/css/layout/flex-vs-grid",
          },
        ]}
      >
        本篇聚焦 Flex 收缩这条最深的主线；弹性三件套（grow/shrink/basis）的分配总览与 Grid
        侧的孪生坑，见布局选型篇。
      </Prerequisite>

      <Heading level={2} title="第一道闸门：加权收缩，不是等比压缩" />
      <Paragraph>
        先立一道例题：容器 600px，三个子项 basis 200/300/300、shrink 分别 1/2/1。基准总和
        800px，超出容器 200px，引擎进入负剩余空间分配。直觉答案「等比缩到 75%」给出 150/225/225——
        <strong>错的</strong>
        ，收缩引擎从头到尾没做过等比缩放，它做的是<strong>加权分摊</strong>。
      </Paragraph>
      <Paragraph>
        推导只有三步。第一步算权重：每项权重 = shrink × basis，得 200/600/300，
        <strong>权重和 1100</strong>（既不是 shrink 之和，也不是 basis 之和）。第二步分摊溢出：
        每项收缩量 = 200 × 自己的权重占比，得 36.4 / 109.1 / 54.5。第三步落账：最终宽度 163.6 /
        190.9 / 245.5。
      </Paragraph>

      <Table
        label="例题逐项账本 / worked example"
        head={["子项", "basis", "shrink", "权重 s×b", "收缩量", "最终宽度"]}
        rows={[
          ["A", "200px", "1", "200", "36.4px", "163.6px"],
          ["B", "300px", "2", "600", "109.1px", "190.9px"],
          ["C", "300px", "1", "300", "54.5px", "245.5px"],
        ]}
      />
      <Paragraph>
        和等比答案对照能看出加权的性格：B 同时占高 shrink 和大 basis，被压得远比等比更狠（190.9 对
        225）；C 与 B 同 basis、shrink 只有一半，最终反而比 B 宽 54.6px。用 MDN 的话说， shrink
        因子要乘以基准尺寸再参与分摊——<strong>shrink 是缩放意愿，basis 是加权基数</strong>
        。只有 shrink 全相同时权重退化为 basis 本身，收缩才「碰巧」等比——那是特例，不是通则。
      </Paragraph>
      <SpecQuote source="MDN · flex-shrink">
        The flex shrink factor is multiplied by the flex base size; this distributes negative space
        in proportion to how much the item can shrink.
      </SpecQuote>
      <Paragraph>
        真实引擎在这之上还有一层<strong>夹逼-冻结迭代</strong>：某项被 min/max 夹住后冻结出局，
        它分摊不掉的量重新按权重摊给未冻结项，循环到没有违约为止。上面的手算是单轮理想值，
        第二道闸门（自动最小尺寸）正是触发迭代的常见来源。
      </Paragraph>

      <Heading level={2} title="亲手拨一遍：加权收缩模拟器" />
      <Paragraph>
        模拟器的默认参数就是上面这道例题（总 basis 800、容器 600、B 的 shrink
        可调）：上方色条是浏览器真实 flex 渲染，下方三列是公式的理论值——两者对照，
        加权分配会从「背公式」变成「看得见」。
      </Paragraph>
      <FlexShrinkSimulator />

      <Heading level={2} title="第二道闸门：min-width:auto 的自动最小尺寸协议" />
      <Paragraph>
        经典事故：子项里放了一段长文本（长单词、URL、宽表格），容器被撑爆，<code>flex-shrink</code>{" "}
        好像失效了。根因是 flex 子项默认 <code>min-width: auto</code>，走
        <strong>自动最小尺寸</strong>协议——这是规范有意为之的保护，防止内容被压到完全不可读，
        代价是收缩算法碰到这条隐形下限时提前冻结。按 MDN 的归纳，flex/grid
        子项的自动最小值依次回落三档： 显式指定的尺寸 → 经 <code>aspect-ratio</code> 传递的尺寸 →{" "}
        <strong>min-content 尺寸</strong>
        ；而普通 block 的 <code>min-width: auto</code> 恒为 0——这套协议只在 flex/grid 子项上生效。
      </Paragraph>
      <Paragraph>
        min-content 对文本是<strong>最长不可断单元</strong>
        的宽度——长单词、URL、不换行的表格列都会把它抬得很高； 对图片这类替换元素则是
        <strong>固有宽度</strong>：一张 3000px 的原图，隐形下限就是
        3000px，容器再窄也压不下去，所以图片溢出得比文本更极端。协议生效时，触到下限的子项被冻结，
        溢出被转嫁给邻居；邻居也触界时容器整体溢出——这就是「压不到预期宽度」的最终形态。
      </Paragraph>
      <Paragraph>
        解法链按需递进：<code>min-w-0</code> 把隐形下限钉到 0，收回收缩权；需要裁剪保护再加{" "}
        <code>overflow</code>；要省略号就配 <code>truncate</code>。规范还留了一条捷径——
        子项成为滚动容器（overflow 非 visible）时自动最小尺寸直接归 0，所以{" "}
        <code>overflow: hidden / auto</code> 也能解开下限，但它们同时带入裁剪或滚动条语义，
        溢出呈现策略还是显式声明更可控。
      </Paragraph>

      <CodeBlock
        code={`/* 解法链：按需递进，从①到③逐级加码 */
.item { min-width: 0; }                    /* ① 解除隐形下限，收回收缩权 */

.item {                                    /* ② 需要裁剪保护：长内容不外溢 */
  min-width: 0;
  overflow: hidden;
}

.item {                                    /* ③ 省略号收尾 */
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

img { min-width: 0; max-width: 100%; }     /* 图片：下限上限双管齐下 */`}
      />

      <DoDont
        label="长文本溢出 / min-width"
        dont={{
          code: `<div class="flex">
  <span class="flex-1">
    a-very-long-unbreakable-url-slug
  </span>
</div>
/* 撑爆容器，shrink 无力回天 */`,
          note: "自动最小尺寸 = min-content：长单元把下限抬到内容宽度，收缩提前冻结",
        }}
        do={{
          code: `<div class="flex">
  <span class="flex-1 min-w-0 truncate">
    a-very-long-unbreakable-url-slug
  </span>
</div>
/* min-w-0 解除下限，truncate 出省略号 */`,
          note: "min-w-0 是 flex 子项处理长内容的第一反应，几乎总是需要的",
        }}
      />

      <DoDont
        label="图片溢出 / replaced element"
        dont={{
          code: `<div class="flex">
  <img class="max-w-full" src="hero-3000px.png" />
</div>
/* 只压上限，下限仍是 auto */`,
          note: "替换元素的隐形下限来自固有宽度：只写 max-w-full 限的是上限，3000px 原图照样撑爆",
        }}
        do={{
          code: `<div class="flex">
  <img
    class="min-w-0 max-w-full object-cover"
    src="hero-3000px.png"
  />
</div>`,
          note: "min-w-0 解除下限 + max-w-full 压住上限，双管齐下才有效",
        }}
      />

      <Heading level={2} title="嵌套陷阱：下限沿 flex 链逐层传播" />
      <Paragraph>
        多层嵌套是这条协议最容易翻车的形态：最小尺寸会沿着「内容 → 最内层子项 → 中间层子项」
        一路向上传播，<strong>中间任何一层 flex 项没解开下限，最深层写的 min-w-0 都救不回来</strong>
        ——溢出在外层那一轮收缩里就被冻结了。排查时不要只盯着出问题的那一层， 从内容往外逐层确认每个
        flex 子项的下限状态。
      </Paragraph>

      <DoDont
        label="嵌套层级 / nested flex"
        dont={{
          code: `<div class="flex">
  <div class="flex flex-1">
    <!-- 中间层没解下限 -->
    <span class="min-w-0 flex-1 truncate">
      a-very-long-unbreakable-slug
    </span>
  </div>
</div>`,
          note: "内层解了也白解：外层中间项的自动最小尺寸已被内容顶起，收缩在它那一层冻结",
        }}
        do={{
          code: `<div class="flex">
  <div class="flex min-w-0 flex-1">
    <span class="min-w-0 flex-1 truncate">
      a-very-long-unbreakable-slug
    </span>
  </div>
</div>`,
          note: "每一层会溢出的 flex 中间项都要 min-w-0：下限是逐层传播的",
        }}
      />
      <MemoryCard keyword="收缩失灵排查口诀" color="#1677ff">
        先算加权（shrink × basis），再查下限（min-width:auto）。长内容 flex 项的第一反应是{" "}
        <code>min-w-0</code>；图片配 <code>max-w-full</code>；嵌套布局
        <strong>每一层中间项都要解下限</strong>
        。任何收缩失效，先怀疑隐形下限。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "flex-shrink 全都是 1 时，收缩按什么比例分配？",
            intent:
              "热身题，先校准「shrink = 等比压缩」的默认错觉——加权公式在任何参数下都要成立，退化形态只是巧合。",
            depth: 2,
            a: "仍按 shrink × basis 加权。shrink 全相同时权重就是 basis 本身，退化为按基准尺寸占比收缩——所以「等比压缩」的说法只在这个特例里碰巧成立。权重公式的完整形态是：收缩量 = 溢出 × (shrink × basis) ÷ Σ(shrink × basis)。",
            bonus:
              "推论：flex:1（basis 为 0）的项权重恒为 0，从不参与收缩分摊；且全体 basis 归零后基准和为 0，根本不会溢出——这就是「flex:1 永不收缩」的算术根源。",
          },
          {
            q: "容器 500px，三个子项 basis 都是 200、shrink 分别 1/1/3，各自最终多宽？",
            intent:
              "把公式背下来的人一遇多变量就露馅——这题专门验证推导是否长在手上，中间步骤不能跳。",
            depth: 3,
            a: "溢出 100px。权重 = 1×200 / 1×200 / 3×200，即 200/200/600，权重和 1000。收缩量 = 100 × 权重占比 = 20/20/60，最终宽度 180/180/140。注意 shrink 为 3 的 C 项只比邻居多缩 40px 而不是三倍——收缩量按权重占比拉开，不是按 shrink 值直接乘。",
            bonus:
              "对照：若三者 shrink 全为 1，权重全 200，各缩 33.3px、最终 166.7px——正是「按 basis 等比」的退化形态，可与上一问互相印证。",
          },
          {
            q: "min-width:auto 的自动最小尺寸到底取什么值？为什么图片溢出得比文本更极端？",
            intent:
              "考自动最小尺寸协议的回落链——能答出三档回落与替换元素差异，说明读过规范行为而不是背 min-w-0 口诀。",
            depth: 4,
            a: "依次回落三档：显式指定的尺寸（width）→ 经 aspect-ratio 传递的尺寸 → min-content。文本的 min-content 是最长不可断单元（长单词、URL、表格列）；图片这类替换元素的 min-content 直接是固有宽度——3000px 的原图下限就是 3000px，容器再窄也压不下去。解法上文本加 min-w-0 即可；图片必须 min-w-0（解除下限）+ max-w-full（压住上限）双管齐下。",
            bonus:
              "这套协议只在 flex/grid 子项上生效（普通 block 的 min-width:auto 恒为 0）；表格是 min-content 重灾区，惯用做法是外面包一层 overflow-x:auto 的容器——顺带利用了「滚动容器自动最小尺寸归 0」的规则。",
          },
          {
            q: "overflow:hidden 不写 min-w-0 也能止住溢出，两者该怎么选？",
            intent:
              "考「滚动容器 → 自动最小尺寸归 0」这条规范捷径，以及把它当万能工具的副作用意识。",
            depth: 4,
            a: "都能解开下限：子项成为滚动容器（overflow 非 visible）时，自动最小尺寸直接归 0。但 overflow 同时引入裁剪或滚动语义——hidden 把内容剪掉（屏幕阅读器也读不全）、auto 长出滚动条；min-w-0 只解除下限、不改变内容的呈现方式，溢出策略交给后续显式声明（truncate、换行、子级滚动）。工程默认用 min-w-0 表达「我只要收缩权」，需要裁剪再叠加。",
            bonus:
              "overflow:hidden 还会建立独立的格式化上下文并成为 sticky 定位的滚动参照——把「解下限」和「裁剪」两件事耦合在一个属性里，是隐性回归的常见来源。",
          },
          {
            q: "手算的加权收缩，什么时候会跟浏览器实际渲染对不上？",
            intent:
              "压轴题考 §9.7 的夹逼-冻结迭代——答出「冻结与二次分配」才算把单轮公式升级成完整算法模型。",
            depth: 5,
            a: "有子项触到 min/max 时。引擎按轮分配：某项的目标尺寸撞上下限就被冻结，它「想吃却吃不下」的量（违约量）按权重重新摊给未冻结项，循环到没有违约为止。手算的单轮值只是无夹逼时的理想值——典型偏差场景：长文本项顶着 min-content 冻结，它本该承担的收缩被转嫁给邻居，邻居最终比手算值更窄。",
            bonus:
              "验证方法：给可疑项临时设 min-width:0，邻居宽度随之突变即说明发生了冻结转嫁；收缩模拟器的理论值也只在无人触界时与浏览器渲染条一致。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Flex 还是 Grid：一维流与二维网格？",
            to: "/note/frontend/css/layout/flex-vs-grid",
            description:
              "把收缩放回布局全景：两种引擎的选型决策、对齐体系，以及 Grid 侧的孪生坑 minmax(0, 1fr)。",
          },
        ]}
      />
    </NoteShell>
  );
}
