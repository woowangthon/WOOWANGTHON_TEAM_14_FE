import { useState, type ChangeEvent, type DragEvent } from "react";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import AnalysisView from "../components/AnalysisView";
import ItemsEditor from "../components/ItemsEditor";
import Progress from "../components/Progress";
import { classifyFile, type MaterialKind } from "../lib/materials";
import type { Item } from "../types";

type Step = "docs" | "items" | "chat" | "result";

const STEPS: { key: Step; label: string }[] = [
  { key: "docs", label: "자료 올리기" },
  { key: "items", label: "항목 고르기" },
  { key: "chat", label: "카톡에서 내용 뽑기" },
  { key: "result", label: "분석 결과" },
];

interface Entry {
  file: File;
  kind: MaterialKind;
}

const title =
  "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const lead = "max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";
const secondButton =
  "w-fit rounded-full bg-[#f1f1f4] px-5 py-3 text-sm text-[#2b2b33] transition-colors hover:bg-[#e4e4ea] disabled:cursor-not-allowed disabled:opacity-40";
const pickButton =
  "cursor-pointer rounded-full bg-[#1c1c22] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#1c1c22]";

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
const keyOf = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

/** 올린 파일 한 줄: 이름, 종류, 지우기. */
function FileRow({ entry, onRemove }: { entry: Entry; onRemove: () => void }) {
  return (
    <li
      aria-label={entry.file.name}
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6f6f8] px-4 py-3"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-medium">{entry.file.name}</span>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs text-[#55555f]">
          {entry.kind}
        </span>
      </span>
      <button
        type="button"
        aria-label={`${entry.file.name} 지우기`}
        onClick={onRemove}
        className="shrink-0 text-sm text-[#8b8b94] underline underline-offset-4 hover:text-[#1c1c22]"
      >
        지우기
      </button>
    </li>
  );
}

