import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  DoDont,
  MemoryCard,
  Prerequisite,
  CrossRef,
  Table,
  Timeline,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
          },
          {
            title: "reset --hard 丢弃的提交去哪了？",
            to: "/note/devtools/git/refs/branch-head",
          },
        ]}
      >
        工作流的每一步都是日常命令的组合；「合并后敢删分支」依赖分支只是指针、删除有可达性检查兜底这两个事实。
      </Prerequisite>

      <Conclusion>
        提交历史是团队的<strong>公共基础设施</strong>，两条规范让它可读、可查、可自动化：
        <strong>功能分支工作流</strong>管「改动从哪进主干」——main
        永远保持可用，每个功能在独立分支上演进，经 PR 评审后合并；
        <strong>Conventional Commits</strong> 管「每个提交怎么自我介绍」——{" "}
        <code>&lt;type&gt;: &lt;描述&gt;</code> 格式让 git log 可扫描（<code>--grep="^fix"</code>{" "}
        直接筛出所有修复），也让 CHANGELOG
        与语义化版本可以自动生成。规范的收益不在写的那一刻，而在六个月后有人
        <code>git log</code> 排查问题的那一刻。
      </Conclusion>

      <Heading level={2} title="为什么不能直接提交 main" />
      <Paragraph>
        一个人赶进度时，直接在 main 上小步提交看起来毫无问题。问题在多人共享的那一刻爆发：main
        上混着「验证到一半的功能」「改错方向的实验」「半成品的重构」，任何一次发布都要先回答「现在这版能不能上」——而这个问题的答案藏在某次提交意图里，没人记得。
        工作流的本质是把<strong>「写完」和「可用」两个状态物理隔离</strong>：main
        只接受「完成、评审过、测试过」的改动，其余一切都发生在分支上。
      </Paragraph>
      <Paragraph>
        隔离之后，主干上每次提交都自动获得三个性质：<strong>可发布</strong>（随时能基于 main
        出版本）、<strong>可回滚</strong>（revert 一个 PR 的合并提交即整体撤销一个功能）、
        <strong>可归因</strong>
        （历史里每个节点都对应一个经过评审的意图）。这三个性质就是后面提交规范、PR
        粒度讨论的评判标准——一切规范都在保护 main 的这三个性质。
      </Paragraph>

      <Heading level={2} title="功能分支工作流：四步循环" />
      <Paragraph>
        主流姿势是四步循环：<strong>开分支 → 小步提交 → 推送开 PR → 合并后清理</strong>
        。每一步都对应一个 Git 机制，不是流程图上的装饰：
      </Paragraph>

      <Timeline
        label="功能分支循环 / feature branch flow"
        steps={[
          {
            label: "开分支",
            sub: "git switch -c feature/x（基于最新 main）",
            color: "#1677ff",
          },
          { label: "小步提交", sub: "一个逻辑一个 commit，写清 type", color: "#1677ff" },
          { label: "推送开 PR", sub: "git push -u origin feature/x", color: "#f59e0b" },
          { label: "合并清理", sub: "合并后删本地与远程分支", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        第一步「基于最新 main」值得强调：分支只是指向某个提交的指针，从旧 main
        开出来的分支天然带着落后的起点，合并时平白多出解决别人已修问题的冲突。习惯动作是开分支前{" "}
        <code>git pull</code>（或 fetch 后基于 <code>origin/main</code> 开）。第三步的{" "}
        <code>-u</code> 建立本地分支与远程分支的追踪关系，之后该分支上的 push/pull 不用再写全名。
      </Paragraph>
      <Paragraph>
        第四步「合并后清理」之所以敢执行，是两层机制在兜底：<code>git branch -d</code>{" "}
        删除前会检查「这串提交是否已从别的书签可达」，未合并的分支直接拒绝删除——绕过检查的{" "}
        <code>-D</code> 丢掉的提交也还能从 reflog 捞回（引用系统篇）。而合并方式选 merge 还是
        squash，决定这个 PR 在历史上留下的是「分叉气泡 +
        一个合并节点」还是「压成单点的普通提交」——历史形状的取舍见合并篇。
      </Paragraph>

      <Heading level={2} title="Conventional Commits：type 是机器可读的路标" />
      <Paragraph>
        格式一句话：<code>&lt;type&gt;: &lt;简短描述&gt;</code>，type
        声明「这次提交改动了什么性质的东西」。常用七个：
        <code>feat</code>（新功能）、<code>fix</code>（修 bug）、<code>docs</code>（文档）、
        <code>refactor</code>（重构，不改行为）、<code>test</code>（测试）、<code>chore</code>
        （构建与杂务）、<code>perf</code>
        （性能）。描述用祈使句、一行说清「做了什么」，细节留给空一行后的
        body。它源自社区约定（Conventional Commits 规范），被 semantic-release
        等自动化工具当作输入契约。
      </Paragraph>
      <Paragraph>
        它不是形式主义，价值全部在「机器可读」四个字上：<strong>log 可扫描</strong>——{" "}
        <code>git log --oneline --grep="^fix"</code> 一步筛出所有修复，排查「哪次改动引入的」时按
        type 过滤比逐条读快一个量级；<strong>CHANGELOG 可生成</strong>——工具按 feat/fix
        自动汇总两个版本间的用户可见变化；<strong>版本号可推导</strong>——只有 feat → minor、只有 fix
        → patch、出现破坏性变更（<code>feat!</code> 或 body 里的 <code>BREAKING CHANGE:</code>）→
        major，语义化版本的三个数字不再靠人记。本站自己的提交（
        <code>feat: xxx</code> / <code>fix: xxx</code>）就在用这套。
      </Paragraph>

      <Table
        label="常用 type 速查 / commit types"
        head={["type", "含义", "对版本号的含义", "示例"]}
        rows={[
          ["feat", "新增用户可见功能", "触发 minor", <code>feat: 笔记页支持目录跳转</code>],
          ["fix", "修复 bug", "触发 patch", <code>fix: 目录跳转后高亮不消失</code>],
          ["refactor", "不改行为的重构", "不影响版本号", <code>refactor: 抽出 useTOC hook</code>],
          [
            "perf",
            "性能优化（通常也算修复）",
            "视团队约定",
            <code>perf: 目录索引改用二分查找</code>,
          ],
          ["docs", "仅文档", "不影响版本号", <code>docs: 补充组件 API 说明</code>],
          ["test / chore", "测试与构建杂务", "不影响版本号", <code>chore: 升级 vite 到 7</code>],
        ]}
      />
      <Callout kind="info" title="破坏性变更的写法">
        破坏性变更有专门语法：<code>feat!</code> 的感叹号，或 body 里单独一行{" "}
        <code>BREAKING CHANGE: 迁移说明</code>。自动化工具靠这两个标记判断「这次要升 major
        」，比口头约定可靠得多。
      </Callout>

      <Heading level={2} title="整合应用：一个 feature 的完整生命周期" />
      <Paragraph>
        把两条规范接起来，一次功能开发的完整命令序列是这样的（注释标出每步对应的规范点）：
      </Paragraph>

      <ShellBlock>{`$ git switch main && git pull                 # 基于「最新」main 开分支
$ git switch -c feat/toc-jump
$ git commit -m "feat: 目录支持点击跳转"       # 一个逻辑一个 commit
$ git commit -m "fix: 跳转后高亮 1.3s 后消退"  # type 路标全程在线
$ git push -u origin feat/toc-jump             # 推送开 PR
# ……评审通过，squash merge 进 main……
$ git switch main && git pull                  # 同步合并结果
$ git branch -d feat/toc-jump                  # 可达性检查通过，安全删除
$ git push origin --delete feat/toc-jump       # 清理远程分支`}</ShellBlock>
      <Paragraph>
        注意 PR 粒度与提交粒度是两个尺度：分支内的提交允许「小步 + 偶尔的 wip」（合并方式选 squash
        时它们最终压成一个），但 <strong>PR 本身必须对应一个完整意图</strong>
        ——「顺手修了三个无关 bug」的 PR
        是评审和回滚的灾难，应该拆成三个分支。规范的单位从来不是提交，而是「可独立评审、可独立回滚」的改动单元。
      </Paragraph>
      <MemoryCard keyword="规范保护的是六个月后的排查" color="#1677ff">
        <p>
          功能分支保护「main 可发布可回滚」，type 路标保护「log
          可扫描可自动化」。两条规范的共同收益期都是事后——写提交信息多花的十秒，会在下一次
          bisect、下一次生成 CHANGELOG 时成倍赚回。
        </p>
      </MemoryCard>

      <DoDont
        label="分支与提交粒度 / granularity"
        dont={{
          code: `$ git commit -m "改了一堆东西"
# 一个提交：重构 + 修复 + 新功能 + 格式化
$ git push origin main          # 直接推主干，没人评审`,
          note: "大杂烩提交 + 直推主干，让「可回滚、可归因」同时失效——bisect 定位到它也无法部分撤销。",
        }}
        do={{
          code: `$ git commit -m "refactor: 抽出 useTOC hook"
$ git commit -m "fix: 跳转高亮残留"
# 一个逻辑一个提交，type 各就各位
$ git push -u origin feat/toc-jump   # PR 只含一个意图`,
          note: "提交按逻辑切，PR 按意图开——评审按块读，回滚按点撤。",
        }}
      />

      <DoDont
        label="提交信息写法 / message style"
        dont={{
          code: `fix bug
update
修改
wip`,
          note: "无 type、无对象、无原因——log 变成猜谜，自动化工具完全无法解析。",
        }}
        do={{
          code: `fix: 目录跳转后高亮不消退
refactor: 目录渲染改用 memo 化组件

长描述第二段：说明为什么这样改（body 可选）`,
          note: "type + 祈使句一行说清做了什么；「为什么」写进 body，别挤在标题里。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "团队只有两三个人，功能分支工作流是不是过重了？",
            intent: "热身题，检验是否理解工作流保护的对象——不是流程仪式，而是 main 的可用性。",
            a: "分支本身的成本近乎为零（创建是写一个 41 字节指针文件），不重的从来不是分支而是评审流程。小团队可以缩短循环——分支存活几小时而不是几天、评审可以异步——但「改动不经分支直接进 main」仍然不建议：哪怕只有你一个人提交，main 上「半成品」与「可发布」混在一起，两个月后没有人（包括你自己）能分清哪个节点能部署。",
            bonus:
              "trunk-based development（主干开发）也不是直推 main：它用短命分支 + 特性开关隔离未完成功能，隔离的思想相同，只是尺度更小。",
            depth: 1,
          },
          {
            q: "squash merge 之后，分支里那些小步提交去哪了？",
            intent: "考察对合并方式与对象生命周期的理解——「压扁」是重建不是编辑。",
            a: "分支的全部提交被「重放」成一个全新的普通提交（单 parent，内容是分支相对 main 的最终差异），原提交对象仍在对象库里，但从任何分支都不可达——只能在 reflog 里躺到过期。所以 squash 后删除分支没有数据损失，代价是分支内的中间历史不可查：适合「一串 wip 提交最终成型」的场景，不适合「分支内每步都值得留名」的场景。",
            bonus:
              "squash 的新提交哈希必变——GitHub 上 squash 后显示的「被合并提交」只是 UI 关联，Git 层面新旧提交没有任何 parent 关系。",
            depth: 2,
          },
          {
            q: "type 写错了（把 feat 写成 fix）会有实际后果吗？",
            intent:
              "把规范从「风格偏好」推进到「自动化契约」层面，检验是否理解 type 的消费者是工具。",
            a: "有，且和错误的类型成正比：fix 误写成 feat 会让 CHANGELOG 多出一条不存在的「新功能」、版本号被多升一个 minor；反过来 feat 写成 fix 则少升版本，下游可能错过新接口。refactor/docs 这类不影响版本号的 type 之间写错基本无感。破坏性变更漏标（该 feat! 写成 feat）后果最重——依赖方按 semver 自动升级后会直接炸。人工 review type 是防不住的，值得上 commitlint 这类钩子校验。",
            bonus:
              "commitlint + husky 的组合能在 commit 时直接拒绝不合规信息；CI 里再跑一次校验防止 --no-verify 绕过。",
            depth: 3,
          },
          {
            q: "PR 合并方式选 merge、squash 还是 rebase，团队怎么定？",
            intent:
              "工程决策题，检验能否从「历史信息保真 vs 历史整洁」这条主轴推导选型，而不是背团队惯例。",
            a: "三种方式改变的是历史形状：merge 保留分叉拓扑和分支内全部提交（可追溯每个中间步骤，历史图较乱）；squash 压成单点（历史是干净的直线，但中间步骤全丢）；rebase 把分支提交重放到 main 顶端（保留每个提交、历史线性，但改写了哈希）。选型主轴是「分支内提交的价值」：wip 多的团队选 squash，提交粒度好的团队选 rebase 或 merge。多数托管平台允许按仓库统一配置，关键是全仓库一致，而不是哪种绝对正确。",
            bonus:
              "rebase 合并要求分支上没有他人协作（哈希重写），且冲突要在重放中逐个提交解决——提交越碎冲突次数越多，这是它隐藏的成本。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "origin/main 是远程上的分支吗？",
            to: "/note/devtools/git/remote/fetch-pull",
            description: "推送开 PR 那一步背后，fetch/push 到底同步了什么。",
          },
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
            description: "四步循环里每条命令的三区语义。",
          },
        ]}
      />
    </NoteShell>
  );
}
