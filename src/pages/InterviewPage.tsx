import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { defaultApi } from "../api";
import type { Api, QuestionCard } from "../api/types";
import Progress from "../components/Progress";
import { elementLabel } from "../lib/checklist";
import { decide, tally, type Decision } from "../lib/interview";
import type { Annotation } from "../types";

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const lead = "text-[clamp(18px,2.4vw,22px)] tracking-[-0.02em]";
const lineBox =
  "w-full resize-y rounded-2xl border border-transparent bg-[#f3f3f6] px-4 py-3 text-base placeholder:text-[#9a9aa4] focus:border-[#1c1c22] focus:bg-white focus:outline-none";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";
const plainButton =
  "w-fit rounded-full bg-[#f1f1f4] px-5 py-2.5 text-sm text-[#2b2b33] transition-colors hover:bg-[#e4e4ea] disabled:cursor-not-allowed disabled:opacity-40";

const STEP_KEYS = ["step1", "step2", "step3"] as const;

/** 화면 2: AI가 만든 질문을 전임이 3단계로 답하고, 정리된 초안을 맞음·수정·삭제로 확정한다. 확정된 것만 후임에게 간다. */
export default function InterviewPage({
  api = defaultApi,
  onDecide,
  decided: previouslyDecided = [],
}: {
  api?: Api;
  /** 이전에 이미 결정한 주석들. 같은 항목·요소의 질문은 다시 묻지 않고 이어서 시작한다. */
  decided?: Annotation[];
  /** 전임이 결정할 때마다 불린다. 화면 3이 쓰도록 바깥에서 모은다. */
  onDecide?: (annotation: Annotation, itemTitle: string) => void;
}) {
  const [cards, setCards] = useState<QuestionCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]); // 지금 질문에서 이미 한 답변 (건너뛴 단계는 빈 문자열)
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [decided, setDecided] = useState<Annotation[]>(previouslyDecided);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .getQuestions()
      .then((result) => {
        if (!alive) return;
        setCards(result);
        const firstOpen = result.findIndex(
          (q) =>
            !previouslyDecided.some(
              (a) => a.item_id === q.item_id && a.element === q.element,
            ),
        );
        setIndex(firstOpen === -1 ? result.length : firstOpen);
      })
      .catch(
        (e: unknown) =>
          alive &&
          setError(e instanceof Error ? e.message : "질문을 불러오지 못했어요"),
      );
    return () => {
      alive = false;
    };
    // 처음 들어올 때만 이어서 시작할 자리를 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function goNext() {
    setIndex((i) => i + 1);
    setAnswers([]);
    setText("");
    setDraft(null);
    setEditing(false);
    setEditText("");
    setError("");
  }

  async function finishStep(answer: string) {
    if (!cards) return;
    const next = [...answers, answer.trim()];
    setError("");
    if (next.length < STEP_KEYS.length) {
      setAnswers(next);
      setText("");
      return;
    }
    if (next.every((a) => a === "")) {
      goNext(); // 아무 답도 없으면 지어내지 않고 이 질문은 비워 둔 채 넘어간다
      return;
    }
    setAnswers(next);
    setBusy("초안을 만드는 중이에요…");
    try {
      const result = await api.draftAnnotation(cards[index], next);
      setDraft(result);
      setEditText(result.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "초안을 만들지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  async function choose(decision: Decision) {
    if (!draft) return;
    try {
      const result = decide(draft, decision, editText); // 렌더 밖에서 계산해야 오류를 여기서 잡을 수 있다
      await api.saveDecision?.(result); // 서버가 있으면 서버에 먼저 저장한다. 실패하면 넘어가지 않는다.
      setDecided((prev) => [...prev, result]);
      onDecide?.(result, cards?.[index]?.item_title ?? result.item_id);
      goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요");
    }
  }

  if (error && !cards) {
    return (
      <p role="alert" className="text-sm">
        <b className="underline underline-offset-4">(오류)</b> {error}
      </p>
    );
  }
  if (!cards)
    return (
      <Progress
        label="질문을 불러오는 중이에요…"
        hint="처음에는 보통 10~20초 걸려요"
      />
    );

  if (index >= cards.length) {
    const { confirmed, rejected, skipped } = tally(decided, cards.length);
    return (
      <section className="flex flex-col gap-4">
        <h2 className={title}>질문을 모두 마쳤어요</h2>
        <p
          className={lead}
        >{`확정 ${confirmed} · 삭제 ${rejected} · 건너뜀 ${skipped}`}</p>
        <p className="text-sm text-[#6b6b75]">
          확정한 내용만 후임에게 보여요. 건너뛴 질문은 "기록 없음"으로 답해요.
        </p>
        <Link to="/handbook" className={`${primaryButton} inline-block`}>
          문서 보기
        </Link>
      </section>
    );
  }

  const card = cards[index];
  const step = answers.length; // 0, 1, 2: 지금 보여줄 질문 단계
  const stage = draft
    ? "draft"
    : answers.length === STEP_KEYS.length
      ? "making"
      : "ask";

  return (
    <div className="flex flex-col gap-8">
      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f1f1f4] px-3.5 py-1.5 text-sm font-medium">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#6f62ff] to-[#3a2fd8]"
        />
        {`질문 ${index + 1} / ${cards.length}`}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className={title}>
          {card.item_title} ·{" "}
          <b className="font-semibold">{elementLabel(card.element)}</b>
        </h2>
        <p className="text-[13px] text-[#6b6b75]">
          {card.kind === "빈칸"
            ? "자료에 없는 내용이에요"
            : card.kind === "보완"
              ? "자료가 모호해서 보완이 필요해요"
              : "자료의 내용이 맞는지 확인해 주세요"}
        </p>
      </section>

      {answers.length > 0 && (
        <dl className="flex flex-col gap-4 rounded-3xl bg-[#f6f6f8] p-6 text-base">
          {answers.map((answer, i) => (
            <div key={STEP_KEYS[i]} className="flex flex-col gap-0.5">
              <dt className="text-sm text-[#6b6b75]">{card[STEP_KEYS[i]]}</dt>
              <dd className="font-semibold">{answer || "(건너뜀)"}</dd>
            </div>
          ))}
        </dl>
      )}

      {busy && <Progress label={busy} hint="보통 3~5초 걸려요" />}
      {error && (
        <p role="alert" className="text-sm">
          <b className="underline underline-offset-4">(오류)</b> {error}
        </p>
      )}

      {stage === "ask" && (
        <section className="flex flex-col gap-4">
          <p className={lead}>{card[STEP_KEYS[step]]}</p>
          <div className="flex flex-col gap-0.5">
            <label htmlFor="answer" className="px-1 text-[13px] text-[#6b6b75]">
              답변
            </label>
            <textarea
              id="answer"
              rows={3}
              className={lineBox}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="기억나는 대로 편하게 적어 주세요"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={text.trim() === "" || busy !== null}
              onClick={() => finishStep(text)}
            >
              {step === STEP_KEYS.length - 1 ? "초안 만들기" : "다음 질문"}
            </button>
            <button
              type="button"
              className={plainButton}
              disabled={busy !== null}
              onClick={() => finishStep("")}
            >
              잘 모르겠어요
            </button>
            <button
              type="button"
              className="text-sm text-[#8b8b94] underline underline-offset-4 hover:text-[#1c1c22]"
              onClick={goNext}
            >
              이 질문 건너뛰기
            </button>
          </div>
        </section>
      )}

      {stage === "draft" && draft && (
        <section
          aria-label="초안 확인"
          className="flex flex-col gap-4 rounded-3xl bg-[#f6f6f8] p-6"
        >
          <p className="text-[13px] text-[#6b6b75]">
            초안이에요. 맞는지 확인해 주세요.
          </p>
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor="draft-edit"
                  className="px-1 text-[13px] text-[#6b6b75]"
                >
                  초안 수정
                </label>
                <textarea
                  id="draft-edit"
                  rows={3}
                  className={lineBox}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => choose("수정")}
                >
                  수정 저장
                </button>
                <button
                  type="button"
                  className={plainButton}
                  onClick={() => {
                    setEditing(false);
                    setEditText(draft.text);
                    setError("");
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <blockquote className="text-lg font-medium tracking-[-0.02em]">
                {draft.text}
              </blockquote>
              <p className="text-[13px] text-[#8b8b94]">출처: 전임 답변</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => choose("맞음")}
                >
                  맞음
                </button>
                <button
                  type="button"
                  className={plainButton}
                  onClick={() => setEditing(true)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className={plainButton}
                  onClick={() => choose("삭제")}
                >
                  삭제
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
