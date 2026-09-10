import { motion } from "framer-motion";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { DoDont, MemoryCard, VizBlock } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        InnoDB 里每个二级索引都是一棵独立的 B+ 树，叶子节点只存<strong>索引列 + 主键</strong>
        ——完整行只住在聚簇索引那棵树上。查询要的列不在二级索引里，就得拿着主键回聚簇索引再查一次，这就是
        <strong>回表</strong>，代价是每命中一行一次随机 I/O；查询所需列全部在索引里则直接从索引返回
        （EXPLAIN 的 <code>Extra: Using index</code>），这就是<strong>覆盖索引</strong>。
        联合索引的列顺序决定谁能进 range：<strong>等值列在前、范围列最后</strong>
        ，范围之后的列无法继续收窄扫描区间。
      </Conclusion>

      <Heading level={2} title="两棵 B+ 树：索引结构与扇出" />
      <Paragraph>
        InnoDB 的表本身就是一棵 B+ 树（<strong>聚簇索引</strong>
        ）：数据行按主键序存放在叶子节点，所以「按主键查」一次下探就能拿到整行。
        每建一个二级索引，就多一棵独立的树——叶子节点不再存整行，只存
        <strong>索引列的值 + 主键值</strong>。
        这个「叶子瘦身」是理解一切的关键：二级索引体积小、单棵树便宜，但代价是「拿主键再查一次」的回表动作。
      </Paragraph>
      <Paragraph>
        为什么树只有三四层就能装下千万行？靠的是<strong>扇出</strong>
        ：B+ 树的非叶子节点只存「键 + 子指针」，不存数据。一个 16KB 的页里，bigint
        主键（8B）加页指针（6B）约 14B 一条，单页能放约 1170 个键；叶子若每行约占 100B，单页约 160
        行。于是三层树的理论容量是 1170 × 1170 × 160 ≈ <strong>2 亿行</strong>——千万级数据三层封顶，
        一次点查最多 3 次页读，且根节点几乎常驻 Buffer
        Pool，实际磁盘读往往只有一两次。树「矮胖」的直接收益：每次下探是一次页读，层数就是随机读的上限。
      </Paragraph>

      <BPlusTreeDiagram />

      <Heading level={2} title="回表的成本：一次随机 I/O" />
      <Paragraph>
        走二级索引找到 <code>(key, pk)</code> 之后，还要拿着 pk 回聚簇索引从根下探一遍才能取到整行——
        <strong>每命中一行，就是一次额外的 B+ 树下探</strong>
        。更糟的是访问模式：命中行在二级索引里按索引列的顺序排列，
        而它们的主键几乎必然是乱序的，对应到聚簇索引里就是一串随机位置。命中 1 万行 = 1
        万次乱序下探：数据全部在 Buffer Pool 里时是内存随机读，尚可接受；一旦超出内存，就是 1
        万次真磁盘随机 I/O， 与顺序读的差距是两个数量级。回表贵不贵，本质上取决于 Buffer Pool
        装不装得下这批行。
      </Paragraph>
      <Paragraph>
        这个成本模型立刻解释两个常见现象。其一，「有索引反而更慢」不是错觉：优化器估算回表行数太多时，会直接放弃二级索引改走全表扫描
        （EXPLAIN 的 type 显示
        ALL）——顺序扫全表比百万次随机回表便宜。其二，覆盖索引之所以值得专门设计： 它把成本从「行数 ×
        随机回表」降到「索引页顺序读」，两者的差距在大查询上是数量级的。
      </Paragraph>

      <Heading level={2} title="覆盖索引：EXTRA 里的 Using index" />
      <Paragraph>
        判定条件一句话：
        <strong>查询引用的所有列（SELECT、WHERE、ORDER BY）都包含在同一个二级索引里</strong>
        ，回表动作整个消失。EXPLAIN 的 Extra 列是判官：<code>Using index</code>{" "}
        表示覆盖命中、零回表； <code>Using index condition</code>{" "}
        表示走了索引下推（ICP）——仍在回表，但回表前先在索引层过滤掉了不合格的行。对比一组真实写法：
      </Paragraph>

      <CodeBlock
        code={`CREATE INDEX idx_status_created ON users (status, created_at);

-- 覆盖索引：SELECT/WHERE 引用列全部在索引里（id 是主键，二级索引叶子自带）
-- EXPLAIN Extra: Using index —— 零回表
SELECT id, status FROM users WHERE status = 'active';

-- 回表：email 不在索引里，命中的每行都要拿 id 回聚簇索引取整行
-- Extra 无 Using index；命中行数多时优化器可能直接放弃这个索引
SELECT status, email FROM users WHERE status = 'active';

-- (status, created_at)：status 等值在前 + created_at 范围在后，
-- 两列共同构成 range 访问，条件在 range 求值时已消耗——与 ICP 无关
SELECT * FROM users
WHERE status = 'active' AND created_at > '2026-01-01';

-- 真 ICP 场景：orders(customer_id, note) 联合索引，
-- note 的前导模糊进不了 range，但引擎在索引层先判断 note 条件，只对幸存行回表
-- EXPLAIN Extra: Using index condition
SELECT * FROM orders
WHERE customer_id = 42 AND note LIKE '%退款%';`}
      />
      <Paragraph>
        第三个例子值得单独解释，因为「索引下推」经常被安错地方。<code>(status, created_at)</code>{" "}
        这个组合里，status 等值锁定前缀、created_at 在前缀内做范围——两列的过滤都在
        <strong>确定扫描区间</strong>
        的过程中完成，引擎直接拿到最终命中集合，不存在「先扫再过滤」的中间步骤，所以与 ICP 无关。ICP
        处理的是另一类问题：条件的<strong>部分列能进索引、但没法收窄扫描区间</strong>
        。官方手册的经典例子（MySQL 8.0 Reference Manual, Index Condition Pushdown Optimization）：
        索引 (zipcode, lastname, firstname)，查询{" "}
        <code>zipcode='95054' AND lastname LIKE '%etrunia%'</code>——前导通配的 lastname
        缩不了区间，但引擎可以在索引层逐条判断这个 LIKE， 不满足的行连回表都省了。一句话区分：
        <strong>覆盖索引免掉回表，ICP 减少回表</strong>。
      </Paragraph>

      <Heading level={2} title="联合索引顺序：最左前缀与列顺序设计" />
      <Paragraph>
        联合索引 (a, b, c) 的键按「先 a、a 相同再比 b、再比 c」排序，所以只有
        <strong>从最左列开始的连续前缀</strong>
        能用于定位：a、a+b、a+b+c 三种命中形态。查询条件只有 b、c 时，键在树里对 b
        的有序性无从利用（a 未知时 b 是乱序的），无法进入 range。还有一个更隐蔽的截断规则：
        <strong>遇到范围列就停</strong>——(a, b, c) 上 <code>a=1 AND b&gt;10 AND c=2</code>，b
        的范围之后 c 无法继续收窄区间，只能在 b 的扫描结果里逐行过滤。
      </Paragraph>
      <Paragraph>
        由此得出顺序设计的完整原则：<strong>等值列在前，范围列收尾</strong>
        ——等值条件逐列锁定前缀，范围列放在最后一次性收窄； 多个等值列之间，把
        <strong>选择性高</strong>（区分度大、过滤后剩余行少）的放前面；如果还有 ORDER
        BY，排序列紧接在等值列之后， 可以顺势消掉 filesort。反过来排列的代价是实打实的：
        <code>(created_at, status)</code> 上跑{" "}
        <code>status='active' AND created_at &gt; '2026-01-01'</code>，created_at 的范围之后 status
        进不了区间，只能在扫过的每一行上再过滤——同一个查询，索引顺序不同，扫描量差出数量级。
      </Paragraph>

      <MemoryCard keyword="等值在前，范围收尾" color={PALETTE.green}>
        联合索引列顺序三问：谁能等值锁定前缀？哪列选择性最高？范围与排序列是否已垫底？
        满足这三问的顺序，才配得上「一次建索引」的写入开销。
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="索引列上套函数 / function on column"
        dont={{
          code: `SELECT * FROM orders
WHERE YEAR(created_at) = 2026;`,
          note: "对索引列套函数后，比较发生在函数结果与常量之间——B+ 树按列本身有序，帮不上忙，直接全表扫。",
        }}
        do={{
          code: `SELECT * FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at <  '2027-01-01';`,
          note: "同样的语义改写成范围条件，条件落在列本身，range 扫描照常可用。",
        }}
      />
      <DoDont
        label="隐式类型转换 / implicit cast"
        dont={{
          code: `-- phone 是 VARCHAR 列
SELECT * FROM users
WHERE phone = 13800001111;`,
          note: "字符串列与数字比较时，MySQL 把每行的列值转成数字——等价于对列套了 CAST，索引失效。",
        }}
        do={{
          code: `SELECT * FROM users
WHERE phone = '13800001111';`,
          note: "类型写对，列不再被改写。反方向则安全：数字列用字符串常量查，转的是常量不是列，索引无恙。",
        }}
      />
      <DoDont
        label="LIKE 前导通配 / leading wildcard"
        dont={{
          code: `SELECT * FROM articles
WHERE title LIKE '%性能%';`,
          note: "前导 % 让前缀无从对起，B+ 树只能全索引扫描；ICP 也只能在扫描途中过滤，省不掉扫描本身。",
        }}
        do={{
          code: `SELECT * FROM articles
WHERE title LIKE 'MySQL%';  -- 前缀匹配，可走 range

-- 任意位置检索：交给全文索引（FULLTEXT + ngram）`,
          note: "确定前缀的用 LIKE 'xxx%' 走 range；真正的全文检索是全文索引的职责，不是 LIKE 的。",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "为什么 InnoDB 选 B+ 树，而不是 B 树或哈希表？",
            intent:
              "热身题，索引结构的底座——答「B+ 树快」不给结构性理由的，说明没想过存储引擎要什么。",
            depth: 2,
            a: "三个结构性理由。其一，非叶子节点不存数据，单页能放更多键、扇出更大，千万行数据三层封顶，每次点查的页读次数有硬上界；其二，叶子节点串成双向链表，范围扫描是定位起点后顺序遍历，天然贴合 ORDER BY 与区间查询；其三，磁盘按页读，树高即 I/O 次数，B+ 树把随机读压到最少。哈希表等值虽 O(1)，但不支持范围与排序，直接出局；B 树非叶子节点存数据导致扇出变小、且范围查询要中序回溯，处处吃亏。",
            bonus:
              "能自己算容量更加分：16KB 页、14B 一个内部键约 1170 扇出，三层 1170² × 每页叶子行数——千万级表 3 次页读的结论是从这算出来的，不是背出来的。",
          },
          {
            q: "SELECT * 为什么被 DBA 嫌弃？",
            intent: "考成本模型的日常落地——能不能把「回表」这个概念翻译成一条写代码的纪律。",
            depth: 2,
            a: "因为它最容易毁掉覆盖索引：多选一列不在索引里，Using index 立刻消失、每行多一次回表；回表行数一多，优化器还可能放弃索引改走全表扫。此外还有传输与内存的浪费——大字段（TEXT/JSON）原样过网络、进 Buffer Pool，挤掉的却是真正热的数据页。明确列出所需列，是成本最低的优化。",
            bonus:
              "延伸：InnoDB 的行格式（DYNAMIC）下长 TEXT 列在行内存 20 字节指针、实际数据在溢出页——SELECT * 把溢出页也拖出来，代价远超列宽直觉。",
          },
          {
            q: "联合索引 (a, b, c)，WHERE b = 1 AND c = 2 能用上它吗？",
            intent: "最左前缀的反向考法——条件列全在索引里却用不上，答得出原因才算真懂排序键。",
            depth: 3,
            a: "用不上 range（8.0.13 前的常规场景）。联合索引先按 a 排序，a 未知时 b、c 在树里是乱序的，无法定位区间。存储引擎最多走索引全扫（type=index，扫完整棵二级索引），配合 ICP 在索引层过滤 b、c——比回表全扫省 I/O，但扫描量仍是整个索引。要这类查询快，得为 (b, c) 单独建索引，或调整查询让 a 进条件。",
            bonus:
              "MySQL 8.0.13 起有 Skip Scan 优化：a 的不同值很少时，优化器会对每个 a 值分别做 (b, c) 定位，相当于把缺失的前缀枚举补上——但它是补救不是设计，前缀列基数大时性能依旧崩塌。",
          },
          {
            q: "怎么判断一条 SQL 到底回没回表？",
            intent: "把概念变成工具——不会读 EXPLAIN 的回表判断，等于只有理论没有排错能力。",
            depth: 3,
            a: "看 EXPLAIN 的 Extra 列。Using index = 覆盖命中、零回表；Using index condition = 走了 ICP，仍回表但已过滤；两者都没有、且 type 是 ref/range，说明按索引定位后逐行回表——此时 rows 估算值就是回表行数。辅助手段：EXPLAIN ANALYZE（8.0.18+）给出真实执行统计，比估算准；SHOW STATUS 里的 Handler_read_* 计数器能确认实际读行量。",
            bonus:
              "type 列是访问路径的分级：const > eq_ref > ref > range > index > ALL——回表与否看 Extra，扫描量级看 type 与 rows，两者一起读才是完整的成本画像。",
          },
          {
            q: "为什么 VARCHAR 列用数字查会失效，数字列用字符串查却没事？",
            intent: "压轴追索引失效的底层规则——隐式转换的方向性，绝大多数人只背现象不知道规则。",
            depth: 4,
            a: "规则只有一条：字符串与数字比较时，MySQL 把字符串转成数字。方向决定谁被改写——VARCHAR 列遇数字常量，被转换的是列（等价于 CAST(phone AS SIGNED) 每行算一遍），列被函数包裹，有序性失效；INT 列遇字符串常量，被转换的是常量（只转一次），列毫发无损，索引照常 range。所以失效与否不取决于「类型不一样」，而取决于转换落在哪一边。",
            bonus:
              "顺带的精度坑：浮点转换可能引入舍入误差，`WHERE varchar_col = 1e15` 这类大数比较会出现「值不相等却匹配」的诡异结果——这也是字段类型必须与常量类型对齐的另一个理由。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        本篇的成本模型可以压成一句话：
        <strong>二级索引是「目录页」，回表是「按页码去正文翻一次」</strong>
        ——目录里没有的信息（非覆盖列）都要翻一次正文，而正文翻页是随机的。所以索引设计的全部心法：
        能覆盖就覆盖，覆盖不了就减少命中行数，顺序上等值在前、范围收尾。
      </Paragraph>
      <Paragraph>
        下一个值得问的问题：这些成本判断如何落到日常工具上——EXPLAIN 的 <code>type</code> 列从{" "}
        <code>const</code> 到 <code>ALL</code> 各代表什么访问路径、<code>rows</code>{" "}
        估算值怎么来的、什么时候估算会骗人？把执行计划读熟，本篇的模型才能真正变成排错武器。
      </Paragraph>
    </NoteShell>
  );
}

