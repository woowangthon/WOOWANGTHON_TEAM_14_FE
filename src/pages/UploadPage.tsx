import { useState } from "react";
import { createMockApi } from "../api/mockApi";
import type { Api } from "../api/types";
import AnalysisView from "../components/AnalysisView";
import ItemsEditor from "../components/ItemsEditor";
import type { Item } from "../types";

// 서버(API 2·3·4)가 준비되면 이 줄을 실제 구현으로 바꿔 끼운다.
const defaultApi = createMockApi();

type Step = "docs" | "items" | "chat" | "result";

const STEPS: { key: Step; label: string }[] = [
  { key: "docs", label: "확정 자료" },
  { key: "items", label: "항목 확인" },
  { key: "chat", label: "카톡 대화" },
  { key: "result", label: "분석 결과" },
];

const title = "text-[clamp(26px,4vw,40px)] font-medium leading-[1.08] tracking-[-0.035em]";
const fileInput =
  "block w-full rounded-none border-0 border-b border-black bg-transparent pb-2 text-sm file:mr-3 file:cursor-pointer file:border file:border-black file:bg-white file:px-3 file:py-2 file:text-sm file:text-black";
const primaryButton =
  "w-fit rounded-[2px] border border-black bg-black px-6 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black disabled:hover:text-white";

export default function UploadPage({ api = defaultApi }: { api?: Api }) {
  const [step, setStep] = useState<Step>("docs");
  const [docs, setDocs] = useState<File[]>([]);
  const [chat, setChat] = useState<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // 진행 중일 때 보여줄 문구
  const [error, setError] = useState("");

  async function run<T>(message: string, job: () => Promise<T>, onDone: (result: T) => void) {
    setBusy(message);
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
    run("항목을 뽑는 중이에요…", () => api.uploadDocs(docs), (result) => {
      setItems(result);
      setStep("items");
    });

  const analyzeChat = () =>
    run("대화를 분석하는 중이에요…", () => api.uploadChat(chat!, items), (result) => {
      setItems(result);
      setStep("result");
    });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-xs text-neutral-900">
        지금은 <b>목 데이터</b>로 보는 화면이에요. 올린 파일의 내용은 읽지 않고, 동아리 업무를 예로 든 가상 자료가 나옵니다.
        백엔드가 연결되면 입력한 조직의 자료로 바뀝니다.
      </p>

      <ol aria-label="진행 단계" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {STEPS.map((s, index) => (
          <li
            key={s.key}
            aria-current={s.key === step ? "step" : undefined}
            className={
              s.key === step
                ? "-rotate-[1.5deg] bg-sticker px-2.5 py-1 font-bold text-sticker-ink shadow-[0.1em_0.15em_0.3em_rgba(0,0,0,0.25)]"
                : "text-neutral-900"
            }
          >
            {index + 1} {s.label}
          </li>
        ))}
      </ol>

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

      {step === "docs" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>확정 자료 올리기</h2>
          <p className="text-[clamp(16px,2.2vw,20px)] font-light tracking-[-0.02em]">
            정리 안 된 자료도 괜찮아요. 회칙, 규정, 공지문, 메모, 엑셀에서 복사한 글까지 있는 대로 다 넣어 주세요.
            순서가 뒤죽박죽이어도, 겹쳐도 상관없어요. 정리는 Handoff가 하고, 여기서 업무 항목을 뽑아요.
          </p>
          <label htmlFor="docs-input" className="text-xs text-neutral-900">
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
          {docs.length > 0 && <p className="text-xs">고른 파일: {docs.map((f) => f.name).join(", ")}</p>}
          <button type="button" className={primaryButton} disabled={docs.length === 0 || busy !== null} onClick={extractItems}>
            항목 뽑기
          </button>
        </section>
      )}

      {step === "items" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>업무 항목 확인</h2>
          <p className="text-[clamp(16px,2.2vw,20px)] font-light tracking-[-0.02em]">
            항목이 틀리면 뒤의 분석이 모두 틀려져요. 합치거나 빼거나 추가해서 바로잡은 뒤 확인해 주세요.
          </p>
          <ItemsEditor items={items} onChange={setItems} />
          <button type="button" className={primaryButton} disabled={items.length === 0} onClick={() => setStep("chat")}>
            항목 확인
          </button>
        </section>
      )}

      {step === "chat" && (
        <section className="flex flex-col gap-4">
          <h2 className={title}>카톡 대화 올리기</h2>
          <p className="text-[clamp(16px,2.2vw,20px)] font-light tracking-[-0.02em]">
            카카오톡 대화 내보내기 파일(TXT)도 거르지 말고 통째로 올려 주세요. 잡담이 섞여 있어도 괜찮아요. 다만 개인정보는
            미리 가명으로 바꾼 파일을 권해요.
          </p>
          <label htmlFor="chat-input" className="text-xs text-neutral-900">
            카톡 대화 (TXT)
          </label>
          <input
            id="chat-input"
            type="file"
            accept=".txt"
            className={fileInput}
            onChange={(e) => setChat(e.target.files?.[0] ?? null)}
          />
          {chat && <p className="text-xs">고른 파일: {chat.name}</p>}
          <button type="button" className={primaryButton} disabled={!chat || busy !== null} onClick={analyzeChat}>
            분석하기
          </button>
        </section>
      )}

      {step === "result" && <AnalysisView initialItems={items} />}
    </div>
  );
}
