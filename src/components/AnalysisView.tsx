import { useState } from "react";
import { closeElement, type Mode } from "../lib/checklist";
import type { ElementKey, Item } from "../types";
import ChecklistTable from "./ChecklistTable";

const title = "text-[clamp(26px,4vw,40px)] font-medium leading-[1.08] tracking-[-0.035em]";

/** 분석이 끝난 결과: 업무 항목 목록과 항목 × 6요소 체크표. */
export default function AnalysisView({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [mode, setMode] = useState<Mode>("전임");

  const handleClose = (itemId: string, key: ElementKey) => setItems((prev) => closeElement(prev, itemId, key, mode));

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className={title}>업무 항목</h2>
        <ul className="border-t border-black">
          {items.map((item) => (
            <li key={item.id}>
              <article
                aria-label={item.title}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-black py-3"
              >
                <h3 className="text-lg font-medium tracking-[-0.02em]">{item.title}</h3>
                <ul className="flex flex-1 flex-wrap gap-x-3 gap-y-1">
                  {item.keywords.map((keyword) => (
                    <li key={keyword}>
                      <span className="text-xs text-neutral-900">{keyword}</span>
                    </li>
                  ))}
                </ul>
                <span className="text-xs">사실 {item.facts.length}건</span>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={title}>
            항목 × 6요소 <b className="font-bold">(체크표)</b>
          </h2>
          <div className="flex" role="group" aria-label="보는 사람">
            {(["전임", "후임"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`-mr-px border border-black px-3.5 py-2 text-sm ${mode === m ? "bg-black text-white" : "bg-transparent"}`}
              >
                {m}으로 보기
              </button>
            ))}
          </div>
        </div>
        <ChecklistTable items={items} mode={mode} onClose={handleClose} />
      </section>
    </div>
  );
}
