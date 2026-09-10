import type { ReactNode } from "react";
import { Conclusion, Heading, Kbd, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Exercise } from "@/components/demo/Exercise";
import { StepThrough } from "@/components/demo/StepThrough";
import { Callout, CrossRef, DoDont, MemoryCard, SpecQuote, Table } from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>grep</code> 按内容筛行——把输入逐行检查，匹配模式的行打印出来，AI
        靠它在代码库里找定义、找 用法、找配置；管道 <code>|</code>{" "}
        把左边命令的标准输出接到右边命令的标准输入，数据从左往右逐段加工；
        <code>head</code>/<code>tail</code> 按位置截头尾，与 grep 的「按内容筛」互为分工。读懂 AI
        拼的 命令，记住两条规则就够：<strong>过滤器有文件参数就读文件、没有就读标准输入</strong>；
        <strong>每一段的输出形态要接得上下一段的输入</strong>。
      </Conclusion>

      <Heading level={2} title="grep：按内容筛行" />
      <Paragraph>
        grep 的名字来自 global regular expression print，它做的事一句话就能说清——
      </Paragraph>
      <SpecQuote source="GNU Grep Manual · 开篇摘要（Top 节，非编号章节）">
        grep prints lines that contain a match for one or more patterns.
      </SpecQuote>
      <Paragraph>
        语法只有三段：<code>grep [选项] "模式" [文件或目录]</code>，分别是
        <strong>怎么找、找什么、在哪找</strong>
        。选项都是 <code>-</code> 加一个字母，可以连写——<code>-rn</code> 就是 <code>-r -n</code>
        。匹配是
        <strong>逐行</strong>进行的：一行里只要包含模式，整行都会被打印出来，所以 grep
        的输出永远是「一行 一行的文本」，这个形态后面接管道时至关重要。
      </Paragraph>
      <Paragraph>
        最值得先讲的是 <code>-n</code>（显示行号）：它让输出变成 <code>行号:内容</code> 的格式，AI
        拿到 行号就能精确地说「定义在 <code>note.tsx:122</code>
        」，然后只跳去读那几行，而不是把整个文件读一遍 ——这就是 AI 高频使用它的原因。下面四条是 AI
        agent 真实日常（输出来自本站仓库，你的机器上哈希 与提交信息会不同，但形态一致）：
      </Paragraph>

      <ShellBlock>{`# ① 单文件 + 行号：AI 引用「文件:行号」的依据
$ grep -n "export function" src/components/note.tsx
5:export function NoteShell({ children }: { children: ReactNode }) {
11:export function Heading({ level, title }: { level: 2 | 3; title: string }) {
...（共 10+ 处）

# ② 递归 + 只列文件名：哪些文件用到了 PlayGround 组件？
$ grep -rln "PlayGround" src/
src/content/frontend/javascript/types/float-precision/index.tsx
src/content/frontend/javascript/patterns/concurrency-pool/index.tsx
src/content/frontend/javascript/patterns/debounce-throttle/index.tsx
src/content/frontend/javascript/event-loop/event-loop-basics/index.tsx
src/content/devtools/shell/text-pipeline/grep-pipe-basics/index.tsx
src/components/demo/PlayGround.tsx

# ③ 定位配置项：在不在、第几行
$ grep -n "exactOptionalPropertyTypes" tsconfig.json
18:    "exactOptionalPropertyTypes": true,

# ④ 限定文件类型：只在 .tsx 里搜（末尾的 | head -3 下一节主角，先混个脸熟）
$ grep -rn "useState" src/components --include="*.tsx" | head -3
src/components/note.tsx:2:import { useState, type ReactNode } from "react";
src/components/note.tsx:131:  const [open, setOpen] = useState(reveal === "always");
src/components/demo/CodeAnnotate.tsx:1:import { useEffect, useState } from "react";`}</ShellBlock>

      <Paragraph>
        四条覆盖了四种典型问法：①是「这个文件里有哪些导出」；②是「哪些文件用了 X」——<code>-r</code>{" "}
        让 grep 钻进目录层层递归，<code>-l</code> 表示只关心文件名、不输出匹配行内容。②的 6
        条命中如实反映了构成： <code>src/components/demo/PlayGround.tsx</code> 是组件本体，其余 5
        条是使用它的笔记（其中一条就是本篇自己的代码块）；输出顺序是 grep
        递归遍历目录的先后，与重要程度无关。③是「这个配置存在吗、 在第几行」——注意不带{" "}
        <code>-i</code> 时搜索<strong>区分大小写</strong>；④用
        <code>--include</code> 把搜索范围限定到指定后缀的文件。其余高频选项一表收尽：
      </Paragraph>

      <Table
        label="grep 常用选项速查 / options"
        head={["选项", "作用", "典型场景"]}
        rows={[
          [<code>-r</code>, "递归搜目录", "在 src/ 全库搜索"],
          [<code>-n</code>, "显示行号", "AI 要引用「文件:行号」精确定位"],
          [<code>-i</code>, "忽略大小写", "搜 todo 也能命中 TODO、Todo"],
          [<code>-w</code>, "全词匹配", "搜 cat 不会命中 category"],
          [<code>-l</code>, "只列出文件名", "「哪些文件用了 X」"],
          [<code>-c</code>, "只输出匹配行数", "「这个文件里有多少处 X」"],
          [<code>-v</code>, "反选：排除匹配行", "过滤掉注释行、干扰行"],
          [<code>-E</code>, "扩展正则（+ ? | ()）", "复杂模式，如同时搜两个词"],
          [<code>-C 3</code>, "显示匹配行上下各 3 行", "看匹配处的代码语境"],
          [<code>--include="*.tsx"</code>, "只搜指定后缀的文件", "在混合目录里只搜组件文件"],
        ]}
      />

      <Heading level={3} title="正则最小集：够用九成场景" />
      <Paragraph>
        grep 的模式是正则表达式，但日常用到的核心符号只有六个：<code>.</code> 任意单个字符、
        <code>*</code> 前一字符重复零次或多次、<code>^</code> 行首、<code>$</code> 行尾、
        <code>[abc]</code> 字符集合、
        <code>\.</code> 转义字面量（匹配真正的点号）。而 <code>+</code>（一次以上）、<code>?</code>
        （零或一 次）、<code>|</code>（或）、<code>()</code>（分组）属于扩展语法，要么加{" "}
        <code>-E</code>，要么在基础 模式里写成 <code>\+</code>。两条实测：
      </Paragraph>

      <ShellBlock>{`# 行首锚定 ^ + -E 的 +：只匹配「行首是哈希+空格+feat」的行，
# 提交信息中间碰巧含 feat 字样的（如 feature）会被 ^ 挡在外面
$ git log --oneline | grep -E "^[a-f0-9]+ feat" | head -3
3865037 feat: 笔记组件块流化——Heading/Paragraph/List 结构块…
0c2f2e0 feat: 组件库扩充与单层化——新增 17 个可视化/语义/演示块组件…
cee4f6f feat: 大纲点击跳转后目标标题渐变高亮 1.5s 渐隐（toc-flash 动画）

# -E 的 | 「或」：一条命令同时匹配两类行（基础模式里得给 | 加反斜线转义）
$ grep -E '"name"|"version"' package.json
  "name": "note-viz",
  "version": "0.1.0",`}</ShellBlock>

      <Heading level={2} title="管道：命令之间的传送带" />
      <Paragraph>
        Unix 里每个进程启动时都自动挂着三条标准流：<strong>stdin（标准输入，编号 0）</strong>
        ——数据从这进 来；<strong>stdout（标准输出，编号 1）</strong>——结果从这出去；
        <strong>stderr（标准错误，编号 2）</strong>——报错从这出去，和正常输出分开走。平时 stdin
        接你的键盘、stdout 接屏幕；而
        <code>|</code> 做的事只有一件：<strong>把左边进程的 stdout，接到右边进程的 stdin 上</strong>
        。
      </Paragraph>
      <Paragraph>
        数据因此像水流一样从左往右流过每一段，最后一段的输出落到屏幕。几乎所有常用命令都遵守同一个约定：
        「读几行文本 → 处理 →
        吐出几行文本」——输入输出格式统一，所以任何命令都能自由拼接。每个命令只做
        一件小事，管道把它们串成流水线，这是 Unix 哲学的根基。拿一条 AI 高频命令逐段看：
      </Paragraph>

      <StepThrough
        label="三段流水线逐段推演 / pipeline walkthrough"
        height={230}
        steps={[
          {
            title: "第 1 段 · 生产者：git log --oneline",
            desc: "把提交历史压成一行一条的文本流。它只管产数据，不做任何筛选——54 条提交全部涌向右边。",
            color: "#f59e0b",
            render: (
              <Snap>{`$ git log --oneline                          （共 54 行）
848401c content: 全站 32 篇笔记迁移块流体系…
4a88fc6 fix: main 统一为笔记滚动容器…
851d51c docs: 写作规范 v2——块流体系架构…
3865037 feat: 笔记组件块流化…
0c2f2e0 feat: 组件库扩充与单层化…
…（省略 48 行）`}</Snap>
            ),
          },
          {
            title: '第 2 段 · 过滤器：grep -i "feat"',
            desc: "逐行检查上游送来的每一行，只放行含 feat 的行（-i 忽略大小写）。54 行进去，24 行出来。",
            color: "#1677ff",
            render: (
              <Snap>{`$ git log --oneline | grep -i "feat"         （剩 24 行）
3865037 feat: 笔记组件块流化…
0c2f2e0 feat: 组件库扩充与单层化…
cee4f6f feat: 大纲点击跳转后目标标题渐变高亮…
…（省略 21 行）`}</Snap>
            ),
          },
          {
            title: "第 3 段 · 限量阀：head -5",
            desc: "不管内容是什么，只放前 5 行出去，其余全扔。最后一段的输出就是你在屏幕上看到的。",
            color: "#3fb950",
            render: (
              <Snap>{`$ git log --oneline | grep -i "feat" | head -5
3865037 feat: 笔记组件块流化——Heading/Paragraph/List 结构块…
0c2f2e0 feat: 组件库扩充与单层化——新增 17 个可视化/语义/演示块组件…
cee4f6f feat: 大纲点击跳转后目标标题渐变高亮 1.5s 渐隐…
dc07052 feat: 笔记页改为内容/大纲左右双栏…
4f339d9 feat: QA 加分项内容同时融入回答正文…`}</Snap>
            ),
          },
        ]}
      />

      <Paragraph>
        读 AI 拼的管道命令，方法就是<strong>从左往右逐段问「这一段把数据变成了什么样」</strong>
        。生产者、 过滤器、限量阀各司其职——中游、下游都是可插拔的积木：把末端 <code>
          head -5
        </code>{" "}
        换成 <code>wc -l</code>
        （数行数），同一条流水线立刻从「展示」变成「统计」，这条命令在你仓库的真实结果 是{" "}
        <code>24</code>，即共 24 个 feat 提交。
      </Paragraph>

      <Heading level={3} title="过滤器的取材规则：本篇最反直觉的一处" />
      <Paragraph>
        管道右边的命令凭什么「接得住」？因为 grep、cat、head、tail、sort、wc、sed 这类
        <strong>过滤器家族</strong>
        都遵守同一条取材公约：<strong>命令行里给了文件参数就读文件，一个都没给就读标准输入</strong>
        （GNU Grep Manual §2.4 的原话是：otherwise, grep searches standard input）。所以{" "}
        <code>git log --oneline | head -5</code> 里的 head
        不带文件，读的正是管道送来的提交历史。想显式指 名「这一处读 stdin」，用 <code>-</code>{" "}
        占位：<code>git log --oneline | grep "feat" - package.json</code> 会同时搜提交历史和
        package.json。四条对照实验把规则钉死：
      </Paragraph>

      <ShellBlock>{`# ① 没给文件参数 → 读标准输入（管道送来的那一行）
$ echo "feat: apple" | grep "feat"
feat: apple

# ② 带了文件参数 → 只读文件，管道数据被静默忽略！
$ echo "feat: apple" | grep '"name"' package.json
  "name": "note-viz"

# ③ 对照组：没有管道，直读文件——同一个命令的两种取材模式
$ grep '"name"' package.json
  "name": "note-viz"

# ④ 反过来喂：cat 把文件吐到 stdout，grep 读 stdin（与 ③ 等价）
$ cat package.json | grep -m1 '"name"'
  "name": "note-viz"`}</ShellBlock>

      <Paragraph>
        实验②是新手第一大坑：echo 送来的 <code>feat: apple</code> 被完全无视了——
        <strong>文件参数会「抢占」 grep 的取材来源，管道数据被静默丢弃，不报错、不合并</strong>
        。所以「管道数据一定会被处理」是错觉；
        判断一段管道是否生效，要看右边命令有没有文件参数。另一个要知道的事实：
        <strong>不是所有命令都吃 stdin</strong>——<code>ls</code>、<code>cd</code>、
        <code>git log</code> 这类命令根本不读标准输入， 所以 <code>git log | ls</code> 里 ls
        会完全无视管道数据，自己列当前目录。判断右边能不能接，就看它 是不是过滤器家族的。
      </Paragraph>
      <Paragraph>
        顺带认识 grep 的另一套「语言」——退出码：命令结束后会留下一个数字给系统，
        <strong>0 表示成功、非 0 表示失败</strong>。grep 找到匹配返回 0，一行都没匹配返回
        1，出错返回 2：
      </Paragraph>
      <SpecQuote source="GNU Grep Manual §2.3 Exit Status">
        Normally the exit status is 0 if a line is selected, 1 if no lines were selected, and 2 if
        an error occurred.
      </SpecQuote>
      <Paragraph>
        AI 常用 <code>grep ... ; echo $?</code> 来区分「搜到了」和「没搜到」；shell 里{" "}
        <code>&amp;&amp;</code> 与 <code>||</code>{" "}
        的成败判断、脚本里的条件分支，依赖的都是这套退出码。它是「重定向与退出码」一篇
        的主角，这里先混个脸熟。
      </Paragraph>

      <Heading level={3} title="顺序决定语义：先筛再截 ≠ 先截再筛" />
      <Paragraph>
        管道每一段都在加工「上一段的输出」，所以<strong>段的顺序换了，语义就换了</strong>
        。用你仓库的真实 数据对比：<code>git log --oneline | grep -i "feat" | head -5</code>{" "}
        是先全历史过滤再取前 5 条，得到 「最近的 5 个 feat 提交」（可能跨越很多个提交）；而{" "}
        <code>git log --oneline | head -5 | grep -i "feat"</code> 是先取最近 5
        个提交再从中筛，得到「最近 5 个提交里的 feat」——这个仓库的真实结果只有
        <code>2</code> 条，因为另外 3 个提交是 content/fix/docs 类型，被 grep
        滤掉了。两条命令都合法，但回 答的是两个不同的问题。
      </Paragraph>

      <Heading level={2} title="head 与 tail：按位置截取" />
      <Paragraph>
        grep 和 head 的分工一句话：<strong>grep 按内容筛</strong>（关心行里有什么），
        <strong>head/tail 按 位置截</strong>（不管内容是什么，只要开头/结尾一段）。head 默认取前 10
        行，<code>-n 3</code> 指定行 数（<code>-3</code> 是等价的历史简写）；<code>-c 60</code>{" "}
        切换成按字节取——它不管行的边界，切到第 60 个字节就停，也不补换行，实测输出末尾是{" "}
        <code>"private": t</code>，<code>true</code> 只剩一个字 母。多文件时每个文件前会插一行{" "}
        <code>==&gt; 文件名 &lt;==</code> 分隔头。tail 是 head 的镜像：默认取 末尾 10 行，
        <code>-n</code>/<code>-c</code> 同款，取材规则也一样。
      </Paragraph>

      <ShellBlock>{`# 默认取前 10 行；-n 3 取前 3 行（-3 是等价简写）
$ head -n 3 package.json
{
  "name": "note-viz",
  "version": "0.1.0",

# -c 按字节截取：切到第 60 个字节，不管行的边界，也不补换行
$ head -c 60 package.json
{
  "name": "note-viz",
  "version": "0.1.0",
  "private": t

# 多文件：插入 ==> 文件名 <== 分隔头
$ head -n 2 package.json tsconfig.json
==> package.json <==
{
  "name": "note-viz",

==> tsconfig.json <==
{
  "compilerOptions": {

# tail 是镜像：取末尾 3 行
$ tail -n 3 package.json
  },
  "packageManager": "pnpm@10.34.5"
}`}</ShellBlock>

      <Paragraph>
        head 有一个对管道特别重要的性质：<strong>它是流式的，读够数量就关闭 stdin</strong>
        。上游命令检测到 下游「关闸」会提前收工（SIGPIPE 信号），所以哪怕仓库有一万条提交，
        <code>git log --oneline | head -5</code> 也是瞬间出结果——git log
        永远只被读走开头一小部分。这也是 AI 爱把 head 放在管道末端的
        原因：既控制输出长度防刷屏，又免费获得早停提速。
      </Paragraph>
      <Paragraph>
        tail 多一张王牌 <code>-f</code>（follow）：<code>tail -f server.log</code>{" "}
        会停在原地持续盯着文件，
        有新内容追加就实时打印出来——看服务日志、看构建输出的标配。注意它是少数不会「自己结束」的命令，按{" "}
        <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd> 退出。最后看一条磁盘排查的经典三连，三件套全员到场：
      </Paragraph>

      <ShellBlock>{`$ du -sk */ 2>/dev/null | sort -rn | head -5
209064  node_modules/
11768   dist/
980     src/
4       public/
4       plugins/`}</ShellBlock>

      <Paragraph>
        从左往右读：<code>du -sk */</code> 统计每个目录占多少 KB（<code>-s</code> 汇总、
        <code>-k</code> 以 KB 计）；<code>sort -rn</code> 按数值倒序——<code>-n</code>{" "}
        必须加，默认按字符串排序会把 980 排到 11768 前面；<code>head -5</code> 只要前五名。结尾的{" "}
        <code>2&gt;/dev/null</code> 是把报错信息（标准错
        误）丢进黑洞——它属于重定向家族，后续篇章正式讲。head 在这类命令里的角色永远是「只要 top
        N」。
      </Paragraph>

      <MemoryCard keyword="有文件读文件，没文件读 stdin" color="#1677ff">
        <p>
          过滤器家族（grep/cat/head/tail/sort/wc/sed）的取材公约：命令行给了文件参数就读文件——
          <strong>此时管道数据被静默忽略</strong>；一个文件参数都没给才读标准输入。配套两条：管道
          <code>|</code> 右边必须是愿意读 stdin 的命令（<code>ls</code>/<code>git log</code>{" "}
          不读，接了也 白接）；管道每一段的输出形态要接得上下一段的输入。顺手记住分工：grep
          管内容，head/tail 管位置。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        三个最高频的翻车点，全部源于同一套规则没吃透：取材规则、段顺序、段间形态。
      </Paragraph>

      <Heading level={3} title="坑 1：文件参数抢占管道输入" />
      <DoDont
        label="坑 1 · 取材规则 / stdin vs file"
        dont={{
          code: `$ echo "feat: apple" | grep "feat" package.json
  "name": "note-viz"
# 以为会输出 feat: apple，
# 实际输出的是 package.json 的匹配行`,
          note: "grep 带了文件参数就只读文件，管道里的 feat: apple 被静默忽略——不报错、不合并，很多人盯着输出半天才发现搜错了地方。",
        }}
        do={{
          code: `$ echo "feat: apple" | grep "feat"
feat: apple          ← 不带文件参数，读 stdin
$ git log --oneline | grep "feat" - package.json
# 想「管道和文件都搜」用 - 显式给 stdin 占位`,
          note: "判断方法：数一数命令里有没有文件参数。有则 grep 只认文件；想保留管道数据就去掉文件参数，或用 - 占位。",
        }}
      />

      <Heading level={3} title="坑 2：过滤与截取的顺序" />
      <DoDont
        label="坑 2 · 顺序语义 / filter then head"
        dont={{
          code: `$ git log --oneline | head -5 | grep -i "feat"
3865037 feat: 笔记组件块流化…
0c2f2e0 feat: 组件库扩充与单层化…
# 以为是「最近 5 个 feat」
# 实际只有 2 条：最近 5 个提交里恰好 2 个是 feat`,
          note: "head 在前会先把数据截成最近 5 个提交，grep 只能在这 5 条里筛——语义变成了「最近 5 个提交里的 feat」。",
        }}
        do={{
          code: `$ git log --oneline | grep -i "feat" | head -5
3865037 feat: …
0c2f2e0 feat: …
cee4f6f feat: …
dc07052 feat: …
4f339d9 feat: …
# 先全历史过滤，再取前 5 条：真正的「最近 5 个 feat」`,
          note: "从左往右逐段问「这段把数据变成了什么样」。先筛后截得到「最近的 N 个满足条件的」，先截后筛得到「最近的 N 条里满足条件的」。",
        }}
      />

      <Heading level={3} title="坑 3：段间的输出形态接不上" />
      <DoDont
        label="坑 3 · 形态衔接 / -c already counts"
        dont={{
          code: `$ git log --oneline | grep -ci "fix" | wc -l
1
# 永远输出 1——不管有多少个 fix 提交`,
          note: "grep -c 的输出已经是「一个数字」而不是一堆文本行，wc -l 只能数出 1。管道右边接得住的前提，是左边输出的形态是它期待的。",
        }}
        do={{
          code: `$ git log --oneline | grep -ci "fix"
18          ← 要计数：-c 一步到位
$ git log --oneline | grep -i "fix" | wc -l
18          ← 或者让 grep 吐行、wc 数行`,
          note: "两种正确写法二选一：要么 -c 直接计数，要么 grep 原样输出匹配行、交给 wc -l 数。别让两道计数工序叠在一起。",
        }}
      />

      <Callout kind="warning" title="macOS 自带的是 BSD 家族">
        macOS 预装的是 BSD 版 grep/sed，与 Linux 上的 GNU
        版在个别选项上有差异（如递归时对符号链接的处 理；到了 sed 一篇你还会遇到更著名的{" "}
        <code>sed -i</code> 必须写成 <code>sed -i ''</code>）。日常基 本无感，但当 AI 给的命令在你
        Mac 上报 <code>invalid option</code> 时，先怀疑版本差异；想要 GNU 行 为可以{" "}
        <code>brew install grep</code>。另外很多 agent 实际首选 ripgrep（<code>rg</code>）：语法与
        grep 高度相似，默认递归、自动跳过 .gitignore 里的内容、速度快得多。
      </Callout>

      <Heading level={2} title="动手练习" />
      <Paragraph>
        以下练习都在你自己的项目仓库里做，全部只读、零风险。先自己从左往右搭，再展开答案。
      </Paragraph>
      <Exercise
        tags={["grep", "管道", "head"]}
        hint="从左往右搭三段：谁产数据 → 谁按内容筛 → 谁限量。"
        question={<>用一条管道命令，筛出仓库里最近 3 个 fix 提交（一行一条，含哈希与提交信息）。</>}
        answer={
          <ShellBlock>{`$ git log --oneline | grep -i "fix" | head -3
4a88fc6 fix: main 统一为笔记滚动容器…
a266a08 fix: 评审修复——closeOtherDomains 领域判定与 history 重映射…
1603be9 fix: 侧栏四级条目恢复可变色竖线激活指示…`}</ShellBlock>
        }
      />
      <Exercise
        tags={["wc", "-c", "形态衔接"]}
        hint="grep -c 的输出是什么形态？wc -l 数的又是什么？"
        question={
          <>
            数一数仓库里 fix 提交的总数。为什么{" "}
            <code>{`git log --oneline | grep -ci "fix" | wc -l`}</code> 永远是 1？
          </>
        }
        answer={
          <Paragraph>
            直接 <code>{`git log --oneline | grep -ci "fix"`}</code>（本仓库为 18），或{" "}
            <code>{`git log --oneline | grep -i "fix" | wc -l`}</code>。<code>-c</code>{" "}
            已经把结果压成 「一个数字」这一行，再接 <code>wc -l</code> 是对数字数行，永远得
            1——两道计数工序只能留一道， 这是坑 3 的动手版。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="从热身到机制，四问走完本篇主线。"
        items={[
          {
            q: 'grep -rn "useState" src/ 里的 -r 和 -n 分别是什么意思？',
            intent:
              "热身题，确认是否真的动手用过 grep——这两个字母是 AI 命令里出现率最高的组合，没实际用过的话背不住。",
            a: "-r 是递归：钻进目录层层搜索所有文件；-n 是显示行号：每条匹配前加上它所在的行号，输出变成「文件:行号:内容」。AI 拿到行号就能精确引用 src/main.tsx:12 这样的位置，直接跳读那几行，而不用把整个文件读一遍。",
            bonus:
              '实战常再配 --include="*.tsx" 限定文件后缀，或在 src/ 这类源码目录里搜以避开 node_modules、dist 等生成物目录。',
            depth: 1,
          },
          {
            q: "管道右边的命令有什么讲究？为什么 git log --oneline | ls 里 ls 完全无视 git log 的输出？",
            intent:
              "检验是否理解「过滤器家族公约」，而不是死记命令组合——管道的接线模型是本篇的地基。",
            a: "管道只负责把左边命令的 stdout 接到右边命令的 stdin 上，右边得愿意读 stdin 才接得住。grep/cat/head/tail/sort/wc 这类过滤器遵守「没给文件参数就读 stdin」的公约；而 ls 根本不读标准输入，它只按自己的参数列目录，所以管道送来的数据被原样丢弃。判断一个命令能不能放管道右边，就看它是不是过滤器家族的。",
            bonus:
              "快速验证法：echo hi | 某命令，看它有没有反应、有没有把 hi 当输入处理；也可以查帮助页里是否提到 standard input。",
            depth: 2,
          },
          {
            q: 'echo "feat: apple" | grep "feat" package.json 会输出什么？管道里的那行数据去哪了？',
            intent:
              "本篇核心反直觉点：文件参数对 stdin 的「抢占」。能答对这题说明真正理解了取材规则，而不是背了几个组合。",
            a: '输出的是 package.json 里的匹配行（"name": "note-viz"），而管道送来的 feat: apple 被静默忽略——grep 一旦拿到文件参数就只读文件，不报错、不合并、不留任何提示。这是「以为管道数据一定会被处理」的错觉来源，排查时要先数命令里有没有文件参数。',
            bonus:
              '想两边都搜，用 - 为 stdin 显式占位：git log --oneline | grep "feat" - package.json 会同时搜提交历史和该文件。',
            depth: 3,
          },
          {
            q: '仓库有一万条提交时，git log --oneline | grep "feat" | head -5 为什么也是瞬间出结果？',
            intent:
              "看是否建立了「流式」心智：管道不是「等左边全部跑完再交给右边」的批处理，这是理解 shell 性能的分水岭。",
            a: "因为管道是流式的：git log 每吐一行，grep 就立即处理一行，数据像水一样连续流过三段，任何时刻都不需要等全量数据就位。head 凑够 5 行就关闭自己的 stdin，上游检测到管道下游关闭（收到 SIGPIPE 信号）便提前收工——所以 git log 实际只产出了开头一小部分就被叫停，一万条提交和十条提交的耗时几乎一样。",
            bonus:
              "同一机制的反面：下游提前退出时上游可能收到 broken pipe 报错（如 head -1 接某个持续输出的命令）。另外 head 放管道末端「控输出 + 早停提速」一举两得，这正是 AI 高频这么写的原因。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        本篇解决的是「按内容找」这一侧：grep 找内容、管道组合加工、head/tail 控制去留。系列下一篇是{" "}
        <strong>find</strong>——按文件名、大小、时间找<strong>文件本身</strong>，与 grep
        正好凑成「找文件 vs 找内容」的一对；再往后是<strong>重定向与退出码</strong>（
        <code>&gt;</code> <code>&gt;&gt;</code> <code>2&gt;/dev/null</code> <code>$?</code>
        ，本篇已两次偷看到它们），把「命令的成败与输出去向」补 齐；然后才是动文件的第一刀{" "}
        <strong>sed</strong>。本篇管道实验大量用到 <code>git log</code>，它只是 Git
        日常的冰山一角，完整体系见站内 Git 篇。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
            description: "本篇管道的原料供应商 git log 的完整用法：看历史、比对差异与安全撤销。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** 与代码块同款风格的命令/输出快照（ShellBlock 的紧凑版，用于步骤推演与练习答案内嵌） */
function Snap({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-[#e6edf3]">
      {children}
    </pre>
  );
}

/** shell 命令与输出块：站内 CodeBlock 仅支持 JS/TS 高亮，命令类内容用此本地块呈现 */
