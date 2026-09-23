import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import {
  BarChart,
  Callout,
  CompareTable,
  CrossRef,
  MemoryCard,
  Prerequisite,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        手机定位不是单一技术，而是<strong>多信号源融合</strong>
        ：GNSS 卫星（5~50 米、慢、耗电、室内失效）、Wi-Fi（20~100
        米、快、省电但要联网查库）、蜂窝基站（数百米到几公里、粗但稳）、传感器融合（只能修正不能从零定位）。定位的快慢与成败，本质是
        <strong>系统决定给哪些硬件上电、上电多久</strong>。理解两件事就理解了绝大多数定位 bug：一是
        GNSS 冷启动要靠 50 bit/s 的卫星链路下载星历，动辄几十秒，A-GPS 用网络下载数据来加速——所以
        <strong>弱网连累 GPS</strong>；二是低电量模式下系统限制 GPS 上电、节流位置交付——所以
        <strong>省电模式连累定位</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "从输入 URL 到页面渲染，中间发生了什么？",
            to: "/note/frontend/browser/fundamentals/url-to-render",
          },
        ]}
      >
        本文讨论的 W3C Geolocation
        只是「传话筒」——真正的定位发生在操作系统层。浏览器环境的基础链路见前置笔记。
      </Prerequisite>

      <Heading level={2} title="四种信号源：各管一段的拼图" />
      <Paragraph>
        Android 官方的定位策略文档和 Apple 的能效指南（Energy Efficiency Guide）都明确： 位置服务是
        <strong>组合拳</strong>
        ，系统按请求的精度档位决定给哪些硬件上电，不会为每次请求点亮全部硬件。四个信号源的分工：
      </Paragraph>

      <Table
        label="信号源对比 / signal sources"
        head={["信号源", "原理", "精度", "首响应速度", "耗电", "弱点"]}
        rows={[
          [
            "GNSS（GPS/北斗等）",
            "接收卫星信号，测距交汇（至少 4 颗）",
            "5~50 m",
            "慢：秒级到分钟级",
            "高",
            "室内/遮挡几乎失效",
          ],
          [
            "Wi-Fi",
            "扫描周围 AP 的 MAC 地址，查厂商位置数据库",
            "20~100 m",
            "快",
            "低",
            "需联网查库；库未收录的 AP 无效",
          ],
          ["蜂窝基站", "小区塔位置 + 信号强度估算", "500 m~数 km", "快", "低", "精度极粗"],
          [
            "传感器融合",
            "加速度计/陀螺仪推算相对位移",
            "误差递增",
            "—",
            "极低",
            "只能修正，不能从零定位",
          ],
        ]}
      />

      <Paragraph>
        两条官方结论值得记住。Android 对 GPS
        的评价：最精确，但只在室外可用、快速耗电、返回位置没有用户期望的那么快；对网络定位（基站 +
        Wi-Fi）的评价：室内外都可用、响应更快、更省电。Apple 能效指南对精度与功耗关系的表述更直接：
        <strong>
          请求高于所需的精度，会让 Core Location 点亮额外的硬件、为不必要的精度浪费电量
        </strong>
        ——这句话是「定位快慢本质是上电决策」的官方注脚。
      </Paragraph>

      <Callout kind="tip" title="面试翻译">
        「手机定位用的什么技术」这道题的得分点不在罗列四种信号源，而在说清<strong>融合决策</strong>
        ：系统按精度档位（高精度 / 平衡 /
        低功耗）决定硬件上电范围，先到的结果先交付、后续结果再修正——所以定位可能先粗后细，也可能一次到位。
      </Callout>

      <Heading level={2} title="TTFF：为什么 GPS 首次定位那么慢" />
      <Paragraph>
        GNSS 领域的标准概念 <strong>TTFF（Time To First Fix，首次定位时间）</strong>
        把接收机启动分为三档，核心差别是手里有多少先验数据（据 ESA Navipedia「TTFF」词条与
        Wikipedia「Time to first fix」）：
      </Paragraph>

      <List
        items={[
          <>
            <strong>冷启动</strong>
            ：无任何先验数据——全天空搜索卫星，再逐颗下载星历（ephemeris，每颗星约每 30
            秒广播一次，有效期约 4 小时）。典型耗时 30 秒到几分钟。
          </>,
          <>
            <strong>温启动</strong>
            ：有粗略历书和大概位置，但星历过期——不必全天空搜索，但仍要补星历。典型约 45 秒。
          </>,
          <>
            <strong>热启动</strong>
            ：星历仍有效、时间与位置先验精确（比如刚定位完不久）。典型几秒内。
          </>,
        ]}
      />

      <BarChart
        label="TTFF 量级 / time to first fix"
        title="三种启动的首次定位耗时量级，仅供直觉（实际取决于可见卫星数、信号质量与辅助数据）"
        items={[
          { label: "热启动（星历有效）", value: 3, suffix: "s", color: PALETTE.green },
          { label: "温启动（需补星历）", value: 45, suffix: "s", color: PALETTE.orange },
          { label: "冷启动（无辅助数据）", value: 90, suffix: "s", color: PALETTE.red },
        ]}
      />

      <Paragraph>
        瓶颈在哪？<strong>卫星信号的数据速率只有 50 bit/s</strong>
        ——星历和历书必须从卫星慢慢「听」下来，这是物理层约束，芯片再强也快不了。于是现代手机全部采用
        <strong>A-GPS（辅助 GNSS）</strong>
        ：通过移动网络从辅助服务器下载星历、历书和粗略位置，把冷启动加速到接近热启动。
      </Paragraph>

      <MemoryCard keyword="A-GPS 的因果链" color={PALETTE.orange}>
        A-GPS 依赖网络 → 弱网时辅助数据下载慢或失败 → GNSS 退化为冷启动 →
        首次定位时间从几秒膨胀到几十秒甚至分钟级。 这就是「弱网定位失败」的第一层原因：
        <strong>网络不只喂 Wi-Fi 定位，还喂 GPS 的启动数据</strong>。
      </MemoryCard>

      <Heading level={2} title="弱网：两条定位通道同时变差" />
      <Paragraph>
        弱网影响的不只是 A-GPS。Android 官方对 <code>NETWORK_PROVIDER</code> 的说明原文：
        「Operation of this provider may require a data connection」——
        <strong>Wi-Fi/基站定位本身就要联网查询位置数据库</strong>
        （把 AP 的 MAC 地址换成经纬度）。弱网时两条通道同时劣化：GNSS
        通道拿不到辅助数据退化为冷启动；Wi-Fi/基站通道查不了库，直接不可用或变慢。系统只能干等，你的超时计时器可不会等。
      </Paragraph>

      <Paragraph>
        为什么两条通道会被同一根网线绊倒？因为它们依赖的都是<strong>网络资产</strong>
        ：A-GPS 的星历/历书存在运营商辅助服务器上，Wi-Fi/基站定位的「AP →
        经纬度」映射存在厂商位置数据库里——无线信号本身再好，查不到账本就出不了坐标。
        排查时有个关键分辨：<strong>信号满格 ≠ 数据通路正常</strong>
        ——蜂窝信号格只反映基站的无线链路质量，数据连接的拥塞、丢包、DNS
        失败完全可以在满格信号下发生。「用户说信号很好但定位失败」的工单，先按弱网处理。
      </Paragraph>

      <FlowChart
        label="弱网下的定位劣化路径 / weak-network degradation"
        height={360}
        data={{
          direction: "TB",
          nodes: [
            { id: "req", label: "应用发起定位请求", color: PALETTE.blue },
            { id: "agnss", label: "GNSS 通道：A-GPS 辅助数据下载", color: PALETTE.purple },
            { id: "net", label: "网络定位通道：查 AP 位置数据库", color: PALETTE.purple },
            { id: "cold", label: "退化冷启动：几十秒起", color: PALETTE.red },
            { id: "fail", label: "查库失败/超时：不可用", color: PALETTE.red },
            { id: "wait", label: "系统只能干等 → 应用侧超时", color: PALETTE.orange },
          ],
          edges: [
            { source: "req", target: "agnss" },
            { source: "req", target: "net" },
            { source: "agnss", target: "cold", label: "弱网：下载慢/失败" },
            { source: "net", target: "fail", label: "弱网：查不到库" },
            { source: "cold", target: "wait" },
            { source: "fail", target: "wait" },
          ],
        }}
      />

      <Heading level={2} title="低电量模式：系统主动踩刹车" />
      <Paragraph>
        省电模式的本质：系统把定位硬件视为最贵的耗电项之一，尽量不给它上电、延长缓存复用、节流交付频率。两大平台可核实的官方行为：
      </Paragraph>

      <CompareTable
        label="低电量模式行为 / power save"
        left={{ title: "iOS", color: PALETTE.purple }}
        right={{ title: "Android", color: PALETTE.green }}
        rows={[
          {
            aspect: "整机策略",
            left: "低电量模式减少后台活动：后台 App 刷新、邮件获取等被推迟（Apple 支持文档）",
            right: "Doze/省电下后台定位被节流，位置每小时只计算和交付几次（Android 后台定位文档）",
          },
          {
            aspect: "定位硬件",
            left: "按精度需求上电：请求更高精度会点亮更多硬件（Energy Efficiency Guide）",
            right: "尽量不给 GPS 上电，优先用缓存与网络定位",
          },
          {
            aspect: "网络扫描",
            left: "随整机后台活动一起收敛",
            right: "Wi-Fi 扫描更保守：设备连着同一个 AP 时不再计算位置更新",
          },
          {
            aspect: "自动暂停",
            left: "pausesLocationUpdatesAutomatically：系统判断拿不到理想定位时自动暂停更新",
            right: "Doze 冻结后台作业与网络访问，定位请求排队等待维护窗口",
          },
        ]}
      />

      <Paragraph>
        iOS 侧特别值得注意 <code>pausesLocationUpdatesAutomatically</code>
        ：这个默认开启的机制会让 Core Location
        在判断「当前拿不到符合预期的定位」时自动暂停更新——Apple
        的能效指南把它作为省电最佳实践推荐。它解释了一类经典的现场现象：
        <strong>低电量 + 信号差时，定位回调不是「报错」而是「再也不来」</strong>
        ——没有失败事件，只有静默。应用层必须有超时兜底提示，不能死等回调。
      </Paragraph>

      <Heading level={2} title="多星座融合：北斗和 GPS 为什么不用区分" />
      <Paragraph>
        现代手机的 GNSS 芯片（高通、联发科等）都是<strong>多星座联合定位</strong>
        ：同时跟踪 GPS、北斗、GLONASS、Galileo、QZSS
        的卫星，把所有卫星的伪距观测值放进同一个最小二乘/卡尔曼滤波解算，输出一个位置解。芯片内部会把北斗的
        CGCS2000 语义归算到统一解算框架，最终按 WGS-84 语义通过系统 API
        给出——这一步对调用方完全透明。
      </Paragraph>
      <Paragraph>
        严格说 GPS 用 WGS-84、北斗用 CGCS2000，两者有厘米级的参考框架差异；但手机单点定位精度是 3~10
        米量级，<strong>框架差比定位噪声小两个数量级以上</strong>
        ，应用层视作同一个坐标系即可。工程结论更进一步：你的代码里<strong>不存在任何 API</strong>
        能查到「这次定位用了哪颗系统的卫星」——这不是「不需要管」，是「管不了」。卫星星座影响的是定位的快慢与成败（可用卫星数决定解算质量），而不是你的代码该怎么写。
      </Paragraph>

      <Callout kind="warning" title="常见误判">
        「定位慢是因为手机用的是北斗不是
        GPS」这类归因不成立——多星座融合下调用方既不可见也不可选星座。 可感知的相关变量只有两个：
        <strong>可见卫星数</strong>（影响快慢成败）和<strong>信号质量</strong>
        （影响精度），都发生在芯片和系统层，你只能通过最终结果（拿到/超时/accuracy 值）间接感知。
      </Callout>

      <Heading level={2} title="边界与陷阱" />
      <List
        items={[
          <>
            <strong>「室内 GPS 定位慢」的说法不准确</strong>
            ——室内 GNSS 信号基本失效，此时定位全靠
            Wi-Fi/基站通道；如果又没有网络，室内定位不是慢而是拿不到。
          </>,
          <>
            <strong>传感器不是第五信号源</strong>
            ——加速度计/陀螺仪推算的是相对位移，误差随时间递增，只能在上一次定位结果之上修正航迹，不能从零算出经纬度。
          </>,
          <>
            <strong>飞行模式关掉的不只是蜂窝</strong>
            ——GNSS 芯片本身仍在工作，但没有数据连接就拉不到 A-GPS 辅助数据，首次定位显著变慢；Wi-Fi
            定位通道也随之关闭（除非手动重开 Wi-Fi）。两条通道同时退化，而不是「还有 GPS 兜底」。
          </>,
          <>
            <strong>第一次定位成功不代表后续也快</strong>
            ——星历有效期约 4
            小时，间隔久了下次定位退回温启动；长时间驻留室内再出来，就是一次冷启动。
          </>,
        ]}
      />

      <QAChain
        intro="五问沿「信号源 → 启动机制 → 系统行为 → 融合语义」递进，最后一问是工程归因的分辨力测试。"
        items={[
          {
            depth: 2,
            q: "手机在地下室能定位吗？为什么？",
            intent: "热身：检验是否理解各信号源的物理前提，而不是背「GPS 室内不可用」一句结论。",
            a: "GNSS 基本失效——卫星信号被建筑结构遮挡衰减到无法解算。此时定位只剩 Wi-Fi/基站通道，而这两者都需要联网查位置数据库：地下室通常也没信号，所以不是「定位慢」而是「拿不到」。有网络覆盖的地下车库（Wi-Fi 通了）反而能拿到 20~100 米级精度。",
          },
          {
            depth: 3,
            q: "为什么 GNSS 冷启动要几十秒，热启动只要几秒？瓶颈在哪？",
            intent:
              "考察是否理解 TTFF 的分档依据是先验数据，且瓶颈是卫星链路的 50 bit/s 物理约束。",
            a: "分档看先验数据：冷启动无任何先验，要全天空搜索卫星并逐颗下载星历（每颗约 30 秒广播一次）；热启动星历仍有效，直接进入测距解算。瓶颈是卫星信号数据速率只有 50 bit/s——星历必须从卫星「听」下来，这是物理层约束。所以加速手段不是更强的芯片，而是绕开卫星链路：A-GPS 用移动网络下载辅助数据，把冷启动加速到接近热启动。",
            bonus:
              "星历有效期约 4 小时、控制段约每 2 小时上传更新（Navipedia「GPS Navigation Message」）——这解释了为什么「隔了几小时再定位」会退化成温启动。",
          },
          {
            depth: 3,
            q: "弱网为什么会让 GPS 也变慢？GPS 不是接收卫星信号吗？",
            intent:
              "区分度题：很多人不知道 A-GPS 的存在，把「弱网定位失败」归咎于 Wi-Fi 定位不可用。",
            a: "因为现代 GNSS 定位实际是 A-GNSS——启动数据（星历、历书、粗略位置）主要靠移动网络从辅助服务器下载，弱网时下载慢或失败，接收机退化为冷启动。同时 Wi-Fi/基站定位查位置数据库也需要数据连接（Android 官方对 NETWORK_PROVIDER 的原话是 may require a data connection）。两条通道同时劣化，系统只能干等，应用侧的超时计时器先到。",
            bonus:
              "A-GPS 辅助数据不只是省时间：粗略位置先验能显著缩小卫星搜索窗口，降低首次解算的算力与功耗。",
          },
          {
            depth: 4,
            q: "低电量模式下定位会发生什么？系统层面动了哪些手脚？",
            intent:
              "考察对系统省电策略的具体认知——能否说出上电限制、节流、保守扫描三层动作，而不是只答「变慢」。",
            a: "三层动作。一是硬件上电限制：系统把定位硬件当最贵耗电项，尽量不给 GPS 上电、优先用网络定位与缓存——Apple 能效指南的原话是「请求更高精度会点亮额外硬件」，省电模式自然把这类请求档位调低。二是节流：Android Doze 下后台位置每小时只计算和交付几次。三是保守扫描：Android 明确「连着同一个 AP 时不再计算位置更新」。净效果是定位响应显著变长或被降级，iOS 侧还可能直接静默暂停（pausesLocationUpdatesAutomatically）——表现为回调再也不来而非报错，应用层必须有超时兜底。",
            bonus:
              "区分两类「不动」：code=3 超时是「还在等」，静默暂停是「不再给」——前者靠放宽 timeout 缓解，后者只能靠用户干预（关闭省电模式/换环境）。",
          },
          {
            depth: 4,
            q: "你的 H5 页面能知道这次定位用的是 GPS 还是北斗吗？这会影响代码怎么写吗？",
            intent:
              "收束题：检验「多星座融合对调用方透明」与「关注点分离」两层理解，筛掉试图在应用层干预星座选择的人。",
            a: "不能知道，也不需要知道。多星座芯片把 GPS/北斗/GLONASS/Galileo 的观测值放进同一个滤波解算，输出一个按 WGS-84 语义表达的位置解，系统 API 与浏览器 Geolocation 都不暴露星座信息——不存在「选择用哪个星座」的 API。北斗的 CGCS2000 与 WGS-84 有厘米级框架差，比手机 3~10 米的定位噪声小两个数量级，应用层视作同一坐标系。卫星星座影响的是定位快慢与成败（发生概率），不是你的代码逻辑。",
            bonus:
              "真要感知信号条件，唯一窗口是返回的 accuracy 字段（置信半径）与 timestamp——用结果反推质量，而不是猜信号源。这是定位质量监控的通用做法。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么 GPS 坐标丢到高德地图会偏几百米？",
            to: "/note/frontend/browser/positioning/map-coordinate-systems",
            description:
              "定位拿到了坐标，但这个坐标是什么系的？三层坐标系生态是打卡/围栏类业务的第一大坑。",
          },
        ]}
      />
    </NoteShell>
  );
}
