import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createMockApi } from "../api/mockApi";
import type { Api, QuestionCard } from "../api/types";
import { elementLabel } from "../lib/checklist";
import { decide, tally, type Decision } from "../lib/interview";
import type { Annotation } from "../types";

// 서버가 준비되면 이 줄을 실제 구현으로 바꿔 끼운다.
const defaultApi = createMockApi();

const title = "text-[clamp(26px,4vw,40px)] font-medium leading-[1.08] tracking-[-0.035em]";
const lead = "text-[clamp(16px,2.2vw,20px)] font-light tracking-[-0.02em]";
const lineBox =
  "w-full resize-y rounded-none border-0 border-b border-black bg-transparent py-2 text-base placeholder:text-neutral-700";
const primaryButton =
  "w-fit rounded-[2px] border border-black bg-black px-6 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black disabled:hover:text-white";
const plainButton =
  "w-fit rounded-[2px] border border-black bg-white px-5 py-2.5 text-sm transition-colors hover:bg-black hover:text-white";

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
          (q) => !previouslyDecided.some((a) => a.item_id === q.item_id && a.element === q.element),
        );
        setIndex(firstOpen === -1 ? result.length : firstOpen);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "질문을 불러오지 못했어요"));
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

  function choose(decision: Decision) {
    if (!draft) return;
    try {
      const result = decide(draft, decision, editText); // 렌더 밖에서 계산해야 오류를 여기서 잡을 수 있다
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
  if (!cards) return <p role="status">질문을 불러오는 중이에요…</p>;

  if (index >= cards.length) {
    const { confirmed, rejected, skipped } = tally(decided, cards.length);
    return (
      <section className="flex flex-col gap-4">
        <h2 className={title}>질문을 모두 마쳤어요</h2>
        <p className={lead}>{`확정 ${confirmed} · 삭제 ${rejected} · 건너뜀 ${skipped}`}</p>
        <p className="text-sm">확정한 내용만 후임에게 보여요. 건너뛴 질문은 후임에게 "기록 없음"으로 답해요.</p>
        <Link to="/handbook" className={`${primaryButton} inline-block`}>
          문서 보기
        </Link>
      </section>
    );
  }

  const card = cards[index];
  const step = answers.length; // 0, 1, 2: 지금 보여줄 질문 단계
  const stage = draft ? "draft" : answers.length === STEP_KEYS.length ? "making" : "ask";

  return (
    <div className="flex flex-col gap-8">
      <p className="w-fit -rotate-[1.5deg] bg-sticker px-2.5 py-1 text-sm font-bold text-sticker-ink shadow-[0.1em_0.15em_0.3em_rgba(0,0,0,0.25)]">
        {`질문 ${index + 1} / ${cards.length}`}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className={title}>
          {card.item_title} · <b className="font-bold">{elementLabel(card.element)}</b>
        </h2>
        <p className="text-xs">
          {card.kind === "빈칸" ? "자료에 없는 내용이에요" : card.kind === "보완" ? "자료가 모호해서 보완이 필요해요" : "자료의 내용이 맞는지 확인해 주세요"}
        </p>
      </section>

      {answers.length > 0 && (
        <dl className="flex flex-col gap-3 border-t border-black pt-4 text-sm">
          {answers.map((answer, i) => (
            <div key={STEP_KEYS[i]} className="flex flex-col gap-0.5">
              <dt className="text-xs">{card[STEP_KEYS[i]]}</dt>
              <dd className="font-semibold">{answer || "(건너뜀)"}</dd>
            </div>
          ))}
        </dl>
      )}

      {busy && (
        <p role="status" className="text-sm font-bold">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          <b className="underline underline-offset-4">(오류)</b> {error}
        </p>
      )}

      {stage === "ask" && (
        <section className="flex flex-col gap-4">
          <p className={lead}>{card[STEP_KEYS[step]]}</p>
          <div className="flex flex-col gap-0.5">
            <label htmlFor="answer" className="text-xs">
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
            <button type="button" className={primaryButton} disabled={text.trim() === "" || busy !== null} onClick={() => finishStep(text)}>
              {step === STEP_KEYS.length - 1 ? "초안 만들기" : "다음 질문"}
            </button>
            <button type="button" className={plainButton} disabled={busy !== null} onClick={() => finishStep("")}>
              잘 모르겠어요
            </button>
            <button type="button" className="text-sm underline underline-offset-4" onClick={goNext}>
              이 질문 건너뛰기
            </button>
          </div>
        </section>
      )}

      {stage === "draft" && draft && (
        <section aria-label="초안 확인" className="flex flex-col gap-4 border-t border-black pt-4">
          <p className="text-xs">정리한 초안이에요 (확정 전). 맞는지 확인해 주세요.</p>
          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="draft-edit" className="text-xs">
                  초안 수정
                </label>
                <textarea id="draft-edit" rows={3} className={lineBox} value={editText} onChange={(e) => setEditText(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="button" className={primaryButton} onClick={() => choose("수정")}>
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
              <blockquote className="border-l-4 border-black pl-4 text-lg font-medium tracking-[-0.02em]">{draft.text}</blockquote>
              <p className="text-xs">출처: 전임 답변 ({draft.source.ids.join(", ")})</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={primaryButton} onClick={() => choose("맞음")}>
                  맞음
                </button>
                <button type="button" className={plainButton} onClick={() => setEditing(true)}>
                  수정
                </button>
                <button type="button" className={plainButton} onClick={() => choose("삭제")}>
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
