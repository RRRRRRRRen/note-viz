import { Link } from "react-router-dom";
import { domainTrees, latestNotes } from "@/lib/registry";
import { taxonomyIcon } from "@/lib/icons";
import { NoteRow } from "@/components/NoteRow";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1120px] px-8 py-8">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-7">
        <div>
          <p className="eyebrow">NoteViz / 全局首页</p>
          <h1 className="text-3xl leading-tight font-semibold">你的全部知识，从这里开始组织。</h1>
          <p className="mt-2 text-[13px] text-muted">
            选择一个领域进入知识地图，或从最新笔记开始阅读。
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-[1.35fr_1fr] gap-6">
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-semibold">知识领域</h2>
            <span className="text-[10px] text-muted meta-mono">进入领域首页</span>
          </div>
          <div className="flex flex-col gap-2">
            {domainTrees.map((d) => {
              const Icon = taxonomyIcon(d.icon);
              const noteCount = d.techs.reduce(
                (acc, t) => acc + t.areas.reduce((a, ar) => a + ar.notes.length, 0),
                0,
              );
              return (
                <Link
                  key={d.slug}
                  to={`/${d.slug}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3 transition-colors hover:border-accent hover:bg-surface-2"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${d.color}22`, color: d.color }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-[13px] font-medium">{d.label}</span>
                  <small className="ml-auto text-[10px] text-muted meta-mono">
                    {noteCount} 篇笔记 · 查看总览 →
                  </small>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-semibold">学习建议</h2>
            <span className="text-[10px] text-muted meta-mono">从低成本动作开始</span>
          </div>
          <div className="flex flex-col gap-2">
            <Suggestion text="Ctrl/Cmd + K 全局搜索笔记" />
            <Suggestion text="点击顶栏 Zen 进入沉浸阅读" />
            <Suggestion text="多开标签并行对比知识点" />
          </div>
        </section>
      </div>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base font-semibold">最新笔记</h2>
          <span className="text-[10px] text-muted meta-mono">按更新时间排序</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {latestNotes(10).map((n) => (
            <NoteRow key={n.path} note={n} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Suggestion({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3 text-[13px] text-muted">
      <span className="status-dot shrink-0" />
      {text}
    </div>
  );
}