function BPlusTreeDiagram() {
  return (
    <VizBlock label="二级索引回表 / secondary-index-lookup" color={PALETTE.orange}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {["[a,c,e]", "[g,k,m]", "[p,s,u]"].map((k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-md border border-warn/50 bg-warn/10 px-3 py-1.5 font-mono text-xs text-warn"
            >
              {k}
            </motion.div>
          ))}
        </div>
        <span className="text-xs text-muted meta-mono">↓ 非叶子节点：键 + 子指针</span>
        <div className="flex items-center gap-2">
          {["leaf: k=7, pk=102", "leaf: k=9, pk=115", "leaf: k=12, pk=88"].map((k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-md border border-accent/40 bg-accent/5 px-3 py-1.5 font-mono text-xs text-accent"
            >
              {k}
            </motion.div>
          ))}
          <span className="text-muted">⇄</span>
        </div>
        <span className="text-xs text-muted meta-mono">↓ 拿 pk=115 回聚簇索引（随机 I/O）</span>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-md border border-success/40 bg-success/5 px-4 py-1.5 font-mono text-xs text-success"
        >
          聚簇索引 leaf: pk=115 → 完整行
        </motion.div>
        <div className="mt-1 rounded-md border border-dashed border-border px-4 py-1.5 text-center text-xs text-muted">
          若查询列全部在索引中，上面最后一步消失 → Using index（覆盖索引）
        </div>
      </div>
    </VizBlock>
  );
}
