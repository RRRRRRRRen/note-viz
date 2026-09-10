import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, PlayGround } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        差在<strong>输出节奏模型</strong>
        ：防抖是「重置式延迟」——每次触发都重置倒计时，只在事件流停止 wait
        毫秒后执行一次，连续触发可能一次都不执行；节流是「固定窗口」——wait
        内至多执行一次，持续触发也有稳定输出。选型看「要不要中间反馈」：搜索联想用防抖（中间结果无意义），滚动加载用节流（需要持续反馈）。实现的题眼在三处：
        <code>this</code>/<code>args</code>
        的传递、immediate（leading）与尾帧（trailing）两个端点、cancel 与组件卸载时机。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
          },
        ]}
      >
        setTimeout
        的回调是宏任务——防抖/节流的「时间感」全部建立在事件循环的调度模型上，这也是它们精确度边界（不是精确的
        wait）的根源。
      </Prerequisite>

      <Heading level={2} title="语义层：两种节奏模型" />
      <Paragraph>
        两者的共同目标是限制执行频率，但输出节奏完全不同。防抖的模型是
        <strong>「每次触发都作废上一次等待」</strong>
        ：计时器只认「最后一次触发」，所以输出永远落在输入结束之后——它是「结果导向」的，中间过程被彻底静音。节流的模型是
        <strong>「窗口内一个名额」</strong>
        ：无论触发多密，wait
        窗口内只有一个执行名额，输出是「匀速流」——它是「过程导向」的，反馈持续存在。
      </Paragraph>
      <Paragraph>
        由此推出一条不常被说破的选型判据：<strong>「中间态执行了有没有价值」</strong>
        。搜索联想的中间输入毫无价值（用户还打错着呢）→
        防抖；滚动加载的中间反馈有价值（用户要知道在加载）→
        节流；输入校验介于两者——要即时反馈用节流、只校验最终值用防抖。防抖连续触发下「一次都不执行」不是缺陷，是语义本身。
      </Paragraph>
      <DoDont
        label="输入法组词 / IME composition"
        dont={{
          code: `// 拼音组词期间 input/keydown 高频触发
// 每次触发都重置倒计时 → 整个组词过程被静音
input.addEventListener("input", debounce(search, 300));
// 用户停顿选词前，联想列表一次都不出现`,
          note: "组词是一次很长的连续输入流，重置式延迟会把它整个吞掉——「等停下」等来的是选词动作，不是搜索时机",
        }}
        do={{
          code: `// 方案一：leading 立即执行，先给反馈再说
const suggest = debounce(search, 300, /* immediate */ true);
// 方案二（更对症）：组词期跳过，选词结束才触发
input.addEventListener("compositionend", () => suggest(input.value));`,
          note: "leading 保证第一个字母按下就有响应；compositionend 把「真正选定」与「组词过程」区分开，比盲目防抖精准",
        }}
      />
      <CompareTable
        label="对比 / compare"
        left={{
          title: "防抖 debounce",
          color: "#8b5cf6",
          points: [
            "语义：停止触发 wait 毫秒后才执行",
            "连续触发不断重置计时器，可能一次都不执行",
            "场景：搜索联想、输入校验、resize 结束后重算",
            "考点：immediate 立即执行版、cancel 取消",
          ],
        }}
        right={{
          title: "节流 throttle",
          color: "#1677ff",
          points: [
            "语义：wait 毫秒内至多执行一次",
            "持续触发也有稳定节奏的输出",
            "场景：滚动加载、鼠标移动、按钮防连点",
            "考点：首尾都要执行（leading + trailing）",
          ],
        }}
      />

      <Heading level={2} title="实现层：三个题眼" />
      <Paragraph>
        满分实现的分水岭在三处。第一处是<strong>this 与 args 的传递</strong>
        ：返回的包装函数要用 <code>fn.apply(this, args)</code> 把调用现场的 this
        和参数原样转交——丢了这两行，事件处理器里的 e 就没了。第二处是
        <strong>两个端点</strong>
        ：immediate（leading）让首次触发立刻执行；节流的尾帧兜底（trailing）保证「停止触发后最后一次变化不丢失」——lodash
        的 <code>{"{ leading, trailing }"}</code> 选项正是这两个端点的产品化。第三处是{" "}
        <code>cancel</code>
        ：可取消是防抖的刚需，组件卸载时不清定时器，回调就会在卸载后触发。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`// 防抖：支持 immediate 与 cancel
function debounce(fn, wait, immediate = false) {
  let timer = null;
  function debounced(...args) {
    if (timer) clearTimeout(timer);
    if (immediate && !timer) fn.apply(this, args); // 首次立即执行
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn.apply(this, args);
    }, wait);
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

// 节流：时间戳（保证首帧）+ 定时器（保证尾帧）
function throttle(fn, wait) {
  let previous = 0;
  let timer = null;
  function throttled(...args) {
    const remaining = wait - (Date.now() - previous);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      previous = Date.now();
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {          // 兜底：停止触发后补执行最后一次
        previous = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  }
  return throttled;
}`}
      />
      <PlayGround
        label="游乐场 / debounce & throttle"
        height={260}
        code={`// 极简桩（只保留节奏骨架；leading/trailing/cancel 等完整实现见上文「实现层」）
function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    if (Date.now() - last >= wait) { last = Date.now(); fn.apply(this, args); }
  };
}
function debounce(fn, wait) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// —— 调用侧：同一条事件流，喂给两种节奏模型 ——
const onScrollT = throttle(() => console.log('[节流] 稳定输出一次'), 200);
const onScrollD = debounce(() => console.log('[防抖] 事件流停止后才执行'), 200);

console.log('开始：每 50ms 触发一次，共 20 次');
const timer = setInterval(() => {
  onScrollT();
  onScrollD();
}, 50);
setTimeout(() => {
  clearInterval(timer);
  console.log('事件流结束');
}, 1000);
// 预期：节流约 5~6 次（200ms 稳定节奏）；防抖 0 次，
// 事件停止 200ms 后补 1 次 —— 约 1.2s 时输出`}
      />

      <Heading level={2} title="工程边界：React 与精确度" />
      <Paragraph>
        React 里最常见的翻车不是实现，是<strong>实例的稳定性</strong>
        ：在组件函数体里直接调用 <code>debounce(fn, 300)</code>{" "}
        意味着每次重渲染都生成一个新的防抖实例——闭包里的 timer
        各归各的，防抖静默失效。正解是把实例放进 <code>useRef</code>（或 useMemo）固定下来，卸载时调{" "}
        <code>cancel()</code>
        。这和「闭包记住状态」的实现原理是一体两面：状态活在闭包里，实例不稳定状态就分裂。
      </Paragraph>
      <DoDont
        label="实例稳定性 / stable instance"
        dont={{
          code: `function SearchBox() {
  // 每次渲染都新建一个防抖实例：闭包里的 timer 各归各的
  const onChange = (e) => debounce(search, 300)(e.target.value);
  return <input onChange={onChange} />;
}`,
          note: "timer 藏在每次渲染新产生的闭包里，上一次的等待永远不会被这一次取消——防抖静默失效，且没有任何报错",
        }}
        do={{
          code: `function SearchBox() {
  const searchRef = useRef(search);
  searchRef.current = search; // 转存最新引用，避免闭包过期 props
  const debounced = useRef(debounce((...a) => searchRef.current(...a), 300)).current;
  return <input onChange={(e) => debounced(e.target.value)} />;
}`,
          note: "实例放进 useRef 只创建一次；fn 依赖最新状态时用 ref 转存——实例稳定 + 数据新鲜的组合拳",
        }}
      />
      <DoDont
        label="卸载清理 / cancel on unmount"
        dont={{
          code: `const debounced = useRef(debounce((data) => setData(data), 300)).current;
// 组件卸载后定时器仍在排队：
// 300ms 内离开页面 → 回调照样触发，对已卸载组件 setData`,
          note: "React 会打出「Can't perform a React state update on an unmounted component」类告警；若回调里还有请求，泄漏更深一层",
        }}
        do={{
          code: `const debounced = useRef(debounce((data) => setData(data), 300)).current;
useEffect(() => {
  return () => debounced.cancel(); // 卸载时清掉排队中的定时器
}, [debounced]);`,
          note: "cancel 与 on/off 一样属于「有状态资源必须生命周期配对」——创建时就要想好谁负责销毁",
        }}
      />
      <Paragraph>
        另一条边界是<strong>精确度</strong>
        ：setTimeout 的回调是宏任务，实际延迟受事件循环排队与浏览器嵌套节流（≥4ms）影响，「wait
        毫秒」是名义值。滚动/手势这类高频场景还有一个 rAF 变体：用{" "}
        <code>requestAnimationFrame</code> 做节流，节奏对齐渲染帧（约
        16.7ms），回调里读到的布局状态与下一帧绘制天然同步——代价是页面隐藏时 rAF
        暂停，语义从「时间窗口」变成「帧窗口」。
      </Paragraph>
      <MemoryCard keyword="手写题答题框架">
        <strong>一句话语义 → 主体实现 → 主动补边界</strong>
        （immediate/cancel、leading/trailing、this/args
        传递）。面试官的第二问永远埋在你没写的那行里——主动说出来，就轮不到他问。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "搜索框该用防抖还是节流？lodash 的 leading / trailing 选项改变什么？",
            intent:
              "热身题考语义而非代码——能说清「输出节奏」差异、并用 lodash 选项收尾的人，才算真用过。",
            depth: 2,
            a: "搜索框用防抖：用户停顿才发请求，中间过程执行了也是浪费。节流的语义是「稳定节奏反馈」，适合滚动加载、resize 重排这类持续事件。lodash 的 leading: true 表示第一次触发立刻执行（防抖加它就是「先响应再等安静」）；trailing: true 表示等待期结束前补执行最后一次（节流加它保证「停止后不丢尾帧」）——两者组合才是生产语义，手写版的 immediate/尾帧兜底正是在模拟它们。",
            bonus:
              "边界补充：防抖的 cancel（如组件卸载时）不写会触发「卸载后 setState」告警——面试主动说出这个，比多写十行代码更加分。",
          },
          {
            q: "在 React 组件里写的防抖为什么「不防了」？怎么修？",
            intent: "考闭包实例与组件生命周期的交互——这是防抖在现代前端最高发的翻车点。",
            depth: 3,
            a: "组件函数体里的 debounce(fn, 300) 每次渲染都执行一次，产出一个全新实例：闭包各自持有各自的 timer，前一次的等待永远不会被后一次取消——防抖退化为逐次执行。修法是把实例稳定下来：useRef(() => debounce(fn, 300)).current 或 useMemo 创建一次；fn 若依赖最新 props，用 ref 转存（实例只在首次创建，直接闭包 props 会拿到过期值）。卸载时调用 cancel 收尾。",
            bonus:
              "类推：节流、动画帧批处理、「每 N 秒轮询」全都有同款问题——本质是「有状态的高阶函数」在重渲染世界里必须自己管理实例生命周期。",
          },
          {
            q: "防抖的搜索框有没有可能「一次都不执行」？这是 bug 吗？",
            intent: "考语义边界的理解——把「可能不执行」当作缺陷还是特性，区分背实现和懂语义。",
            depth: 3,
            a: "可能，而且不是 bug：用户连续快速输入超过 wait 间隔时，每次触发都重置倒计时，执行被无限推迟——防抖的语义就是「只认最后一次」。但产品上可能出现「用户停了却没搜」的观感问题（比如拼音输入法组词期间 keydown 高频触发）。工程解法是「防抖 + 上限」：等待超过 maxWait 强制执行一次（lodash 的 maxWait 选项），兼顾「等停下」与「不能等太久」。",
            bonus:
              "输入法组词场景还有专门事件：compositionstart/end——在组词期间跳过处理，结束才触发，比防抖更对症。",
          },
          {
            q: "节流为什么常用 requestAnimationFrame 实现？它和 setTimeout 节流换掉了什么？",
            intent: "考渲染对齐视角——能说出「时间窗口换帧窗口」及其副作用，说明理解了两套时钟。",
            depth: 4,
            a: "rAF 节流的执行时机对齐渲染帧：每帧至多执行一次，天然把高频滚动/指针事件压缩到约 16.7ms 一档，且回调读到的布局信息与本次绘制同步，避免了「setTimeout 回调跑在两帧之间导致的布局抖动」。换掉的是时钟语义：页面隐藏或标签页失焦时 rAF 整体暂停，恢复时也不补帧——对「加载更多」这类场景是特性（省流量），对「心跳/计时」类场景是缺陷。",
            bonus:
              "组合拳：滚动监听里「先 rAF 节流、读布局用 getBoundingClientRect 的返回值」——把读和写都压进同一帧，是布局抖动治理的起点。",
          },
          {
            q: "多个组件共享同一个防抖实例会发生什么？说明什么设计约束？",
            intent:
              "收尾题，从「能不能复用」考闭包状态的所有权——答出「timer 是共享的」才算理解实现。",
            depth: 4,
            a: "互相干扰：timer 活在同一个闭包里，A 组件触发会 clearTimeout 掉 B 组件正在等待的倒计时，B 的调用被静默吞掉——两个调用方在争一个执行名额。所以防抖实例的所有权规则是「谁的状态谁独享」：需要独立节奏的调用方各自创建实例；刻意共享反而是高级用法（全局搜索：无论哪个入口触发，都只认最后一次）。",
            bonus:
              "同构判断：节流实例共享时 shared 的是 previous/timer——多入口节流也会互相「占名额」。要不要共享，取决于业务把两者看作一个队列还是多个队列。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "闭包在工程里怎么用：私有状态与模块模式",
            to: "/note/frontend/javascript/closure/closure-patterns",
            description: "防抖/节流是闭包「记住状态、返回待触发函数」的代表性应用。",
          },
          {
            title: "怎么把并发请求数限制在 N 以内？",
            to: "/note/frontend/javascript/patterns/concurrency-pool",
            description: "同一族「节奏控制」问题的高阶形态：控制的是请求并发而不是事件频率。",
          },
        ]}
      />
    </NoteShell>
  );
}
