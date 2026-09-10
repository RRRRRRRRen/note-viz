import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        tsserver 画红线、oxlint 报警告、oxfmt 改格式、tsc 拦构建——多工具
        <strong>重复是常态，冲突要分型</strong>： 同内核多形态（tsserver vs
        tsc）要防漂移；多内核抢同一职责（双 formatter）要指定唯一权威；接缝双事实（alias vs
        paths）要收敛单一源。治理四板斧：<strong>投影、委托、契约、版本锚定</strong>。原则句一句话：
        <strong>同一职责允许多形态，不允许多内核</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
          {
            title: "编辑器和构建的类型检查为什么会不一致？",
            to: "/note/frontend/engineering/typescript/ts-version-drift",
          },
        ]}
      >
        本篇是知识面的收尾：三角色模型扩展到完整工具链，版本锚定是四板斧之一而非全部。
      </Prerequisite>

      <Heading level={2} title="先把职责摆平" />
      <Paragraph>
        讨论冲突之前先看「谁真正拥有什么」——职责矩阵一旦清晰，大部分「冲突」自动消解为「各司其职」：
      </Paragraph>
      <Table
        label="职责矩阵 / responsibility matrix"
        head={["职责", "唯一权威", "编辑器的角色"]}
        rows={[
          ["类型语义与检查", "tsc 类型检查器内核", "tsserver 是它的交互投影"],
          ["转译产出 JS", "esbuild / Oxc（Vite 内嵌）", "无——tsc 因 noEmit 退出竞争"],
          ["模块解析（类型侧）", "tsconfig paths", "tsserver 用它跳转与补全"],
          ["模块解析（运行时）", "vite resolve.alias", "无——需要与 paths 人肉对齐"],
          ["格式化", "oxfmt", "保存时委托执行，内置 formatter 禁用"],
          ["lint", "oxlint", "同屏第二视角（警告色）"],
        ]}
      />
      <Paragraph>
        这张矩阵的读法是<strong>先问归属、再谈工具</strong>
        ：任何一处「打架」，先定位它属于哪一行职责，再看该行的唯一权威是否真的唯一——冲突九成出在「同一行出现两个权威」
        （两个 formatter、两套类型诊断），而不是「行与行之间」。留意「编辑器的角色」一列：
        没有一行是编辑器当权威，它全部是投影或委托——这正是四板斧前两条的雏形。
        职责清晰的副产品是排错路径收敛：格式乱了查 oxfmt 配置、类型错了查
        tsconfig，不再有「哪个工具改了我的文件」的悬案。
      </Paragraph>

      <Heading level={2} title="三种冲突型" />
      <Table
        label="冲突分型 / three conflict kinds"
        head={["型", "本质", "典型标本", "解法"]}
        rows={[
          [
            "A 假冲突",
            "同内核多形态——防的是主从延迟",
            "tsserver vs tsc（实时查询 vs 跑批）",
            "版本锚定 + include 写全",
          ],
          [
            "B 真冲突",
            "多内核抢同一职责",
            "prettier vs 编辑器内置 formatter；Volar vs tsserver 双诊断",
            "指定唯一权威，其余降级或接管",
          ],
          [
            "C 结构冲突",
            "接缝双事实漂移",
            "vite alias vs tsconfig paths",
            "收敛单一事实源（插件化）",
          ],
        ]}
      />
      <Paragraph>
        A 型用数据库锚点最准：tsserver 和 tsc
        是同一存储引擎的常驻查询与跑批作业——像主库与只读副本，要防的不是「打架」而是
        <strong>主从延迟</strong>。B 型最经典的现场是格式化：prettier 和 IDE 内置 formatter
        同时开，保存后互相改写，每个前端都经历过；Vue 生态的 Volar 与 tsserver 给 .vue
        出双份诊断，Volar 1.x 的 take-over mode 就是为消灭这个冲突而生——2.x 起 Vue - Official
        已把这套整合做成默认行为。C 型则是模块解析篇讲过的双份事实——改一漏一的分裂症状。
      </Paragraph>

      <Heading level={2} title="四板斧" />
      <List
        ordered
        items={[
          <>
            <strong>投影</strong>：UI 层不另立判断，只渲染内核结论——红线与补全是 tsserver
            的投影，不是编辑器自己的观点；
          </>,
          <>
            <strong>委托</strong>：编辑器从实现者降级为触发器——保存时 exec oxfmt/oxlint，内置
            formatter 禁用；
          </>,
          <>
            <strong>契约</strong>：tsconfig
            做多读者的共享事实源，接缝能用插件对齐就插件化（vite-tsconfig-paths）；
          </>,
          <>
            <strong>版本锚定</strong>：所有裁判型工具（编译器/linter/formatter）的版本从 lockfile
            和工作区取，不从编辑器内置取——mise 的「声明式单一来源」哲学在 TS 上的应用。
          </>,
        ]}
      />
      <Paragraph>
        版本锚定值得单独展开「为什么」：裁判型工具的版本直接决定判断语义——TS 的 minor
        都可能加检查，linter 的规则集随版本增删，而编辑器内置版随编辑器发布节奏走，与项目 lockfile
        毫无关系。不锚定，等于把「代码对不对」的裁判权交给一个不属于项目的版本：同一份代码在不同成员的机器上得出不同结论——这正是
        A 型冲突（漂移）的完整成因。锚定的本质是把<strong>判断语义</strong>
        也纳入声明式单一来源：package.json 声明、lockfile 锁定、编辑器用 tsdk
        指路（VSCode）或自动探测（IDEA），与版本漂移篇的统一链条是同一条链。
      </Paragraph>

      <Heading level={2} title="重复检查的最佳实践" />
      <Paragraph>
        「tsserver 和 oxlint 同时报错」「CI 里 lint 和 tsc
        串行跑」——这些都不是重复检测，因为两边的职责本来就不同：
        <strong>
          tsc/tsserver 管「类型对不对」（正确性），linter 管「写法好不好」（风格、坑、框架约定）
        </strong>
        。真实的冲突出在规则交集上，治理就是消除交集：
      </Paragraph>
      <List
        items={[
          <>
            <strong>规则去重</strong>：tsconfig 开了 <code>noUnusedLocals</code>/
            <code>noUnusedParameters</code>
            ，linter 对应规则关掉；TS 项目里 no-undef 类规则全部不配（tsc 全权负责，linter
            那份还会误报）；
          </>,
          <>
            <strong>编辑器三报告共存是特性</strong>
            ：红色波浪线（类型错）与黄色警告（写法问题）是两个视角——规则不重叠就不会同一处报两次；
          </>,
          <>
            <strong>CI 双门禁串行</strong>：
            <code>format:check → lint → tsc -b &amp;&amp; vite build</code>
            ——便宜的先跑，正确性门禁挡在构建前，各查各的；
          </>,
          <>
            <strong>永不同时跑两个 linter</strong>：eslint + oxlint 二选一——那才是真正的 B 型冲突。
          </>,
        ]}
      />
      <Callout kind="info" title="oxlint 为什么快">
        linter 的 TS 支持分两档：语法级规则（不向编译器买类型信息，快）与类型感知规则（要请求 tsc
        的类型，慢一个数量级）。oxlint 绝大多数规则是语法级——这是它快和「与 tsc
        无版本耦合」的共同根源。
      </Callout>

      <DoDont
        label="格式化的唯一权威 / one formatter"
        dont={{
          code: "prettier + 内置 formatter 都开",
          note: "B 型冲突现场：保存触发两套格式化引擎互相改写，diff 噪音与无限循环的根源",
        }}
        do={{
          code: "default formatter = oxfmt，内置禁用",
          note: "每职责唯一权威，编辑器降级为触发器——保存委托执行 oxfmt，格式永不拉锯",
        }}
      />

      <QAChain
        intro="五问从「是不是冲突」问到「怎么落到配置」：分型能力比背结论重要。"
        items={[
          {
            depth: 2,
            q: "tsserver 和 oxlint 同时在文件里报错，是冲突吗？",
            intent: "热身：用最高频的现场检验「重复 ≠ 冲突」的分辨力。",
            a: "不是，是两个视角。tsserver 报类型语义（红线），oxlint 报写法与坑（警告色）——只要规则清单不重叠，同一处不会被报两次。真正的重复是两边都开了 no-unused-vars 这类同语义规则，解法是规则去重而不是砍掉一边。",
          },
          {
            depth: 3,
            q: "prettier 和编辑器内置 formatter 打架，怎么治？",
            intent: "B 型冲突的标准处置流程——考察「唯一权威 + 其余降级」的动作完整性。",
            a: "指定唯一权威并降级其余：编辑器 default formatter 设为 prettier（或 oxfmt），禁用内置格式化，format on save 只委托一个引擎。根治判断：看 team 里格式化的事实标准是什么，让编辑器配置跟着二进制走，而不是各配各的。",
          },
          {
            depth: 3,
            q: "Volar 为什么要「接管」tsserver？",
            intent:
              "用 Vue 生态的真实案例考察 B 型冲突的结构性成因——新文件类型超出语言服务的能力边界。",
            a: "因为 .vue 不在 tsserver 认识的文件类型里，且 tsserver 插件只能增强已有类型、不能认识新类型。Volar 必须包装甚至接管 tsserver 才能让类型内核服务 .vue；不接管就会出现两套诊断同屏的 B 型冲突——Volar 1.x 的 take-over mode 就是为消灭双诊断设计的，2.x 起 Vue - Official 已把这套整合做成默认行为。",
          },
          {
            depth: 4,
            q: "CI 里 lint 和 tsc 串行跑，算重复检测吗？门禁顺序怎么定？",
            intent: "把「职责不同」落到工程编排——顺序本身也是设计。",
            a: "不算。lint 查风格与坑，tsc 查类型正确性，规则去重之后两者检查的是不相交的集合。顺序按成本排：format:check（最便宜）→ lint → tsc -b && vite build——让最便宜的失败最快暴露，正确性门禁挡在产出之前。",
            bonus:
              "pre-commit 钩子只放语法级便宜检查（对暂存文件跑 oxfmt/oxlint），tsc 全量放 CI——本地反馈速度与门禁完整性两头都要。",
          },
          {
            depth: 4,
            q: "「允许多形态，禁止多内核」怎么落到具体配置？",
            intent: "收束题：把四板斧变成可执行的检查清单，检验抽象原则的落地能力。",
            a: "四条配置对应四板斧：投影——红线只认 tsserver，编辑器不装第二套类型诊断；委托——default formatter 指向 oxfmt、内置禁用，lint 由 oxlint 一家负责；契约——tsconfig 做共享源，alias/paths 这类接缝用 vite-tsconfig-paths 收敛；版本锚定——提交 typescript.tsdk、裁判型工具版本全部来自 lockfile。逐条自查，多内核无处藏身。",
          },
        ]}
      />

      <MemoryCard keyword="允许多形态，禁止多内核">
        tsserver 与 tsc 是同内核的两形态（防漂移）；双 formatter、双 linter 是多内核（必起冲突）。
      </MemoryCard>
      <MemoryCard keyword="四板斧：投影·委托·契约·锚定" color="#8b5cf6">
        UI 渲染内核结论、编辑器降级为触发器、配置收敛单一源、裁判版本来自
        lockfile——多工具治理的完整动作集。
      </MemoryCard>

      <CrossRef
        title="回到根基"
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
            description: "治理的对象是三角色与多工具的分工——绕一圈回来重读地基，会有第二层理解。",
          },
          {
            title: "几十个项目版本各异，心智怎么统一？",
            to: "/note/frontend/engineering/package-management/unified-toolchain",
            description: "「声明式单一来源」在工具链层的完整形态——四板斧中版本锚定的上游。",
          },
        ]}
      />
    </NoteShell>
  );
}
