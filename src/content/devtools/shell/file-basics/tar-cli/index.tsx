import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";
import { Checklist, ShellBlock } from "@/components/demo";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        三个动词打天下：<strong>c 打包、t 看清单、x 解包</strong>；修饰符记住 <code>f</code>
        （指定归档文件名，<strong>永远放修饰符最后一位、紧跟文件名</strong>）、<code>v</code>
        （显示过程）、<code>z</code>（顺带挂 gzip）。日常五命令：
        <code>tar -cvf x.tar dir/</code>、<code>tar -czvf x.tar.gz dir/</code>、
        <code>tar -tvf x.tar.gz</code>、<code>tar -xzvf x.tar.gz</code>、解到指定位置加{" "}
        <code>-C 目录</code>。最重要的习惯：
        <strong>
          解包前先 <code>-tvf</code> 看清单
        </strong>
        ——解包会无提示覆盖同名文件，且只增不删。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么有了 gzip 还需要 tar？",
            to: "/note/devtools/shell/file-basics/tar-vs-gzip",
          },
        ]}
      >
        本篇默认你已知道分工：tar 管装订、gzip 管压缩，.tar.gz 是两层套娃。
      </Prerequisite>

      <Heading level={2} title="动词制：一个动作词 + 三个修饰符" />
      <Paragraph>
        tar 的语法是动词制的，和你天天用的 git
        一个思路——先想清楚做什么动作，再配参数。动词只有三个：
        <code>c</code> 打包（create）、<code>x</code> 解包（extract）、<code>t</code>
        列清单（lisT），一条命令只用一个动词。修饰符常用三个：<code>f</code> 指定归档文件名、
        <code>v</code>
        显示过程、<code>z</code> 顺带挂上 gzip。所有 tar 命令都是这套乐高的排列组合：
      </Paragraph>
      <List
        items={[
          <span>
            <code>c</code> 打包 · <code>x</code> 解包 · <code>t</code> 列清单——一条命令一个动词
          </span>,
          <span>
            <code>f</code> 归档文件名 · <code>v</code> 过程可见 · <code>z</code> 外挂 gzip
          </span>,
          <span>
            组合读法：<code>tar -czvf x.tar.gz dir/</code> = 打包 + 话痨 + 挂 gzip + 文件名 x.tar.gz
            + 目标 dir/
          </span>,
        ]}
      />
      <Paragraph>
        两个背景知识。其一，老教程里会见到没有横线的 <code>tar cvf</code>——tar
        的选项系统比「长选项」标准还老，无横线是历史兼容写法，能跑，但本篇统一用带横线的现代风格。其二，macOS
        自带的是 bsdtar（libarchive 系），Linux 上更常见 GNU tar，两家实现同一份核心语法，90%
        场景无感切换，
        <code>tar --version</code> 第一行就能对表。
      </Paragraph>

      <Heading level={2} title="三个动词走一遍" />
      <Paragraph>
        造一个小目录 app/（两个文件一个子目录），<code>c</code> 打包，<code>v</code> 让它边装边报：
      </Paragraph>
      <ShellBlock>{`$ tar -cvf demo.tar app
a app
a app/README.md
a app/package.json
a app/src
a app/src/index.js`}</ShellBlock>
      <Paragraph>
        v 的输出前缀 <code>a</code> 是 adding；解包时会变成 <code>x</code>
        （extracting），一眼分清方向。接着 <code>t</code> 列清单——安静版只报路径，加 <code>v</code>{" "}
        变详情版，权限、属主、大小、修改时间全部到位（这些元数据为什么会在包里，见原理篇）：
      </Paragraph>
      <ShellBlock>{`$ tar -tf demo.tar
app/
app/README.md
app/package.json
app/src/
app/src/index.js
$ tar -tvf demo.tar
drwxr-xr-x  0 demo  staff     0 Sep 10 22:18 app/
-rw-r--r--  0 demo  staff    22 Sep 10 22:18 app/README.md
-rw-r--r--  0 demo  staff    42 Sep 10 22:18 app/package.json
drwxr-xr-x  0 demo  staff     0 Sep 10 22:18 app/src/
-rw-r--r--  0 demo  staff    25 Sep 10 22:18 app/src/index.js`}</ShellBlock>
      <Paragraph>
        <code>x</code> 解包，<code>-C</code> 指定落点目录，再用 <code>diff -r</code>{" "}
        验货——零输出即逐字节无损还原：
      </Paragraph>
      <ShellBlock>{`$ tar -xvf demo.tar -C restored
x app/
x app/README.md
x app/package.json
x app/src/
x app/src/index.js
$ diff -r app restored/app        # 零输出 = 逐字节一致`}</ShellBlock>
      <Paragraph>
        注意解包的铺开规则：<strong>包内条目写什么路径，就在当前相对位置原样铺开</strong>
        。所以解包要么先 cd 到目标目录，要么用 <code>-C</code> 明确落点——别在 home 目录裸解。
      </Paragraph>

      <Heading level={2} title="-f 的铁律：紧跟文件名" />
      <Paragraph>
        <code>-f</code> 是<strong>带参数的选项</strong>
        ：紧贴着它的字符、或它后面的下一个词，会被当作归档文件名。连写顺序错了，文件名就换人——看一次真实翻车：
      </Paragraph>
      <ShellBlock>{`$ tar -cfv oops.tar app           # 想把 v 当「显示过程」？翻车
tar: oops.tar: Cannot stat: No such file or directory
tar: Error exit delayed from previous errors.
$ ls -l v
-rw-r--r--  1 demo  staff  15360 Sep 10 22:45 v`}</ShellBlock>
      <Paragraph>
        解析过程：<code>-cfv</code> 被读成 <code>-c -f v</code>——归档名成了 <code>v</code>，
        <code>oops.tar</code> 沦为「要装订的文件」，自然找不到。规则就一条：
        <strong>f 永远放修饰符最后一位，后面紧跟文件名</strong>。
      </Paragraph>
      <DoDont
        label="-f 的位置 / f last"
        dont={{
          code: "$ tar -cfv backup.tar proj/   # f 吃掉 v：归档叫 v，backup.tar 变成员",
          note: "连写时紧贴 f 的字符就是它的参数",
        }}
        do={{
          code: "$ tar -cvf backup.tar proj/   # f 殿后，文件名紧随其后",
          note: "修饰符全部写完再写 f，归档名永远是下一个词",
        }}
      />

      <Heading level={2} title="z 可以不写：自动认壳" />
      <Paragraph>
        <code>-czvf</code> 是两层套娃的糖衣：装订完顺手调 gzip 压一遍。同族字母还有 <code>-j</code>
        （bzip2）与 <code>-J</code>（xz）——换个字母换台压缩机。但现代 tar
        连这些字母都可以省：打开文件先偷看头部魔数，认出 <code>1F 8B</code> 就知道有 gzip 壳、认出
        xz 的 <code>FD 37 7A 58 5A</code> 就调 xz，剥完壳当 tar
        流读。认壳认的是字节，不是后缀——bsdtar(1) 手册明确写着自动识别压缩格式。
      </Paragraph>
      <ShellBlock>{`$ tar -tf app.tar.gz              # 没写 z，照样列清单
app/
app/README.md
app/package.json
app/src/
app/src/index.js
$ tar -cJf app.tar.xz app         # J 挂 xz
$ file app.tar.xz
app.tar.xz: XZ compressed data, checksum CRC64`}</ShellBlock>
      <Paragraph>
        所以解包的万能钥匙就一把：
        <strong>
          <code>tar -xf</code> 什么都能开
        </strong>
        ——
        <code>.tar</code>、<code>.tar.gz</code>、<code>.tgz</code>、<code>.tar.xz</code>{" "}
        通吃。后缀只是给人看的约定，认壳靠魔数。
      </Paragraph>

      <Heading level={2} title="日常三招：-C 落点、--exclude 备份、-O 抽文件" />
      <Paragraph>
        下载的源码包几乎都是「名字-版本.tar.gz」，标准流程三步：先 <code>-tvf</code>
        看清单做安检，再解到指定目录，最后进目录干活。「所有条目都在一个公共顶层目录里」是社区公约（干净归档），但公约靠不住，靠第一步的清单说话：
      </Paragraph>
      <ShellBlock>{`$ tar -tzf demo-lib-1.2.0.tar.gz          # ① 安检：有公共顶层目录吗
demo-lib-1.2.0/
demo-lib-1.2.0/LICENSE
demo-lib-1.2.0/package.json
demo-lib-1.2.0/src/
demo-lib-1.2.0/src/index.js
$ tar -xzf demo-lib-1.2.0.tar.gz -C build # ② 解到 build/
$ cd build/demo-lib-1.2.0                 # ③ 进目录干活`}</ShellBlock>
      <Paragraph>
        备份项目目录时，九成体积是 node_modules 和 .git，用 <code>--exclude</code>{" "}
        排掉。它匹配的是路径里
        <strong>任何层级</strong>叫这个名字的目录，不用写通配符：
      </Paragraph>
      <ShellBlock>{`$ du -sk my-project my-project/node_modules my-project/.git
28      my-project
12      my-project/node_modules
8       my-project/.git
$ tar -czf backup-all.tar.gz my-project
$ tar --exclude node_modules --exclude .git -czf backup-clean.tar.gz my-project
$ ls -l backup-all.tar.gz backup-clean.tar.gz
-rw-r--r--  1 demo  staff  1182 Sep 10 22:51 backup-all.tar.gz
-rw-r--r--  1 demo  staff   616 Sep 10 22:51 backup-clean.tar.gz
$ tar -tf backup-clean.tar.gz             # node_modules 和 .git 全没进来
my-project/
my-project/package.json
my-project/src/
my-project/src/main.js`}</ShellBlock>
      <Callout kind="warning" title="排除 .git 是文件备份，不是仓库备份">
        清单里没有 .git，意味着提交历史不在包里。备份代码和迁移仓库是两种需求——后者老老实实 git
        clone，别指望 tar 包里的工作区。
      </Callout>
      <Paragraph>
        第三招是大写 <code>-O</code>
        （output）：不解包，把包内某个文件直接打到标准输出。抠包里的单个文件特别好使，比如看源码包里的某个配置原文：
      </Paragraph>
      <ShellBlock>{`$ tar -xOf demo-lib-1.2.0.tar.gz demo-lib-1.2.0/package.json
{"name":"demo-lib","version":"1.2.0"}`}</ShellBlock>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        坑一和坑二在同一个现场：目标目录里已有 <code>app/README.md</code>
        （内容「我原来的版本」）和一个包里没有的
        <code>extra.txt</code>，往里解一个同样含 <code>app/README.md</code> 的包：
      </Paragraph>
      <ShellBlock>{`$ printf '我原来的版本\\n' > victim/app/README.md
$ tar -xf demo.tar -C victim             # 包里也有 app/README.md
$ cat victim/app/README.md
# my app

just a demo                              ← 无提示被换掉，退出码 0
$ ls victim/app
README.md   extra.txt   package.json   src
                          ↑ 包里没有的 extra.txt 原地活着`}</ShellBlock>
      <Paragraph>
        两个结论一起拿走：同名文件<strong>无提示直接换掉</strong>（不问、不备份、退出码
        0）；包里没有的文件
        <strong>原地活着</strong>。解包是「往目录上铺一层」的<strong>覆盖合并</strong>
        ，不是「还原到打包那一刻」的
        <strong>快照恢复</strong>——想要快照语义，先清空目标再解。
      </Paragraph>
      <Paragraph>
        坑三，属主与权限跟着包走。tar
        会在解包时尽力还原包里记录的属主——普通用户解包还原不了，警告一声文件归你（这是好事）；但
        <code>sudo</code> 解包就真的把属主设成包里写的谁。解来路不明的包加
        sudo，等于让包作者在你系统上安置任意属主任意权限的文件。坑四，绝对路径不用慌：打包时开头的{" "}
        <code>/</code> 会被剥掉并给出警告，这是历史事故换来的防御——早期 tar 照原样存{" "}
        <code>/etc/passwd</code>
        这类路径，解包就能覆盖系统任意文件：
      </Paragraph>
      <ShellBlock>{`$ tar -cf abs.tar /tmp/tar-demo/badpack
tar: Removing leading '/' from member names
$ tar -tf abs.tar | head -2
tmp/tar-demo/badpack/
tmp/tar-demo/badpack/c.txt`}</ShellBlock>
      <Paragraph>
        附赠一个小暗器：mtime 也随包还原——解出来的文件「出生时间」停在打包那一刻，可能骗过 make
        这类按时间戳做增量判断的构建工具。
      </Paragraph>
      <DoDont
        label="解包权限 / no sudo"
        dont={{
          code: "$ sudo tar -xf untrusted.tar -C /   # 包里写谁是属主，就设成谁",
          note: "元数据跟着包走：sudo 解来路不明的包等于元数据注入",
        }}
        do={{
          code: "$ tar -xf untrusted.tar -C ~/unpack  # 普通用户解，文件归你",
          note: "真需要改属主，事后自己 chown，决定权留在手里",
        }}
      />
      <Callout kind="warning" title="macOS 打的包，Linux 解出一堆 ._ 文件">
        bsdtar 会把 macOS 扩展属性（Finder 信息、ACL 等）以 AppleDouble 编码存成
        <code>._&lt;名字&gt;</code> 条目写进包。坑中坑：本机 <code>tar -tf</code>{" "}
        的清单会过滤这些条目，你自己看不见——收包的 Linux 同事才见到。根治在打包端：
        <code>COPYFILE_DISABLE=1 tar ...</code>（macOS 10.5+ 起），或{" "}
        <code>--disable-copyfile</code>（libarchive 3.0.3+）。
      </Callout>
      <ShellBlock>{`$ tar -cf plain.tar app           # 完全默认的打包
$ tar -tf plain.tar               # 自己看清单：很干净？
app/
app/README.md
...
$ xxd plain.tar | head -1
00000000: 2e5f 6170 7000 0000 0000 0000 0000 0000  ._app...........`}</ShellBlock>

      <Checklist
        title="解包安检三步"
        items={[
          {
            text: "tar -tvf 先看清单",
            note: "有公共顶层目录吗？有没有来路不明的绝对路径或 ..？",
          },
          {
            text: "选好落点再解",
            note: "mkdir 一个目录配 -C，别在当前位置裸解铺一地",
          },
          {
            text: "普通用户解包",
            note: "不用 sudo；macOS 打的包留意 ._ 条目（COPYFILE_DISABLE=1）",
          },
        ]}
      />

      <Table
        label="命令速查 / cheatsheet"
        head={["命令", "干什么"]}
        rows={[
          ["tar -cvf x.tar dir/", "打包（不压缩）"],
          ["tar -czvf x.tar.gz dir/", "打包 + gzip 压缩"],
          ["tar -tvf x.tar.gz", "看清单（解包前必做）"],
          ["tar -xOf x.tar inner/file", "不解包，直打印包内某文件"],
          ["tar -xf x.tar.gz", "解开（自动认壳，通吃 .tar/.gz/.tgz/.xz）"],
          ["tar -xzvf x.tar.gz -C dir/", "解到指定目录"],
          ["tar --exclude node_modules --exclude .git -czf b.tar.gz proj/", "备份去噪"],
          ["COPYFILE_DISABLE=1 tar ...", "macOS 打包不夹带 ._ 条目"],
        ]}
      />

      <MemoryCard keyword="先看后解，f 殿后">
        解包前先 tar -tvf 看清单；-f
        永远放修饰符最后一位紧跟文件名；解包是覆盖合并不是快照恢复；macOS 打包加
        COPYFILE_DISABLE=1。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "tar -xf 为什么连 .tar.xz 都能解，z/J 一个都不用写？",
            intent: "热身题考自动识别的原理——答「按后缀识别」的人没接上魔数地基。",
            depth: 1,
            a: "tar 打开归档先读头部魔数：1F 8B 认出 gzip 壳、FD 37 7A 58 5A 认出 xz，认出什么壳就调对应工具剥，剥完当 tar 流读。后缀只是给人看的约定，认壳认的是字节。",
            bonus:
              "把 app.tar.gz 改名 app.jpg，tar -xf 照样解开——file 命令和 tar 用的是同一套「看字节不看名字」的路标逻辑。",
          },
          {
            q: "往已有文件的目录解包，会删掉目录里多余的文件吗？",
            intent: "考解包语义——很多人把 tar 当快照恢复工具用。",
            depth: 2,
            a: "不会。解包是覆盖合并：同名文件无提示直接换掉，包里没有的文件原地不动——它只负责把包里的铺上去，从不删除。想要「还原到打包那一刻」，先清空目标目录再解。",
            bonus:
              "mtime 也随包还原，解出来的文件时间停在打包时刻——make 这类按时间戳增量的工具可能被骗着少干活；真正有删除语义的是 rsync --delete，不是 tar。",
          },
          {
            q: "tar -cfv backup.tar proj/ 会发生什么？",
            intent: "细节陷阱题，考 -f 带参数这件事是否真懂。",
            depth: 2,
            a: "翻车。连写被解析成 -c -f v：紧贴 f 的字符 v 被当成归档名，backup.tar 沦为要装订的成员——实测目录里多出一个 15360 字节、名叫 v 的文件，同时报 oops.tar: Cannot stat。规则：f 永远放修饰符最后一位，文件名紧随其后。",
            bonus:
              "无横线的老派写法 tar cvf 能跑，是因为 tar 的选项系统比长选项标准更老——那是历史兼容，不是什么新语法。",
          },
          {
            q: "macOS 打的包在 Linux 解出一堆 ._ 开头的文件，哪来的？怎么根治？",
            intent: "跨平台协作的实战坑——答不上说明没给非 Mac 同事发过包。",
            depth: 3,
            a: "bsdtar 把 macOS 扩展属性（Finder 信息、ACL 等）以 AppleDouble 编码存成 ._<名字> 条目物理写进包；Linux 的 tar 不认识这种伴随条目，当普通文件落地就成了垃圾。根治在打包端：COPYFILE_DISABLE=1 tar ...（macOS 10.5+ 起）或 --disable-copyfile（libarchive 3.0.3+）。",
            bonus:
              "坑中坑在「自己看不见」：本机 bsdtar 的 -tf 清单会过滤 ._ 条目，xxd 看包的开头字节才实锤——发包前用 COPYFILE_DISABLE=1 重打一次最稳。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "gzip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/gzip-cli",
            description: "压缩侧的全家桶：-k/-c 安全带、z 系列与级别实测。",
          },
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description: "docker save/load 搬的就是 tar 包：镜像搬运的两条通道。",
          },
        ]}
      />
    </NoteShell>
  );
}
