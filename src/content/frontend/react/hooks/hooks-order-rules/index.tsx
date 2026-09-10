import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { StepThrough } from "@/components/demo";
import { Callout, CrossRef, DoDont, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 Hook 的状态不存在组件函数里，而是按<strong>调用顺序</strong>
        挂在 Fiber 节点的 <code>memoizedState</code> 链表上——React 对号入座的唯一依据是「第 N
        次调用对应第 N 个节点」，Hook 没有名字也没有 key。放进条件、循环或提前 return
        之后，某次渲染少调一个 Hook，后面所有 Hook 整体前移：<strong>轻则读到别人的状态串台</strong>
        （数量恰巧一致时不报错，最难排查），<strong>重则数量对不上直接抛错</strong>
        崩掉渲染。约束只有一条形态要求——每次渲染以相同顺序调用相同数量的 Hook——
        eslint-plugin-react-hooks 负责把它变成静态报错。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "连续 setState 为什么只加一次：批处理",
            to: "/note/frontend/react/hooks/hooks-render",
          },
        ]}
      >
        本篇回答一个 Hooks 的存储层问题：useState 保住的那些状态，到底放在哪、靠什么找回——这是 Hooks
        全部调用纪律的根源。
      </Prerequisite>

      <Heading level={2} title="memoizedState：按调用序挂在 Fiber 上" />
      <Paragraph>
        函数组件没有实例——它就是每次渲染重新执行的一个函数，局部变量天然随调用结束消失。那 useState
        的状态存哪？答案是<strong>Fiber 节点</strong>
        ：每个 Hook 调用对应一个 hook 对象，对象上挂着该 Hook 的全部状态（useState
        的值与更新队列、useEffect 的依赖数组与清理函数……），这些对象串成一条{" "}
        <code>memoizedState</code> 链表，挂在组件的 Fiber 节点上。首次渲染（mount）时，React
        按调用顺序逐个创建节点、依次串链；更新渲染（update）时沿这条链<strong>按同样顺序</strong>
        逐个读取——第 1 次 useState 读第 1 个节点，第 2 次读第 2 个。
      </Paragraph>
      <Paragraph>
        为什么用顺序而不是名字或 key 标识？因为「调用即注册」是零声明成本的模型：你不需要给每个
        useState 起唯一的名字参数，调用这个动作本身就完成了登记。代价是
        <strong>顺序成了唯一身份</strong>
        ——这是一份契约：React 假设每次渲染的调用序列完全一致，才敢放心地按位置对号入座。自定义 Hook
        在这套机制里没有任何特权：它就是个普通函数，内部调用的 Hook
        按执行顺序串进组件的同一条链——「不能写在条件里」对自定义 Hook 内部同样生效，一点不减。
      </Paragraph>

      <Heading level={2} title="错位推演：中间少调一个的那次渲染" />
      <Paragraph>
        场景：组件里三个 useState（a、b、c），中间的 b 被包在 <code>if (cond)</code> 里。首次渲染
        cond 为 true，链上建了三个节点；某次更新 cond 变成 false，b 不再被调用——本轮只剩两次
        useState 调用。看 React 按序对号入座时发生了什么：
      </Paragraph>
      <StepThrough
        label="Hook 错位推演 / hook order"
        height={170}
        steps={[
          {
            title: "mount：三次调用，按序建链",
            color: PALETTE.blue,
            desc: "调用序 a → b → c，Fiber 的 memoizedState 链建成 [节点1: a, 节点2: b, 节点3: c]。此时调用序与节点序一一对应。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>调用 1 次 useState → 节点1 = a 的状态</div>
                <div>调用 2 次 useState → 节点2 = b 的状态</div>
                <div>调用 3 次 useState → 节点3 = c 的状态</div>
              </div>
            ),
          },
          {
            title: "update：cond = false，b 被跳过",
            color: PALETTE.orange,
            desc: "本轮只执行两次 useState 调用（a 和 c）。React 不知道「谁没来」，只知道「这次只调了两次」。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>调用 1：useState(a) → 读节点1 ✓</div>
                <div>调用 2：useState(c) → 读节点2 ← 那是 b 的节点！</div>
              </div>
            ),
          },
          {
            title: "对号入座：c 拿到了 b 的状态",
            color: PALETTE.purple,
            desc: "setC 更新写的也是节点2——b 与 c 的身份彻底互换：界面上「c 的值」其实是 b 的旧值，改 c 动的是 b 的存储。全程无任何报错。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>节点2：存的是 b 的值 → 被当成 c 读了</div>
                <div>节点3：c 的节点 → 本轮无人认领</div>
              </div>
            ),
          },
          {
            title: "更糟的一步：数量对不上直接崩",
            color: PALETTE.red,
            desc: "若 cond 分支里是提前 return，本轮只调 1 个 Hook——数量少于 mount 时，React 无链可读，直接抛错 Rendered fewer hooks than expected，整棵子树渲染失败。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>调用数 1 &lt; mount 数 3</div>
                <div>→ throw: Rendered fewer hooks than expected</div>
              </div>
            ),
          },
        ]}
      />
      <Paragraph>
        推演的结论分两级：<strong>串位不报错</strong>
        ——数量恰巧一致时，错位表现为「数据串台」，开关控制了不相关的输入框、两个状态互相对调，这是最难排查的形态；
        <strong>数量不一致抛错</strong>
        ——Rendered fewer/more hooks than during the previous
        render，组件树直接崩。前者静默污染数据，后者至少把问题暴露在控制台——两条路都不通向「能上线的代码」。
      </Paragraph>

      <Heading level={2} title="拦截与正确姿势" />
      <Paragraph>
        这条规则的本质是一个<strong>运行时不变量</strong>
        ：调用序列每次渲染必须逐位一致。人肉保证不现实（谁能保证三个月后加的分支不跳过 Hook），所以
        eslint-plugin-react-hooks 的 <code>react-hooks/rules-of-hooks</code>{" "}
        把它转成静态检查：任何执行路径上，Hook 调用都不得出现在条件、循环、return
        之后——它检查的不是「这一次跑不跑」，而是「写在不合法的位置」。工程里的正确姿势有三条：条件逻辑搬进
        Hook 的参数（<code>useState(cond ? a : b)</code>
        ，调用本身永远发生）；条件执行的逻辑搬进 useEffect 内部（effect
        里随便你早退）；按条件渲染的有状态分支拆成子组件（子组件整个挂载或卸载，各自维护完整 Hook
        链）。
      </Paragraph>
      <DoDont
        label="条件分支 / conditional hook"
        dont={{
          code: `function Form({ withEmail }: { withEmail: boolean }) {
  const [name, setName] = useState("");
  if (withEmail) {
    const [email, setEmail] = useState("");  // ← 按序错位
  }
  const [ok, setOk] = useState(false);`,
          note: "withEmail 变化一次，email 与 ok 的节点身份就互换一次——串台不报错",
        }}
        do={{
          code: `function Form({ withEmail }: { withEmail: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(withEmail ? "" : null);
  const [ok, setOk] = useState(false);
  // 调用次数恒定；「用不用」由值和渲染逻辑决定`,
          note: "条件进 Hook 参数：调用本身永远发生，链的顺序天然稳定",
        }}
      />
      <DoDont
        label="提前返回 / early return"
        dont={{
          code: `function Panel({ data }: { data: Data | null }) {
  if (!data) return <Empty />;        // ← return 在 Hook 之前
  const [open, setOpen] = useState(false);  // 某些路径不执行
  return <Detail data={data} open={open} />;`,
          note: "data 为空的渲染少调一个 Hook：数量对不上直接抛错崩渲染",
        }}
        do={{
          code: `function Panel({ data }: { data: Data | null }) {
  const [open, setOpen] = useState(false);  // Hook 全在顶部
  if (!data) return <Empty />;              // return 放最后
  return <Detail data={data} open={open} />;`,
          note: "所有 Hook 调用置于 return 之前——「最顶层」的准确含义是所有路径都会执行的顺序段",
        }}
      />
      <DoDont
        label="列表项有状态 / hooks in loops"
        dont={{
          code: `function List({ items }: { items: Item[] }) {
  items.forEach((it) => {
    const [sel, setSel] = useState(false);  // ← 循环里调 Hook
  });`,
          note: "items 长度变化 = 调用次数变化，链必然错位；循环里也轮不到你写 Hook",
        }}
        do={{
          code: `function Row({ item }: { item: Item }) {
  const [sel, setSel] = useState(false);   // 每行一个组件
  return <li onClick={() => setSel(!sel)}>...</li>;
}
// List 里 <Row key={item.id} item={it} />`,
          note: "把状态单元拆成子组件：每行一条独立 Hook 链，数量天然稳定（配稳定 key，见延伸阅读）",
        }}
      />
      <Callout kind="tip" title="自定义 Hook 同样受约束">
        useXxx 内部调用 useState/useEffect 时，这些 Hook 会按执行顺序串进调用方的同一条链——在自定义
        Hook 里写条件调用，错位的机理与组件里完全相同。规则检查器正是按这个模型工作的：自定义 Hook
        名（use 前缀）就是它给静态分析留下的「这里会调 Hook」的标记。
      </Callout>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "Rules of Hooks 的规则原文是什么？「最顶层」具体指什么？",
            intent:
              "热身题，把模糊印象收紧成两条可背的原文——规则只有两条，但「最顶层」常被理解错。",
            depth: 2,
            a: "两条：只在最顶层调用 Hook（不要在循环、条件、嵌套函数里调）；只在 React 函数中调用（函数组件或自定义 Hook）。「最顶层」不是文件顶部，而是每次渲染都会按相同顺序走到的位置——所有 Hook 调用必须位于任何 return、分支之前，与代码写在第几行无关。",
            bonus:
              "「只在 React 函数中调用」排除的是普通 JS 函数与类组件——它们没有 Fiber 节点，链表无处可挂。",
          },
          {
            q: "React 为什么用「调用顺序」标识 Hook 状态，而不是名字或 key？",
            intent:
              "考设计权衡：答出「调用即注册的零成本模型」才算理解这个选择，而不是背「React 就这么设计的」。",
            depth: 3,
            a: "因为「调用即注册」是成本最低的契约：不需要给每个 useState 传唯一标识，调用动作本身就完成了登记，读写状态和写普通变量一样轻。代价是把「调用序列稳定」设为硬约束——React 只记住顺序，就敢在每次渲染按位置对号入座。名字或 key 方案要求每个调用显式声明标识，省下的约束又以样板代码还回去。",
            bonus:
              "真要用过带 key 的同类机制可以对比：Vue 的组合式 API 同样依赖调用顺序（setup 里同一约束），这不是 React 独有的取舍。",
          },
          {
            q: "「状态串台」和「抛错崩渲染」分别在什么条件下发生？",
            intent:
              "考错位的两种后果分级——能把「静默串位」从「崩溃」里分开的人，才排查过线上问题。",
            depth: 3,
            a: "取决于本轮 Hook 数量与 mount 时是否一致。数量一致但顺序错位：对号入座照常完成，没人报错，表现为状态串台——读到别的 Hook 的值、更新写进别人的节点，最静默也最难查。数量不一致：React 沿链读到尽头无节点可给（或剩余节点无人认领），抛 Rendered fewer/more hooks than during the previous render，子树渲染失败。前者是慢性病，后者是急症。",
            bonus:
              "急症反而是好消息：抛错至少把问题钉在控制台；串台只有靠用户反馈或状态对不上的业务数据才能暴露。",
          },
          {
            q: "自定义 Hook 里的 Hook 调用怎么算顺序？在 useXxx 里写 if 合法吗？",
            intent:
              "考「自定义 Hook 无特权」这个延伸：很多人知道组件里的规则，不知道自定义 Hook 完全同一套链。",
            depth: 4,
            a: "不合法，机理与组件里完全相同。自定义 Hook 就是普通函数，它内部的 useState/useEffect 按执行顺序串进调用方组件的同一条 memoizedState 链——useToggle 里条件执行一个 useState，效果等同于在组件里条件执行。use 前缀不只是命名约定：它是 eslint-plugin-react-hooks 识别「这个函数里会调 Hook、规则适用」的标记。",
            bonus:
              "正确的条件化封装是把分支包在 Hook 的返回行为里：比如 useToggle 返回的函数内部随便你判断，Hook 本身的调用序列保持恒定。",
          },
          {
            q: "这个「按序对账」的模型让你联想到 React 的哪个其他机制？它们的失败形态像不像？",
            intent:
              "压轴题，考机制间的同构迁移——能主动关联 key 对账的人，说明 React 的「身份」心智已经成体系。",
            depth: 4,
            a: "同层列表的 key 对账。两者都是「React 只认身份标记、按标记复用既有状态」：列表节点靠 key 找回自己的 DOM 与组件状态，Hook 靠调用序找回自己的 memoizedState。失败形态也同构——身份标记错位时都是「状态落到别人头上」：index 做 key 增删后全体顶位，输入框串行；条件调用 Hook 后整条链前移，状态串台。区别只在粒度：一个在 Fiber 节点间对账，一个在链表节点间对账。",
            bonus:
              "所以两类问题的解法哲学也一致：身份标记必须稳定——列表用稳定业务 id，Hook 用恒定的调用序列，绝不给 React 错认身份的机会。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "useLayoutEffect 到底差在哪一帧？",
            to: "/note/frontend/react/hooks/effect-vs-layout-effect",
            description:
              "链上挂的不只是 state：useEffect 的依赖与清理也住在同一个节点上——它们的执行时机差在哪一帧。",
          },
          {
            title: "用 index 做 key 为什么会状态错位？",
            to: "/note/frontend/react/reconcile/key-index-mismatch",
            description:
              "同一套「身份对账」的另一处战场：列表节点靠 key 找回状态，错位同样是串台。",
          },
        ]}
      />
    </NoteShell>
  );
}
