import { motion } from "framer-motion";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        InnoDB 二级索引的叶子节点只存<strong>索引列 + 主键</strong>。
        查询列不在索引里就要拿着主键回聚簇索引再查一次——这就是<strong>回表</strong>。
        查询所需列全部在索引里，直接返回，即<strong>覆盖索引</strong>。
      </Conclusion>

      <Heading level={2} title="逐段拆解" />
      <Heading level={3} title="两棵 B+ 树" />
      <Paragraph>
        聚簇索引叶子 = 完整行数据；二级索引叶子 = 索引列值 + 主键。每个二级索引都是一棵独立的树。
      </Paragraph>

      <Heading level={3} title="回表的成本" />
      <Paragraph>
        按主键回聚簇索引是随机 I/O，命中 1 万行 = 1 万次随机读。EXPLAIN 的 Extra 出现{" "}
        <code>Using index</code> 表示免回表。
      </Paragraph>

      <Heading level={3} title="最左前缀" />
      <Paragraph>
        联合索引 (a, b, c) 只能命中 a、a+b、a+b+c 前缀。遇到范围查询后面的列停止走索引。
      </Paragraph>

      <CodeBlock
        code={`CREATE INDEX idx_user_status ON users(status, created_at);

-- 覆盖索引：status/created_at 都在索引里，Extra: Using index
SELECT status, created_at FROM users WHERE status = 'active';

-- 回表：email 不在索引里，每行都要回聚簇索引取
SELECT status, email FROM users WHERE status = 'active';

-- 索引下推 ICP：先在索引层过滤 created_at，减少回表次数
SELECT * FROM users
WHERE status = 'active' AND created_at > '2026-01-01';`}
      />

      <Heading level={2} title="索引层级可视化" />
      <BPlusTreeDiagram />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "为什么用 B+ 树不用 B 树 / 哈希表？",
            a: "B+ 树叶子成链表，范围扫描只需顺序遍历；非叶子节点不存数据，单页可容纳更多键，树更矮（千万级数据 3 层）。哈希等值快但不支持范围与排序。",
          },
          {
            q: "SELECT * 为什么被 DBA 嫌弃？",
            a: "废掉覆盖索引的可能、传输无用列、回表列更多。明确列出所需列是成本最低的优化。",
          },
          {
            q: "索引列越多越好吗？",
            a: "每个索引都是一棵要维护的 B+ 树，写入时全部要更新。按查询频率建联合索引，能合并的合并，杜绝单列索引堆砌。",
          },
          {
            q: "什么情况下索引失效？",
            a: "对索引列做函数/运算、隐式类型转换（varchar 列用数字查）、前导模糊 LIKE '%x'、OR 两侧有无索引列。本质都是破坏了有序性，无法走树的查找。",
          },
        ]}
      />
    </NoteShell>
  );
}

function BPlusTreeDiagram() {
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card p-5">
      <div className="mb-4 text-[10px] tracking-[0.08em] text-muted uppercase meta-mono">
        二级索引查找 + 回表路径 / secondary index lookup
      </div>
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
    </div>
  );
}
