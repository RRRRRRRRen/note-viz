import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeAnnotate, Exercise, ShellBlock } from "@/components/demo";
import { Callout, CrossRef, DoDont, MemoryCard, OutputTimeline, Table } from "@/components/viz";
import { PALETTE } from "@/components/palette";

/** deploy.sh 逻辑骨架（单引号数组拼接，避免模板字符串与 shell 变量语法冲突） */
const SCRIPT = [
  "#!/bin/bash",
  "set -e   # 任何一步失败立即退出",
  "",
  'REGISTRY="112.26.45.227:10001"   # 镜像推往的私有仓库',
  'BASE_DIR="/home"                 # 镜像材料所在的根目录',
  "",
  'IMAGE_NAME=""',
  'VERSION="1.0.0"',
  "",
  'while getopts "n:v:h" opt; do',
  "    case $opt in",
  '        n) IMAGE_NAME="$OPTARG" ;;',
  '        v) VERSION="$OPTARG" ;;',
  "        h) show_usage ;;",
  "    esac",
  "done",
  "",
  'if [ -z "$IMAGE_NAME" ]; then',
  '    echo "镜像名称不能为空！"',
  "    show_usage",
  "fi",
  "",
  'IMAGE_TAG="${REGISTRY}/${IMAGE_NAME}:${VERSION}"',
  'IMAGE_DIR="${BASE_DIR}/${IMAGE_NAME}"',
  "",
  'if [ ! -d "$IMAGE_DIR" ]; then',
  '    echo "目录不存在: ${IMAGE_DIR}"; exit 1',
  "fi",
  'if [ ! -f "${IMAGE_DIR}/Dockerfile" ]; then',
  '    echo "Dockerfile 不存在"; exit 1',
  "fi",
  "",
  'cd "$IMAGE_DIR"',
  "",
  'if docker images | grep -q "${REGISTRY}/${IMAGE_NAME}"; then',
  '    docker rmi "${IMAGE_TAG}" 2>/dev/null || echo "旧镜像不存在，继续"',
  "fi",
  "",
  'docker build -t "${IMAGE_TAG}" .',
  'docker push "${IMAGE_TAG}"',
  "",
  "# 注：原脚本把 docker build 包在 if 里，失败分支 print_error + exit 1；",
  "# 骨架为省篇幅展开成裸调用，快速失败由 set -e 兜底（见追问链第 2 问）。",
].join("\n");

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        一百多行的部署脚本，<strong>真正干活的只有最后两条命令</strong>：<code>docker build</code>{" "}
        和 <code>docker push</code>
        ——前面全是外壳：参数解析、防呆校验、彩色输出。读它的正确姿势是抓四件事：
        <strong>set -e</strong> 保证任何一步失败立即中止（绝不带病续跑）；<strong>getopts</strong>{" "}
        把 -n 镜像名、-v 版本号收进变量；<strong>材料目录的暗约定</strong>——镜像名叫什么就去 /home
        下找同名目录；最后在材料目录里 build 出镜像、push 上私服。脚本是调用命令的人机接口，
        <strong>装配的智能在 Dockerfile，分发的智能在仓库</strong>。
      </Conclusion>

      <Heading level={2} title="逐段精读：从 130 行到一张骨架" />
      <Paragraph>
        原脚本大段篇幅是颜色定义、帮助信息和错误提示函数，逻辑骨架抽出来长这样（保留全部关键语句；唯一展开：原脚本把
        docker build 包在 if 里、失败显式报错退出，骨架里写成裸调用，见末行注释）：
      </Paragraph>

      <CodeAnnotate
        code={SCRIPT}
        lang="javascript"
        annotations={[
          {
            line: 2,
            text: "全脚本最重要的一行：任何命令以非零状态结束，整个脚本立即中止。没有它，build 失败后脚本会继续 push——把旧镜像推上去还报告成功。",
            color: PALETTE.red,
          },
          {
            line: 4,
            text: "环境约定写成常量：仓库地址与材料根目录，换环境才需要改；每次运行会变的输入（镜像名、版本号）则从参数来。",
            color: PALETTE.gray,
          },
          {
            line: 10,
            text: "getopts 是 bash 的内置参数解析器（会认即可，现代脚本已少手写）：引号串是参数清单，字母带冒号表示「该参数必须跟一个值」。",
            color: PALETTE.orange,
          },
          {
            line: 18,
            text: "[ -z xxx ] 判断字符串为空。必填参数缺失就在入口拦住并打印用法——防呆逻辑前置，而不是跑到一半才炸。",
            color: PALETTE.blue,
          },
          {
            line: 23,
            text: "两行拼出全程的路标：镜像全名三段式「仓库/名字:tag」；材料目录 = /home + 镜像名——目录名必须与镜像名一致，这是个没写在注释里的暗约定。",
            color: PALETTE.purple,
          },
          {
            line: 26,
            text: "存在性检查：目录、Dockerfile 不在就立即退出。把「环境没准备好」的失败拦在构建开始之前。",
            color: PALETTE.blue,
          },
          {
            line: 33,
            text: "从这一刻起，脚本的「当前位置」就是材料目录——后面 build 的那个 . 指向的就是这里，COPY 的 ./conf、./dist 也从这里算。",
            color: PALETTE.green,
          },
          {
            line: 35,
            text: "清理段：本地有同仓库旧镜像就删掉当前 tag。实际上可以整段删——同名 tag 重新 build 会自动顶掉旧的；它只是保持列表干净的化妆步骤。",
            color: PALETTE.orange,
          },
          {
            line: 39,
            text: "干活 ①：在材料目录装配镜像并打上完整三段式 tag。上下文就是 cd 进来的这个目录。",
            color: PALETTE.blue,
          },
          {
            line: 40,
            text: "干活 ②：推上私服。前提是这台机器 docker login 过——凭证存在 ~/.docker/config.json，脚本里没有 login，换新机器跑第一步就会死在这里。",
            color: PALETTE.blue,
          },
        ]}
      />

      <Heading level={2} title="getopts 拆解：用 JS 翻译一遍" />
      <Paragraph>那个让很多人卡壳的 while/case 组合，功能用 JS 一行就能说清——</Paragraph>
      <ShellBlock>{`// getopts "n:v:h" 循环的整体效果 ≈
const args = parseArgs(["-n", "cnsig-ems-ui", "-v", "1.0.1"])
//           → { n: "cnsig-ems-ui", v: "1.0.1" }`}</ShellBlock>
      <Paragraph>
        引号里的 <code>"n:v:h"</code> 是参数说明表：
        <strong>字母后带冒号 = 这个参数必须跟一个值</strong>
        ，值自动存入 <code>$OPTARG</code>；case 分支只是把解析结果填进变量。h
        是惯例的帮助开关。两个分支你没见过但值得认识：<code>\?</code> 接住「传了清单外的参数」、
        <code>:</code> 接住「该带值的没带值」——都算用法错误，原脚本在这两个分支里打印用法并退出。
        这套机制是 bash 内置的，不依赖任何工具，但可读性确实差——看懂「它在收参数」这个结论即可，
        实际工作中没人手写它，新脚本普遍用现成的参数库或环境变量。
      </Paragraph>

      <Heading level={2} title="set -e 的精确规则：三个豁免场景" />
      <Paragraph>
        「失败即退」听起来绝对，实际上 set -e 有明确的豁免清单——理解豁免才能解释脚本里那行{" "}
        <code>docker rmi ... || echo 继续</code> 为什么不会让脚本中止：
      </Paragraph>

      <Table
        label="set -e 行为速查 / errexit"
        head={["场景", "失败时会退出吗", "原因"]}
        rows={[
          [
            "普通命令失败（如 docker push 断网）",
            <strong>退出</strong>,
            "默认规则：非零状态即中止",
          ],
          ["if 条件里的命令失败", "不退出", "进入 else/跳过分支是预期行为，失败是「合法结果」"],
          [
            "A || B 中 A 失败",
            "不退出",
            "执行 B——脚本的 || echo 正是利用这一点让删除失败「不算失败」",
          ],
          [
            "管道 A | B 中 A 失败（B 成功）",
            "不退出",
            "默认只看最后一段的退出码；要连中间一起查需 set -o pipefail",
          ],
        ]}
      />

      <Paragraph>
        最后一行是脚本里真实的暗坑：<code>docker images | grep -q xxx</code> 若 docker images
        失败，默认下 set -e 毫无察觉。严格脚本会在开头加 <code>set -o pipefail</code>
        （管道任一段失败即视为失败），与 set -e 搭配使用。
      </Paragraph>

      <Heading level={2} title="真实执行一次：输出逐条解读" />
      <Paragraph>
        在材料齐备的服务器上执行 <code>./deploy.sh -n cnsig-ems-ui -v 1.0.1</code>，输出如下，
        每一条都对应脚本的一个阶段：
      </Paragraph>

      <OutputTimeline
        label="deploy.sh 执行输出 / real run"
        steps={[
          {
            output: "[INFO] 镜像名称: cnsig-ems-ui",
            phase: "校验",
            why: "getopts 已收完参数，[ -z ] 校验通过后脚本回显拼好的信息——这一步过了，说明参数与目录检查全部通过。",
          },
          {
            output: "[WARNING] 旧镜像不存在或删除失败，继续构建...",
            phase: "清理",
            why: "清理段分支：本地没有同名旧镜像（或 rmi 失败）。|| echo 让它「失败也不中止」，脚本继续。",
          },
          {
            output: "Sending build context to Docker daemon  12.3MB",
            phase: "构建",
            why: "docker build 第一步：把材料目录（上下文）整体打包交给引擎。这里出现的是 conf + dist + Dockerfile 的体积。注：这行是 legacy builder 的输出，BuildKit（Docker 23+ 默认）下同一过程打印 transferring context 等不同形态。",
          },
          {
            output: "Successfully tagged 112.26.45.227:10001/cnsig-ems-ui:1.0.1",
            phase: "构建",
            why: "逐行执行清单完毕（FROM 底座 + COPY conf + COPY dist），镜像按 -t 参数打好标签存入本机镜像库。Successfully tagged 同为 legacy builder 输出，BuildKit 下对应的是 naming to … 一类的行。",
          },
          {
            output: "The push refers to repository [112.26.45.227:10001/cnsig-ems-ui]",
            phase: "推送",
            why: "docker push 开始：引擎把本地层与仓库比对，只上传仓库里没有的层（底座层早已存在时几乎零传输）。",
          },
          {
            output: "1.0.1: digest: sha256:9f2a1c... size: 1571",
            phase: "推送",
            why: "推送完成的标志：digest 是内容的哈希指纹，等价于这次构建的「身份证号」。脚本此后打印成功横幅并退出。",
          },
        ]}
      />

      <MemoryCard keyword="脚本是接口，不是引擎" color={PALETTE.blue}>
        <p>
          部署脚本的骨架四件事：
          <strong>set -e 快速失败 → getopts 收参 → 校验拦错 → cd 进材料目录 build + push</strong>
          。材料目录暗约定：<code>/home/镜像名</code>
          目录里必须有 Dockerfile、conf/、dist/。push 的前提是本机 login 过；推送成功的标志是拿到
          digest，不是脚本那句横幅。
        </p>
      </MemoryCard>

      <Heading level={2} title="它和 CI 通道是什么关系" />
      <Paragraph>
        同一个仓库里往往两套通道并存：<strong>脚本通道</strong>（dist 传上跳板服务器，人执行
        deploy.sh）与<strong>CI 通道</strong>（git push 触发流水线，CI 机器执行同样的 build +
        push，随后 kubectl 滚动更新）。它们的 Docker 命令完全同源——CI 的流水线脚本里就是{" "}
        <code>docker build -f docker/Dockerfile -t 私服:tag</code> 加 <code>docker push</code>，
        差别只有两处：原料来源（CI 从干净检出拷 dist，脚本吃上传上来的 dist）与凭证管理（私服 push
        权限发给 CI 还是发给跳板机）。理解了这一点，读任何团队的部署脚本都能秒懂骨架——
        也就能判断哪些环节值得搬进 CI、哪些校验值得抄回脚本。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>三个高频坑：两个出在 shell 语义上，一个出在脚本作者的手上。</Paragraph>

      <Heading level={3} title="坑 1：以为有 set -e 就万事大吉" />
      <DoDont
        label="坑 1 · set -e 的盲区 / pipefail"
        dont={{
          code: `#!/bin/bash
set -e
docker build -t app:1.0 . | tee build.log
# build 真的失败了，但 tee 成功
# → 脚本看到退出码 0，继续往下跑 push`,
          note: "管道的退出码取最后一段。build 的失败被 tee 的成功掩盖，set -e 全程不知情——这是「我明明写了 set -e 为什么没拦住」的头号原因。",
        }}
        do={{
          code: `#!/bin/bash
set -e
set -o pipefail   # 管道任一段失败即视为失败
docker build -t app:1.0 . | tee build.log
# build 失败 → 管道失败 → 立即中止`,
          note: "两条开关是一对：set -e 管「失败要退」，pipefail 管「失败能被看见」。生产脚本两个都写。",
        }}
      />

      <Heading level={3} title="坑 2：改脚本时丢掉变量两侧的双引号" />
      <DoDont
        label="坑 2 · 引号 / word splitting"
        dont={{
          code: `cd $IMAGE_DIR
# 若目录名是 /home/my app（带空格）
# bash 会拆成两个词：
# cd /home/my 和 app 两个参数
# → cd: too many arguments`,
          note: '未加引号的变量会经历单词拆分与通配符展开——空格、星号都是地雷。原脚本处处 "$变量" 就是防这个。',
        }}
        do={{
          code: `cd "$IMAGE_DIR"
docker build -t "\${IMAGE_TAG}" .
# 引号让变量永远是一个整体`,
          note: "给脚本提 PR 时的自查项：新加的每一处变量引用，两侧都有双引号吗？这条纪律能消灭 shell 脚本一整类诡异 bug。",
        }}
      />

      <Heading level={3} title="坑 3：grep 的 pattern 里藏着正则通配符" />
      <DoDont
        label="坑 3 · 宽松匹配 / grep pattern"
        dont={{
          code: `docker images | grep -q "112.26.45.227:10001/cnsig-ems-ui"
# grep 的 . 是「任意字符」：
# 这个 pattern 也能匹配 112x26y45z227...
# 恰好无同形仓库，纯属侥幸`,
          note: "IP 地址里的点在 grep 正则里是任意字符通配符。想按字面匹配用 grep -F（fixed string），或转义每个点。",
        }}
        do={{
          code: `docker images | grep -qF "112.26.45.227:10001/cnsig-ems-ui"
# -F：按固定字符串匹配，. 就是 .`,
          note: "顺便一个更严格的写法：grep -qF 用在脚本里既准确又自文档——「我要找的就是这串字面量」。",
        }}
      />

      <Callout kind="warning" title="凭证在脚本之外">
        脚本没有处理 <code>docker login</code>——它默认这台机器登录过私服。换新机器或凭证过期时，
        失败点会精确出现在 push 这一步（denied / unauthorized）。部署机的凭证管理
        （~/.docker/config.json 或 credential helper）是脚本的前置条件，属于交接文档必须写清的一项。
      </Callout>

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["getopts", "改造"]}
        hint="参数说明表里加一个带冒号的字母，case 里加一个分支。"
        question={
          <>
            给脚本增加 <code>-r</code> 参数指定仓库地址（不传时用默认{" "}
            <code>112.26.45.227:10001</code>）。写出需要改动的三处。
          </>
        }
        answer={
          <ShellBlock>{`REGISTRY="112.26.45.227:10001"      # ① 保留作默认值

while getopts "n:v:r:h" opt; do     # ② 清单加 r:
    case $opt in
        ...
        r) REGISTRY="$OPTARG" ;;    # ③ 新分支：覆盖默认值
    esac
done
# 镜像全名一行不用改——它引用的就是 $REGISTRY`}</ShellBlock>
        }
      />
      <Exercise
        tags={["失败分析", "set -e"]}
        hint="set -e 在 push 失败的那一刻做了什么？本地镜像库和仓库各自处于什么状态？"
        question={
          <>
            执行到 <code>docker push</code> 时网络中断失败。此刻本地镜像库里有什么？私服上有什么？
            正确的恢复动作是什么？
          </>
        }
        answer={
          <Paragraph>
            build 已成功：本地镜像库里有打好 1.0.1 tag 的完整镜像；push 失败触发 set -e
            立即中止，私服上没有
            1.0.1（或只有不完整的中间状态）。恢复动作：确认网络后直接重跑同一条命令 ——build
            阶段全部命中层缓存秒过，push 从断点层继续。这正是「快速失败」的价值：失败被拦在
            当前动作，不会污染前序环节的成果。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问从防呆入口问到 shell 失败语义的精确规则。"
        items={[
          {
            q: "直接执行 ./deploy.sh 不带任何参数，会发生什么？",
            intent:
              "热身题：验证「防呆在入口」是否成为直觉——好的脚本让错误在第一条命令之前就结束。",
            a: "getopts 循环零次通过（没有参数可解析），IMAGE_NAME 保持空串，[ -z ] 判空命中，打印「镜像名称不能为空」并调用 show_usage 展示用法后退出。整个流程发生在任何 docker 命令之前——不消耗构建资源，也不产生任何副作用。",
            bonus:
              "show_usage 里通常还带 -h 分支：主动打印帮助而不算错误，这是脚本人机接口的礼貌。",
            depth: 1,
          },
          {
            q: "build 失败了，脚本为什么一定不会执行 push？如果有同事把 set -e 删了呢？",
            intent: "检验快速失败机制是否真被理解——set -e 与脚本里的显式判断是同一目标的两道保险。",
            a: "set -e 在 docker build 以非零状态结束时立即中止脚本。删掉 set -e 后，原脚本仍安全：build 被包在 if 里，失败分支显式 print_error 并 exit 1。这叫双重保险——但两道保险都删了，脚本就会带着失败的镜像继续 push（推上去的是上一个 tag 的内容，危害极大）。结论：快速失败至少要有一道，最好两道。",
            bonus:
              "CI 通道里同样的保障来自流水线本身：任一步骤非零退出即终止流水线，等价于天然 set -e。",
            depth: 2,
          },
          {
            q: "-n 传的镜像名和材料目录是什么关系？./deploy.sh -n training-ui 会发生什么？",
            intent:
              "考察脚本里的暗约定：目录名 = 镜像名。这是脚本可移植性最差的一点，也是交接事故高发点。",
            a: "脚本拼出 IMAGE_DIR=/home/training-ui，然后要求这个目录存在、里面有 Dockerfile。也就是说材料目录的名字必须与 -n 参数完全一致——约定由这两行拼接与校验代码隐式执行，没有任何注释说明。传 training-ui 就去 /home/training-ui 找材料；材料实际放在别处时，只能迁就目录名或改脚本。",
            bonus:
              "改进方向：加 -d 参数显式传材料目录，镜像名与目录名解耦——很多团队的脚本演化史就是从这个坑开始的。",
            depth: 3,
          },
          {
            q: "这套脚本通道与 CI 通道的边界怎么划？哪些环节天然属于 CI？",
            intent:
              "工程判断题：理解两通道的差异根源（原料来源与凭证面），才能给出「什么该搬进 CI」的清单。",
            a: "脚本通道的原料是「人工上传的 dist」——不可追溯、无法审计是谁的什么提交构建的；CI 通道从 git 干净检出构建，每个镜像都能回溯到一次提交。所以与「内容正确性」相关的环节（构建 dist、跑测试、打版本 tag）天然属于 CI；脚本通道的合理残留是「内网操作」——在内网机器上 load/重建容器这类 CI 够不到的动作。私有仓库凭证只应发给 CI 服务账号或一台跳板机，而不是每个开发者的机器。",
            bonus:
              "折中形态：CI 只负责 build+push，内网用 watchtower 类工具或 webhook 触发拉取——通道合并成一条，人工环节归零。",
            depth: 3,
          },
          {
            q: "精确说出 set -e 的豁免规则；管道中间失败为什么它看不见，怎么补？",
            intent:
              "压轴题：shell 失败语义的完整版——豁免清单 + 管道退出码规则，是读任何生产脚本的地基。",
            a: "豁免三条：命令出现在 if/while 的条件位置时，失败只是「条件为假」不触发退出；命令出现在 && 或 || 链中间时，由短路逻辑决定（只有链条最终的失败才触发）；命令在管道中间时，默认只有最后一段的退出码算数。补法是 set -o pipefail：管道中任何一段失败，整条管道即以失败告终，与 set -e 组合后盲区消除。",
            bonus:
              "还有一条冷规则：set -e 在子 shell（命令替换 $(...)）里的失败同样不会传染给父 shell——关键命令的退出码要么显式 if 判断，要么写进管道让 pipefail 兜住。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        镜像推上仓库之后，故事的下一幕在运行侧：<strong>容器跑起来后页面 502 怎么一步步排查</strong>
        ——run 的端口映射、四件套命令（ps/logs/exec/inspect）与三条故障路径。脚本里的
        grep、管道、退出码的完整体系在 Shell 系列里有独立一篇。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "nginx.conf 是怎么让页面和接口都通的？",
            to: "/note/devtools/docker/deploy/nginx-conf-anatomy",
            description: "前置：脚本 build 进镜像的那份配置，逐行拆解见此篇。",
          },
          {
            title: "AI 拼的 grep 管道怎么读懂？",
            to: "/note/devtools/shell/text-pipeline/grep-pipe-basics",
            description: "脚本里 grep -q、|、退出码的完整原理与更多玩法。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** shell/配置类代码块：站内 CodeBlock 仅支持 JS/TS 高亮，此类内容用此本地块呈现 */
