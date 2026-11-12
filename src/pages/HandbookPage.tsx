import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import FactList from "../components/FactList";
import Progress from "../components/Progress";
import { elementLabel } from "../lib/checklist";
import { groupByItem, type Note } from "../lib/handbook";
import type {
  AskResponse,
  ForwardedQuestion,
  PublishedDocument,
} from "../types";

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const lead = "max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";
const secondButton =
  "w-fit rounded-full bg-white px-5 py-2.5 text-sm text-[#2b2b33] transition-colors hover:bg-[#ececf0]";
const pill = "w-fit rounded-full bg-white px-3 py-1 text-xs font-medium";

const LABEL_TEXT = { 전임경험: "전임 경험", 규정근거: "규정 근거" } as const;

const askedAt = (iso: string) => iso.slice(0, 16).replace("T", " ");

/** 화면 3: 전임이 확정해 발행한 인수인계서, 후임이 물어보는 곳, 후임이 남긴 질문함. 후임은 확정된 내용만 근거와 함께 듣고, 없으면 "기록 없음"을 듣는다. */
export default function HandbookPage({
  api = defaultApi,
  notes,
}: {
  api?: Api;
  notes: Note[];
}) {
  const confirmed = groupByItem(notes).flatMap((g) => g.annotations);
  const confirmedKey = JSON.stringify(
    confirmed.map((a) => [a.id, a.status, a.text, a.label]),
  );

  const [doc, setDoc] = useState<PublishedDocument | null>(null);
  const [docError, setDocError] = useState("");
  const [inbox, setInbox] = useState<ForwardedQuestion[] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forwarded, setForwarded] = useState(false);

  // 이 화면에 들어올 때(그리고 확정한 기록이 바뀔 때) 인수인계서를 발행해서 받는다.
  useEffect(() => {
    let alive = true;
    setDocError("");
    api
      .publish(confirmed)
      .then((result) => alive && setDoc(result))
      .catch(
        (e: unknown) =>
          alive &&
          setDocError(
            e instanceof Error ? e.message : "인수인계서를 만들지 못했어요",
          ),
      );
    return () => {
      alive = false;
    };
    // confirmed는 confirmedKey로 바뀜을 알아본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, confirmedKey]);

  const refreshInbox = () =>
    api
      .getForwarded()
      .then(setInbox)
      .catch(() => setInbox([]));

  useEffect(() => {
    void refreshInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  async function forward() {
    setError("");
    try {
      await api.forward?.(question);
      setForwarded(true);
      void refreshInbox();
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

  const items = (doc?.items ?? []).filter(
    (item) => item.annotations.length > 0,
  );

  return (
    <div className="flex flex-col gap-12">
      <section aria-label="인수인계서" className="flex flex-col gap-5">
        <h2 className={title}>인수인계서</h2>

        {docError && (
          <p role="alert" className="text-sm">
            <b className="underline underline-offset-4">(오류)</b> {docError}
          </p>
        )}
        {!doc && !docError && (
          <Progress label="인수인계서를 만드는 중이에요…" />
        )}

        {doc && items.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className={lead}>
              아직 확정한 내용이 없어요. 질문에 답하고 "맞음"을 누르면 여기에
              쌓여요.
            </p>
            <Link to="/interview" className={`${primaryButton} inline-block`}>
              질문 화면으로
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-3xl bg-[#f6f6f8] p-6">
                <h3 className="text-xl font-semibold tracking-[-0.02em]">
                  {item.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-5">
                  {item.annotations.map((a) => {
                    const slots = Object.entries(a.slots ?? {}).filter(
                      ([, value]) => value,
                    );
                    return (
                      <li key={a.id} className="flex flex-col gap-1.5">
                        <span className={pill}>{elementLabel(a.element)}</span>
                        <p className="text-base">{a.text}</p>
                        {slots.length > 0 && (
                          <dl className="flex flex-col gap-1 text-sm">
                            {slots.map(([name, value]) => (
                              <div key={name} className="flex gap-3">
                                <dt className="w-10 shrink-0 text-[#8b8b94]">
                                  {name}
                                </dt>
                                <dd className="text-[#3d3d46]">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <p className="text-[13px] text-[#8b8b94]">
                          {LABEL_TEXT[a.label]} · 출처: 전임 답변
                          {a.status === "edited" && " · 전임이 고침"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {item.facts.length > 0 && (
                  <div className="mt-5 flex flex-col gap-1 border-t border-[#e4e4ea] pt-4">
                    <p className="text-[13px] font-medium text-[#6b6b75]">
                      자료에서 찾은 사실 {item.facts.length}건
                    </p>
                    <FactList facts={item.facts} />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {doc && (
          <p className="whitespace-pre-line text-sm text-[#6b6b75]">
            {doc.notice}
          </p>
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

        {busy && <Progress label="찾는 중이에요…" />}
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
                <li className={pill}>전임이 확정한 답변</li>
                {answer.hits.map((hit) => (
                  <li key={hit.annotation_id} className="flex flex-col gap-1">
                    {hit.item && (
                      <span className="w-fit text-[13px] font-medium text-[#6b6b75]">
                        {hit.item}
                      </span>
                    )}
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

      <section aria-label="전임 질문함" className="flex flex-col gap-4 pt-4">
        <h2 className={title}>후임이 남긴 질문</h2>
        <p className={lead}>
          기록이 없어서 후임이 전임에게 보낸 질문이에요. 직접 답해 주세요.
        </p>
        {inbox && inbox.length === 0 && (
          <p className="text-sm text-[#8b8b94]">아직 받은 질문이 없어요.</p>
        )}
        {inbox && inbox.length > 0 && (
          <ul className="flex flex-col gap-2">
            {inbox.map((q, i) => (
              <li
                key={`${q.asked_at}-${i}`}
                className="flex flex-col gap-0.5 rounded-2xl bg-[#f6f6f8] px-5 py-4"
              >
                <span className="text-base">{q.question}</span>
                <span className="text-[13px] text-[#8b8b94]">
                  {askedAt(q.asked_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
