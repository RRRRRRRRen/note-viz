import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { PlayGround } from "@/components/demo/PlayGround";
import { CompareTable, DoDont, MemoryCard } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        手写题考三层：<strong>API 语义</strong>（防抖和节流差在哪）、<strong>边界处理</strong>
        （立即执行、取消、循环引用）、<strong>底层机制</strong>（this
        绑定、事件调度）。答题框架固定： 先一句话说语义 → 写主体 → <strong>主动补边界</strong>
        ——面试官的第二问永远埋在你没写的那行里。
        本篇六个高频实现全部配了可运行的游乐场：改一改边界条件，真实跑一遍比背十遍牢。
      </Conclusion>

      <MemoryCard keyword="手写题答题框架" color="#f59e0b">
        <strong>一句话语义 → 主体实现 → 主动补边界</strong>
        （immediate/cancel、循环引用、new
        交互、错误兜底）。面试官的第二问永远埋在你没写的那行里——主动说出来，就轮不到他问。
      </MemoryCard>

      <Heading level={2} title="防抖与节流" />
      <Paragraph>
        两者的共同目标是「限制执行频率」，语义差异一句话说清：
        <strong>防抖是「等你停下来」，节流是「按节奏来」</strong>
        ——防抖把执行推迟到事件流停止后 wait 毫秒（期间任何新触发都会重置计时），节流保证 wait
        内至多执行一次。选型看场景：搜索框输入用防抖（用户停了才查），滚动/resize/按钮防连点用节流（持续反馈但不能每帧都来）。
      </Paragraph>

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
        height={280}
        code={`function throttle(fn, wait) {
  let previous = 0;
  let timer = null;
  return function (...args) {
    const remaining = wait - (Date.now() - previous);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      previous = Date.now();
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        previous = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

function debounce(fn, wait) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// 模拟：1 秒内每 50ms 触发一次滚动事件（共 20 次）
let n = 0;
const onScrollThrottled = throttle(
  () => console.log('[节流] 处理滚动 #' + ++n),
  200
);
const onScrollDebounced = debounce(
  () => console.log('[防抖] 事件流停止后才执行'),
  200
);

console.log('开始：每 50ms 触发一次，共 20 次');
const t = setInterval(() => {
  onScrollThrottled();
  onScrollDebounced();
}, 50);
setTimeout(() => {
  clearInterval(t);
  console.log('事件流结束');
}, 1000);
// 预期：节流约 5~6 次（200ms 节奏）；防抖 0 次，
// 事件停止 200ms 后补 1 次 —— 约 1.2s 时输出`}
      />

      <Heading level={2} title="call / bind / new / instanceof" />
      <Paragraph>
        这一组的全部难度在 <strong>bind 与 new 的交互</strong>：new 的优先级高于 bind——用 new 调用
        bind 返回的函数时，this 应该是新创建的实例而不是绑定的 ctx。手写版用{" "}
        <code>this instanceof bound</code> 判断「我是不是被 new 调用的」，再给 bound 接上原函数的
        prototype 链，让 instanceof 校验通过。面试写箭头函数一简到底的版本，就是在这里翻车。
      </Paragraph>

      <DoDont
        label="手写 bind / bind & new"
        dont={{
          code: `Function.prototype.myBind = function (ctx, ...pre) {
  const fn = this;
  return (...args) => fn.call(ctx, ...pre);
};
// new (fn.myBind(obj))() → this 是 obj
// 而不是新实例：constructor 场景翻车`,
          note: "箭头函数版丢掉了 new 语义，也没有 prototype——当构造函数用直接崩",
        }}
        do={{
          code: `Function.prototype.myBind = function (ctx, ...pre) {
  const fn = this;
  function bound(...args) {
    // new 调用时 this 是新实例 → 忽略绑定的 ctx
    return fn.apply(
      this instanceof bound ? this : ctx,
      pre.concat(args)
    );
  }
  bound.prototype = Object.create(fn.prototype);
  return bound;
};`,
          note: "instanceof 校验处理 new 优先级；接上 prototype 链保住构造能力",
        }}
      />
      <CodeBlock
        lang="typescript"
        code={`function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // 挂原型链
  const result = Ctor.apply(obj, args);      // 以 obj 为 this 执行
  // 返回对象/函数则覆盖，原始值忽略
  return result !== null &&
    (typeof result === "object" || typeof result === "function")
    ? result
    : obj;
}

function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left);
  while (proto) {                 // 沿原型链一路向上
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}`}
      />

      <Heading level={2} title="深拷贝：从及格到满分" />
      <Paragraph>
        概念与 JSON 拷贝缺陷清单在「深浅拷贝」篇完整展开，这里聚焦实现考点： 「递归 +
        WeakMap」是及格线，满分版要补
        <strong>内建特殊类型</strong>
        ：Date、RegExp、Map、Set 各有专属构造方式；Symbol 键要 Reflect.ownKeys
        才收得到。再往上，面试官会问 structuredClone——原生 API
        已覆盖循环引用与大部分类型，但不认函数与 DOM
        原型，什么时候能替代手写、什么时候不能，是加分分界。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`function deepClone(source, seen = new WeakMap()) {
  if (source === null || typeof source !== "object") return source;
  if (seen.has(source)) return seen.get(source); // 命中：断开循环
  if (source instanceof Date) return new Date(source);
  if (source instanceof RegExp)
    return new RegExp(source.source, source.flags);
  if (source instanceof Map) {
    const m = new Map();
    seen.set(source, m);
    source.forEach((v, k) =>
      m.set(deepClone(k, seen), deepClone(v, seen))
    );
    return m;
  }
  if (source instanceof Set) {
    const s = new Set();
    seen.set(source, s);
    source.forEach((v) => s.add(deepClone(v, seen)));
    return s;
  }
  const target = Array.isArray(source) ? [] : {};
  seen.set(source, target); // 先登记再递归：环引用在递归中命中缓存
  Reflect.ownKeys(source).forEach((key) => {
    target[key] = deepClone(source[key], seen);
  });
  return target;
}`}
      />

      <Heading level={2} title="EventEmitter 与并发控制" />
      <Heading level={3} title="EventEmitter：发布订阅的最小实现" />
      <Paragraph>
        考点只有两个：once
        的「执行后自动解绑」怎么写才算对（包装函数替换原函数注册，但要保留原引用供手动 off），以及
        on/emit 用 Map + Set 还是对象的取舍。返回 this 支持链式调用是顺手补上的边界。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`class EventEmitter {
  events = new Map();

  on(name, fn) {
    if (!this.events.has(name)) this.events.set(name, new Set());
    this.events.get(name).add(fn);
    return this;
  }
  off(name, fn) {
    this.events.get(name)?.delete(fn);
    return this;
  }
  once(name, fn) {
    const wrap = (...args) => {
      this.off(name, wrap); // 执行前先解绑，防止回调里再 emit 造成重入
      fn.apply(this, args);
    };
    wrap.origin = fn;       // 保留原引用：once 后手动 off(fn) 也能命中
    this.on(name, wrap);
    return this;
  }
  emit(name, ...args) {
    this.events.get(name)?.forEach((fn) => fn.apply(this, args));
    return this;
  }
}`}
      />
      <Heading level={3} title="并发控制 multiRequest：worker 池模式" />
      <Paragraph>
        题目：N 个请求，最大并发 maxNum，空位立刻补新请求，完成后按原始顺序输出。正解是{" "}
        <strong>worker 池</strong>：起 min(maxNum, N) 个 worker 循环领任务——每个 worker
        完成一个自动取下一个（动态补位），而不是把列表切成固定分片。顺序输出不靠排队，靠{" "}
        <strong>按原始索引落位</strong>：结果写进 results[i]，天然与发起顺序无关。
      </Paragraph>

      <PlayGround
        label="游乐场 / concurrency pool"
        height={300}
        code={`function multiRequest(urls, maxNum) {
  return new Promise((resolve) => {
    const results = new Array(urls.length);
    let next = 0;  // 下一个待发任务（游标）
    let done = 0;  // 已完成数量
    async function worker() {
      while (next < urls.length) {
        const i = next++;
        console.log('发起 ' + urls[i] + '（并发位 ' + i % maxNum + '）');
        try {
          results[i] = await fakeRequest(urls[i]);
        } catch (e) {
          results[i] = '失败: ' + e.message;
        }
        done++;
        if (done === urls.length) resolve(results);
        // 循环继续：完成一个立刻补一个
      }
    }
    for (let i = 0; i < Math.min(maxNum, urls.length); i++) {
      worker();
    }
  });
}

function fakeRequest(url) {
  return new Promise((resolve) => {
    const delay = 100 + Math.random() * 400;
    setTimeout(() => resolve(url), delay);
  });
}

const urls = ['/a', '/b', '/c', '/d', '/e', '/f', '/g'];
multiRequest(urls, 3).then((results) => {
  console.log('—— 全部完成，按原始顺序输出：');
  results.forEach((r, i) => console.log(i + 1, r));
});
// 观察「发起」日志：任意时刻最多 3 个在途
// 观察「输出」顺序：始终 a~g，与完成先后无关`}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "搜索框该用防抖还是节流？lodash 的 leading / trailing 选项改变什么？",
            intent:
              "热身题考语义而非代码——能说清「输出节奏」差异、并用 lodash 选项收尾的人，才算真用过。",
            depth: 3,
            a: "搜索框用防抖：用户停顿才发请求，中间过程执行了也是浪费。节流的语义是「稳定节奏反馈」，适合滚动加载、resize 重排这类持续事件。lodash 的 leading: true 表示第一次触发立刻执行（防抖加它就是「先响应再等安静」）；trailing: true 表示等待期结束前补执行最后一次（节流加它保证「停止后不丢尾帧」）——两者组合才是生产语义，手写版的 immediate/尾帧兜底正是在模拟它们。",
            bonus:
              "边界补充：防抖的 cancel（如组件卸载时）不写会触发「卸载后 setState」告警——面试主动说出这个，比多写十行代码更加分。",
          },
          {
            q: "手写 bind 里的 this instanceof bound 是在判断什么？prototype 那行删了会怎样？",
            intent: "考 new 与 bind 的优先级交互——这是 bind 实现的题眼，答不出说明只背了模板。",
            depth: 3,
            a: "在判断「bound 是不是被 new 调用的」：new 会把 this 指向新实例，此时应忽略绑定的 ctx、把 this 交给原函数——这就是「new 优先级高于 bind」。prototype 那行把 bound 的原型接到原函数的原型链上，删掉后 new bound() 创建的实例拿不到原函数的原型方法，instanceof 校验也会失败——两行配合才完整保留构造语义。",
            bonus:
              "原生 bind 的行为与此一致：MDN 明确「new boundFunc() 时 this 绑定被忽略」；真正的原生实现用内部槽，手写版是行为级模拟。",
          },
          {
            q: "深拷贝手写版里，seen 登记的时机为什么必须在递归之前？放到递归之后会怎样？",
            intent:
              "考对断环机制时序的理解——「登记时机」是循环引用检测的成败点，顺序写错环照样爆栈。",
            depth: 4,
            a: "必须先 seen.set(source, target) 再对属性值递归。登记在前，递归中再次遇到同一个对象时 seen.has 命中、直接返回缓存，环被截断；登记在后，第一次回到自身时缓存里还没有记录，递归继续深入——无限展开直到栈溢出，WeakMap 形同虚设。WeakMap vs Map 的选型语义（弱引用不阻止 GC）见「深浅拷贝」篇，这里考的是时序。",
            bonus:
              "Map/Set 分支同理：先创建空容器并登记，再逐项深拷贝——先把「壳」挂进缓存，环引用回来时拿到的是完整的壳，而不是等待中的递归。",
          },
          {
            q: "并发控制为什么不能把请求切成固定分片跑 Promise.all？顺序输出怎么保证？",
            intent:
              "考调度模型——「分片等待」与「动态补位」的差异是这道题的核心分层，顺序落位是第二层。",
            depth: 4,
            a: "分片方案把 N 个任务切成 N/maxNum 组串行执行：组内快的请求完成后，它的并发位要干等同组最慢的那个才能开始下一组——出现「空位等待」，吞吐量打折。worker 池是动态补位：每个 worker 完成一个立刻从游标领下一个，任何时刻在途数都是满的。顺序输出不靠发起顺序，靠按原始索引落位——results[i] 的写入位置由任务携带的 i 决定，与完成先后无关。",
            bonus:
              "更进一步：worker 数等于 maxNum 但任务数很大时，游标 next++ 的单线程递增在 JS 里天然原子（无并发修改问题）；如果用「Promise 完成后再 push 新 Promise 到 all」的写法，容易写出越界或漏发的 bug——worker 循环是边界最少的形式。",
          },
          {
            q: "实现 Promise.retry：失败自动重试，超过次数才真正 reject，怎么做？",
            intent:
              "压轴题，考 Promise 与 async 的调度功底——while + await 与递归链两条路，能对比优劣的是高分回答。",
            depth: 5,
            a: "async 版最清晰：用 while 循环 try/catch，成功就 return，失败次数减一并 await 一个 sleep 延时后继续，用尽次数抛出最后一次的错误。递归 Promise 链版（fn().catch(() => times > 1 ? retry() : Promise.reject(err))）同样可行但错误传递绕；async 版的语义是平铺的，更好测。关键边界：重试要用同一参数重新调用 fn，而不是复用失败的 Promise 实例——它已经定格为 rejected，再 then 也不会重跑。",
            bonus:
              "工程加分项：间隔用指数退避（delay * 2^n + 随机抖动）避免雪崩式重试；每次重试 emit 进度事件让上层可观测——「能重试」和「重试得体面」差的是这两步。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        手写题的所有机制在站内都有对应的深挖笔记：this 绑定四规则在「this 绑定」篇，new
        语义与原型链在「继承演进」篇，事件调度与微任务在「事件循环」，闭包与内存视角在「闭包」篇。建议的练习方式：每段实现丢进页面游乐场，故意改坏一个边界（删掉
        cancel、把 WeakMap 换成
        Map、把游标改成队列），跑一遍看它怎么崩——崩过一次的手写题才真正是你的。
      </Paragraph>
    </NoteShell>
  );
}
