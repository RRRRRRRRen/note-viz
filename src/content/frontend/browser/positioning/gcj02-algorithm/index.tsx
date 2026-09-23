import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeAnnotate, PlayGround } from "@/components/demo";
import {
  Callout,
  CompareTable,
  CrossRef,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

const offsetDemoCode = `// 在中国境内的任意一点试试：WGS-84 → GCJ-02 加偏
// 换成境外坐标（如东京 35.6762, 139.6503）会原样返回
const wgsLat = 39.90923, wgsLon = 116.39722; // 北京 WGS-84

const pi = 3.14159265358979324;
const a = 6378245.0;               // 克拉索夫斯基椭球长半轴（米）
const ee = 0.00669342162296594323; // 第一偏心率平方

const outOfChina = (lat, lon) =>
  lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;

// 正弦扰动函数：纬度与经度各一个，互相耦合（都接收 x、y）
function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y
    + 0.2 * Math.sqrt(Math.abs(x))                     // 根号项：在 x=0 处不可导
    + (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2 / 3
    + (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2 / 3
    + (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2 / 3;
  return ret;
}

function transformLon(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y
    + 0.1 * Math.sqrt(Math.abs(x))
    + (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2 / 3
    + (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2 / 3
    + (150.0 * Math.sin(x / 12.0 * pi) + 300 * Math.sin(x / 30.0 * pi)) * 2 / 3;
  return ret;
}

// 扰动量（近似米）+ 椭球曲率修正换算成度
function delta(lat, lng) {
  const x = lng - 105.0, y = lat - 35.0;   // 以 (105E, 35N) 为扰动原点
  let dLat = transformLat(x, y);
  let dLon = transformLon(x, y);
  const radLat = lat / 180.0 * pi;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;          // 椭球修正因子
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sq)) * pi);
  dLon = (dLon * 180.0) / ((a / sq) * Math.cos(radLat) * pi);
  return [dLat, dLon];
}

function wgs84ToGcj02(lat, lon) {
  if (outOfChina(lat, lon)) return [lat, lon];  // 境外不加偏
  const [dLat, dLon] = delta(lat, lon);
  return [lat + dLat, lon + dLon];
}

// 两点球面距离（Haversine，米）
const dist = (la1, lo1, la2, lo2) => {
  const r = x => x * pi / 180, R = 6371000;
  const h = Math.sin(r(la2 - la1) / 2) ** 2 +
    Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const [gcjLat, gcjLon] = wgs84ToGcj02(wgsLat, wgsLon);
console.log("GCJ-02:", gcjLat.toFixed(6), gcjLon.toFixed(6));
console.log("偏移量（米）:", dist(wgsLat, wgsLon, gcjLat, gcjLon).toFixed(1));`;

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        不是。GCJ-02（「火星坐标」）没有官方公开算法文档，但它不是密码学意义上的加密——是一个
        <strong>确定性数学函数</strong>：以 (105°E, 35°N) 为原点的正弦 +
        多项式非线性扰动，叠加克拉索夫斯基椭球的曲率修正。 正向转换（WGS-84 →
        GCJ-02）人人可算、结果精确；反解（GCJ-02 → WGS-84）没有解析逆，只能近似——
        实测简单减法在北京点残差 0.08 米（社区实现标注的跨区域上界是 1~2
        米），迭代逼近可压到毫米级；而
        <strong>高德官方接口只提供正向</strong>
        （合规原因，不是技术做不到）。设计目标不是让人解不开，而是让「不经授权的精确坐标还原」在法律层面不合规。实测加偏量级：北京约
        555 米、上海约 481 米、深圳约 606 米。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么 GPS 坐标丢到高德地图会偏几百米？",
            to: "/note/frontend/browser/positioning/map-coordinate-systems",
          },
        ]}
      >
        本文拆解 GCJ-02 偏移的数学本体。三系分工与「统一而非还原」的工程原则见前置笔记。
      </Prerequisite>

      <Heading level={2} title="先破除四个误解" />
      <Paragraph>
        这一点理解错了，后面全错。GCJ-02 的「加密」是俗称，准确叫法是<strong>非线性加偏算法</strong>
        ：
      </Paragraph>

      <CompareTable
        label="误解澄清 / misconceptions"
        left={{ title: "常见误解", color: PALETTE.red }}
        right={{ title: "事实", color: PALETTE.green }}
        rows={[
          {
            aspect: "算法性质",
            left: "密码学加密，不可逆",
            right: "确定性数学函数，正向人人可算",
          },
          {
            aspect: "偏移是否随机",
            left: "每台设备/每次偏移不同",
            right: "同一坐标任何人任何时间算出的偏移完全相同",
          },
          {
            aspect: "偏移量形态",
            left: "一个固定偏移量，减掉即可",
            right: "随位置非线性变化，无法用常数或线性变换抵消",
          },
          {
            aspect: "官方文档",
            left: "有公开标准可查",
            right: "从未公开；公开实现全部来自逆向工程（如 eviltransform），各语言实现一致",
          },
        ]}
      />

      <SpecQuote source="高德开放平台 FAQ">
        「高德开放平台服务用的是国测局规定的 GCJ-02
        坐标系……是在（WGS-84）基础上进行了加密」——官方对加偏事实的确认；
        算法细节官方从未发布，社区最广泛使用的开源实现是
        googollee/eviltransform（Go/C/JS/Swift/Python 各语言实现相互一致）。
      </SpecQuote>

      <Heading level={2} title="算法解剖" />
      <Paragraph>
        整个算法只有三个常量、两个扰动函数、一次单位换算。先完整看一遍代码（自包含，可改坐标直接跑），
        再逐段拆解：
      </Paragraph>

      <PlayGround label="在线验证 / try it" code={offsetDemoCode} height={560} />

      <Paragraph>
        在中国境内，北京一点 (39.90923, 116.39722) 的真实运行结果：GCJ-02 坐标
        <code>(39.910633, 116.403464)</code>，偏移 <strong>554.9 米</strong>
        。把坐标换成东京，输出偏移 0.0 米——境外不加偏。下面按「常量 → 扰动 → 换算」三段拆解。
      </Paragraph>

      <Heading level={3} title="三个常量与境内判断" />
      <Paragraph>
        <code>a = 6378245.0</code> 是<strong>克拉索夫斯基 1940 椭球</strong>
        的长半轴（苏联推算的地球模型），<code>ee = 0.0066934216…</code> 是它的第一偏心率平方——注意
        GCJ-02 的换算建立在克拉索夫斯基椭球而非 GPS 的 WGS-84 椭球上（两者长半轴相差约 108
        米），这就是算法里会出现椭球曲率公式的原因。<code>outOfChina</code>{" "}
        用经纬度矩形框判断境内：境外坐标直接原样返回，GCJ-02 只是中国境内规则——在美国用 GPS
        坐标标境外地图不会偏。
      </Paragraph>

      <Heading level={3} title="核心：正弦扰动函数" />
      <Paragraph>
        <code>transformLat</code> / <code>transformLon</code>{" "}
        是偏移场的本体：多项式基底叠加多组不同频率的正弦。设计意图值得品——
        <strong>低频正弦</strong>（/12、/30）波长几百公里，制造偏移量在国土上的「大势起伏」；
        <strong>高频正弦</strong>（×1、×2、×3、×6）波长几十到几百公里，叠加细节；
        <code>sqrt(|x|)</code> 项在 x=0（东经 105° 线）处导数无穷大，让偏移场出现不可导的「棱」
        ——用简单多项式拟合偏移场会在这里失败。两个函数互相耦合（都接收 x 和 y），以 (105°E, 35°N)
        ——大约在西安与兰州之间的中国大陆几何中心——为原点展开。输出量纲近似米（量级
        ±几百），交给下一步换算。
      </Paragraph>

      <Heading level={3} title="单位换算：椭球曲率的 magic 因子" />
      <CodeAnnotate
        code={`const radLat = (lat / 180.0) * pi;
let magic = Math.sin(radLat);
magic = 1 - ee * magic * magic;      // 椭球修正因子
const sqrtMagic = Math.sqrt(magic);
dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * pi);
dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * pi);`}
        annotations={[
          {
            line: 3,
            text: "magic = 1 - e²·sin²φ，不是拍脑袋的数：经线曲率半径 M(φ) = a(1-e²)/(1-e²sin²φ)^(3/2)，分母正是 magic·√magic；卯酉圈曲率半径 N(φ) = a/√(1-e²sin²φ)。",
            color: PALETTE.green,
          },
          {
            line: 5,
            text: "纬度方向：把「米」除以经线曲率半径 M 换算成度。同样偏移 500 米，纬度越高对应的度数变化规律由 M 随纬度变大决定。",
            color: PALETTE.blue,
          },
          {
            line: 6,
            text: "经度方向：除以 N·cosφ——经线圈越往北越短，同样米数在高纬度对应更大的经度度数，cosφ 修正的就是这件事。常数换算会在高纬度引入数十米误差。",
            color: PALETTE.orange,
          },
        ]}
      />

      <MemoryCard keyword="算法一句话" color={PALETTE.purple}>
        GCJ-02 = 以 (105°E, 35°N) 为原点的正弦 +
        多项式非线性扰动，按克拉索夫斯基椭球曲率把米换算成度； 正向公开可算且精确，境外不生效。
      </MemoryCard>

      <Heading level={2} title="反解为什么是难点" />
      <Paragraph>
        正向是 <code>GCJ = WGS + delta(WGS)</code>。反解要求 <code>WGS = GCJ - delta(???)</code>
        ——偏移函数应该在未知的 WGS 点上求值，而你手里只有 GCJ 点。正弦 + 多项式 +
        根号的混合没有解析逆， 无法配出闭式解，所以只能近似。三条路：
      </Paragraph>

      <List
        items={[
          <>
            <strong>简单减法</strong>：直接在 GCJ 点求 delta
            再减——用的点是「错的」，但偏移场梯度极小（相邻 100 米内偏移量变化远小于 1 米），在 GCJ
            点求值和在真实 WGS 点求值差别可忽略。实测北京点残差 0.08 米；eviltransform
            文档标注的跨区域精度上界为 1~2 米。
          </>,
          <>
            <strong>迭代逼近</strong>：因为正向精确，用「反复正向试错 + 收缩」反解。不动点迭代{" "}
            <code>wgs += target - wgs2gcj(wgs)</code> 八轮内收敛，实测残差 &lt; 0.001
            米；eviltransform 的 gcj2wgs_exact 用二分法迭代 30 次，阈值 0.000001 度（约 0.1 米）。
          </>,
          <>
            <strong>官方接口（只有正向）</strong>：高德 Web 服务坐标转换接口的 coordsys 参数只有
            gps/mapbar/baidu → 高德坐标，不提供 gcj02 → wgs84
            方向。不是技术做不到，是合规原因——官方渠道不提供「还原真实坐标」的服务。
          </>,
        ]}
      />

      <Callout kind="info" title="实测数据说明">
        本文偏移量与反解误差均为本地 Node 实测运行结果（算法与 eviltransform JS 版一致）：北京
        (39.90923, 116.39722) 加偏 554.9 米、上海 (31.2304, 121.4737) 加偏 481.2 米、深圳 (22.5431,
        114.0579) 加偏 605.9 米； 简单反解残差 0.08 米、不动点迭代 8 轮残差 &lt; 0.001 米；GCJ-02 →
        BD-09 再加偏约 890~921 米。
      </Callout>

      <Heading level={2} title="误差预算：哪个环节最致命" />
      <Table
        label="误差预算表 / error budget"
        head={["误差来源", "量级", "性质"]}
        rows={[
          ["迭代反解残差", "< 0.001 m", "可忽略（实测，8 轮不动点）"],
          ["6 位小数截断", "≈ 0.1 m", "序列化精度，保留 6 位以上即可"],
          [
            "简单反解残差",
            "0.08 m 实测 / 1~2 m 上界",
            "可接受（北京点实测 / eviltransform 标注上界）",
          ],
          ["GPS 单点定位本身", "3~10 m", "随信号环境波动，转换无法消除"],
          ["GCJ-02 未转换", "555 m（北京点实测）", "系统性、方向一致、可完全避免"],
          ["BD-09 未转换", "≈ 890~921 m（实测）", "在 GCJ-02 偏移上再叠加，百度系数据独有"],
        ]}
      />

      <Paragraph>
        结论显而易见：转换精度问题都是米级，<strong>某个环节根本没转才是百米级</strong>
        。打卡判断半径若是 100~300 米量级，坐标系不一致足以让员工「站在公司却打卡失败」或「离公司
        500 米却打卡成功」——这类工单比定位超时更常见，也更隐蔽。
        量级跨了五个数量级，别用同一把尺子衡量：反解精度是「锦上添花」级优化，坐标系统一是「正确性」级刚需。
      </Paragraph>

      <Heading level={2} title="BD-09：在火星坐标上再套一层" />
      <Paragraph>
        百度在 GCJ-02 基础上再做一次加偏形成 BD-09：对 GCJ
        点的经纬度做极坐标变换（模长加微扰、角度加微扰）后叠加约 0.006° 的常量偏移，实测比 GCJ-02
        再偏约 900 米。四方互转以 GCJ-02 为桥梁——GPS → 高德 →
        百度是「先加偏、再加偏」，反向则逐层剥离。这张链路图本身就是排查坐标偏差的诊断工具： 看到约
        500 米级的偏差，怀疑漏了 GCJ-02 转换；看到千米级，怀疑百度系数据还叠加了 BD-09 未剥。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <List
        items={[
          <>
            <strong>「官方接口能转 GCJ-02」只对正向成立</strong>
            ——高德坐标转换接口仅支持 gps/mapbar/baidu → gcj02；任何声称官方 gcj02 → wgs84
            的渠道都不合规。
          </>,
          <>
            <strong>拟合偏移场注定失败</strong>
            ——sqrt(|x|) 项使偏移场在东经 105°
            线不可导，加上多重正弦叠加，低阶多项式拟合的残差远超业务容忍；直接实现原算法比拟合便宜且精确。
          </>,
          <>
            <strong>坐标小数位截断也有影响</strong>
            ——6 位小数约 0.1 米精度，4 位小数约 11 米；存储与传输时保留 6
            位以上，别让序列化吃掉精度。
          </>,
          <>
            <strong>同一坐标转两次</strong>
            ——wgs84→gcj02 之后又被下游当 wgs84
            再转，偏移叠加；转换必须收敛到唯一环节（建议服务端）并显式标注 coordType。
          </>,
        ]}
      />

      <QAChain
        intro="五问从「是不是加密」问到「怎么选转换方案」，中段两问是算法细节的深水区。"
        items={[
          {
            depth: 2,
            q: "GCJ-02 既然叫「加密」，为什么 GitHub 上到处都是转换代码？",
            intent: "热身：检验是否被「加密」二字误导过，能否分清密码学加密与确定性加偏。",
            a: "因为 GCJ-02 不是密码学加密，是确定性数学函数：同一坐标任何人在任何时间算出的偏移完全相同。它的算法从未有官方公开文档，但逆向工程早已完成——社区最广泛使用的开源实现 eviltransform（Go/C/JS/Swift/Python 各语言一致）就是事实标准，各家地图 SDK 内部行为与之一致。设计目标从来不是让人算不出，而是让「不经授权的精确坐标还原」不合规：正向加偏随便用，反向还原不提供官方渠道。",
          },
          {
            depth: 3,
            q: "为什么正向转换是精确的，反解却只能近似？差在哪？",
            intent:
              "核心机制题：能否说清「delta 应该在哪个点上求值」这个信息差，是理解反解误差的钥匙。",
            a: "正向 GCJ = WGS + delta(WGS)，delta 在已知的 WGS 点上求值，结果唯一确定。反解 WGS = GCJ - delta(?)，delta 应该在未知的 WGS 点上求值，而你只有 GCJ 点——手里的求值点是「错的」。又因为正弦+多项式+根号的混合没有解析逆，无法配出闭式解，只能近似。好在这个偏移场梯度极小：相邻 100 米内偏移量的变化远小于 1 米，所以在 GCJ 点求值和在真实 WGS 点求值差别可忽略——简单减法的残差实测只有 0.08 米（北京点），跨区域上界 1~2 米。",
            bonus:
              "迭代法利用「正向精确」这一事实反攻：不动点迭代 wgs += target - wgs2gcj(wgs)，八轮内收敛到亚毫米级——用反复正向逼近反解，是「可精确验证函数」通用的反解思路。",
          },
          {
            depth: 4,
            q: "delta 函数里的 magic 因子是什么？为什么转换要考虑纬度？",
            intent: "算法细节深水区：检验是否理解椭球几何——「米换算成度」为什么不是常数除法。",
            a: "magic = 1 - e²·sin²φ，是克拉索夫斯基椭球的标准修正因子。扰动函数输出的是近似「米」的量，换算成度要除以曲率半径：纬度方向除以经线曲率半径 M(φ) = a(1-e²)/(1-e²sin²φ)^(3/2)——分母正是 magic^(3/2)；经度方向除以卯酉圈曲率半径 N(φ) = a/√(1-e²sin²φ)，再乘 cosφ。为什么要修正：经线圈越往北越短，同样偏移 500 米在高纬度对应更大的经度度数——常数换算会在高纬度引入数十米误差。",
            bonus:
              "算法用的是克拉索夫斯基 1940 椭球（a=6378245）而非 WGS-84 椭球（a=6378137），两者长半轴相差约 108 米——这暗示 GCJ-02 的设计源头与苏联/中国的大地测量体系有渊源。",
          },
          {
            depth: 4,
            q: "业务上需要 GCJ-02 → WGS-84，官方接口又只提供正向，怎么办？",
            intent:
              "工程决策题：给出可落地的方案并说明误差量级，筛掉「官方没有就做不了」或「随便找个在线接口」的回答。",
            a: "本地算法反解，两档精度按需选：简单减法（在 GCJ 点求 delta 再减）残差米级以内（实测北京点 0.08 米），实现一行，适合围栏/打卡这类几十米级业务；迭代逼近（不动点或二分）残差毫米级，适合轨迹回放等更高要求。工程上更优先的方向是消除这个转换需求：把比对基准直接用 GCJ-02 存储，读数侧做正向转换——正向零误差，还绕开了「官方不提供反解」的合规灰色地带。",
            bonus:
              "特殊场景可考虑百度官方接口：百度地图开放平台提供 BD-09 与 WGS-84 的双向转换（含 GCJ-02 中转）——不同厂商的合规边界不同，但不建议为了一个转换引入第二家地图依赖。",
          },
          {
            depth: 5,
            q: "既然正向算法公开精确，国家为什么不换一个不可逆的方案？这个设计的真正约束是什么？",
            intent: "硬核收束题：从测绘监管的运作方式反推算法设计约束，考察技术之外的系统性思维。",
            a: '因为监管目标不是保密，而是"测绘资质门槛"。真正的约束有三个：一是偏移必须系统性一致——所有用户、所有厂商偏同样的量，地图看起来才没有毛病（导航、测距全行业可用），这要求确定性函数而非随机噪声；二是偏移必须非线性——固定偏移或线性偏移一次测量即可抵消，失去了"提高还原门槛"的意义；三是精度损失必须可控——偏移量级被限制在几百米，服务于民用精度需求。所以它落在"确定性、非线性、可公开正向计算、不公开反向授权"的平衡点上——技术方案是监管约束的解，不是密码学问题。',
            bonus:
              "与之配套的是资质体系：互联网地图服务测绘资质决定谁能合法生成加偏数据。算法公开与否只是门槛的一环，资质与数据源头管控才是主体。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "WebView 里 H5 定位超时怎么排查与修复？",
            to: "/note/frontend/browser/positioning/webview-geolocation-timeout",
            description: "坐标系统一之后，另一类失败是坐标根本拿不到——超时与降级的完整实战。",
          },
          {
            title: "手机是怎么知道自己在哪的？",
            to: "/note/frontend/browser/positioning/geolocation-signals",
            description: "偏移场的输入从哪来：信号源融合与 TTFF 的定位原理。",
          },
        ]}
      />
    </NoteShell>
  );
}
