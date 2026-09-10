import { Callout, CrossRef, DoDont, LayerStack, MemoryCard, Prerequisite } from "@/components/viz";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        要统一的不是几十个项目——异构是常态，也无需消灭——而是<strong>读取项目环境的方式</strong>
        ：全局装一次工具壳（mise），每个项目用声明文件（<code>.nvmrc</code> / <code>mise.toml</code>{" "}
        / <code>packageManager</code> 字段）写清「我用什么」，cd
        进目录自动生效；命令层再统一为一个入口（<code>mise run dev</code>
        ）。至此「很多项目」在心智上坍缩成「一个项目 + 一份配置」。
        完成态的判定标准：任何一台新机器十分钟配好，clone
        任意一个老项目不用问人、不看文档就能跑，全程零回忆。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "nvm、fnm、Volta、mise 差在哪？",
            to: "/note/frontend/engineering/package-management/version-managers",
          },
        ]}
      >
        本篇是整个知识面的整合篇：把环境一致性、lockfile
        纪律、缓存诊断、版本管理器四条线拧成一套多项目工作流。
      </Prerequisite>

      <Heading level={2} title="换一个问题：统一「解析」而不是统一「项目」" />
      <Paragraph>
        面对几十个 Node 版本各异、包管理器各异的项目，直觉方案是「把它们统一掉」——全部升到同一个
        Node、全部换成同一个管理器。这在存量世界里不现实：老项目能跑就是生产力，贸然升级才是风险。正确的转念是：项目可以异构，但
        <strong>解析机制</strong>
        必须统一——你只需要一个全局安装、认得所有声明格式的工具壳，让它替你回答「这个项目该用什么」。一个亲缘技术参照是
        DNS：你从不背诵每台服务器的 IP，你只装一个 resolver；每个项目的声明文件就是它的 zone
        record，cd 进目录就是一次查询。
      </Paragraph>
      <Paragraph>
        于是整个体系分成四层，各层性质完全不同——这个分层是本知识面所有内容的地基，也是「押声明不押工具」的完整形态：
      </Paragraph>
      <LayerStack
        label="四层终局 / the stack"
        title="声明层永生，解析层常换，依赖层已定型，兜底层守门"
        layers={[
          {
            name: "兜底层：CI 校验 + devcontainer",
            desc: "全新环境跑只读安装与构建——唯一能 100% 拦住「忘了提交 lockfile」的关卡",
            color: PALETTE.gray,
          },
          {
            name: "依赖层：lockfile + 严格安装",
            desc: "npm ci / --frozen-lockfile / --immutable 三家语义一致，2018 年起已定型",
            color: PALETTE.blue,
          },
          {
            name: "解析层：mise（或 fnm + corepack）",
            desc: "读声明、切版本、装工具——可替换的消耗品，坏了十分钟换一个",
            color: PALETTE.orange,
          },
          {
            name: "声明层：.nvmrc + packageManager + mise.toml",
            desc: "格式被整个生态认领、十年稳定——你的资产，永不搬家",
            color: PALETTE.green,
          },
        ]}
      />

      <Heading level={2} title="落地：机器一次，项目五分钟" />
      <Paragraph>
        机器层面只做一次：安装 mise 并激活（注入 shell 的 cd
        钩子），再设一个全局兜底版本——遇到没有声明文件的项目也有合理默认，不会落到「没声明就用错版本」。pnpm/yarn
        的版本同样交给 mise 管理（声明在 <code>[tools]</code> 里），此时不要再启用
        Corepack——同一个职责只允许一个工具拥有最终解释权，这是本知识面反复出现的纪律。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`# 每台机器一次
curl https://mise.run | sh                    # macOS / Linux（Windows: scoop install mise）
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
mise use -g node@lts                          # 全局兜底版本

# 每个项目一次（约五分钟）
cd some-project
mise use node@22.11 pnpm@10                   # 写入 mise.toml 并按声明安装`}
      />
      <Paragraph>
        项目层面是一份 <code>mise.toml</code>
        ：声明环境和统一入口各占一半。任务层的价值在「命令不变」——无论底下是 npm 还是 pnpm、Node 18
        还是 22，对外的入口永远是 <code>mise run dev</code>。这就是「声明层 +
        命令层」的适配器结构：命令是稳定 API，项目内部随便演进。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`# mise.toml —— 项目环境声明（提交入库）
[tools]
node = "22.11"          # 精确到小版本
pnpm = "10"

[tasks.dev]
description = "启动开发服务器"
run = "pnpm dev"

[tasks.build]
run = "pnpm build"

[tasks.reset]
description = "清赃状态，从 lockfile 完整重放"
run = ["rm -rf node_modules node_modules/.vite", "pnpm install --frozen-lockfile"]`}
      />

      <Heading level={2} title="存量项目迁移：审计、补声明、兜底" />
      <Paragraph>
        老项目不需要一次性整改。mise 认 <code>.nvmrc</code> 等既有声明文件，所以「没写
        mise.toml」的老项目 cd 进去就会按 .nvmrc
        自动切对版本——迁移可以按项目活跃度渐进。需要做的只有三件事：对存量项目做一次审计（缺声明的列出来）、给每个会持续维护的项目补齐两行声明（版本文件
        + <code>packageManager</code> 字段）、把 CI
        的只读安装与构建立为最后一道闸。审计一行脚本就够：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`# 列出既没有 .nvmrc 也没有 packageManager 声明的项目
for d in ~/Github/*/; do
  [ -f "$d/.nvmrc" ] || grep -q packageManager "$d/package.json" 2>/dev/null || echo "缺声明: $d"
done`}
      />
      <List
        ordered
        items={[
          <>
            <code>.nvmrc</code> 写精确版本（如 <code>22.11.0</code>），不要写宽松下界。
          </>,
          <>
            package.json 写 <code>packageManager</code> 字段，精确到小版本。
          </>,
          <>
            项目 <code>.npmrc</code> 固化 registry、<code>engine-strict=true</code>、
            <code>frozen-lockfile=true</code>。
          </>,
          <>mise.toml 配统一入口任务 + reset 任务（清赃状态的核弹按钮）。</>,
          <>CI：只读安装 + build + lint，PR 不绿不合并。</>,
        ]}
      />
      <Callout kind="tip" title="统一入口的判断标准">
        不是所有项目都值得配全：这个项目你会不会隔三差五回来？会回来的项目按上面清单配全；一次性的小项目靠约定即可——所有项目的
        script 名统一叫 dev / build / lint，用 <code>npm run dev</code> 也能跑（npm 随 Node
        附送，执行脚本与用哪个管理器装的依赖无关）。
      </Callout>

      <DoDont
        label="职责分配 / one owner per concern"
        dont={{
          code: `# fnm 管 Node + mise 也管环境
eval "$(fnm env --use-on-cd)"
eval "$(mise activate zsh)"
# cd 时两个工具都重排 PATH，
# 「当前 node 是谁」取决于 eval 顺序
# mise 还会认 .nvmrc 再装一份 Node`,
          note: "两个工具对同一职责都有解释权 = 没有解释权，排查「哪个 node 在跑」变成日常",
        }}
        do={{
          code: `# 组合 A（推荐）：mise 全权
eval "$(mise activate zsh)"
mise use node@22.11 pnpm@10    # Node、pnpm 都归 mise
# 组合 B（专工）：fnm + corepack + just
#   fnm 管 Node、corepack 管 pnpm 版本、
#   just 管统一入口——各管一摊，互不重叠`,
          note: "同一个职责，永远只允许一个工具拥有最终解释权",
        }}
      />

      <MemoryCard keyword="全局装壳，目录声明，进入生效">
        机器层只装一次工具壳（mise）并设全局兜底；每个项目用声明文件写清环境；cd
        进目录自动切换。统一的是解析机制，不是项目本身。
      </MemoryCard>
      <MemoryCard keyword="统一入口：mise run dev" color={PALETTE.green}>
        声明层 + 任务层 = 适配器结构：无论项目底下用什么
        Node、什么管理器，对外永远是同一条命令。会回来的项目配全，一次性项目靠 npm run 约定。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <DoDont
        dont={{
          code: `# 机器 A
$ nvm use 22
# 机器 B（忘了切）
$ node -v # v20，构建脚本用了 22 的 API 直接报错`,
          note: "版本靠每台机器自觉，永远对不齐",
        }}
        do={{
          code: `// package.json
"engines": { "node": ">=22" },
"packageManager": "pnpm@10.34.5"`,
          note: "声明即约定：mise/corepack 按声明自动落位，三平台一致",
        }}
      />

      <QAChain
        items={[
          {
            q: "mise 一把梭，到底帮我管了哪些东西？",
            intent: "热身题，检验对「三合一」边界是否清晰——管什么和不管什么同样重要。",
            depth: 1,
            a: "三件事：版本管理（Node、pnpm 等工具的安装与按目录切换）、环境变量（进目录注入、离开撤销，direnv 的活）、任务运行（mise run 统一入口，Make/just 的活）。它不管依赖安装本身——那仍是 pnpm/npm 的职责；也不管整机环境——那是容器的事。边界清晰才能替代：任何一环出问题都有对应的其他工具顶上。",
            bonus:
              "它还内建了 direnv 式的 [env] 配置：把 DATABASE_URL 这类项目变量也写进 mise.toml，告别散落的 .env 加载脚本。",
          },
          {
            q: "为什么 fnm + mise 是反模式？两者不都是优秀工具吗？",
            intent: "考职责重叠的代价——工具各自优秀不等于组合正确，这是本知识面最容易踩的坑。",
            depth: 2,
            a: "因为它们在「Node 版本管理」上职责完全重叠：cd 时 fnm 的 --use-on-cd 和 mise 的 activate 钩子都会重排 PATH，谁在 shell 配置里靠后谁生效；mise 还会读 .nvmrc，即使 mise.toml 没写 node 也会按它安装版本。结果是「当前 node 是哪个、谁装的」取决于 eval 书写顺序——环境问题排查从「读声明」退化成「考古配置」。判据只有一条：同一个职责，永远只允许一个工具拥有最终解释权。",
            bonus: "fnm 的正确位置是「替补」：mise 在 Windows 出问题时的退路。替补不常驻主力阵容。",
          },
          {
            q: "为什么说声明层「不会过时」？依据是什么？",
            intent:
              "考「押声明不押工具」的底层依据——能从格式标准化的角度回答，才算真正消化了这个知识面。",
            depth: 2,
            a: "因为声明格式的价值由整个生态共同背书：.nvmrc 被 nvm/fnm/mise/asdf 全部认领，packageManager 字段是 Corepack、pnpm、mise 等共同遵循的事实标准。工具之间竞争的是「谁解析声明更好」，声明格式本身是它们共同的接口——没有一家有动机破坏它。十年里版本管理器死了几个，.nvmrc 的写法一个字没变。资产的定义就是：换掉所有实现，它依然有效。",
            bonus:
              "同理类推：lockfile 格式随管理器走（资产归管理器所有），而 .nvmrc 连所有者都没有——越是无主的标准越长寿。",
          },
          {
            q: "什么时候该越过 mise，直接上 devcontainer？",
            intent:
              "压轴题，定位四层架构的最上层边界——知道一样新东西「该什么时候用」，比知道它是什么更难。",
            depth: 3,
            a: "mise 解决的是「工具链版本」一致性，管不到系统级依赖。当项目依赖操作系统层的东西——特定版本的系统库、数据库、ImageMagick、原生编译链——且团队成员环境各异时， mise 层就无法收敛了，该上 Dev Container：把整机环境做成镜像，VS Code 一键进入。判据是「一致性缺口在哪一层」：缺在工具链用 mise，缺在整机用容器，两者不冲突（容器里照样可以跑 mise）。",
            bonus:
              "成本意识：devcontainer 要为每个项目多维护一份环境定义，日常开销也高于原生 shell——按需给「环境娇贵」的项目上，不必全量推广。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "5 行的 Dockerfile 是怎么变成镜像的？",
            to: "/note/devtools/docker/dockerfile/build-anatomy",
            description:
              "四层架构的最上层：当一致性缺口出现在整机环境，容器是终解——镜像即环境的不可变快照。",
          },
          {
            title: "为什么各机器装出来的依赖会不一样？",
            to: "/note/frontend/engineering/package-management/different-deps",
            description:
              "回到起点：三类病根与五层钉死。读完整个知识面再回看第一篇，每层都该有新的对应物。",
          },
        ]}
      />
    </NoteShell>
  );
}
