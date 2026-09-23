import { CodeBlock, ShellBlock } from "@/components/demo";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        外来类型的按来源分五类，每类的事实源不同、落位文件也不同：
        <strong>构建注入</strong>归 <code>src/vite-env.d.ts</code> 配合 tsconfig <code>types</code>{" "}
        白名单（二选一）；<strong>外部脚本注入</strong>进 <code>src/types/globals.d.ts</code>；
        <strong>无类型 npm 包</strong>集中补在 <code>src/types/modules.d.ts</code>；
        <strong>@types 维护</strong>的类型靠 package.json 版本联动纪律；<strong>API 契约</strong>进{" "}
        <code>src/shared/api/generated/</code> 交给代码生成。配置一律写{" "}
        <code>tsconfig.app.json</code>（壳 tsconfig 里的 compilerOptions 不生效），
        <code>src/types/</code> 只放环境声明——业务类型一律就近。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么没有 import/export 的文件就是全局的？",
            to: "/note/frontend/typescript/basics/scope-script-vs-module",
          },
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
          },
        ]}
      >
        落位规则的底层依据是两条机制结论：声明文件收录即全局生效（include/被导入/三斜线三路径），以及查找管道的类型来源优先级。
      </Prerequisite>

      <Heading level={2} title="先记住目录骨架与两条铁律" />

      <Paragraph>
        五类外来类型的落位共享同一套目录骨架（以 Vite + React + TS 脚手架为基准，project references
        结构）。所有手写环境声明的集中地是 <code>src/types/</code>，所有配置进{" "}
        <code>tsconfig.app.json</code>——这两个位置是本篇的主语，先定型：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`my-app/
├── tsconfig.json               # 壳：files:[] + references（⚠️ 配 types/include 不生效）
├── tsconfig.app.json           # 应用程序：include src，你的代码全归它管
├── tsconfig.node.json          # node 程序：只管 vite.config.ts
├── index.html                  # ② 外部脚本 <script> 挂这里
└── src/
    ├── vite-env.d.ts           # ① 构建注入 + env（脚本式全局声明的家）
    ├── types/                  # ②③④ 手写环境声明集中地
    │   ├── globals.d.ts        #    window 注入 / CDN 全局
    │   └── modules.d.ts        #    declare module（补包声明 / 覆盖烂类型）
    ├── shared/
    │   ├── env.ts              # env 启动校验（升级方案用）
    │   └── api/
    │       ├── generated/      # ⑤ 代码生成物（⛔ 手改）
    │       └── orval.config.ts # 生成配置与生成物同目录
    └── features/
        └── order/
            └── api/order.ts    # ⑤ 端点函数（类型 import 自生成物）`}
      />

      <List
        ordered
        items={[
          <>
            <strong>壳 tsconfig.json 里不写任何 compilerOptions</strong>——它只有{" "}
            <code>files: []</code> 加 references，types、include、paths 写进去都会被静默忽略。
            「paths 配了不生效」类事故的第一排查项。
          </>,
          <>
            <strong>include 覆盖即生效</strong>——<code>"include": ["src", "vite.config.ts"]</code>{" "}
            意味着 src 下任何位置的 .d.ts 自动进编译程序；放 src 外面（如项目根 <code>types/</code>
            ）必须显式加进 include，否则整文件是死文件。
          </>,
        ]}
      />

      <Heading level={2} title="① 构建注入：import.meta、虚拟模块、非标准导入" />

      <Paragraph>
        <code>import.meta.env</code>、<code>import.meta.glob</code>、HMR、虚拟模块、CSS
        Modules、图片导入——这些是构建工具创造的，TS 本身不认识。事实源是构建工具发布的类型包 （vite
        的 client.d.ts），管理方式是把它接进编译程序，两条路二选一。
      </Paragraph>

      <CompareTable
        label="两种接法二选一 / types vs reference"
        left={{ title: "tsconfig types 白名单", color: PALETTE.blue }}
        right={{ title: "脚本式文件 + reference 指令", color: PALETTE.purple }}
        rows={[
          {
            aspect: "配置位置",
            left: "tsconfig.app.json 的 types 字段",
            right: "src/vite-env.d.ts 顶部三斜线指令",
          },
          {
            aspect: "作用范围",
            left: "该程序内所有文件全局生效",
            right: "文件被收录才生效（依赖 include）",
          },
          {
            aspect: "可见性",
            left: "集中、一眼看清注入了什么",
            right: "跟随源码走，复制项目即生效",
          },
          { aspect: "同时使用", left: "功能冗余——留一个即可", right: "同左" },
        ]}
      />

      <DoDont
        label="注入配置二选一 / pick one"
        dont={{
          code: `// tsconfig.app.json
{ "types": ["vite/client"] }
// src/vite-env.d.ts
/// <reference types="vite/client" />`,
          note: "两处同时配置是冗余死代码——功能完全等价，改配置时容易只改一处造成认知分裂",
        }}
        do={{
          code: `// tsconfig.app.json
{ "types": ["vite/client"] }
// src/vite-env.d.ts 只留自定义 env 扩展，不写 reference`,
          note: "白名单为主（集中可见），vite-env.d.ts 只承担「自定义 env 变量的接口合并」这一件事",
        }}
      />

      <Paragraph>
        自定义部分写在 <code>src/vite-env.d.ts</code>：env 变量走 <code>ImportMetaEnv</code>{" "}
        接口合并；自研 Vite 插件的虚拟模块用 <code>declare module</code> 描述。这个文件
        <strong>永远保持脚本式</strong>——顶部混进一行 import，全局合并静默失效，env
        类型提示全部消失。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// src/vite-env.d.ts（脚本式：顶层禁止 import/export）
interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
}

// 自定义 Vite 插件的虚拟模块
declare module "virtual:analytics" {
  export const track: (event: string, data?: Record<string, unknown>) => void;
}`}
      />

      <Callout kind="warning" title="env 声明是信任模式">
        声明了 <code>VITE_API_BASE: string</code> 不代表 .env
        里真的配了——漏配编译不报、首次请求才炸。 升级路径：Vite 官方的{" "}
        <code>
          interface ViteTypeOptions {"{"} strictImportMetaEnv: unknown {"}"}
        </code>{" "}
        让未声明的 key 直接编译报错；多环境大项目再进一步，用 zod 在启动时 parse{" "}
        <code>import.meta.env</code>（集中放 <code>src/shared/env.ts</code>），漏配启动即炸。
      </Callout>

      <Heading level={2} title="② 外部脚本注入的全局变量" />

      <Paragraph>
        index.html 里挂的高德/Google 地图、GA 的 <code>gtag</code>、微前端注入的{" "}
        <code>window.__MICRO_APP_DATA__</code>——运行时凭空出现，源码里没有任何 import
        可追溯。落位分两处：
        <strong>
          声明进 <code>src/types/globals.d.ts</code>，消费封装进 <code>src/shared/</code>
        </strong>
        。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// src/types/globals.d.ts（脚本式）
declare const gtag: (...args: unknown[]) => void;

declare global {
  interface Window {
    // 注入可能不发生的（微前端/灰度）用 ?，必现注入（统计脚本）不用
    __MICRO_APP_DATA__?: { userId: string; tenant: string };
  }
}`}
      />

      <Paragraph>
        声明的取舍只有一条：<strong>是否 optional 要如实反映注入是否必然发生</strong>。可选注入加{" "}
        <code>?</code> 强制使用处判空；必现注入不加，避免到处无意义判空。
      </Paragraph>

      <Paragraph>
        重型 SDK（地图、播放器、编辑器）更进一步：别让业务代码散摸 <code>window.AMap</code>，
        写一个类型化 loader 模块（<code>src/shared/amap.ts</code>）封装 script 注入与 onload
        时序，声明面收窄到 loader 内部的一处类型断言。整个项目对「全局注入」的依赖被压缩到一个
        模块里，SDK 换版本只改一处。
      </Paragraph>

      <Callout kind="tip" title="先搜再写">
        主流 SDK 多半有现成类型包（高德有 @amap/amap-jsapi-types，Google Maps 有
        @types/google.maps）。先搜后写是纪律——冷门查不到再回手写最小 declare。 另外不要用 typeRoots
        指向 src/types：typeRoots 是给「含 types 入口的声明包目录」用的， 普通声明文件走 include
        就够，混用反而引入解析歧义。
      </Callout>

      <Heading level={2} title="③ 无类型 npm 包：集中补在 modules.d.ts" />

      <Paragraph>
        装了个老包 IDE 报「Could not find a declaration file」——事实源是你手写的声明。所有{" "}
        <code>declare module</code> 集中进 <code>src/types/modules.d.ts</code>：一个文件回答
        「我们到底给哪些包糊过声明」，这是集中放的核心价值。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// src/types/modules.d.ts（脚本式）

