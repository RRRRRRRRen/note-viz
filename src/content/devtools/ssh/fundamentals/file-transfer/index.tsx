import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  VersionNote,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        选型一句话：<strong>拷一个文件（或一次性的目录搬运）用 scp，反复执行的同步用 rsync</strong>
        。两者共用同一套 ssh 底座——认证、加密、<code>~/.ssh/config</code> 别名全部复用，所以「会 ssh
        就会用它们」。差异在传输模型：scp 每次全量重传（自 OpenSSH 9.0 起，底层已从自有协议换成
        SFTP）；rsync 核心是 <strong>delta 增量算法</strong>
        ——先比对两边文件的差异块、只传不同的部分，第二次同步几乎瞬间完成，且支持断点续传、排除规则与
        镜像删除。最大的坑是 rsync 源路径的<strong>尾斜杠语义</strong>：<code>src/</code>{" "}
        传「目录内容」，<code>src</code> 传「目录本身」。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "SSH 是怎么保证远程登录安全的？",
            to: "/note/devtools/ssh/fundamentals/remote-access",
          },
        ]}
      >
        传文件工具没有自己的认证体系——它们搭 ssh 的便车：密钥认证、host key 校验、config
        别名全部照搬本篇的结论。
      </Prerequisite>

      <Heading level={2} title="共同底座：它们都只是 ssh 的另一个客户端" />
      <Paragraph>
        先建立一个统一视角：<code>ssh</code>、<code>scp</code>、<code>rsync</code>、
        <code>sftp</code> 在协议层是并列的四个客户端程序，数据通道全部走同一条 ssh 加密连接。你在
        remote-access 里学的整条链路原样生效——服务器端的 <code>sshd</code>{" "}
        负责认证与加密，传文件只是在这条连接上多开 一个「传输会话」。所以：
        <strong>
          给 ssh 配好的密钥、改过的端口、config 里的主机别名，对 scp/rsync/sftp 自动生效
        </strong>
        ，不存在「ssh 能连但 rsync
        连不上」的问题——如果真连不上，先怀疑命令的目标地址写法，而不是认证。
      </Paragraph>
      <Paragraph>
        这也解释了为什么四个命令长得像：<code>user@host:path</code>{" "}
        这个「远程路径」语法是共享约定。区别只在会话里跑的是什么——交互
        shell、文件拷贝协议（scp/sftp）， 还是增量同步逻辑（rsync）。
      </Paragraph>

      <ShellBlock>{`# 四个客户端共享同一底座：~/.ssh/config 的别名对它们全部生效
ssh gpu                     # 交互登录（别名 gpu 定义在 ~/.ssh/config）
scp data.csv gpu:~/         # 拷文件到别名主机
rsync -av project/ gpu:backup/project/   # 增量同步
sftp gpu                    # 交互式文件管理（ls/put/get/mkdir）`}</ShellBlock>

      <Heading level={2} title="scp：语法像 cp 的一次性拷贝" />
      <Paragraph>
        <code>scp</code> 的定位是「ssh 加持的 cp」：把文件整个传一遍，语法与 cp
        几乎一致，把本地路径换成 <code>user@host:路径</code> 就是远程操作。适合
        <strong>一次性的文件搬运</strong>：传个配置文件、拉个日志、部署一个二进制。
      </Paragraph>

      <ShellBlock>{`scp 本地文件 user@host:/远程路径     # 上传
scp user@host:/远程文件 ./          # 下载
scp -r 目录 user@host:/path         # 递归传目录
scp -P 2222 file user@host:/path    # 注意：指定端口是大写 -P（ssh 是小写 -p）
scp -i ~/.ssh/work_key file host:/path   # 指定私钥，同 ssh -i`}</ShellBlock>

      <VersionNote
        label="scp 底层协议变更 / scp protocol"
        versions={[
          {
            range: "OpenSSH < 9.0",
            text: "scp 走历史遗留的 SCP/RCP 协议：远端文件名由远端 shell 展开，通配符有解释歧义",
            color: "#9ca3af",
          },
          {
            range: "OpenSSH ≥ 9.0（2022-04）",
            text: "默认改走 SFTP 协议：文件名处理更可预期；旧协议需显式加 -O 回退",
          },
        ]}
      />
      <Paragraph>
        这次换底不是小事：SFTP 是一个结构化的文件传输协议（带类型、权限、原子性的重命名语义），而旧
        SCP 协议本质是「远端跑一条 scp 命令 + 裸流传输」。官方引导的方向很明确：
        <strong>新协议时代 scp 只是 SFTP 的命令行皮</strong>，需要更完整的文件操作时直接用{" "}
        <code>sftp</code> 交互客户端或 rsync。
      </Paragraph>

      <Heading level={2} title="rsync：为「反复同步」设计的增量传输" />
      <Paragraph>
        scp 的每一次执行都是全量重传：1GB 的目录改了一个文件，也重传 1GB。
        <code>rsync</code> 为「反复执行」这个场景重新设计了传输模型，核心是{" "}
        <strong>delta 增量算法</strong>
        ：把目标文件切成固定大小的块，为每块计算校验值；接收方先报出自己
        已有内容的校验序列，发送方逐块比对后<strong>只传真正不同的块</strong>
        ，接收方就地拼装出与源端 一致的文件。这个「先校验、再决定传什么」的思路与 HTTP
        缓存再验证（ETag / 304 Not
        Modified）同源——已一致的字节不出网。第二次同步一个几乎没变的目录，耗时接近于零。
      </Paragraph>
      <Paragraph>
        增量之外，rsync 还有三件 scp 给不了的工具：<strong>排除规则</strong>（<code>--exclude</code>{" "}
        跳过 node_modules 这类永远不该同步的目录）、<strong>镜像语义</strong>（<code>--delete</code>{" "}
        让目标端与源端完全一致，源端删掉的文件目标端也删）、<strong>断点续传</strong>（配合{" "}
        <code>--partial</code> 保留半成品文件，下次接着传）。
      </Paragraph>

      <ShellBlock>{`# -a 归档（= -rlptgoD：递归+软链+权限+时间戳+属组+属主+设备文件）
# -v 显示过程，-z 压缩传输
rsync -avz project/ user@host:~/project
rsync -avz --exclude node_modules project/ user@host:~/project
rsync -avz --delete project/ user@host:~/project   # 镜像：目标端与源端完全一致
rsync -avn project/ user@host:~/project            # -n 干跑：只报告将做什么，不动文件`}</ShellBlock>

      <Heading level={3} title="实测：尾斜杠与增量重跑" />
      <Paragraph>
        rsync 最反直觉的行为是<strong>源路径的尾斜杠</strong>，两条命令只差一个斜杠，落点完全不同：
      </Paragraph>

      <ShellBlock>{`# 实验①：尾斜杠语义（输出来自 macOS 自带 openrsync，GNU rsync 行为一致、格式略异）
$ mkdir -p /tmp/rtest/src
$ echo hello > src/a.txt; echo world > src/b.txt

$ rsync -av src dstA            # 源路径不带斜杠：传「目录本身」
src/a.txt
src/b.txt
$ find dstA -type f
dstA/src/a.txt                  # 落在 dstA/src/ 下
dstA/src/b.txt

$ rsync -av src/ dstB           # 源路径带斜杠：传「目录内容」
a.txt
b.txt
$ find dstB -type f
dstB/a.txt                      # 落在 dstB/ 下
dstB/b.txt`}</ShellBlock>
      <Paragraph>
        规则一句话：<strong>尾斜杠的意思是「目录里面的东西」，不是目录自己</strong>
        。对照记忆：与 shell 的 <code>cp src dstA</code> 行为一致（cp 拷目录本身，
        <code>cp src/.</code> 才是拷内容）。部署脚本翻车高发点：想同步到 <code>~/project</code>{" "}
        却写成 <code>rsync -av project ~/project</code>，结果得到 <code>~/project/project</code>。
      </Paragraph>

      <ShellBlock>{`# 实验②：增量验证——第二次执行不传任何文件；改一个文件后只重传该文件
$ rsync -av src/ dstB           # 第二次跑：文件列表为空
Transfer starting: 4 files
sent 155 bytes  received 20 bytes

$ echo "changed" >> src/a.txt
$ rsync -av src/ dstB           # 只有 a.txt 出现在列表里
Transfer starting: 4 files
a.txt
sent 228 bytes  received 42 bytes`}</ShellBlock>
      <Paragraph>
        第二次执行的列表里一个文件都没有——两边内容一致，一个字节都不用传；改动 <code>a.txt</code> 后
        重跑，列表里只有它。这就是「反复执行的传输选 rsync」的量化依据：scp 做不到这一点，它的世界里
        没有历史状态，每次都是从头传。
      </Paragraph>

      <Heading level={2} title="选型对照" />
      <CompareTable
        label="scp 与 rsync 逐维度对比 / scp vs rsync"
        left={{ title: "scp", color: "#1677ff" }}
        right={{ title: "rsync", color: "#8b5cf6" }}
        rows={[
          { aspect: "传输模型", left: "全量重传，无历史状态", right: "delta 增量，只传差异块" },
          { aspect: "适合场景", left: "一次性拷文件、拉日志", right: "反复同步：部署、备份、镜像" },
          { aspect: "元数据保留", left: "-p 保留权限与时间戳", right: "-a 归档模式一次带全" },
          { aspect: "排除 / 删除同步", left: "不支持", right: "--exclude / --delete" },
          { aspect: "断点续传", left: "不支持，中断重来", right: "--partial 接着传" },
          { aspect: "干跑预览", left: "无", right: "-n 只报告不执行" },
          { aspect: "底层协议", left: "SFTP（OpenSSH 9.0 起）", right: "自家协议，走 ssh 通道" },
        ]}
      />
      <MemoryCard keyword="拷一个文件用 scp，同步一个目录用 rsync" color="#1677ff">
        <p>
          判断只看一个特征：这条传输<strong>会不会反复执行</strong>
          。一次性动作（拿个配置、传个包）scp 足够；凡是会跑第二遍的（部署、备份、数据搬运）， rsync
          的增量、排除、续传都是碾压性优势。两条命令共用 ssh 底座，切换没有学习成本。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="尾斜杠语义 / trailing slash"
        dont={{
          code: `$ rsync -av project user@host:~/project
$ ssh host 'ls ~/project'
project/
# 想同步目录内容，
# 结果多套了一层 project/project`,
          note: "源路径不带尾斜杠 = 传「目录本身」，目标端会多一层同名目录。这是 rsync 第一大坑。",
        }}
        do={{
          code: `$ rsync -avn project/ user@host:~/project
# 带尾斜杠 = 传「目录内容」；
# 拿不准先加 -n 干跑看落点
sending incremental file list
index.html
assets/app.js`,
          note: "口诀：要「里面的东西」就加斜杠。任何不确定的 rsync 命令先跑 -n（dry run），确认文件列表符合预期再真跑。",
        }}
      />
      <DoDont
        label="scp 静默覆盖 / silent overwrite"
        dont={{
          code: `$ scp nginx.conf user@host:/etc/nginx/
# 远端已有同名文件？
# scp 不询问、不备份、直接覆盖
# 也没有 -n 干跑可用`,
          note: "scp 与 cp 同款语义：目标同名直接覆盖，没有任何提示或撤回手段。对远端配置文件用 scp 前先确认目标状态。",
        }}
        do={{
          code: `$ ssh host 'cat /etc/nginx/nginx.conf'   # 先看远端现状
$ scp nginx.conf host:/tmp/nginx.conf.new
$ ssh host 'sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak \\
  && sudo mv /tmp/nginx.conf.new /etc/nginx/nginx.conf'`,
          note: "对「远端已有状态」的变更：先查看、再备份、后替换。要的是可回滚，scp 只会覆盖。",
        }}
      />
      <DoDont
        label="--delete 的镜像风险 / mirror danger"
        dont={{
          code: `# 手滑把源路径写成了空目录
$ rsync -av --delete /tmp/empty/ user@host:~/project
deleting index.html
deleting assets/app.js
# 目标端文件被逐个删除`,
          note: "--delete 让目标端向源端看齐：源端是空的，目标端就被清空。路径写错 + --delete = 定向删除远端文件。",
        }}
        do={{
          code: `# 铁律：带 --delete 的命令必须先干跑核对删除清单
$ rsync -avn --delete project/ user@host:~/project
...
deleting old/tmp.log
# 删除清单符合预期，再去掉 -n 真跑
# 高价值数据再加 --backup --backup-dir=/tmp/rsync-bak 留后路`,
          note: "--delete 永远搭配 -n 使用：干跑看到 deleting 列表没有意外项，才允许真执行。这是备份脚本上线前的固定检查项。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "scp 和 cp 语法几乎一样，那 scp 比 cp 到底多了什么？",
            intent:
              "热身题：确认你理解「scp 没有自己的认证体系」这一层，而不是把它当成独立的传输工具。",
            a: "多了一整条 ssh 加密通道。scp 把目标路径从本地路径换成 user@host:路径 后，连接建立、host key 校验、用户认证（密码或密钥）、传输加密全部复用 ssh 的机制——它本质上是「cp 语义 + ssh 底座」。所以 ssh 能连的主机 scp 一定能传，认证配置只需要做一份。",
            bonus:
              "四个客户端共享这套约定：ssh（交互 shell）、scp（拷贝）、sftp（交互文件管理）、rsync（增量同步），~/.ssh/config 里的别名、端口、私钥对它们全部生效。",
            depth: 1,
          },
          {
            q: "同一个目录第二次跑 rsync 几乎瞬间完成，它是怎么知道哪些文件不用传的？",
            intent:
              "考察对 delta 增量模型的真实理解——很多人只知道「rsync 快」，说不出它是「先校验、再传输」。",
            a: "rsync 在传输前先做比对：默认按「快速校验」只比文件的大小和修改时间（mtime），一致的就跳过；文件变了才进入逐块比对，把内容切成固定大小的块、逐块校验，只传差异块。第二次执行时所有文件的时间戳和大小都没变，一个字节都不用传，所以几乎瞬间完成。这套「先校验、再决定传什么」与 HTTP 缓存的 ETag/304 再验证是同一个设计思想。",
            bonus:
              "逐块比对的完整版是滚动校验：弱校验值快速滑动匹配 + 强校验值确认，即使文件中间插入了一段数据，也能只传插入的部分——这是 1996 年 rsync 论文的核心算法。",
            depth: 2,
          },
          {
            q: "rsync src dstB 和 rsync src/ dstB 只差一个斜杠，结果差在哪？-a 选项具体归档了什么？",
            intent: "检验是否踩过（或能避开）rsync 第一大坑，以及 -a 是不是背过它的展开。",
            a: "不带斜杠传「目录本身」，结果是 dstB/src/…；带斜杠传「目录内容」，结果是 dstB/…——尾斜杠的含义是「目录里面的东西」。这与 cp 的行为一致：cp src dstB 拷目录本身，cp src/. dstB 拷内容。-a（archive）是 -rlptgoD 的集合：递归、保留软链接、权限、时间戳、属组、属主与设备文件——同步部署产物或做备份时用它替代裸 -r，避免远端权限被重置成默认值。",
            bonus:
              "拿不准就用 -n 干跑：rsync -avn src/ dstB 只打印将要发生的文件清单，不落任何文件——所有首次编写的 rsync 命令都值得先干跑一遍。",
            depth: 3,
          },
          {
            q: "一个 2GB 的文件传到 60% 断线了，rsync 怎么接着传？和 scp 重来的差别有多大？",
            intent:
              "考察断点续传的机制细节与 --partial / --append-verify 的区别，这是大文件场景的实操分水岭。",
            a: "默认情况下 rsync 中断会删掉半成品（它的临时隐藏文件），从头再来——所以续传要显式配 --partial：中断时保留半成品，下次重跑时对它逐块校验、只补缺失的差异块。大文件场景的正确姿势是 rsync -av --partial（或写成 -avP，P 等价于 --partial --progress）。--append-verify 是另一种激进策略：假定已传部分正确、直接从断点追加，追加前校验一次——快，但若已传部分本身损坏会产出坏文件，通用场景首选 --partial。scp 没有任何续传机制，2GB 传 60% 断线就是 2GB 重来。",
            bonus:
              "-z 压缩要看数据类型：文本、JSON 压缩收益大；已是压缩格式（图片、视频、tar.gz、已编译产物）再压缩纯烧 CPU，大文件场景省略 -z 反而更快。",
            depth: 4,
          },
          {
            q: "部署脚本里 rsync --delete 让目标端与源端完全一致，这个「镜像」能力怎么安全地用？它的风险模型是什么？",
            intent:
              "压轴题：考察对「能力即风险」的认知——--delete 是 rsync 里唯一会主动删数据的选项，能否给出工程化的护栏方案。",
            a: "风险模型一句话：--delete 让目标端向源端看齐，包括源端的「错误」。源路径手滑写成空目录，目标端就被清空；所以它的护栏是三道：第一道 -n 干跑，把 deleting 清单先打印出来人工核对，没有意外项才真跑；第二道 --backup --backup-dir，删除和被覆盖的文件先挪进备份目录，给了反悔的后路；第三道 --exclude 收窄同步范围，让命令只对它该管的目录生效，缩小爆炸半径。生产部署脚本里前两道是标配。",
            bonus:
              "另一个工程惯例：部署产物用版本号目录 + 软链切换（rsync 到 releases/时间戳，再把 current 软链指过去），让 --delete 只清理老的 releases——回滚就是把软链指回去，秒级完成。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        传文件的前提是「网络可达」。目标机器藏在跳板机后面时，scp/rsync 怎么穿透两跳、以及{" "}
        <code>~/.ssh/config</code> 里怎么把跳板固化成一行别名，见跳板机一篇；把本篇的 ssh 底座用到
        Git 远程仓库上（多账号、多密钥），是同一套机制的另一个战场。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "跳板机是怎么控制访问的？",
            to: "/note/devtools/ssh/tunneling/jump-host",
            description:
              "目标机路由不通时，ProxyJump 让 scp/rsync/git 对内网机器透明可用，别名写一次全工具生效。",
          },
          {
            title: "ssh 免密推送是怎么配出来的？",
            to: "/note/devtools/git/remote/ssh-setup",
            description:
              "~/.ssh/config 在 Git 多账号场景的完整应用：同一套密钥与别名机制，另一个战场。",
          },
        ]}
      />
    </NoteShell>
  );
}
