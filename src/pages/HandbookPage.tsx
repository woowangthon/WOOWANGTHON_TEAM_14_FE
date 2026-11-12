import { useState } from "react";
import { Link } from "react-router-dom";
import { createMockApi } from "../api/mockApi";
import type { Api } from "../api/types";
import { elementLabel } from "../lib/checklist";
import { groupByItem, type Note } from "../lib/handbook";
import type { AskResponse } from "../types";

// 서버가 준비되면 이 줄을 실제 구현으로 바꿔 끼운다.
const defaultApi = createMockApi();

const title = "text-[clamp(26px,4vw,40px)] font-medium leading-[1.08] tracking-[-0.035em]";
const lead = "text-[clamp(16px,2.2vw,20px)] font-light tracking-[-0.02em]";
const primaryButton =
  "w-fit rounded-[2px] border border-black bg-black px-6 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black disabled:hover:text-white";

const LABEL_TEXT = { 전임경험: "전임 경험", 규정근거: "규정 근거" } as const;

/** 화면 3: 전임이 확정한 인수인계서와, 후임이 물어보는 곳. 후임은 확정된 내용만 근거와 함께 듣고, 없으면 "기록 없음"을 듣는다. */
export default function HandbookPage({ api = defaultApi, notes }: { api?: Api; notes: Note[] }) {
  const groups = groupByItem(notes);
  const confirmed = groups.flatMap((g) => g.annotations);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      setAnswer(await api.ask(question, confirmed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 났어요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-label="인수인계서" className="flex flex-col gap-5">
        <h2 className={title}>
          인수인계서 <b className="font-bold">(확정본)</b>
        </h2>
        {groups.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className={lead}>아직 확정한 내용이 없어요. 질문에 답하고 "맞음"을 누르면 여기에 쌓여요.</p>
            <Link to="/interview" className={`${primaryButton} inline-block`}>
              질문 화면으로
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map((group) => (
              <article key={group.item_title} className="border-t border-black py-4">
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{group.item_title}</h3>
                <ul className="mt-3 flex flex-col gap-4">
                  {group.annotations.map((a) => (
                    <li key={a.id} className="flex flex-col gap-1">
                      <span className="w-fit border border-black px-2 py-0.5 text-xs font-bold">{elementLabel(a.element)}</span>
                      <p className="text-base">{a.text}</p>
                      <p className="text-xs">
                        {LABEL_TEXT[a.label]} · 출처: 전임 답변 ({a.source.ids.join(", ")})
                        {a.status === "edited" && " · 전임이 고침"}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="후임 물어보기"className="flex flex-col gap-4 border-t-2 border-black pt-8">
        <h2 className={title}>
          후임이 <b className="font-bold">(물어보기)</b>
        </h2>
        <p className={lead}>궁금한 걸 물어보세요. 전임이 확정한 내용만 근거와 함께 답하고, 없으면 "기록 없음"이라고 해요.</p>
        <div className="flex flex-col gap-0.5">
          <label htmlFor="ask-input" className="text-xs">
            후임 질문
          </label>
          <input
            id="ask-input"
            className="w-full rounded-none border-0 border-b border-black bg-transparent py-2 text-base placeholder:text-neutral-700"
            placeholder="예: 회비 안 낸 사람은 어떻게 해요?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button type="button" className={primaryButton} disabled={question.trim() === "" || busy} onClick={ask}>
          물어보기
        </button>

        {busy && (
          <p role="status" className="text-sm font-bold">
            찾는 중이에요…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm">
            <b className="underline underline-offset-4">(오류)</b> {error}
          </p>
        )}

        {answer && (
          <section aria-label="답변" className="flex flex-col gap-3 border-t border-black pt-4">
            {answer.none ? (
              <>
                <p className="text-3xl font-bold tracking-[-0.03em]">기록 없음</p>
                <p className="text-sm">전임이 확정한 기록에 없는 내용이에요. 추측해서 답하지 않아요. 전임에게 직접 물어봐 주세요.</p>
              </>
            ) : (
              <ul className="flex flex-col gap-4">
                <li className="w-fit border border-black px-2 py-0.5 text-xs font-bold">전임이 확정한 답변</li>
                {answer.hits.map((hit) => (
                  <li key={hit.annotation_id} className="flex flex-col gap-1 border-l-4 border-black pl-4">
                    <p className="text-lg font-medium tracking-[-0.02em]">{hit.text}</p>
                    <p className="text-xs">
                      {LABEL_TEXT[hit.label]} · 출처: 전임 답변 ({hit.source.ids.join(", ")}) · 확정 {hit.approved_at}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