// 按真实用到的面手写——只声明用到的 API，没到的留白
declare module "legacy-lib" {
  interface Options {
    retries?: number;
    timeout?: number;
  }
  export function init(opts?: Options): void;
  export function destroy(): void;
}

// 应急糊 any：必须带 TODO + issue 链接，明确是暂时状态
// TODO(#1234): 等上游发类型后删除此声明
declare module "semi-legacy";`}
      />

      <Paragraph>
        写声明的纪律是<strong>精确而不完整</strong>：把实际用到的函数签名写准，没用的 API
        不画像——声明面即类型面，糊一张大而错的图比窄而准的图伤害大得多。应急的
        <code>declare module "x";</code> 一键糊 any 只用于 POC 或即将被替换的依赖，
        进生产代码必须带跟踪标记。
      </Paragraph>

      <DoDont
        label="糊 any 的纪律 / temporary means tracked"
        dont={{
          code: `// types/modules.d.ts
declare module "legacy-lib";`,
          note: "无注释无跟踪的糊 any 十有八九变成永久状态——三个月没人回头补，检查全废",
        }}
        do={{
          code: `// TODO(#1234): 等上游发类型后删除此声明
declare module "legacy-lib";`,
          note: "暂时的状态必须有逃离路径：issue 编号写进注释，过期可查可删",
        }}
      />

      <Callout kind="warning" title="同名配对地雷">
        声明文件不能与 src 下任何 .ts 同名同目录——<code>utils.ts</code> 旁边放{" "}
        <code>utils.d.ts</code>，后者会被视为前者的附属声明而内容不被采纳。集中放{" "}
        <code>src/types/modules.d.ts</code> 天然避开这个坑。
      </Callout>

      <Paragraph>
        治本路径按包的性质分叉：公开包还在活跃维护，给上游提 PR 附带 index.d.ts（或走
        DefinitelyTyped）；公司内部私有包，建 <code>packages/types-*</code> 声明包， package.json 写{" "}
        <code>"types": "./index.d.ts"</code>，消费方装包即得——很多中大型公司
        用这种方式集中管理私有生态的类型。
      </Paragraph>

      <Heading level={2} title="④ @types 维护的类型：纪律而非文件" />

      <Paragraph>
        react 本体是 JS、类型在 <code>@types/react</code>——这类的管理不在源码文件， 在
        <strong>依赖清单的版本联动纪律</strong>。@types 与主包是两拨人维护的两份产物，
        滞后与漂移是常态（React 19 发布时 @types 晚了很久），所以规则只有一条：
        <strong>升主包的同一个 PR 里升 @types，永不分开合入</strong>。CI 加脚本校验两者版本
        关系即可将纪律自动化。
      </Paragraph>

      <ShellBlock
        children={`# 版本联动：主包与 @types 同一 PR 一起动
