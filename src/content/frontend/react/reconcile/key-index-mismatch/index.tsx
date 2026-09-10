import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { StepThrough } from "@/components/demo";
import { CrossRef, DoDont, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 index 描述的是<strong>位置</strong>，而 key 要表达的是<strong>身份</strong>
        。增删或排序后所有 index 集体顶位，React 对账时只看 key——它以为「key 0
        还是那个元素」，于是把旧节点（连 DOM
        和组件状态一起）复用给了新数据：非受控输入残留、动画重放、选中串位全是这一个机制。纯静态只读列表用
        index 无害；只要会增删、排序或列表项有内部状态，就用稳定业务 id。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
          },
        ]}
      >
        diff 发生在 render
        阶段：组件函数算出新的元素树后，协调器（reconciler）负责回答「新树和旧树怎么对上」。本篇只深挖对账算法里最锋利的一把刀——key。
      </Prerequisite>

      <Heading level={2} title="三假设：把树 diff 从 O(n³) 压到 O(n)" />
      <Paragraph>
        先看为什么需要假设。两棵任意树的「最小编辑距离」是经典难题，精确解是
        O(n³)——一棵几百个节点的组件树根本付不起。React 的破局思路不是优化算法，而是
        <strong>放弃通用性换性能</strong>
        ：承认 UI 有三条经验规律，把它们当作前提写死——① 不同类型的元素直接销毁重建，不尝试复用（一个
        div 变成 span，子树整棵推倒）；② 同层节点比较，不跨层移动；③ 同层多个子节点用{" "}
        <strong>key</strong> 标识身份。三条假设叠加，复杂度降到 O(n)。
      </Paragraph>
      <Paragraph>
        假设②的工程含义经常被低估：把一个子树从 <code>&lt;div&gt;</code> 移到另一个父节点下，React
        不会「移动」它，而是旧的销毁、新的重建——组件的本地状态随之清零。要保状态，要么把状态提升到共同的父级，要么给子树一个稳定的
        key 并让它留在同一层。这三条假设是 react.dev《Preserving and Resetting
        State》一整章反复展开的规则来源，本篇聚焦其中最难缠的第③条。
      </Paragraph>

      <Heading level={2} title="对账规则：key 相同且类型相同才复用" />
      <Paragraph>
        「复用」在 React 里的含义比直觉重得多：key 相同且类型相同，React 会把旧节点连
        <strong>真实 DOM</strong>、连<strong>组件实例</strong>、连<strong>hooks 状态链</strong>
        一起留给新元素，只更新变化的 props。列表重排时，React 按 key
        对账、移动既有节点，而不是销毁重建——这是 key 带来的全部好处，也是 key
        用错时伤害的通道：身份一旦被错认，被「复用」的就是别人的 DOM 和状态。
      </Paragraph>
      <Paragraph>
        引擎层面的对账分两步：先把旧子节点的 key/type
        建成映射，再遍历新列表逐个判定——命中则复用，未命中则新建，旧列表里多出来的删除。移动判定上，React
        用的是<strong>单向扫描</strong>
        ：维护一个「最后已就位」的下标（lastPlacedIndex），遍历中新节点的旧下标比它小就标记移动。注意这与「最长递增子序列（LIS）」无关——LIS
        是 Vue 3 列表 diff 的方案，追求最少移动次数；React 的算法更简单，可能多移几次 DOM，但单趟
        O(n)。两个框架的方案经常被混着记，别搞混。
      </Paragraph>

      <Heading level={2} title="错位推演：删除头部那一帧发生了什么" />
      <Paragraph>
        场景：用户列表 <code>users = [alice, bob, carol]</code>，用 index 做 key，每个 UserRow
        里有一个非受控输入框，alice 已经在里面打了字。现在删除
        alice。开发者预期「剩两行原样保留」，实际发生的是：
      </Paragraph>
      <StepThrough
        label="index key 错位推演 / mismatch"
        height={150}
        steps={[
          {
            title: "初始渲染：身份 = 位置",
            color: "#1677ff",
            desc: "key 取 index：alice→0、bob→1、carol→2。React 记住的是「key 0 = alice 的节点」，身份绑定在位置上。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>0: &lt;UserRow user=&quot;alice&quot;&gt; 输入:「hi」</div>
                <div>1: &lt;UserRow user=&quot;bob&quot;&gt;</div>
                <div>2: &lt;UserRow user=&quot;carol&quot;&gt;</div>
              </div>
            ),
          },
          {
            title: "数据层：删除 alice",
            color: "#f59e0b",
            desc: "users 变为 [bob, carol]。新列表的 key 依然是 index：bob→0、carol→1。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>新列表：0:「bob」 1:「carol」</div>
              </div>
            ),
          },
          {
            title: "对账：React 只看 key",
            color: "#8b5cf6",
            desc: "新 key 0 在旧树里存在（那是 alice 的节点）→ 复用，props 换成 bob 的数据；新 key 1 同理复用旧 bob 的节点；旧 key 2（carol 节点）在新列表里找不到 → 删除。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>新 key 0 → 复用旧 0（alice 的 DOM）</div>
                <div>新 key 1 → 复用旧 1（bob 的 DOM）</div>
                <div>旧 key 2 → 删除</div>
              </div>
            ),
          },
          {
            title: "结果：DOM 没动，数据全体顶位",
            color: "#3fb950",
            desc: "第一个输入框里 alice 打的「hi」还在（非受控内容不跟 props 走），选中的是「bob」却显示在「alice 的框」里——身份错认完成。若节点有动画或本地状态，同样串位。",
            render: (
              <div className="font-mono text-xs leading-6">
                <div>0: &lt;UserRow user=&quot;bob&quot;&gt; 输入:「hi」← 残留</div>
                <div>1: &lt;UserRow user=&quot;carol&quot;&gt;</div>
              </div>
            ),
          },
        ]}
      />
      <Paragraph>
        推演的结论值得背下来：<strong>DOM 一没动，数据全体顶位</strong>
        。受控组件靠 value prop 每次渲染重置内容，能掩盖错位；非受控输入、CSS 过渡、组件内部
        useState 没有 props
        可依，错位就浮出水面——所以同一个列表「看起来有时正常有时乱」，差的往往就是列表项里有没有内部状态。
      </Paragraph>

      <Heading level={2} title="边界：什么时候 index 无害" />
      <Paragraph>
        index 无害的条件是三同时：列表<strong>纯静态只读</strong>、渲染后
        <strong>不再增删排序</strong>
        、列表项<strong>没有内部状态</strong>（无输入框、无动画、无
        useState）。三个条件本质上是同一条判据的不同侧面——「不存在身份错认的机会」。但静态列表会变成动态列表：今天只读的表格，明天加一个行内编辑或拖拽排序，index
        key 就从无害变成埋雷。所以团队规范普遍直接禁 index，付的不是当下的性能账，是
        <strong>演进风险的账</strong>——禁令买到的是「以后怎么改都不会错」。
      </Paragraph>
      <Paragraph>
        比 index 更糟的是 <code>key={"{Math.random()}"}</code>
        ：它把三条件全判死刑——每次渲染全员换 key，React
        判定「旧节点全部消失、新节点全新面孔」，所有节点连 DOM 带状态全部销毁重建。index
        是「偶尔错位」，random key
        是「每次都推倒」：输入框每敲一个字都失焦、动画每帧重放、性能灾难。看起来「保证唯一」了，却恰恰毁掉了
        key 的唯一价值——<strong>跨渲染的身份稳定</strong>。
      </Paragraph>
      <DoDont
        label="列表 key / list key"
        dont={{
          code: `{items.map((item, i) => (
  <UserRow key={i} user={item} />
))}
/* 删除第一项 → 全体 key 顶位
   复用错节点：输入残留、动画串位 */`,
          note: "index 是「位置」不是「身份」，增删/排序场景必然复用错节点",
        }}
        do={{
          code: `{items.map((item) => (
  <UserRow key={item.id} user={item} />
))}
/* key = 稳定业务 id
   删除后其余节点身份不变，精准移动 */`,
          note: "用稳定唯一 id 做 key；纯静态只读列表用 index 才无害",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "key 是给谁看的？不加 key 会发生什么？",
            intent:
              "热身题，确认 key 的服务对象——它是给 React 的对账算法看的，与 DOM、CSS 毫无关系。",
            depth: 2,
            a: "key 是给 React 的协调器看的身份标识：对账时用「key 相同且类型相同」判定节点可否复用。同层多个子元素不加 key，React 只能按位置对账并警告（开发模式下提示 each child should have a unique key）；效果上等价于用 index——退化为位置对账，增删排序时同样错位。",
            bonus:
              "key 的比较只在「同一个父节点下的同层列表」内进行，跨层不比——这是 diff 三假设的第②条。",
          },
          {
            q: "「复用节点」到底复用了什么？为什么受控组件看不出错位、非受控一看就穿帮？",
            intent:
              "考复用的完整含义——只答「复用 DOM」少了一半，能说出组件状态与 hooks 链才是完整答案。",
            depth: 3,
            a: "复用是三件套：真实 DOM 节点、组件实例、组件的 hooks 状态链全部保留，只把新 props 灌进去。受控组件的输入内容来自 value prop，每次渲染都被重置成新数据，错位被掩盖；非受控输入的内容存在 DOM 内部、动画与 useState 存在组件实例上——它们不跟 props 走，所以错位直接浮出水面。",
            bonus:
              "调试技巧：在列表项里塞一个 useId 或 useRef 时间戳，key 用错时立刻显形，比等用户报「输入串行」快得多。",
          },
          {
            q: "把一个有状态的子树挪到另一个父节点下，状态会保留吗？怎么绕？",
            intent:
              "考三假设第②条「不跨层比较」的工程后果——很多人在 tab 切换、弹窗搬移时踩过这坑而不明所以。",
            depth: 3,
            a: '不会保留。假设②规定只做同层比较：新位置是「另一棵子树里的新节点」，旧位置则被销毁——组件状态随之清零。绕法有二：把状态提升到两个位置共同的父级；或给需要保态的子树一个稳定的 key（配合条件渲染保持在同一层），React 会在同层内按 key 移动而非重建。React 19.2 还稳定了 Activity 组件（前身是实验性的 Offscreen）：mode="hidden" 隐藏期间保留状态、卸载 effects，「隐藏而非卸载」从此是官方 API。',
            bonus:
              "position: fixed 拖拽回列表这类「DOM 位置变了但 React 树没变」的场景不受影响——diff 看的是 React 树，不是布局树。",
          },
          {
            q: "列表重排时 React 怎么决定移动还是重建？它用的是最长递增子序列吗？",
            intent:
              "辨析题：LIS 是 Vue 3 的方案，React 用的是更简单的单向扫描——把两个框架的实现混着说，恰恰暴露背题痕迹。",
            depth: 4,
            a: "不是 LIS，那是 Vue 3 的方案。React 对同层列表做单向扫描：先把旧子节点的 key/type 建成映射，再遍历新列表逐个判定复用/新建/删除；移动判定靠一个 lastPlacedIndex（最后已就位的旧下标）——遍历中某节点的旧下标比它小，说明它要往前挪，标记移动。整趟 O(n)，代价是移动次数可能不是最优：某些重排场景 Vue 3 挪 1 个节点，React 可能挪 3 个。两者都是在「假设③ key 可靠」的前提下换性能，只是优化目标不同。",
            bonus:
              "所以「key 稳定但不连续增长」的列表（如按时间插入）在 React 里性能没问题——对账成本是线性的，与移动优化策略无关。",
          },
          {
            q: "如果列表渲染后永远不再变化，用 index 到底有没有代价？那为什么规范还是要禁？",
            intent:
              "收尾辨析：把「技术上的无害」与「工程上的禁令」分开——能分清这两层的人，才是在做工程而不是背规则。",
            depth: 4,
            a: "技术上无代价：列表永不变，对账就永远不会发生「index 顶位」的错认，复用与位置对账结果一致。规范仍禁它，付的是演进风险的账：静态列表大概率会长出增删、排序或行内编辑——index key 从无害变埋雷的那天没有任何编译期警告，错位只以「用户数据串行」的形态在线上暴露。禁令的本质是消除一类不可观测的隐患，而不是优化当下。",
            bonus:
              "折中写法：静态列表可以用 key={item.id ?? index} 兜底——有业务 id 用 id，真没有再退 index，并把「为什么会没有 id」作为坏味道上报。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
            description: "diff 由更新触发：update 入队与调度合并是整条链路的起点。",
          },
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description: "diff 的宿主：render 阶段如何被切片、双缓存如何保存现场。",
          },
        ]}
      />
    </NoteShell>
  );
}
