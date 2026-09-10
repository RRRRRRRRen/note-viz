import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  VersionNote,
} from "@/components/viz";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        pnpm 的三个卖点来自同一套物理结构：<strong>全局内容寻址 store</strong>
        把每个文件按哈希在整台机器上只存一份；项目的 node_modules 里用<strong>硬链接</strong>
        零拷贝引用 store 的内容，用<strong>符号链接</strong>组装依赖图；顶层只暴露 package.json
        里声明的直接依赖——于是磁盘省了（100
        个项目共享一份文件）、安装快了（下载过的直接链接）、幽灵依赖被封杀了（没声明的包物理上找不到）。配套的{" "}
        <code>.modules.yaml</code>{" "}
        记录环境指纹，任何指纹变化自动触发重装，增量安装的赃状态在这里天然少一个数量级。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么各机器装出来的依赖会不一样？",
            to: "/note/frontend/engineering/package-management/different-deps",
          },
        ]}
      >
        幽灵依赖的成因在病根二里埋了伏笔：npm 的扁平化让「依赖的依赖」顶层可见。本篇看 pnpm
        如何从文件系统层面根治它。
      </Prerequisite>

      <Heading level={2} title="对照物：npm 的扁平 node_modules" />
      <Paragraph>
        早期 npm（1/2 时代）把依赖嵌套安装——依赖的依赖套在里面，Windows 上路径轻松超过 260
        字符限制，于是 npm 3 起改为<strong>扁平化</strong>
        ：尽量把所有层级的依赖都提升（hoist）到顶层
        node_modules。这解决了路径和重复安装问题，但带来一个副作用：你的代码可以 require
        到自己从未声明过的包，因为它们「恰好」躺在顶层。这就是幽灵依赖——它不是语法漏洞，是目录结构给的便利。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`node_modules/            # npm 扁平化（示意）
├── express/             # 你声明的直接依赖
├── body-parser/         # express 的依赖，被提升到顶层
├── accepts/             # express 的依赖的依赖……也在顶层
└── .package-lock.json
# 代码里 require('body-parser') 能跑——但 package.json 里没写它`}
      />

      <Heading level={2} title="pnpm 的结构：一份内容，两重链接" />
      <Paragraph>
        pnpm 的方案分两步。第一步是<strong>全局内容寻址 store</strong>：所有下载过的文件按哈希存在{" "}
        <code>~/.pnpm-store</code>（macOS 默认 <code>~/Library/pnpm/store</code>），内容相同
        的文件整台机器只有一份。第二步是在项目里<strong>组装</strong>：node_modules/.pnpm 是虚拟
        store，每个包的目录内容硬链接回全局
        store（不占额外磁盘），包与包之间的依赖关系用符号链接表达；顶层 node_modules
        只放直接依赖的符号链接。一个最小项目的真实结构（pnpm 10.34.5 实测，
        <code>pnpm add ms@2.1.3</code>）：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`$ ls -la node_modules/
drwxr-xr-x   .pnpm/                    # 虚拟 store
-rw-r--r--   .modules.yaml             # 环境指纹（见下文）
lrwxr-xr-x   ms -> .pnpm/ms@2.1.3/node_modules/ms
#            ↑ 顶层只有直接依赖，且是符号链接

$ ls node_modules/.pnpm/
lock.yaml                # 虚拟 store 的锁
ms@2.1.3/
  └── node_modules/
      ├── ms/            # 内容硬链接 → ~/.pnpm-store（不占双份磁盘）
      └── （该包所依赖的其他包的符号链接）`}
      />
      <Paragraph>
        硬链接与符号链接的分工值得单独说清：硬链接是「同一份 inode
        的另一个名字」，文件内容不复制，所以 100 个项目用同一个版本的
        lodash，磁盘上只有一份，且任何一处使用都不影响其他项目（包管理器写入时用「先写临时文件再替换」保证不就地修改）；
        符号链接则是「指向另一条路径的路标」，pnpm 用它把「express 依赖
        body-parser」这类关系表达成目录可达性。内容用硬链接省磁盘，结构用符号链接建图——职责清晰。
      </Paragraph>
      <Paragraph>
        一个亲缘技术参照：Git 的对象库。<code>.git/objects</code> 按内容哈希存对象，工作区只是
        checkout 出来的视图——pnpm 的 store 与 node_modules 是同构关系：store
        是全机器共享的对象库，每个项目的 node_modules 只是一次「链接视图」。这也是为什么 pnpm
        的安装可以快：大部分时候它不是在下载，而是在做链接。
      </Paragraph>
      <CompareTable
        label="npm 扁平 vs pnpm 隔离 / node_modules"
        left={{ title: "npm（扁平化）", color: PALETTE.orange }}
        right={{ title: "pnpm（符号链接）", color: PALETTE.green }}
        rows={[
          {
            aspect: "磁盘占用",
            left: "每个项目各自完整拷贝一份",
            right: "全局 store 一份，硬链接零拷贝",
          },
          { aspect: "安装速度", left: "下载 + 解压 + 拷贝", right: "命中 store 后只做链接" },
          {
            aspect: "幽灵依赖",
            left: "提升到顶层，「顺手」可见",
            right: "顶层只有直接依赖，物理上不可见",
          },
          {
            aspect: "结构一致性",
            left: "提升顺序受版本影响，可能不同机器不同",
            right: "结构由 lockfile 完全决定",
          },
          {
            aspect: "生态兼容",
            left: "所有工具的默认假设",
            right: "少数假设真实文件的工具需要配置",
          },
        ]}
      />

      <Heading level={2} title=".modules.yaml：让增量安装自愈的环境指纹" />
      <Paragraph>
        上一篇说过增量安装可能留下赃状态。pnpm 对这类问题的缓解是<strong>把环境指纹记录在案</strong>
        ：node_modules/.modules.yaml 记录布局版本、管理器与版本、registry 地址、store
        位置等信息。以下是一台真实开发机的实测内容：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`// node_modules/.modules.yaml（实测节选）
layoutVersion: 5
nodeLinker: isolated
packageManager: pnpm@10.34.5
registries:
  default: https://registry.npmmirror.com/   # ← 用户级配置的实证（见 Callout）
storeDir: /Users/ren/Library/pnpm/store/v10`}
      />
      <Paragraph>
        这些字段就是「上次物化时的世界状态」。下次 install 时 pnpm
        先对照：布局版本变了吗？管理器换了吗？Node 版本变了吗（影响原生模块的 ABI 编译）？registry
        变了吗？任何一项变了，pnpm 重新物化而不是增量打补丁——「换了 Node
        版本忘了重装」这类经典赃状态，在这里被指纹比对自动兜住。npm 没有等价机制，这正是「pnpm
        项目玄学问题少」的底层原因之一。
      </Paragraph>
      <VersionNote
        label="pnpm 10 的行为变化 / scripts"
        versions={[
          {
            range: "pnpm ≤ 9",
            text: "依赖包的 postinstall 等生命周期脚本默认执行（供应链风险点）",
          },
          {
            range: "pnpm 10+（2025）",
            text: "默认不执行依赖的安装脚本，改为 onlyBuiltDependencies 白名单显式放行；同时设置项逐步向 pnpm-workspace.yaml 迁移",
            color: PALETTE.orange,
          },
        ]}
        note="升级 pnpm 大版本时留意：行为默认值的变化也会造成「同样的代码，装完行为不同」。"
      />

      <DoDont
        label="混用管理器 / one project, one manager"
        dont={{
          code: `# 在 pnpm 项目里手滑执行
npm install
# npm 拍平整个 node_modules，
# 生成 package-lock.json，
# pnpm 面对结构陌生的废墟`,
          note: "结构污染后表象是「各种玄学错误」，真因是双管理器互写",
        }}
        do={{
          code: `// package.json
{ "packageManager": "pnpm@10.34.5" }
// pnpm 的 package-manager-strict 默认开启，
// 在声明了其他管理器的项目里运行会直接报错`,
          note: "一个项目一个管理器，装错当场拦截——结构污染从源头消失",
        }}
      />
      <Callout kind="warning" title="顺手检查一下你的 registry">
        上面 .modules.yaml 的实测内容里，registry
        是镜像源而非官方源——它来自这台机器的用户级配置，而不是项目声明。npm 系锁文件会把完整 URL
        记进 resolved 字段，团队里源不统一，lockfile 就会互相整本重写。把 registry 写进项目级 .npmrc
        并提交，是成本最低的一致性投资。
      </Callout>

      <MemoryCard keyword="store 一份，项目零拷贝">
        全局内容寻址 store 按哈希存文件，项目的 node_modules 是硬链接 +
        符号链接组装的视图——省磁盘、装得快，与 Git 对象库同构。
      </MemoryCard>
      <MemoryCard keyword="幽灵依赖不是道德问题，是文件系统问题" color={PALETTE.green}>
        npm 扁平化让未声明的包「恰好可见」；pnpm 顶层只放直接依赖，没声明的包物理上找不到。迁移 pnpm
        前先显式声明所有直接 import。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <DoDont
        dont={{
          code: `// 没声明的包也能 import（幽灵依赖）
import dayjs from "dayjs"; // 来自某个传递依赖，它升级那天就消失`,
          note: "hoist 把依赖拍平，越界使用无声通过",
        }}
        do={{
          code: `import dayjs from "dayjs"; // package.json 里声明过
// pnpm 的 node_modules 只含声明过的包，其余链接到全局 store`,
          note: "显式依赖 + 符号链接结构，越界 import 直接报错",
        }}
      />

      <QAChain
        items={[
          {
            q: "硬链接和符号链接有什么区别？pnpm 分别用在哪？",
            intent: "热身题——两个链接概念混为一谈的人，讲不清 pnpm 的省磁盘与建图分工。",
            depth: 1,
            a: "硬链接是同一份文件数据（inode）的多个名字：不复制内容、不占双份磁盘，删除其中一个名字不影响数据本身。符号链接是独立的路径路标：存的是目标路径，目标删了它就悬空。pnpm 用硬链接把包文件内容指到全局 store（省磁盘、秒级安装），用符号链接组装包与包之间的依赖关系（express 的目录里能「看到」body-parser）。",
            bonus: "验证：ls -li 看两个项目里同一版本包的 inode 号——相同即为硬链接到同一份内容。",
          },
          {
            q: "幽灵依赖是怎么被「物理封杀」的？",
            intent: "考结构如何决定可见性——理解了目录可达性，就理解了依赖纪律的执行机制。",
            depth: 2,
            a: "Node 的模块解析按目录逐级向上找 node_modules。pnpm 的顶层 node_modules 只放直接依赖的符号链接；依赖的依赖被组织在 .pnpm 虚拟 store 内各自的目录里，且一个包的目录里只链接它自己声明的依赖。你的代码从顶层找不到未声明的包，require 直接失败——不是 lint 警告，是文件系统层面不可达。纪律由结构执行，不靠自觉。",
            bonus:
              "逃生舱是 .npmrc 的 public-hoist-pattern（如某些工具确需提升），但那是显式决定，不再是隐式便利。",
          },
          {
            q: "100 个项目用同一个版本的包，磁盘上到底存几份？删一个项目会影响别的吗？",
            intent: "考内容寻址与链接的细节——「共享」与「隔离」如何同时成立是 pnpm 设计的精髓。",
            depth: 2,
            a: "磁盘上只有一份（store 里），100 个项目的 node_modules 都是硬链接，不占额外空间。删掉任何一个项目不会影响其他项目——硬链接的语义是「多一个名字」，删名字不删数据；只有所有名字都删掉，store 在引用计数归零后才可能被 prune 回收。同时项目之间是隔离的：pnpm 修改文件采用先写临时文件再原子替换，不会就地改共享内容。",
            bonus: "pnpm store prune 命令可以清掉不再被任何项目引用的孤儿文件。",
          },
          {
            q: "为什么有些工具在 pnpm 下会坏？遇到了怎么办？",
            intent: "压轴题，直面 pnpm 最大的工程成本——生态兼容。能给出系统性答案说明真的用过。",
            depth: 3,
            a: "根因是部分工具假设「node_modules 是真实文件的扁平目录」：有的用 fs 常规手段遍历却不解析符号链接，有的按提升路径硬编码找依赖。表现多为「找不到某模块」「路径不对」。排查顺序：先确认该工具是否有 pnpm 兼容说明；再用 .npmrc 的 shamefully-hoist / public-hoist-pattern 把特定包提升到顶层（逃生舱，按需收敛）；最后考虑该工具是否有替代品。pnpm 官方对符号链接行为的文档明确：这是设计而非缺陷。",
            bonus:
              "shamefully-hoist=true 会把幽灵依赖的便利也带回来——命名就在提醒你：这是最后的手段，用之前先想清楚放弃了什么。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么删了 node_modules 重装就好了？",
            to: "/note/frontend/engineering/package-management/cache-desync",
            description:
              "pnpm 的指纹自愈只是四层缓存中的一层——系统学一遍「删了就好」背后的脱节机理。",
          },
          {
            title: "git 为什么不存 diff：内容寻址怎么做的？",
            to: "/note/devtools/git/object-model/content-addressing",
            description: "Git 对象库：pnpm store 的思想源头，内容寻址的完整展开。",
          },
        ]}
      />
    </NoteShell>
  );
}
