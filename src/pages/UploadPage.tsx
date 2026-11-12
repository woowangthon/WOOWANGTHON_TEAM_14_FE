import { useState } from "react";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import AnalysisView from "../components/AnalysisView";
import ItemsEditor from "../components/ItemsEditor";
import Progress from "../components/Progress";
import type { Item } from "../types";

type Step = "docs" | "items" | "chat" | "result";

const STEPS: { key: Step; label: string }[] = [
  { key: "docs", label: "확정 자료" },
  { key: "items", label: "항목 확인" },
  { key: "chat", label: "카톡 대화" },
  { key: "result", label: "분석 결과" },
];

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const fileInput =
  "block w-full rounded-2xl bg-[#f3f3f6] p-2 text-sm text-[#55555f] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#1c1c22] file:px-4 file:py-2 file:text-sm file:text-white";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";

export default function UploadPage({ api = defaultApi }: { api?: Api }) {
  const [step, setStep] = useState<Step>("docs");
  const [docs, setDocs] = useState<File[]>([]);
  const [chat, setChat] = useState<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<{ label: string; hint: string } | null>(
    null,
  ); // 진행 중일 때 보여줄 문구
  const [error, setError] = useState("");

  async function run<T>(
    message: string,
    hint: string,
    job: () => Promise<T>,
    onDone: (result: T) => void,
  ) {
    setBusy({ label: message, hint });
    setError("");
    try {
      onDone(await job());
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 났어요");
    } finally {
      setBusy(null);
    }
  }

  const extractItems = () =>
    run(
      "항목을 뽑는 중이에요…",
      "보통 5~15초 걸려요",
      () => api.uploadDocs(docs),
      (result) => {
        setItems(result);
        setStep("items");
      },
    );

  const analyzeChat = () =>
    run(
      "대화를 분석하는 중이에요…",
      "보통 30초~3분, 메시지가 많으면 더 걸려요. 창을 닫지 마세요",
      () => api.uploadChat(chat!, items),
      (result) => {
        setItems(result);
        setStep("result");
      },
    );

  return (
    <div className="flex flex-col gap-8">
      <ol
        aria-label="진행 단계"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        {STEPS.map((s, index) => (
          <li
            key={s.key}
            aria-current={s.key === step ? "step" : undefined}
            className={
              s.key === step
                ? "rounded-full bg-[#1c1c22] px-3.5 py-1.5 font-medium text-white"
                : "rounded-full bg-[#f1f1f4] px-3.5 py-1.5 text-[#8b8b94]"
            }
          >
            {index + 1} {s.label}
          </li>
        ))}
      </ol>

      {busy && <Progress label={busy.label} hint={busy.hint} />}
      {error && (
        <p role="alert" className="text-sm">
          <b className="underline underline-offset-4">(오류)</b> {error}
        </p>
      )}

      {step === "docs" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>확정 자료 올리기</h2>
          <p className="max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]">
            정리 안 된 자료도 괜찮아요. 회칙, 공지문, 메모까지 있는 대로 다 넣어
            주세요.
          </p>
          <label
            htmlFor="docs-input"
            className="px-1 text-[13px] text-[#6b6b75]"
          >
            확정 자료 (PDF·TXT)
          </label>
          <input
            id="docs-input"
            type="file"
            multiple
            accept=".pdf,.txt"
            className={fileInput}
            onChange={(e) => setDocs(Array.from(e.target.files ?? []))}
          />
          {docs.length > 0 && (
            <p className="px-1 text-[13px] text-[#6b6b75]">
              고른 파일: {docs.map((f) => f.name).join(", ")}
            </p>
          )}
          <button
            type="button"
            className={primaryButton}
            disabled={docs.length === 0 || busy !== null}
            onClick={extractItems}
          >
            항목 뽑기
          </button>
        </section>
      )}

      {step === "items" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>업무 항목 확인</h2>
          <p className="max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]">
            항목이 틀리면 뒤의 분석도 틀려져요. 합치거나 빼거나 추가해 주세요.
          </p>
          <ItemsEditor items={items} onChange={setItems} />
          <button
            type="button"
            className={primaryButton}
            disabled={items.length === 0}
            onClick={() => setStep("chat")}
          >
            항목 확인
          </button>
        </section>
      )}

      {step === "chat" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>카톡 대화 올리기</h2>
          <p className="max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]">
            카톡 대화 내보내기 파일(TXT)을 통째로 올려 주세요. 개인정보는 미리
            가명으로 바꾼 파일을 권해요.
          </p>
          <label
            htmlFor="chat-input"
            className="px-1 text-[13px] text-[#6b6b75]"
          >
            카톡 대화 (TXT)
          </label>
          <input
            id="chat-input"
            type="file"
            accept=".txt"
            className={fileInput}
            onChange={(e) => setChat(e.target.files?.[0] ?? null)}
          />
          {chat && (
            <p className="px-1 text-[13px] text-[#6b6b75]">
              고른 파일: {chat.name}
            </p>
          )}
          <button
            type="button"
            className={primaryButton}
            disabled={!chat || busy !== null}
            onClick={analyzeChat}
          >
            분석하기
          </button>
        </section>
      )}

      {step === "result" && <AnalysisView api={api} initialItems={items} />}
    </div>
  );
}
