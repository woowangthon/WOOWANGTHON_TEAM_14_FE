import { useState } from "react";
import type { Api } from "../api/types";
import { closeElement, type Mode } from "../lib/checklist";
import type { ElementKey, Item } from "../types";
import type { Fact } from "../types";
import ChecklistTable from "./ChecklistTable";

const FACT_PREVIEW = 3;

/** 항목에서 찾은 사실. 많을 수 있어서 처음에는 앞의 몇 개만 보여주고 나머지는 접어 둔다. */
function FactList({ facts }: { facts: Fact[] }) {
  const [open, setOpen] = useState(false);
  if (facts.length === 0) return null;
  const shown = open ? facts : facts.slice(0, FACT_PREVIEW);
  const hidden = facts.length - FACT_PREVIEW;
  return (
    <div className="flex w-full flex-col gap-2 pt-1">
      <ul className="flex flex-col gap-1.5 text-sm text-[#3d3d46]">
        {shown.map((fact) => (
          <li key={fact.id} className="flex gap-2">
            {fact.date && (
              <span className="shrink-0 text-[#8b8b94]">{fact.date}</span>
            )}
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-fit text-[13px] text-[#6b6b75] underline underline-offset-4"
        >
          {open ? "접기" : `더 보기 (${hidden}개)`}
        </button>
      )}
    </div>
  );
}

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";

/** 분석이 끝난 결과: 업무 항목 목록과 항목 × 6요소 체크표. */
export default function AnalysisView({
  initialItems,
  api,
}: {
  initialItems: Item[];
  api?: Api;
}) {
  const [items, setItems] = useState(initialItems);
  const [mode, setMode] = useState<Mode>("전임");

  const [error, setError] = useState("");

  // 서버가 있으면 서버가 받은 뒤에 화면의 칸을 닫는다. 질문은 이 뒤에 만들어지므로 여기서 반영돼야 한다.
  async function handleClose(itemId: string, key: ElementKey) {
    setError("");
    try {
      await api?.closeElement?.(itemId, key, mode);
      setItems((prev) => closeElement(prev, itemId, key, mode));
    } catch (e) {
      setError(e instanceof Error ? e.message : "칸을 닫지 못했어요");
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className={title}>업무 항목</h2>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <article
                aria-label={item.title}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-[#f6f6f8] px-5 py-4"
              >
                <h3 className="text-lg font-semibold tracking-[-0.02em]">
                  {item.title}
                </h3>
                <ul className="flex flex-1 flex-wrap gap-1.5">
                  {item.keywords.map((keyword) => (
                    <li key={keyword}>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#55555f]">
                        {keyword}
                      </span>
                    </li>
                  ))}
                </ul>
                <span className="text-[13px] text-[#8b8b94]">
                  사실 {item.facts.length}건
                </span>
                <FactList facts={item.facts} />
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={title}>체크표</h2>
          <div
            className="inline-flex rounded-full bg-[#f1f1f4] p-1"
            role="group"
            aria-label="보는 사람"
          >
            {(["전임", "후임"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${mode === m ? "bg-[#1c1c22] text-white" : "text-[#55555f] hover:text-[#1c1c22]"}`}
              >
                {m}으로 보기
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm">
            <b className="underline underline-offset-4">(오류)</b> {error}
          </p>
        )}
        <ChecklistTable items={items} mode={mode} onClose={handleClose} />
      </section>
    </div>
  );
}
