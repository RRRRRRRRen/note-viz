import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  LayerStack,
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
        因为<strong>坐标系不一致</strong>。GPS/北斗芯片和手机系统 API（Android Location、iOS
        CLLocation、浏览器 Geolocation）输出的都是
        WGS-84；而高德、腾讯地图依据中国测绘法规在地图数据上使用了 GCJ-02
        加偏坐标——同一个物理位置两套数值相差 100~700 米。规则用一句话收拢：
        <strong>
          系统 API 输出 WGS-84（测量数据，不加偏）；地图厂商用 GCJ-02（地图数据，依法加偏）；百度在
          GCJ-02 之上二次加偏成 BD-09（实测再叠约 900 米）
        </strong>
        。涉及真实位置与地图位置比对时（打卡、围栏、轨迹），先问「这个坐标是什么系的」，再谈计算。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "手机是怎么知道自己在哪的？",
            to: "/note/frontend/browser/positioning/geolocation-signals",
          },
        ]}
      >
        本文讨论「拿到坐标之后」的事：坐标系在哪一层被改变、各通道分别输出什么系。定位本身怎么发生见前置笔记。
      </Prerequisite>

      <Heading level={2} title="三层坐标系全景" />
      <Paragraph>
        坐标系的分野不在「哪个 App」，而在<strong>产业链层级</strong>
        。从卫星到地图瓦片，整条数据链上坐标值本身原样透传，只在一个环节被改变——地图数据层，且只在中国境内生效：
      </Paragraph>

      <LayerStack
        label="坐标系三层全景 / coordinate layers"
        title="自上而下：坐标只在第三层被加偏，且仅中国境内"
        layers={[
          {
            name: "物理层：卫星星座",
            desc: "GPS → WGS-84 语义；北斗 → CGCS2000 语义（两者厘米级等价）；芯片内部融合归一",
            color: PALETTE.blue,
          },
          {
            name: "系统层：OS 定位 API",
            desc: "Android Location / iOS CLLocation / 浏览器 Geolocation → 全部按 WGS-84 输出（测量数据，不加偏）",
            color: PALETTE.green,
            emphasis: true,
          },
          {
            name: "地图层：厂商数据",
            desc: "高德/腾讯/谷歌境内街道图 → GCJ-02；百度 → BD-09（GCJ-02 之上二次加偏，实测再叠约 900 米）；OSM/谷歌境外 → WGS-84",
            color: PALETTE.orange,
          },
        ]}
      />

      <Paragraph>
        为什么系统层不加偏？GCJ-02 的法规要求针对的是<strong>地图发布行为</strong>
        （在中国境内向社会公众提供的电子地图必须使用加偏坐标），而系统定位 API
        输出的是「传感器测量数据」，不构成地图服务。依据 Android 官方 API 文档：
        <code>getAltitude()</code> 的海拔「above the WGS84 reference ellipsoid」，
        <code>distanceTo()</code>
        的距离「defined using the WGS84 ellipsoid」——整个 <code>LocationManager</code> 文档从未出现
        GCJ-02 字样，AOSP 源码中距离计算的常量就是 WGS-84 椭球参数（a=6378137.0，b=6356752.3142）。
        分工由此确定：芯片和系统层给物理事实，地图厂商层依法加偏，转换成本落在业务层。
      </Paragraph>

      <SpecQuote source="W3C Geolocation §1.1 / §9.1">
        The geographic position information is provided in terms of World Geodetic System
        coordinates [WGS84]——浏览器 Geolocation API 的纬度、经度、海拔全部显式声明为 WGS-84 坐标系。
      </SpecQuote>

      <MemoryCard keyword="一句话分工" color={PALETTE.green}>
        系统 API = WGS-84（测量数据，不偏移）；地图厂商 SDK/瓦片 =
        GCJ-02（地图数据，依法加偏）；百度 = BD-09（GCJ-02
        之上二次加偏）。坐标值在系统层到地图层之间从不自动转换——
        <strong>变的是参照系，且只在地图层变</strong>。
      </MemoryCard>

      <Heading level={2} title="各通道输出速查" />
      <Paragraph>
        「获取经纬度」的具体通道决定输出坐标系。国内业务最常混淆的几条通道（均指国内定位，海外见下文）：
      </Paragraph>

      <Table
        label="定位通道输出 / channel output"
        head={["获取方式", "国内输出", "说明"]}
        rows={[
          [
            "系统 API（LocationManager / CLLocation / navigator.geolocation）",
            "WGS-84",
            "原始透传，恒定——恒定的输出从不标注坐标系",
          ],
          ["uni.getLocation({ type: 'wgs84' })", "WGS-84", "走系统定位"],
          [
            "uni.getLocation({ type: 'gcj02' })",
            "GCJ-02",
            "App 端走腾讯定位 SDK（uni-app 官方：type 值决定调用规则）",
          ],
          [
            "高德定位 SDK（AMapLocation）",
            "GCJ-02",
            "输出不恒定，SDK 提供 getCoordType() 运行时查询（见下节）",
          ],
          [
            "高德/腾讯坐标拾取器、地图 App 取点",
            "GCJ-02",
            "地图层数据，依法加偏——围栏/门店基准的最常见来源",
          ],
          [
            "百度地图拾取器/定位 SDK",
            "BD-09",
            "不是 GCJ-02！还原 WGS-84 需两步：BD-09 → GCJ-02 → WGS-84",
          ],
        ]}
      />

      <Paragraph>
        海外定位时多数通道回退 WGS-84：高德官方 FAQ
        明确「中国大陆、香港、澳门、台湾返回高德坐标系坐标；海外地区返回 WGS-84」；其余厂商 SDK
        的海外行为以各自文档为准，不要默认照搬。
        <strong>「输出坐标系随定位点位置变化」正是下一节 getCoordType() 设计的由来</strong>。
      </Paragraph>

      <Callout kind="warning" title="百度是 BD-09，不是 GCJ-02">
        在百度地图上框围栏/取点，拿到的是 BD-09 坐标——百度在 GCJ-02 之上又做了一次加偏（极坐标变换 +
        常量偏移），实测比 GCJ-02 再偏约 900 米（北京 890 / 上海 903 / 深圳 921）。要还原成 WGS-84
        必须走两步转换，漏掉第一步会残留数百米级偏差。
      </Callout>

      <Heading level={2} title="谷歌地图：一个国家两套坐标系" />
      <Paragraph>
        谷歌是特例中的特例：在中国大陆<strong>同时使用两套坐标系</strong>。街道/矢量图层自 2006
        年前后起与高德（AutoNavi）合作，依法使用 GCJ-02
        加偏数据；卫星影像图层来自谷歌自己的采集，不走中国测绘授权，保持
        WGS-84。两层叠加的结果是一个著名现象：境内打开谷歌地图切到卫星图层，道路相对影像整体错开几百米。
      </Paragraph>

      <Table
        label="取点工具坐标系 / picker reference"
        head={["取点入口", "坐标系", "还原 WGS-84 的路径"]}
        rows={[
          ["高德/腾讯坐标拾取器", "GCJ-02", "一步反解：GCJ-02 → WGS-84"],
          ["百度地图拾取器", "BD-09", "两步：BD-09 → GCJ-02 → WGS-84"],
          ["谷歌地图（境外）", "WGS-84", "不需要转"],
          ["谷歌地图（境内街道图层）", "GCJ-02", "一步反解，但图层歧义风险高"],
          ["谷歌 Earth / 境内卫星图层", "WGS-84", "不需要转"],
          ["OpenStreetMap", "WGS-84", "不需要转（数据来自 GPS 采集）"],
        ]}
      />

      <Callout kind="danger" title="在境内谷歌地图上取点是危险的">
        你框的点取决于参考的图层：贴街道图层点是 GCJ-02，贴卫星影像画是
        WGS-84，混合参考得到一批坐标系不一致的脏数据
        ——没有任何单一转换能修复。高德/腾讯/百度全图层统一坐标系，不存在此问题。
      </Callout>

      <Heading level={2} title="高德的设计启示：坐标系元数据随值传递" />
      <Paragraph>
        高德定位 SDK 是「输出坐标系不恒定」的活例子：国内（含港澳台）返回 GCJ-02，海外返回
        WGS-84。正因如此它提供了 <code>getCoordType()</code> 让调用方在运行时查询
        <strong>这一次</strong>定位是什么系，还有配套的 <code>isCoorCanUseInMap()</code>{" "}
        回答「这个坐标要不要转了才能上高德地图」。这是面对不确定性的正确姿势：
        <strong>当输出可能变化时，把坐标系元数据和坐标值一起传递</strong>，而不是靠全局约定。
      </Paragraph>

      <Paragraph>
        反面对照是系统 API：<code>android.location.Location</code> 从不标注坐标系，因为它恒定
        WGS-84——<strong>坐标系标注的存在与否，本身就暗示了输出是否恒定</strong>
        。把这个观察迁移到自己的接口设计上：涉及坐标传递的字段显式带上{" "}
        <code>coordType: "wgs84" | "gcj02"</code>，服务端按字段分派转换逻辑；uni-app 用{" "}
        <code>type</code> 参数消歧、高德用 <code>getCoordType()</code> 自查，都是同一设计思想——
        团队协作里最常见的坐标事故，源头就是「大家默认了一个从不写进接口文档的坐标系约定」。
      </Paragraph>

      <Heading level={2} title="距离计算的正确姿势：统一而非还原" />
      <Paragraph>
        一个方向性纠偏：「必须转成 WGS-84 才能计算」并不成立。距离计算真正要求的不是特定坐标系，而是
        <strong>两个点必须在同一个坐标系里</strong>
        。GCJ-02
        的偏移场在空间上变化极缓（相邻几百米内两点受到的偏移量几乎相同），同系内两点算距离时系统性偏移互相抵消，对结果几乎零影响。真正致命的只有一种情况：一个点在
        WGS-84、另一个在 GCJ-02。于是有两条等价路线：
      </Paragraph>

      <CompareTable
        label="转换方向两条路线 / unify direction"
        left={{ title: "路线 A：围栏转 WGS-84", color: PALETTE.purple }}
        right={{ title: "路线 B：读数转 GCJ-02（推荐）", color: PALETTE.green }}
        rows={[
          {
            aspect: "做法",
            left: "围栏配置时反解：BD-09/GCJ-02 → WGS-84，误差永久焊进围栏基准",
            right: "围栏保持原样存储；上报 WGS-84 正向转 GCJ-02 后比对",
          },
          {
            aspect: "转换误差",
            left: "反解是近似：米级残差（量级见 GCJ-02 算法篇）",
            right: "正向加偏是精确算法，零转换误差",
          },
          {
            aspect: "适用场景",
            left: "全系统已统一 WGS-84 且不便迁移",
            right: "新建系统，或围栏本身就来自国内地图取点",
          },
        ]}
      />

      <Paragraph>
        路线 B 在数学上更干净：正向算法公开且精确，反解永远是近似。实际工程更稳的做法是
        <strong>双坐标系冗余存储</strong>
        ——围栏配置时同时存原始值（BD-09/GCJ-02）和转换后的基准值，比对逻辑固定用一套并在代码注释里写死坐标系约定；换地图供应商时不需要重新框围栏。同一个坐标严禁转两次（wgs84→gcj02
        后又被地图 SDK 当 wgs84 再转一遍，偏移叠加）。
      </Paragraph>

      <MemoryCard keyword="统一而非还原" color={PALETTE.blue}>
        距离比对的前提是「同系」，不是「必须是
        WGS-84」。优先正向转换（精确、零误差），避免反解（近似、留残差）； 服务端统一转一次并标注
        coordType，严禁双重转换。
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <List
        items={[
          <>
            <strong>「高德坐标就是火星坐标」只对了一半</strong>
            ——高德在国内（含港澳台）输出 GCJ-02，海外输出 WGS-84；境外业务直接拿高德坐标当 GCJ-02
            处理会反向引入偏差。
          </>,
          <>
            <strong>accuracy 字段与坐标系无关</strong>
            ——<code>coords.accuracy</code>（95%
            置信半径，米）描述定位质量，不随坐标系转换而变，也不需要转换。
          </>,
          <>
            <strong>双端各转一次 = 双重加偏</strong>
            ——H5
            转一次、服务端又转一次是真实存在的工单场景：偏移叠加后误差可达千米级。转换收敛到一个环节（建议服务端）。
          </>,
          <>
            <strong>围栏基准的误差是永久的</strong>
            ——反解误差焊进围栏基准后，每一次比对都在重复它；读数侧的正向转换误差则是每请求独立的、可优化掉的。
          </>,
        ]}
      />

      <QAChain
        intro="五问沿「哪一层偏 → 谁输出什么 → 怎么统一」递进，后两问直接对应打卡/围栏类业务的高频工单。"
        items={[
          {
            depth: 2,
            q: "navigator.geolocation 拿到的经纬度是什么坐标系？",
            intent: "热身：这是所有坐标问题的起点，答错后面全错。",
            a: "WGS-84，且恒定。W3C Geolocation 规范 §1.1 与 §9.1 明确：地理坐标按 WGS84 坐标系提供；它透传系统定位服务的结果（系统层不做加偏），无论页面跑在浏览器还是 WebView。对国内业务来说它是「最省心的 WGS-84 来源」——不需要怀疑、不需要配置，也正因如此，它和高德系的围栏/门店坐标比对前必须先转 GCJ-02。",
            bonus:
              "海拔（altitude）同样是 WGS-84 椭球高——若业务同时用海拔，它和经纬度是同一参照系，不存在混用问题。",
          },
          {
            depth: 3,
            q: "为什么系统 API 不直接输出 GCJ-02，让开发者省一次转换？",
            intent:
              "考察法规与架构分层的关系——能否说清「加偏是地图发布行为的合规要求」而非技术选择。",
            a: "因为 GCJ-02 的强制范围是「在中国境内向社会公众提供电子地图」——加偏发生在地图数据层，是地图发布行为的合规义务。系统定位 API 输出的是传感器测量数据，不构成地图服务，法律上没有加偏义务；技术上保持 WGS-84 透传也让系统层保持中立（不绑定任何地图厂商）。所以分工是：芯片/系统层给物理事实，地图厂商层依法加偏——转换成本落在业务层，是分层的代价而非缺陷。",
          },
          {
            depth: 3,
            q: "在百度地图上框了四个围栏点，这些点是什么坐标系？怎么变成代码里能算的坐标？",
            intent: "经典坑位：检验是否知道百度是 BD-09 而非 GCJ-02，以及两步还原链条。",
            a: "是 BD-09——百度在 GCJ-02 之上做了二次加偏（极坐标变换 + 常量偏移），实测比 GCJ-02 再偏约 900 米。还原链条是两步：BD-09 → GCJ-02 → WGS-84，漏掉第一步会残留数百米级偏差。但更优的方向是反过来：不还原围栏，把员工上报的 WGS-84 正向转成围栏所在坐标系再算距离——正向加偏是精确算法，反解是近似。距离计算只要求「两点同系」，不要求特定坐标系。",
            bonus:
              "双坐标系冗余存储：围栏同时存 BD-09 原始值与转换后的基准值，换地图供应商时无需重新框围栏。",
          },
          {
            depth: 4,
            q: "为什么谷歌地图在中国境内切到卫星图层，道路会和影像错开几百米？这暴露了什么风险？",
            intent:
              "区分度题：知道谷歌双图层策略的人不多，答出「图层歧义导致脏数据」说明真正理解坐标系一致性。",
            a: "境内谷歌地图的街道/矢量图层与高德合作（2006 年前后起），依法使用 GCJ-02；卫星影像来自谷歌自己的采集，不走中国测绘授权，保持 WGS-84。两层各说各话，叠加显示就错开。风险在取点环节：在同一张谷歌地图上框围栏，贴街道图层点是 GCJ-02、贴卫星影像点是 WGS-84——混合参考产生坐标系不一致的脏数据，没有任何单一转换能修复。取点应使用全图层统一坐标系的地图（高德/腾讯/百度）。",
            bonus:
              "Google Earth 只有卫星影像，所以境内查坐标它是 WGS-84 的——这是排除图层歧义的一个旁证工具。",
          },
          {
            depth: 4,
            q: "打卡系统里员工坐标 WGS-84、围栏坐标 GCJ-02，为什么建议把员工坐标转成 GCJ-02，而不是把围栏反解成 WGS-84？",
            intent:
              "收束题：综合转换方向、误差位置、工程成本三个维度做决策——面试官想听到「误差焊死在哪个环节」的权衡。",
            a: "三个理由。误差性质：正向 wgs2gcj 是公开的精确算法，零转换误差；反解 gcj2wgs 是近似，留下米级残差（量级与实测见 GCJ-02 算法篇）。误差位置：围栏反解把误差永久焊进基准，之后每次比对都在重复；读数正向转换不引入任何残差。工程成本：正向算法本地即可计算，反解质量依赖实现；且高德官方转换接口只提供正向（gps/mapbar/baidu → 高德），合规渠道本就鼓励正向。距离计算真正要求的是两点同系——GCJ-02 偏移场变化平缓，同系内系统性偏移互相抵消。",
            bonus:
              "服务端收到上报后统一转换并写 coordType 字段，是团队协作里消歧的通用解——uni-app 用 type 参数、高德 SDK 用 getCoordType() 都是同一设计思想。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "GCJ-02 是不可逆的加密算法吗？",
            to: "/note/frontend/browser/positioning/gcj02-algorithm",
            description: "加偏的数学本体：正弦扰动、椭球曲率修正，以及为什么「反解」只能逼近。",
          },
          {
            title: "WebView 里 H5 定位超时怎么排查与修复？",
            to: "/note/frontend/browser/positioning/webview-geolocation-timeout",
            description: "坐标之外的另一类失败：拿不到坐标本身。权限链与超时降级的完整实战。",
          },
        ]}
      />
    </NoteShell>
  );
}