pnpm add react@19.2.8 && pnpm add -D @types/react@^19.2`}
      />

      <Paragraph>
        配置侧两个旋钮：<code>types</code> 白名单只列需要全局生效的（vite/client 这类；@types/react
        靠 import 触发加载，不进白名单）；<code>skipLibCheck: true</code>
        保持默认开启——它跳过的是第三方 .d.ts 内部的自洽检查（类型包之间打架最常见的炸点），
        你的代码调用第三方 API 时依然被检查。知道这个口子开着，报错来自 node_modules 的 .d.ts
        内部时就不必在自己代码里找原因。
      </Paragraph>

      <Paragraph>
        包自带的类型烂到影响产出时，外科手术是脚本式覆盖：在 <code>modules.d.ts</code> 里{" "}
        <code>declare module "bad-lib"</code> 整体替换其声明面。但覆盖是全或无——包升级后 新 API
        不在你的覆盖声明里反而变 any，所以它只是等上游修复期间的临时手段，用 patch-package / pnpm
        patch 修声明文件本体同理，都要有逃离计划。
      </Paragraph>

      <Heading level={2} title="⑤ API 契约：generated 目录 + 端点函数" />

      <Paragraph>
        API 入参/返回是五类里唯一<strong>事实源在仓库外</strong>的——其余四类的形状由你的配置
        或声明决定，API 契约由后端定义。有 OpenAPI spec 就用代码生成（orval /
        openapi-typescript），生成物进 <code>src/shared/api/generated/</code>，禁止手改、
        提交进仓库（CR 能 review 契约 diff、离线可构建）；没有 spec 的退化路径是手写 DTO
        写在端点函数同文件顶部，feature 内共享的上提到同目录 .types.ts。
      </Paragraph>

      <ShellBlock
        children={`# package.json scripts
"gen:api": "orval --config src/shared/api/orval.config.ts"`}
      />

      <CodeBlock
        lang="typescript"
        code={`// src/features/order/api/order.ts —— 类型只 import 自生成物
import type { CreateOrderBody, OrderDetail } from "@/shared/api/generated/orders";

export function createOrder(body: CreateOrderBody) {
  return request.post<OrderDetail>("/orders", body);
}