export default function UploadPage({
  api = defaultApi,
  onNext,
}: {
  api?: Api;
  /** 분석 결과를 확인한 뒤 질문 화면으로 넘어갈 때 부른다. */
  onNext?: () => void;
}) {
  const [step, setStep] = useState<Step>("docs");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [included, setIncluded] = useState<string[]>([]); // 분석에 넣을 항목 id
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<{ label: string; hint: string } | null>(
    null,
  ); // 진행 중일 때 보여줄 문구
  const [error, setError] = useState("");

  const documents = entries.filter((e) => e.kind === "문서");
  const chats = entries.filter((e) => e.kind === "카톡 대화");
  const pickedCount = items.filter((i) => included.includes(i.id)).length;

  // 항목은 문서에서 뽑는다. 카톡은 여기서 같이 넣어도, 카톡 단계에서 넣어도 된다.
  const note =
    entries.length === 0
      ? ""
      : documents.length === 0
        ? "회칙·공지 같은 문서 파일도 필요해요. 업무 항목은 문서에서 뽑아요."
        : chats.length === 0
          ? "카톡 대화는 다음 단계에서 넣어도 돼요."
          : "";

  function addEntries(fresh: Entry[]) {
    setEntries((prev) => {
      const added: Entry[] = [];
      for (const entry of fresh) {
        if (![...prev, ...added].some((e) => sameFile(e.file, entry.file)))
          added.push(entry);
      }
      return [...prev, ...added];
    });
  }

  async function addFiles(files: File[]) {
    addEntries(
      await Promise.all(
        files.map(async (file) => ({ file, kind: await classifyFile(file) })),
      ),
    );
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // 같은 파일을 지웠다가 다시 올릴 수 있게 한다
    void addFiles(files);
  }

  // 카톡 단계에서 고른 파일은 사용자가 카톡이라고 한 것이니, 내용을 따지지 않고 카톡 대화로 받는다.
  function onPickChat(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    addEntries(files.map((file) => ({ file, kind: "카톡 대화" as const })));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

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
      () => api.uploadDocs(documents.map((e) => e.file)),
      (result) => {
        setItems(result);
        setIncluded(result.map((i) => i.id)); // 처음에는 모두 선택
        setStep("items");
      },
    );

  const analyze = () =>
    run(
      "카톡에서 내용을 뽑는 중이에요…",
      "보통 30초~3분, 메시지가 많으면 더 걸려요. 창을 닫지 마세요",
      () =>
        api.uploadChat(
          chats.map((e) => e.file),
          items.filter((i) => included.includes(i.id)),
        ),
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
        <section className="flex flex-col gap-5">
          <h2 className={title}>흩어진 자료 모두 올리기</h2>
          <p className={lead}>
            정리 안 된 자료도 괜찮아요. 회칙, 공지, 카톡 대화, 메모까지 흩어진
            자료를 있는 대로 다 넣어 주세요.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? "border-[#1c1c22] bg-white"
                : "border-[#d9d9e0] bg-[#f6f6f8]"
            }`}
          >
            <input
              id="materials-input"
              type="file"
              multiple
              accept=".pdf,.txt"
              className="peer sr-only"
              onChange={onPick}
            />
            <label htmlFor="materials-input" className={pickButton}>
              자료 파일 고르기 (PDF·TXT)
            </label>
            <span className="text-sm text-[#8b8b94]">
              여러 개를 한꺼번에 고르거나 끌어다 놓을 수 있어요. 나중에 더
              추가해도 돼요.
            </span>
          </div>

          {entries.length > 0 && (
            <ul aria-label="올린 자료" className="flex flex-col gap-2">
              {entries.map((entry) => (
                <FileRow
                  key={keyOf(entry.file)}
                  entry={entry}
                  onRemove={() =>
                    setEntries((prev) =>
                      prev.filter((e) => !sameFile(e.file, entry.file)),
                    )
                  }
                />
              ))}
            </ul>
          )}

          {note && <p className="px-1 text-sm text-[#6b6b75]">{note}</p>}

          <button
            type="button"
            className={primaryButton}
            disabled={documents.length === 0 || busy !== null}
            onClick={extractItems}
          >
            항목 뽑기
          </button>
        </section>
      )}

      {step === "items" && (
        <section className="flex flex-col gap-5">
          <h2 className={title}>업무 항목 고르기</h2>
          <p className={lead}>
            분석할 항목에 체크하세요. 항목이 틀리면 뒤의 분석도 틀려져요. 빠진
            항목은 아래에서 추가할 수 있어요.
          </p>
          <ItemsEditor
            items={items}
            onChange={setItems}
            included={included}
            onIncludedChange={setIncluded}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={pickedCount === 0 || busy !== null}
              onClick={() => setStep("chat")}
            >
              카톡으로 넘어가기
            </button>
            <button
              type="button"
              className={secondButton}
              disabled={busy !== null}
              onClick={() => setStep("docs")}
            >
              자료 더 올리기
            </button>
          </div>
        </section>
      )}

      {step === "chat" && (
        <section className="flex flex-col gap-5">
          <h2 className={title}>카톡에서 내용 뽑기</h2>
          <p className={lead}>
            고른 항목마다 카톡 대화에서 날짜, 한 일, 결정을 찾아요. 업무마다
            빠진 곳도 여기서 가려내요. 개인정보는 미리 가명으로 바꾼 파일을
            권해요.
          </p>
          <p className="px-1 text-sm font-medium text-[#55555f]">{`고른 항목 ${pickedCount}개 · 카톡 대화 ${chats.length}개`}</p>

          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[#d9d9e0] bg-[#f6f6f8] px-6 py-8 text-center">
            <input
              id="chat-input"
              type="file"
              multiple
              accept=".txt"
              className="peer sr-only"
              onChange={onPickChat}
            />
            <label htmlFor="chat-input" className={pickButton}>
              카톡 대화 파일 고르기 (TXT)
            </label>
            <span className="text-sm text-[#8b8b94]">
              카톡 대화 내보내기 파일을 통째로 올려 주세요. 여러 개도 돼요.
            </span>
          </div>

          {chats.length > 0 && (
            <ul aria-label="올린 카톡 대화" className="flex flex-col gap-2">
              {chats.map((entry) => (
                <FileRow
                  key={keyOf(entry.file)}
                  entry={entry}
                  onRemove={() =>
                    setEntries((prev) =>
                      prev.filter((e) => !sameFile(e.file, entry.file)),
                    )
                  }
                />
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={
                chats.length === 0 || pickedCount === 0 || busy !== null
              }
              onClick={analyze}
            >
              카톡에서 내용 뽑기
            </button>
            <button
              type="button"
              className={secondButton}
              disabled={busy !== null}
              onClick={() => setStep("items")}
            >
              항목 다시 고르기
            </button>
          </div>
        </section>
      )}

      {step === "result" && (
        <>
          <AnalysisView api={api} initialItems={items} />
          {onNext && (
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/95 p-4 shadow-[0_10px_40px_-12px_rgba(20,20,40,0.35)] ring-1 ring-[#ececf0] backdrop-blur">
              <p className="px-2 text-sm text-[#55555f]">
                필요 없는 칸은 지금 닫아 주세요. 질문을 만든 뒤에는 바꿀 수
                없어요.
              </p>
              <button type="button" className={primaryButton} onClick={onNext}>
                질문으로 넘어가기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
