import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Checklist, FlowChart } from "@/components/demo";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        典型场景：H5 页面嵌在 App 的 WebView 里做定位打卡，5
        秒超时在正常网络下能过，弱网/低电量下稳定失败。 根因是
        <strong>用固定 5 秒的刚性假设去等一个弹性系统</strong>
        ：弱网时 A-GPS 辅助数据拿不到、Wi-Fi/基站查库失败，低电量时系统限制 GPS
        上电、节流交付——两条定位通道同时变慢，5 秒内无解。修复四板斧：
        <strong>
          error.code 先分诊（1 权限 / 2 不可用 / 3 超时）；打卡场景把 enableHighAccuracy 设为
          false；用 maximumAge 接受缓存；按 W3C 官方降级模式做「短超时快速失败 + 不限时重试」
        </strong>
        。架构级备选：绕开 WebView 定位，让原生层定位后经 postMessage 传给 H5。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "手机是怎么知道自己在哪的？",
            to: "/note/frontend/browser/positioning/geolocation-signals",
          },
          {
            title: "为什么 GPS 坐标丢到高德地图会偏几百米？",
            to: "/note/frontend/browser/positioning/map-coordinate-systems",
          },
        ]}
      >
        本文是前两篇知识的整合实战：失败路径涉及定位原理与系统省电策略，修复涉及坐标系的比对统一。
      </Prerequisite>

      <Heading level={2} title="失败路径完整推演" />
      <Paragraph>
        先看清楚「5 秒超时」在这条链路上量的是什么。W3C Geolocation 规范写明：浏览器自身不定位，
        「try to acquire position data from the underlying
        system」——浏览器向操作系统定位服务发起请求然后等待。 你的 timeout
        覆盖的是整条硬件链路的耗时：
      </Paragraph>

      <FlowChart
        label="超时失败路径 / timeout path"
        height={430}
        data={{
          direction: "TB",
          nodes: [
            { id: "h5", label: "H5: getCurrentPosition({ timeout: 5000 })", color: PALETTE.blue },
            { id: "webview", label: "WebView Geolocation 实现", color: PALETTE.blue },
            {
              id: "os",
              label: "系统定位服务（FusedProvider / CoreLocation）",
              color: PALETTE.purple,
            },
            {
              id: "weak",
              label: "弱网：A-GPS 退化为冷启动（几十秒起）；Wi-Fi/基站查库失败",
              color: PALETTE.orange,
            },
            { id: "saver", label: "低电量：限制 GPS 上电、节流位置交付", color: PALETTE.orange },
            { id: "timeout", label: "5 秒内无解 → error.code = 3 (TIMEOUT)", color: PALETTE.red },
            { id: "fail", label: "打卡失败", color: PALETTE.red },
          ],
          edges: [
            { source: "h5", target: "webview" },
            { source: "webview", target: "os" },
            { source: "os", target: "weak", label: "弱网" },
            { source: "os", target: "saver", label: "低电量" },
            { source: "weak", target: "timeout" },
            { source: "saver", target: "timeout" },
            { source: "timeout", target: "fail" },
          ],
        }}
      />

      <Paragraph>
        正常网络 + 正常电量下为什么能过？系统大概率有<strong>热启动条件</strong>
        （最近刚定过位、星历还有效）或可用的缓存位置，几秒内返回 ——激进的 5
        秒设置被平时的高速掩盖了，只在系统弹性变差的时刻现出原形。这类「平时好好的」bug 的共性：
        <strong>代码假设了下层延迟有上界，而下层从未承诺过</strong>。
      </Paragraph>

      <Heading level={2} title="第一步：error.code 分诊" />
      <Paragraph>
        排查任何定位失败，第一步都是看 <code>GeolocationPositionError.code</code>
        ——三种错误码对应三个完全不同的责任域，解法互不相通。据 W3C 规范 §10.1：
      </Paragraph>

      <Table
        label="错误码分诊 / error codes"
        head={["code", "常量", "含义", "责任域与下一步"]}
        rows={[
          [
            "1",
            "PERMISSION_DENIED",
            "用户/系统拒绝授权，或页面运行在非安全上下文（规范 §6.5：非 HTTPS 直接回调此错误）",
            "查 WebView 权限闸门（见下节）：宿主 App 权限、setGeolocationEnabled、onGeolocationPermissionsShowPrompt、HTTPS",
          ],
          [
            "2",
            "POSITION_UNAVAILABLE",
            "采集失败：定位服务拿不到位置",
            "信号/硬件问题：室内、无 Wi-Fi 无基站；或系统定位服务本身异常。换环境验证，考虑原生定位通道",
          ],
          [
            "3",
            "TIMEOUT",
            "在 timeout 期限内系统没能返回位置",
            "时间预算问题：调 maximumAge、enableHighAccuracy、超时降级重试（本文主战场）",
          ],
        ]}
      />

      <SpecQuote source="W3C Geolocation §7.2">
        The time spent waiting for the document to become visible and for obtaining permission to
        use the API is not included in the period covered by the timeout
        member——等待文档可见与获取授权的时间不计入 timeout，计时只从开始采集位置算起；timeout 设 0
        会立即失败，不传时默认 0xFFFFFFFF（无穷大）。
      </SpecQuote>

      <Heading level={2} title="三个选项的真实语义" />
      <Paragraph>
        <code>PositionOptions</code> 的三个成员各有容易望文生义的坑（规范 §7）：
      </Paragraph>

      <Table
        label="PositionOptions 语义 / options"
        head={["选项", "默认值", "真实语义", "打卡场景建议"]}
        rows={[
          [
            "enableHighAccuracy",
            "false",
            "只是「提示」：请求更高精度，实现可以忽略。规范原文警告它可能导致响应变慢或功耗增加",
            "设 false：50~100 米精度足够，走网络定位快且省电，对低电量模式友好——单点收益最大的改动",
          ],
          [
            "timeout",
            "0xFFFFFFFF",
            "采集位置的最长等待毫秒数；不含授权与文档可见等待；0 立即失败",
            "首次 5~8 秒快速失败，配合降级重试（见下）",
          ],
          [
            "maximumAge",
            "0",
            "愿意接受多老（毫秒）的缓存位置；默认 0 表示必须现取",
            "设 30000（30 秒）：打卡对实时性要求不高，缓存命中可秒回",
          ],
        ]}
      />

      <Callout kind="tip" title="缓存命中的隐藏条件">
        规范要求缓存位置的 <code>[[isHighAccuracy]]</code> 内部槽必须与本次请求的
        <code>enableHighAccuracy</code> 一致才可复用：之前用 true 定过位，现在用 false
        请求，缓存不通用。 两个选项要配套定，别一边要缓存一边切换精度档位。
      </Callout>

      <Heading level={2} title="WebView 的五道权限闸门" />
      <Paragraph>
        WebView 里 H5 定位比浏览器多几道闸门。以 Android
        官方文档（WebSettings.setGeolocationEnabled、
        WebChromeClient.onGeolocationPermissionsShowPrompt）为准，网页能用 Geolocation API
        必须同时满足：
      </Paragraph>

      <List
        ordered
        items={[
          <>
            宿主 App 自身拥有 <code>ACCESS_FINE_LOCATION</code> /{" "}
            <code>ACCESS_COARSE_LOCATION</code> 权限，且用户在系统设置里已授予；
          </>,
          <>
            <code>WebView.setGeolocationEnabled(true)</code> 已设置；
          </>,
          <>
            实现了 <code>WebChromeClient.onGeolocationPermissionsShowPrompt</code>{" "}
            并正确回调授权结果；
          </>,
          <>
            页面运行在<strong>安全上下文</strong>（HTTPS）——W3C 规范 §6.5 明确非安全上下文直接回调
            PERMISSION_DENIED，Chromium 内核（Chrome/WebView 50 起）严格执行；
          </>,
          <>App 在前台——后台时系统节流或拒绝定位。</>,
        ]}
      />

      <Paragraph>
        <strong>任何一环松动，表现都是 H5 里拿不到或超时。</strong>
        特别注意第 1 条与第 5 条的组合：WebView 里页面的定位权限「寄生」在宿主 App
        上——用户在系统设置里把 App 定位权限改成「仅使用期间」或「模糊定位」，H5
        完全感知不到区别，只会表现为成功或失败。 iOS 的 WKWebView 同理但闸门不同：宿主必须配好{" "}
        <code>NSLocationWhenInUseUsageDescription</code> 并获得授权，且 iOS 13 起 WKWebView
        还要求宿主实现 WKUIDelegate 的网页定位授权回调 （
        <code>webView:requestGeolocationPermissionFor:initiatedByFrame:decisionHandler:</code>
        ）——回调没实现或直接拒绝，网页侧拿到的就是 PERMISSION_DENIED。 uni-app 的 web-view
        组件内嵌的就是系统 WebView，以上闸门全部适用。
      </Paragraph>

      <MemoryCard keyword="先分诊，再动手" color={PALETTE.orange}>
        code=1 查权限闸门（App 配置/系统设置/HTTPS），code=2 查信号与系统服务，code=3
        查时间预算与缓存策略 ——三种失败的解法互不相通，混着试只会浪费时间。
      </MemoryCard>

      <Heading level={2} title="修复：官方降级模式" />
      <Paragraph>
        W3C 规范自带的示例代码就是这个策略——<strong>短超时探缓存 + 失败后不限时重试</strong>：
        先给一次快速机会（5~8 秒，可能命中缓存或热启动），超时后自动发起一次不限时的请求慢慢等，
        同时把「正在尽力定位」反馈给用户，而不是直接报错。对照常见的错误实现：
      </Paragraph>

      <DoDont
        label="超时策略对错 / timeout strategy"
        dont={{
          code: `// 只做前半段：5 秒放弃
navigator.geolocation.getCurrentPosition(
  onOk,
  (err) => alert("定位失败，请重试"), // 把用户推进死循环
  { timeout: 5000 }
);`,
          note: "弱网/低电量下系统就是慢，重试 100 次也是 3 秒超时——固定短超时 + 直接报错 = 把弹性系统的失败转嫁给用户",
        }}
        do={{
          code: `// 短超时快速失败 → 不限时重试 → 才提示
navigator.geolocation.getCurrentPosition(
  onOk,
  (err) => {
    if (err.code === 3) { // TIMEOUT：降级重试
      navigator.geolocation.getCurrentPosition(
        onOk,
        showManualFallback, // 二次失败才引导手动处理
        { enableHighAccuracy: false, maximumAge: 30000 }
      );
    } else {
      showManualFallback(err); // code 1/2 走各自分诊
    }
  },
  { timeout: 5000, maximumAge: 30000, enableHighAccuracy: false }
);`,
          note: "W3C 规范示例同款：快速失败保交互体验，静默重试保成功率；重试时放宽缓存与精度档位，把等待交给时间而不是用户",
        }}
      />

      <Paragraph>
        配合两句工程提醒：其一，重试期间给用户明确的进行中状态（转圈 +
        文案「正在获取位置，信号可能较弱」），
        不限时重试最怕的是用户以为卡死而杀掉页面；其二，业务侧兜底——打卡类业务可提供「手动选择位置 /
        拍照打卡」降级路径， 把定位从硬阻塞变成软增强。
      </Paragraph>

      <Heading level={2} title="架构级备选：原生定位通道" />
      <Paragraph>
        既然宿主是 uni-app，可以绕开 WebView 定位：H5 通过 postMessage 通道请求原生层调{" "}
        <code>uni.getLocation</code>，拿到坐标后传回 H5。原生通道的三个结构性优势：
        权限链短（原生直连系统定位，不经过 WebView 的五道闸门）；策略可控（SDK
        自带多源融合、缓存与重试，超时由原生自定，不受 W3C timeout 语义约束）；输出可选（
        <code>type</code> 参数直接指定 wgs84/gcj02，省掉 H5
        侧的一次转换）。代价是多一次跨端通信与两端坐标系的一致性管理。
      </Paragraph>

      <Paragraph>
        落地时的通信协议建议做成「请求-响应」式：H5 发{" "}
        <code>{`{ type: 'requestLocation', reqId }`}</code> → 原生调 <code>uni.getLocation</code> →
        原生回 <code>{`{ reqId, coordType, lat, lon, accuracy, timestamp }`}</code>
        。reqId 配对避免并发请求串扰；<code>coordType</code>{" "}
        显式标注坐标系（这是坐标系篇的核心原则——输出可能变化时元数据随值传递）；
        <code>accuracy</code> 透传让业务侧能判断「这次定位能不能用」。原生侧还能做 H5
        做不到的事：持续缓存最近一次定位、App 启动时预热定位权限、失败时按 SDK 错误码精细化重试。
      </Paragraph>

      <CompareTable
        label="两种定位通道 / channels"
        left={{ title: "WebView 内 Geolocation", color: PALETTE.purple }}
        right={{ title: "原生层 uni.getLocation", color: PALETTE.green }}
        rows={[
          {
            aspect: "权限链",
            left: "五道闸门缺一不可，权限寄生在宿主 App",
            right: "原生直连系统定位，链路短、可控",
          },
          {
            aspect: "超时控制",
            left: "受 W3C timeout 语义约束，浏览器实现差异大",
            right: "SDK 自带融合与重试策略，超时可自定",
          },
          {
            aspect: "输出坐标系",
            left: "恒定 WGS-84",
            right: "type 参数可选 wgs84/gcj02（gcj02 走腾讯定位 SDK）",
          },
          {
            aspect: "改造成本",
            left: "零改造，调参数即可",
            right: "跨端通信 + 双端联调 + 坐标系约定",
          },
        ]}
      />

      <Callout kind="tip" title="决策建议">
        先做参数级修复（enableHighAccuracy / maximumAge /
        降级重试），观察线上失败率；仍然高频失败再上原生通道
        ——架构改造的收益确定性高，但联调成本也是实打实的。
      </Callout>

      <Heading level={2} title="排查清单" />
      <Paragraph>
        接手一个「WebView 定位失败」工单，按下面的顺序走一遍，绝大多数问题能在一轮内定位：
      </Paragraph>

      <Checklist
        title="WebView 定位排查清单"
        items={[
          {
            text: "先看 error.code：1 / 2 / 3 分别走权限、信号、时间预算三条线",
            note: "分诊是第一步，别混着试",
          },
          {
            text: "code=1：确认宿主 App 有定位权限且用户已授予（系统设置里验证）",
            note: "iOS 查 NSLocationWhenInUseUsageDescription；Android 查 ACCESS_*_LOCATION",
          },
          {
            text: "code=1：确认 WebView.setGeolocationEnabled(true) 且实现了 onGeolocationPermissionsShowPrompt",
            note: "Android 专属闸门，漏回调 = 静默失败",
          },
          {
            text: "code=1（iOS）：确认 WKUIDelegate 实现了网页定位授权回调（iOS 13+）",
            note: "iOS 专属闸门，缺失即 PERMISSION_DENIED",
          },
          {
            text: "code=1：确认页面是 HTTPS——非安全上下文直接拒绝（W3C 规范 §6.5）",
            note: "本地调试用 chrome://inspect 看真实 URL",
          },
          {
            text: "code=2：换到开阔地带/关闭省电模式复测，排除信号与系统节流",
            note: "室内 + 低电量是最恶劣组合",
          },
          {
            text: "code=3：enableHighAccuracy 改 false、maximumAge 加 30 秒，重测",
            note: "打卡场景通常不需要 GPS 级精度",
          },
          { text: "code=3：实现短超时 + 不限时重试的降级模式", note: "W3C 规范示例同款策略" },
          {
            text: "坐标拿到后：确认上报坐标系与围栏/门店坐标系一致",
            note: "WGS-84 vs GCJ-02，差 100~700 米——见坐标系篇",
          },
          {
            text: "仍高频失败：评估原生定位通道（uni.getLocation + postMessage）",
            note: "接口显式标注 coordType",
          },
        ]}
      />

      <Heading level={2} title="边界与陷阱" />
      <List
        items={[
          <>
            <strong>把所有失败都当超时修</strong>
            ——code=1 的权限拒绝和 code=2 的采集失败都被业务层笼统报成「定位失败」，于是反复调
            timeout 参数白白浪费时间；先打日志确认 code，三种错误的修法互不相通。
          </>,
          <>
            <strong>iOS 低电量模式下的静默暂停</strong>
            ——CoreLocation
            可能自动暂停位置更新（pausesLocationUpdatesAutomatically），表现为「回调再也不来」
            而非报错；界面要有超时兜底提示，不能死等。
          </>,
          <>
            <strong>visibility state 阻塞</strong>
            ——W3C 规范要求文档可见才继续定位流程：页面藏在后台 tab 或 WebView
            被前台覆盖时，请求会挂起等待可见。 「切到后台再回来才发现定位才开始」就是它。
          </>,
          <>
            <strong>iframe 里 geolocation 被默认禁用</strong>
            ——第三方上下文需要显式 <code>allow="geolocation"</code>；嵌套 H5
            中转页是隐蔽的失败场景。
          </>,
        ]}
      />

      <QAChain
        intro="五问按「现象归因 → 规范语义 → 平台细节 → 架构决策」递进，全部源自真实工单场景。"
        items={[
          {
            depth: 2,
            q: "定位报错 code=3 TIMEOUT，把 timeout 从 5000 改成 15000 就一定有效吗？",
            intent: "热身：检验是否理解超时的本质是系统响应时间的分布，而不是参数大小。",
            a: "不一定。timeout 放宽只是扩大了「系统弹性响应」的接受窗口——弱网冷启动动辄几十秒，15 秒可能仍不够；低电量模式下系统可能节流到每小时只交付几次，调多大都没用。正确姿势是把短超时当「快速失败阈值」，超时后走不限时重试 + 用户提示的降级链路，同时配合 maximumAge 用缓存先满足业务。单一调大 timeout 只是碰运气。",
          },
          {
            depth: 3,
            q: "enableHighAccuracy: true 和 false 到底差在哪？为什么打卡场景建议 false？",
            intent: "考察三选项语义中最容易望文生义的一个：它是提示不是命令，且影响缓存复用。",
            a: "语义上它只是请求更高精度的提示，实现可以忽略；实际效果是要求系统给 GNSS 硬件上电（慢、耗电、室内基本失败），false 则走 Wi-Fi/基站网络定位（快、省电）。规范原文明确警告 true 可能导致响应变慢或功耗增加。打卡判定半径通常几十到几百米，50~100 米的网络定位精度完全够用——换来的却是秒级响应和对低电量模式的友好。额外注意：缓存位置只有 [[isHighAccuracy]] 与本次请求一致才可复用，切来切去会把 maximumAge 变成摆设。",
            bonus:
              "真需要高精度的场景（如轨迹记录）更稳妥的做法是 watchPosition 持续观察，用 accuracy 字段过滤低质量读数，而不是单次请求赌运气。",
          },
          {
            depth: 4,
            q: "用户说「App 里 H5 定位一直失败」，但同一页面在手机浏览器里正常。你的排查顺序？",
            intent: "实战主战场：WebView 独有的权限链问题，检验「环境差异 → 闸门清单」的排查素养。",
            a: "浏览器正常说明页面代码没问题，问题必然在 WebView 环境差集上，按五道闸门顺序查：① 宿主 App 是否声明并获授 ACCESS_*_LOCATION（iOS 查 NSLocationWhenInUseUsageDescription）——最常见，尤其用户把 App 权限设为「模糊定位」或「仅使用期间」后；② WebView.setGeolocationEnabled(true) 是否设置；③ WebChromeClient.onGeolocationPermissionsShowPrompt 是否实现并正确回调——漏掉回调表现为静默失败；④ iOS 13+ 还要查 WKUIDelegate 的网页定位授权回调；⑤ 页面是否 HTTPS（非安全上下文规范级直接拒绝）；⑥ 失败时 App 是否在前台。全程先打 error.code：code=1 走这条线，code=2/3 另行分诊。",
            bonus:
              "Android 可用 chrome://inspect 远程调试 WebView 里的页面，直接看 geolocation 调用的真实报错——比用户口述「定位不了」高效得多。",
          },
          {
            depth: 4,
            q: "W3C 规范里 timeout 为什么不包含授权等待时间？这个设计会制造什么现象？",
            intent:
              "规范语义题：能否从规范设计意图推回用户可感知的行为，区分背文档和理解设计的人。",
            a: "规范原文：等待文档可见和获取权限的时间不计入 timeout，计时只从开始采集位置算起。设计意图：授权是用户交互（可能几分钟才决定），把它算进技术超时会让「用户第一次使用就被报超时」，把系统延迟和用户犹豫混为一谈。制造的现象：首次授权弹窗停留期间页面不会开始计时——如果你在授权回调前自己起了 5 秒的 setTimeout 做兜底，它可能在规范意义上的 timeout 之前就触发，出现「我自己的超时先报错、回调后又成功」的双报错。所以业务层的兜底计时器要在收到首个成功/失败回调后再评估，或者干脆依赖规范的 timeout 而不是自建。",
          },
          {
            depth: 5,
            q: "如果把定位从 WebView 迁到原生层，坐标传递链上最大的新风险是什么？怎么设计接口消解它？",
            intent:
              "收束题：架构迁移的权衡——能否预判「换一层就引入新歧义」并给出坐标系元数据的接口设计。",
            a: "最大风险是坐标系歧义转移：WebView Geolocation 恒定 WGS-84（无歧义本身就是一种约定），原生通道则输出可变——uni.getLocation 的 type 决定走系统定位（wgs84）还是腾讯 SDK（gcj02），高德 SDK 甚至国内 GCJ-02、海外 WGS-84 同一接口两种输出。一旦两端对「这次给的是什么系」理解不一致，就会出现双重转换或漏转换，误差百米级。消解设计：接口显式携带坐标系元数据（coordType: 'wgs84' | 'gcj02'），接收方按字段分派转换逻辑而不是假设恒定；服务端统一转换收敛到唯一环节；跨端消息与上报接口全链路透传该字段。高德的 getCoordType() 和 uni-app 的 type 参数都是同一设计思想的现成参照。",
            bonus:
              "顺带补一条：原生通道返回的 accuracy 字段同样要透传给 H5——它是业务侧判断「这次定位能不能用」的唯一依据，丢掉它业务侧就只能盲收。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "GCJ-02 是不可逆的加密算法吗？",
            to: "/note/frontend/browser/positioning/gcj02-algorithm",
            description: "清单第 9 步的深挖：转换方向的数学与误差量级。",
          },
          {
            title: "手机是怎么知道自己在哪的？",
            to: "/note/frontend/browser/positioning/geolocation-signals",
            description: "弱网/低电量为什么拖慢定位：信号源融合与 TTFF 的原理层解释。",
          },
        ]}
      />
    </NoteShell>
  );
}
