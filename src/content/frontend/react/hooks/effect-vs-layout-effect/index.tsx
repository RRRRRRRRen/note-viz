import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { CrossRef, DoDont, Prerequisite, Timeline, VersionNote } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        差别在一道<strong>浏览器绘制（paint）</strong>
        的分界线：两者都在 commit 阶段、真实 DOM 更新之后执行，但 <code>
          useLayoutEffect
        </code> 在{" "}
        <strong>paint 之前同步执行</strong>
        ——函数体跑多久，用户就多久看不到新界面；<code>useEffect</code> 被标成
        passive，交给调度器排在 <strong>paint 之后异步执行</strong>
        。所以九成场景该用 <code>useEffect</code>；唯一必须用 <code>useLayoutEffect</code>{" "}
        的正当场景是「测量 DOM 并在用户看到之前调整」——比如 tooltip 定位，用错会闪烁。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "连续 setState 为什么只加一次：批处理",
            to: "/note/frontend/react/hooks/hooks-render",
          },
        ]}
      >
        本篇接着渲染往下走：批处理解决了「什么时候渲染」，这篇回答「渲染提交之后，effects
        在帧里的哪个时点跑」。
      </Prerequisite>

      <Heading level={2} title="commit 阶段：effects 被排进了哪条队列" />
      <Paragraph>
        先看 effects 从哪来。render 阶段结束时，要执行的副作用已经作为 flags 标记在 Fiber
        节点上；commit 阶段接过这份清单，按固定顺序走：<strong>先把变更一次性写入真实 DOM</strong>
        （mutation 段），然后立刻同步执行所有 <code>useLayoutEffect</code>
        ——注意这一步没有任何异步间隙，它就在 commit 的调用链里；最后才是浏览器的 paint。{" "}
        <code>useEffect</code> 不在这条同步链上：它在 render 阶段被标成 <strong>passive</strong>
        ，commit 完成后交给调度器另找一个时机——通常在 paint 之后——批量执行。
      </Paragraph>
      <Paragraph>
        为什么要分两档？因为两类副作用对「用户什么时候必须看不到中间态」的承诺不同。commit 的
        mutation 段必须同步一次到位（用户不能看到改到一半的 DOM），但 effects
        的数量多、逻辑重，如果全部同步执行，每次提交的阻塞时间都会被拉长，「输入到上屏」的延迟直接劣化。React
        的解法是把「必须在用户看到之前完成」的和「晚一点无所谓」的拆成两档：前者留在 commit
        里同步跑（layout），后者让出 paint（passive）。这个编排和浏览器一帧的顺序吻合：JS →
        样式/布局 → 绘制，useLayoutEffect 挤在 JS 与绘制之间，useEffect 排在绘制后面。
      </Paragraph>
      <Timeline
        label="一次 commit 与一帧 / effects timing"
        steps={[
          { label: "render 完成", sub: "副作用已标记在 Fiber 上", color: "#1677ff" },
          { label: "commit：DOM 变更", sub: "同步 · 一次写入", color: "#8b5cf6" },
          { label: "useLayoutEffect", sub: "同步执行 · 阻塞绘制", color: "#f59e0b" },
          { label: "浏览器 paint", sub: "用户第一次看到新界面", color: "#3fb950" },
          { label: "useEffect", sub: "passive · paint 之后异步", color: "#9ca3af" },
        ]}
      />

      <Heading level={2} title="paint 前后：一道「用户看见」的分界线" />
      <Paragraph>
        useLayoutEffect 同步执行的代价要说透：<strong>阻塞绘制</strong>
        。它跑在 paint
        之前，函数体执行多久，屏幕上就停留多久旧界面——在里面做重计算，掉的就是实打实的帧。这也是官方文档把默认推荐定为
        useEffect 的原因：订阅、数据获取、事件绑定这些常见副作用都不关心 paint
        时点，没必要拦在用户看画的路上。据 react.dev《useEffect vs
        useLayoutEffect》的表述：绝大多数场景 useEffect 是对的，useLayoutEffect
        只用于「需要在浏览器绘制前进行 DOM 测量」的场景。
      </Paragraph>
      <Paragraph>
        那「测量防闪烁」为什么非它不可？看 tooltip
        的经典场景：气泡渲染后需要量一下自己的尺寸和锚点位置，再决定定位。如果测量放在
        useEffect，执行时 paint <strong>已经发生</strong>
        ——用户先看到一帧位置错误的气泡，再跳到正确位置，这就是闪烁。换成
        useLayoutEffect，测量与调整都在 paint 前完成，浏览器画出的第一帧就是正确结果：
        <strong>错误的中间帧从未存在过</strong>
        。判断口诀一句话——只有「用户会看见中间帧」时才用 useLayoutEffect。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`function Tooltip({ anchor }: { anchor: DOMRect | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = ref.current.getBoundingClientRect();  // paint 前：量自己
    setPos({                                        // paint 前同步重渲染：
      x: anchor.right + 8,                          // 调整在绘制前完成
      y: anchor.top - r.height / 2,
    });
  }, [anchor]);

  return <div ref={ref} style={{ position: "fixed", ...pos }} />;
  // 用 useEffect 的话：首帧按 pos=null 渲染 → 闪一下 → 跳到正确位置
}`}
      />

      <Heading level={2} title="SSR：服务端从来跑不到这一帧" />
      <Paragraph>
        服务端渲染没有浏览器绘制，两类 effect <strong>都不执行</strong>
        ——没有 DOM 可量，也没有帧可排。历史上真正的差异是警告：React 16-18 在服务端渲染遇到
        useLayoutEffect
        会打印警告，提醒你这段逻辑在客户端首屏水合前不会跑、依赖它的布局在首帧可能是空窗；React 19
        起<strong>警告被移除</strong>（服务端渲染器把 useLayoutEffect 直接 stub 成 no-op——已在
        react-dom 19.2 源码核实），警告没了，事实没变：hydration 完成之前它一次都不执行，「paint
        前测量」的承诺在首屏水合前是空窗。SSR
        应用里依赖测量定位的组件要为「首帧无位置」留好兜底（先隐藏、水合后再显示）。
      </Paragraph>
      <VersionNote
        label="SSR 行为演进 / ssr warning"
        versions={[
          {
            range: "React 16-18",
            text: "服务端渲染遇到 useLayoutEffect 打印警告（does nothing on the server）",
            color: "#9ca3af",
          },
          {
            range: "React 19+",
            text: "警告移除：服务端把 useLayoutEffect stub 为 no-op；不执行的事实不变",
            color: "#3fb950",
          },
        ]}
        note="移除的是噪音，不是语义：无论哪个版本，服务端都不会执行任何 effect"
      />

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        除「测量放错档」外，这一对 Hook 还有三个高频坑：在 useLayoutEffect
        里做重活（阻塞被自己放大成掉帧）、在 layoutEffect 里无条件 setState（paint
        前同步重渲染，阻塞时间翻倍，还容易写出无限循环）、以及 SSR 首屏空窗（上一节）。前两个对照：
      </Paragraph>
      <DoDont
        label="测量时机 / measure before paint"
        dont={{
          code: `// 测量放 useEffect：paint 已经发生
useEffect(() => {
  const r = ref.current!.getBoundingClientRect();
  setPos(fix(r));   // 用户先看到错误位置的一帧
}, []);`,
          note: "passive 执行时首帧已上屏，测量结果只能修正「下一帧」——中间帧就是闪烁本身",
        }}
        do={{
          code: `// 测量 + 调整放 useLayoutEffect：paint 前
useLayoutEffect(() => {
  const r = ref.current!.getBoundingClientRect();
  setPos(fix(r));   // 错误的中间帧从未存在
}, []);`,
          note: "layoutEffect 里 setState 会在 paint 前同步重渲染并提交——正是「画之前改好」的实现机制",
        }}
      />
      <DoDont
        label="layoutEffect 的开销 / keep it light"
        dont={{
          code: `useLayoutEffect(() => {
  const rows = heavyCalc(data);  // 同步重计算
  rows.forEach(readLayout);      // 循环读布局 → 反复强制回流
  setRows(rows);                 // paint 前全部串行做完
}, [data]);`,
          note: "阻塞绘制的工作全挤在 paint 前：重计算 + 布局抖动让每一帧都变长",
        }}
        do={{
          code: `useEffect(() => {
  const rows = heavyCalc(data);  // paint 后：不挡上屏
  setRows(rows);
}, [data]);

// 确实要在 paint 前做的工作，先在 render 里算好，
// layoutEffect 里只留「读一次、写一次」的测量`,
          note: "默认 useEffect；layoutEffect 只留轻量的测量与调整，读写集中一次完成",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "一句话说清两个 Hook 的执行时机差别？",
            intent:
              "热身题，确认「同在 DOM 更新后、分 paint 前后」这个基本坐标——答「同步 vs 异步」不算错但要能落到帧上。",
            depth: 2,
            a: "两者都在 commit 阶段、真实 DOM 更新之后执行；useLayoutEffect 在浏览器 paint 前同步执行，会阻塞绘制；useEffect 被标为 passive，由调度器安排在 paint 之后异步执行。差别不在「DOM 更新前还是后」，而在「用户看见之前还是之后」。",
            bonus:
              "类组件的对应物：componentDidMount/Update 属于 layout 档（paint 前同步），所以迁移到 Hooks 时老代码里的测量逻辑要显式换成 useLayoutEffect。",
          },
          {
            q: "在 useLayoutEffect 里 setState 会发生什么？为什么它不闪烁反而成了防闪烁手段？",
            intent:
              "考「同步重渲染」的机制：能说清 paint 前的二次 render/commit，才算理解防闪烁的原理而不是背结论。",
            depth: 3,
            a: "它会在 paint 之前触发一次同步的 render + commit：React 把这次更新插在同一帧内、绘制发生之前处理完，所以用户看不到中间态——这正是「测量 + 调整」防闪烁的实现机制。代价同样明确：两次渲染都被压在 paint 前同步完成，阻塞时间叠加，所以测量逻辑必须轻。",
            bonus:
              "推论：在 useLayoutEffect 里写无条件 setState（比如 setState(Date.now())）而依赖数组又包含该状态，就是 paint 前无限循环的直接配方。",
          },
          {
            q: "useEffect 一定在「下一帧绘制之后」执行吗？",
            intent:
              "辨析题：区分「不阻塞 paint 的保证」与「精确的帧定时」——把 useEffect 当 rAF 用的人会在这里翻车。",
            depth: 3,
            a: "不保证。useEffect 是 passive 优先级，由调度器在 paint 之后的时机批量执行，但这是个「不阻塞绘制」的弱保证，不是精确帧定时：主线程忙时它会延后几帧，某些内部流程（如同步渲染路径里被提前 flush）也会让它早于预期执行。需要与帧严格对齐的工作用 requestAnimationFrame——它才是每帧绘制前回调的标准位。",
            bonus:
              "浏览器一帧的顺序是 JS → rAF → Style/Layout → Paint；passive effects 不在这条固定链上，这就是两者定性差异的根源。",
          },
          {
            q: "测量为什么必须「读布局 + 写回」放在同一个 useLayoutEffect 里？拆成两个行不行？",
            intent:
              "把浏览器强制同步布局与 React 执行档位缝在一起——这是前端两条主线的交汇点，答得出的是调过真实布局的人。",
            depth: 4,
            a: "拆开就白测了。读布局（getBoundingClientRect）在树脏时触发强制同步布局；测量 + 写回必须在「同一次 paint 前」原子完成，浏览器只需一次额外布局、用户看不到中间帧。若读在 layoutEffect、写在 useEffect，写回落在 paint 后——错误位置照样上屏，等于没防。若全放 useEffect，则回到首帧闪烁的老问题。",
            bonus:
              "量多个元素时遵守读写分离：先把所有几何批量读完（首个读触发唯一一次布局），再批量写回——否则在 paint 前自己制造布局抖动。",
          },
          {
            q: "React 19 为什么移除了 SSR 下 useLayoutEffect 的警告？警告没了，风险也没了吗？",
            intent:
              "版本行为题，考「警告与语义」的分离——以为是行为变化的人，说明没真正理解服务端为什么不执行 effect。",
            depth: 4,
            a: "移除警告是因为噪音大于收益：服务端渲染器本就把 useLayoutEffect stub 成 no-op（19.2 源码可核实），执行语义从未变过，警告只是反复提醒一个无法改变的事实。风险没有消失：hydration 完成前它一次都不执行，依赖「paint 前测量」的定位逻辑在首屏水合前是空窗——SSR 应用仍要为「首帧无位置」设计兜底，比如先隐藏占位、水合后再显示。",
            bonus:
              "更稳的做法是把「首屏就必须正确」的定位交给 CSS（固定定位、anchor 定位），把 JS 测量留给水合后的交互态——服务端能给的布局不要欠着客户端。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Hook 为什么不能写在条件语句里？",
            to: "/note/frontend/react/hooks/hooks-order-rules",
            description: "两个 Hook 凭什么按调用顺序对号入座：memoizedState 链与错位的实际后果。",
          },
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description:
              "本篇上游的完整机制：render/commit 两阶段怎么切、副作用 flags 从哪来、lane 优先级怎么排。",
          },
        ]}
      />
    </NoteShell>
  );
}
