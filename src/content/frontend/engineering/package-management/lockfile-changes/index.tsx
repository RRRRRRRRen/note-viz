import { FlowChart } from "@/components/demo/FlowChart";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        lockfile 的两种写入性质完全不同：<code>add</code> 更新它是<strong>记账</strong>
        ——依赖意图变了，档案跟着更新，天经地义；<strong>裸 install</strong> 更新它是
        <strong>补账</strong>——它检测到 lockfile 与 package.json
        脱节，默认替你重新解析并改写。补账动作本身说明仓库状态有问题，团队协作里应当被视为红灯：先查脱节来源，而不是顺手
        commit。至于 lockfile 的大段 diff，先看<strong>形状</strong>
        再下结论：邻域扩散是健康的连锁反应，全文件翻转必有真凶。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "lockfile 是如何保证依赖树一致的？",
            to: "/note/frontend/engineering/package-management/lockfile-consistency",
          },
        ]}
      >
        机制篇的续集：lockfile 是解析结果的档案，本篇回答「谁在什么情况下有权写这份档案」。
      </Prerequisite>

      <Heading level={2} title="先摆正角色：谁有权写这份档案" />
      <Paragraph>
        一个准确的心智模型：lockfile 是<strong>派生数据</strong>
        ，类似数据库里的物化视图——package.json 是视图定义，lockfile
        是按定义查询后的实体化结果，node_modules
        则是照着结果铺出来的表。写权限严格分层：package.json 归人，lockfile 归解析函数，node_modules
        归安装器。凡是「派生数据自己变了」，只有两种可能：定义变了（记账），或者定义与档案脱节后被工具修复了（补账）。
      </Paragraph>
      <Paragraph>
        <code>pnpm add lodash</code> 是标准的记账流程：改 package.json（输入变了）→
        只对受影响的子树重新解析 → 把新结果写回 lockfile →
        物化。三次写入一气呵成，意图、档案、磁盘三者重新对齐——这一类变更合法且应当出现在 commit 里。
      </Paragraph>
      <FlowChart
        label="install 判定 / write or not"
        data={{
          direction: "TB",
          nodes: [
            { id: "install", label: "pnpm install", color: "#1677ff" },
            { id: "check", label: "对照 lockfile 的 specifier\n与 package.json", color: "#f59e0b" },
            { id: "sync", label: "一致：纯物化\nlockfile 一字节不动", color: "#3fb950" },
            {
              id: "desync",
              label: "脱节：对脱节部分重解析\n写回 lockfile（补账）",
              color: "#f85149",
            },
            { id: "done", label: "物化 node_modules", color: "#1677ff" },
          ],
          edges: [
            { source: "install", target: "check" },
            { source: "check", target: "sync", label: "匹配" },
            { source: "check", target: "desync", label: "不匹配", dashed: true },
            { source: "sync", target: "done" },
            { source: "desync", target: "done" },
          ],
        }}
      />

      <Heading level={2} title="实测：红灯与补账只隔一个参数" />
      <Paragraph>
        脱节检测的依据在上一篇讲过：lockfile 的 importers
        区块同时记录意图（specifier）与事实（version）。制造一次脱节——手改 package.json 把{" "}
        <code>"ms": "2.1.3"</code> 改成 <code>"^2.0.0"</code>
        ，但不重装——然后看两种安装方式的反应（pnpm 10.34.5 实测）：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`$ pnpm install --frozen-lockfile
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile"
because pnpm-lock.yaml is not up to date with <ROOT>/package.json

Note that in CI environments this setting is true by default.
  Failure reason:
  specifiers in the lockfile don't match specifiers in package.json:
  - ms (lockfile: 2.1.3, manifest: ^2.0.0)`}
      />
      <CodeBlock
        lang="typescript"
        code={`$ pnpm install          # 同样的脱节，裸 install
Done in 289ms           # 没有任何红灯，静默补账

$ git diff pnpm-lock.yaml
   dependencies:
     ms:
-      specifier: 2.1.3     # 意图被改写
+      specifier: ^2.0.0
      version: 2.1.3        # 事实恰好没变——但换成新区间时
                            # 解析结果同样会变`}
      />
      <Paragraph>
        同一个脱节，frozen 模式当场列出「lockfile: 2.1.3, manifest: ^2.0.0」的不匹配清单，裸 install
        则一言不发地把 specifier
        改写了。差别只在默认值——「自动修复」对单人项目是贴心，对团队是灾难源：补账时的重新解析要查询
        registry 此刻的状态，谁执行、何时执行，结果就可能不同。这就是「lockfile
        自己变了」与环境不一致之间的因果链。
      </Paragraph>

      <Heading level={2} title="脱节从哪来：五个常见入口" />
      <List
        ordered
        items={[
          <>改了 package.json 忘了提交 lockfile——同事拉下来一装，锁文件「自己变了」。</>,
          <>merge 冲突只解了一边：package.json 解了，lockfile 没解（或解坏了）。</>,
          <>
            手改 package.json 的版本区间，没有走 <code>add</code>/<code>update</code>。
          </>,
          <>lockfile 格式迁移：管理器大版本升级会整本重写（如 lockfileVersion 升级）。</>,
          <>管理器或版本混用：格式互不相认，一个工具会重写另一个工具的档案。</>,
        ]}
      />
      <DoDont
        label="发现 lockfile 变了 / who wrote it"
        dont={{
          code: `$ git status
modified: pnpm-lock.yaml
$ git add pnpm-lock.yaml   # 顺手 commit
# 脱节来源就此石沉大海`,
          note: "补账结果被固化进仓库，下一次解析的随机性被永久记录——下次它还会变",
        }}
        do={{
          code: `$ pnpm install --frozen-lockfile
# 报错会列出哪一项不匹配：
#   - ms (lockfile: 2.1.3, manifest: ^2.0.0)
# 定位：是忘了提交？merge 没解？
# 手改的区间？确认后用 add/update 正规化`,
          note: "红灯是线索不是麻烦：先回答「谁造成的脱节」，再决定怎么写回",
        }}
      />

      <Heading level={2} title="大 diff 诊断：看形状，不逐行读" />
      <Paragraph>
        「加一个小包，lockfile 变了几百行」不一定是事故。lockfile
        的数据结构自带放大器：新包的传递依赖与现有树共享区间时，会产生版本分叉或去重，一个 add
        牵动几十个条目是正常连锁；每条记录还带着 integrity
        哈希和依赖映射块，升一个版本整条重写；pnpm 的锁文件更是「元数据 +
        依赖图」双结构，任何变化天然出现两次。判断标准是<strong>形状</strong>：
      </Paragraph>
      <Table
        label="diff 形状诊断 / diff shapes"
        head={["diff 长相", "诊断", "处方"]}
        rows={[
          [
            "变化集中在新包的传递依赖邻域，增删成对出现",
            "健康的连锁反应 / 版本分叉",
            "扫一眼邻域扩散是否合理即可",
          ],
          [
            "全文件均匀翻转，大量 registry URL 变化",
            "registry 不统一：resolved 字段记录完整 URL，各人 .npmrc 不同则整本重写",
            "项目级 .npmrc 固化 registry",
          ],
          [
            "全文件均匀重写，无 URL 变化",
            "lockfileVersion 迁移或管理器版本混用",
            "统一 packageManager 字段锁定的版本",
          ],
          [
            "大量不相干的包被 bump 版本",
            "全量重解析（区间 × registry 时刻漂移）",
            "严格模式 + 有意变更才走 add/update",
          ],
          ["内容没变却全是 diff", "git 行尾转换（autocrlf）", "统一 .gitattributes"],
        ]}
      />
      <Callout kind="danger" title="国内团队的高频真凶：registry URL 进了 lockfile">
        实测某台开发机的 node_modules/.modules.yaml 里，registries.default
        是镜像源而非官方源——这是用户级配置悄悄生效的实证。npm 系锁文件的 resolved 字段、pnpm 对非
        registry 依赖的 tarball 字段都会记录完整 URL：A 用官方源、B
        用镜像源，两人的锁文件从字节层面就不同，谁 install 谁重写。修法只有一个：把 registry
        写进项目级 .npmrc 并提交。
      </Callout>

      <MemoryCard keyword="add = 记账，裸 install = 补账">
        记账合法且应当提交；补账说明 lockfile 与 package.json
        脱节了——它是红灯，先查脱节来源再写回。frozen 模式的价值就是把补账变成当场报错。
      </MemoryCard>
      <MemoryCard keyword="看 diff 形状，不逐行读" color="#8b5cf6">
        邻域扩散是健康连锁；全文件翻转必有真凶（registry URL、格式迁移、全量重解析、行尾）。lockfile
        diff 是团队环境差异最诚实的传感器。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "pnpm add 更新 lockfile 天经地义，那它算「修改依赖树」吗？",
            intent: "热身题——分清「意图变更引起的写入」与「脱节修复引起的写入」。",
            depth: 1,
            a: "算，而且是唯一合法的修改方式。add 的语义是「变更依赖意图」：改 package.json、对受影响子树重新解析、写回 lockfile。它与补账的区别在于触发者：记账由人的明确意图触发，补账由工具的脱节检测触发。所以判断 lockfile 变更是否健康，先问「这次变更有对应的 add/update 吗」。",
            bonus: "remove/update 同属记账家族；install 永远不该出现在「变更依赖」的位置上。",
          },
          {
            q: "为什么补账时的重新解析可能让每台机器结果不同？",
            intent: "把「补账」与「环境不一致」接通——这是 lockfile 纪律为什么存在的核心因果链。",
            depth: 2,
            a: "补账的本质是对脱节部分重新执行解析函数，而解析函数有个隐藏输入：registry 在执行那一刻的状态。区间 ^1.2.3 今天解析到 1.9.0，下个月可能解析到 1.10.0。A 上周补的账和 B 今天补的账，档案内容就不同——「人人同树」的承诺只在「所有人都只读消费 lockfile、写入都经由显式 add/update」时成立。",
            bonus:
              "这也是 frozen 模式报错文案强调 CI 默认开启的原因：CI 是全新环境，补账的随机性在那里被放大成构建不可复现。",
          },
          {
            q: "merge 冲突时 lockfile 应该怎么解？",
            intent: "工程实战题——merge 是脱节的第二大来源，会正确处理的人不多。",
            depth: 2,
            a: "原则：不要手工逐行解 lockfile 冲突。推荐流程是把 lockfile 恢复到任一分支的版本（或直接 checkout --theirs/--ours），然后基于合并后的 package.json 跑一次 add/update 让工具重新生成一致状态，最后审查这次生成产生的 diff。pnpm 额外支持解析冲突标记后重建，但「让工具重算、人来审查结果」的原则不变。",
            bonus:
              "预防优于善后：依赖升级独立成 commit、避免长周期分支并行改依赖，能把 lockfile 冲突概率压到最低。",
          },
          {
            q: "code review 时看到 lockfile 大 diff，审查清单是什么？",
            intent: "把本篇收束成可执行的审查动作——团队里最有传播价值的习惯。",
            depth: 3,
            a: "三步：一看形状——邻域扩散（对应一次 add）还是全文件翻转（指向 registry/格式/行尾问题）；二找意图——PR 里有没有对应的 package.json 变更或「依赖升级」说明， specifier 行的变更必须能对上 package.json 的 diff；三查规模——大版本迁移类的一次性重写应单独成 commit 并在 PR 描述里声明。形状异常的 lockfile 变更，要求作者解释来源是审查的正当要求。",
            bonus:
              "CI 里加一道 git diff --exit-code pnpm-lock.yaml（在 frozen install 之后跑），能把「静默补账」直接拦在合并前。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "pnpm 凭什么又快又省还封杀幽灵依赖？",
            to: "/note/frontend/engineering/package-management/pnpm-structure",
            description: "换个视角看 node_modules：它的物理结构本身就是一致性策略的一部分。",
          },
          {
            title: "为什么构建上下文越大 build 越慢？",
            to: "/note/devtools/docker/dockerfile/build-context-cache",
            description: "另一层缓存：Docker 的层缓存与 .dockerignore，与包管理器缓存同构。",
          },
        ]}
      />
    </NoteShell>
  );
}