// src/features/order/api/order.types.ts —— feature 私有视图类型（就近）
export interface OrderListItemVM extends OrderDetail {
  statusLabel: string;
}`}
      />

      <Paragraph>
        边界纪律：<strong>生成物类型不再转发</strong>——组件消费 OrderDetail 一律直接从 generated
        目录 import，不通过 feature 的 index.ts re-export，否则契约类型与生成物
        出现两条引用路径，生成物换目录时全项目断链。生成物路径统一走{" "}
        <code>@/shared/api/generated/*</code> 别名（tsconfig paths 与 Vite alias
        两处同步），目录调整只改配置不改业务代码。
      </Paragraph>

      <Heading level={2} title="落位决策速查" />

      <Table
        label="五类落位速查 / placement cheat sheet"
        head={["类别", "事实源", "落位文件", "形态", "生效条件"]}
        rows={[
          [
            "① 构建注入",
            "构建工具的类型包",
            "vite-env.d.ts + tsconfig types 白名单（二选一）",
            ".d.ts / jsonc",
            "白名单全局生效；文件依赖 include",
          ],
          [
            "② 外部脚本注入",
            "注入脚本本身",
            "src/types/globals.d.ts（大 SDK 配 shared/ loader）",
            "脚本式 .d.ts",
            "include 覆盖 src 即生效",
          ],
          [
            "③ 无类型 npm 包",
            "你手写的声明",
            "src/types/modules.d.ts",
            "脚本式 .d.ts",
            "同上 + 不与 .ts 同名",
          ],
          [
            "④ @types 维护",
            "DefinitelyTyped",
            "package.json（版本联动）+ skipLibCheck",
            "依赖清单",
            "主包与 @types 同 PR 升级",
          ],
          [
            "⑤ API 契约",
            "后端仓库",
            "src/shared/api/generated/（手写退化到端点同文件）",
            ".ts",
            "正常 import",
          ],
        ]}
      />

      <MemoryCard keyword="src/types 只放环境声明">
        业务类型一律就近：同文件 → 同目录 .types.ts → shared 上提。集中目录一旦开始收业务类型，
        六个月后必然变杂物抽屉。
      </MemoryCard>
      <MemoryCard keyword="声明越窄越便宜" color={PALETTE.green}>
        只声明用到的面、尽量靠近消费点（loader 模块、feature 私有）——声明面越宽，与真实世界
        漂移的面积越大，维护成本越高。
      </MemoryCard>

      <Heading level={2} title="追问链：落位实战" />

      <QAChain
        intro="五问从配置排查挖到架构取舍：落位决策的每个坑都能从「收录即生效」推出来。"
        items={[
          {
            depth: 2,
            q: "在壳 tsconfig.json 里配了 types 和 paths，为什么完全不生效？",
            intent:
              "热身：确认「配置写在哪」的基本功——project references 结构下这是最常见的配置事故。",
            a: "壳 tsconfig 只有 files: [] 加 references，它自己不编译任何文件，compilerOptions 也不被任何程序继承读取（除非显式 extends）。types/paths/include 必须写进实际编译的子配置（tsconfig.app.json / tsconfig.node.json）。「配了不生效」类问题的第一排查项就是看改的是壳还是子配置。",
          },
          {
            depth: 3,
            q: "src/types/ 下的 globals.d.ts 为什么不需要在任何地方 import 就生效？放项目根 types/ 就不行？",
            intent:
              "考察能否把「收录即全局」的机制结论迁移到落位决策——这是本篇所有规则的底层依据。",
            a: "生效条件是被拉进编译程序：tsconfig.app.json 的 include 写了 src，src 下所有 .d.ts（含深层目录）自动收录，脚本式声明即进全局——不需要任何人 import。放项目根 types/ 则不在 include 范围内，文件没进程序，声明不存在；解法是显式把 types 加进 include 数组。位置本身没有魔法，收录才有。",
          },
          {
            depth: 3,
            q: "给无类型包补声明，为什么推荐集中在一个 modules.d.ts 而不是「谁用谁在旁边建」？",
            intent: "考察对「声明面维护成本」的理解——就近原则在这里为什么失效。",
            a: "环境声明与业务类型相反，它没有「归属的 feature」——legacy-lib 可能被三个模块用，就近声明必然多处重复，且「项目到底糊了哪些包」无从回答。集中一个文件让补声明可审计：查一个文件就知道所有临时代码（TODO 糊 any）与覆盖关系，包升级清债时有完整清单。业务类型就近是因为它有明确归属，环境声明没有——归属决定落位。",
            bonus:
              "集中还有个隐性收益：modules.d.ts 里的 declare module 与业务代码物理隔离，避免误加 import 导致文件变模块、覆盖语义滑成增强（脚本=覆盖、模块=增强的双语义陷阱）。",
          },
          {
            depth: 4,
            q: "API 生成物提交进仓库和 CI 临时生成，大型项目为什么多数选提交？",
            intent: "考察对「生成物也是一种契约面」的理解——两个选项的权衡不是洁癖，是构建可靠性。",
            a: "提交进仓库换来三样东西：CR 能 review 契约 diff（后端改字段在前端 PR 里可见，变更拦截提前到合并前）；离线/内网可构建（CI 不依赖后端 spec 服务活着）；本地开发零等待（clone 即有类型，不用先起后端）。代价是仓库里有一份需要定期再生的产物——用「CR 必须过生成物 diff」的纪律补偿。CI 生成的优势只有「永远最新」，而最新不总是优点：后端深夜改了契约，早上全员构建挂掉。",
          },
          {
            depth: 4,
            q: "五类里为什么只有 API 契约需要代码生成，其余四类手写就够？",
            intent: "收官一问：考察能否穿透具体方案看到「事实源位置决定管理方式」这个统一模型。",
            a: "因为事实源的位置不同。其余四类的事实源就在你的仓库里：构建注入由你的 tsconfig/types 字段决定接不接，脚本注入和无类型包的声明由你手写维护，@types 的联动由你的依赖清单控制——都是仓库内可 single-source 的事。唯独 API 契约的事实源在后端仓库，前端任何手写副本都是第二事实源，漂移只是时间问题；代码生成（或 tRPC 全栈同构）本质是把「跨仓库同步」自动化。推论：凡是事实源在仓库外的形状，都应该寻找生成或同构机制；事实源在仓库内的，手写加纪律就够。",
            bonus:
              "这个模型还能预测新类别：接入 GraphQL（schema 在服务端）走 codegen，接入设计系统 token（tokens.json 在设计团队）走 style-dictionary 生成——判断方法相同，先问事实源在哪。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
            description: "落位规则的查找侧机制：types 白名单、@types 池子与解析瀑布的完整水流图。",
          },
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
            description: "壳配置为什么是壳：三类读者各自认得哪些字段。",
          },
        ]}
      />
    </NoteShell>
  );
}
