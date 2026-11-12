import { useState } from "react";
import { Link } from "react-router-dom";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import { elementLabel } from "../lib/checklist";
import { groupByItem, type Note } from "../lib/handbook";
import type { AskResponse } from "../types";

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const lead = "max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";

const secondButton =
  "w-fit rounded-full bg-white px-5 py-2.5 text-sm text-[#2b2b33] transition-colors hover:bg-[#ececf0]";

const LABEL_TEXT = { 전임경험: "전임 경험", 규정근거: "규정 근거" } as const;

/** 화면 3: 전임이 확정한 인수인계서와, 후임이 물어보는 곳. 후임은 확정된 내용만 근거와 함께 듣고, 없으면 "기록 없음"을 듣는다. */
export default function HandbookPage({
  api = defaultApi,
  notes,
}: {
  api?: Api;
  notes: Note[];
}) {
  const groups = groupByItem(notes);
  const confirmed = groups.flatMap((g) => g.annotations);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forwarded, setForwarded] = useState(false);

  async function forward() {
    setError("");
    try {
      await api.forward?.(question);
      setForwarded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문을 보내지 못했어요");
    }
  }

  async function ask() {
    setBusy(true);
    setError("");
    setAnswer(null);
    setForwarded(false);
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
        <h2 className={title}>인수인계서</h2>
        {groups.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className={lead}>
              아직 확정한 내용이 없어요. 질문에 답하고 "맞음"을 누르면 여기에
              쌓여요.
            </p>
            <Link to="/interview" className={`${primaryButton} inline-block`}>
              질문 화면으로
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <article
                key={group.item_title}
                className="rounded-3xl bg-[#f6f6f8] p-6"
              >
                <h3 className="text-xl font-semibold tracking-[-0.02em]">
                  {group.item_title}
                </h3>
                <ul className="mt-3 flex flex-col gap-4">
                  {group.annotations.map((a) => (
                    <li key={a.id} className="flex flex-col gap-1">
                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium">
                        {elementLabel(a.element)}
                      </span>
                      <p className="text-base">{a.text}</p>
                      <p className="text-[13px] text-[#8b8b94]">
                        {LABEL_TEXT[a.label]} · 출처: 전임 답변
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

      <section aria-label="후임 물어보기" className="flex flex-col gap-4 pt-4">
        <h2 className={title}>후임이 물어보기</h2>
        <p className={lead}>
          전임이 확정한 내용만 근거와 함께 답해요. 없으면 "기록 없음"이라고
          해요.
        </p>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="ask-input"
            className="px-1 text-[13px] text-[#6b6b75]"
          >
            후임 질문
          </label>
          <input
            id="ask-input"
            className="w-full rounded-2xl border border-transparent bg-[#f3f3f6] px-4 py-2.5 text-base placeholder:text-[#9a9aa4] focus:border-[#1c1c22] focus:bg-white focus:outline-none"
            placeholder="예: 회비 안 낸 사람은 어떻게 해요?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={primaryButton}
          disabled={question.trim() === "" || busy}
          onClick={ask}
        >
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
          <section
            aria-label="답변"
            className="flex flex-col gap-3 rounded-3xl bg-[#f6f6f8] p-6"
          >
            {answer.none ? (
              <>
                <p className="text-3xl font-bold tracking-[-0.03em]">
                  기록 없음
                </p>
                <p className="text-sm text-[#6b6b75]">
                  전임이 확정한 기록에 없는 내용이에요. 추측해서 답하지 않아요.
                  전임에게 직접 물어봐 주세요.
                </p>
                {api.forward &&
                  (forwarded ? (
                    <p role="status" className="text-sm font-medium">
                      전임에게 보냈어요
                    </p>
                  ) : (
                    <button
                      type="button"
                      className={secondButton}
                      onClick={forward}
                    >
                      전임에게 질문 보내기
                    </button>
                  ))}
              </>
            ) : (
              <ul className="flex flex-col gap-4">
                <li className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium">
                  전임이 확정한 답변
                </li>
                {answer.hits.map((hit) => (
                  <li key={hit.annotation_id} className="flex flex-col gap-1">
                    <p className="text-lg font-medium tracking-[-0.02em]">
                      {hit.text}
                    </p>
                    <p className="text-[13px] text-[#8b8b94]">
                      {LABEL_TEXT[hit.label]} · 출처: 전임 답변
                      {hit.approved_at ? ` · 확정 ${hit.approved_at}` : ""}
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
