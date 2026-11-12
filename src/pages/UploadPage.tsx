import { useState, type ChangeEvent, type DragEvent } from "react";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import AnalysisView from "../components/AnalysisView";
import ItemsEditor from "../components/ItemsEditor";
import Progress from "../components/Progress";
import { classifyFile, type MaterialKind } from "../lib/materials";
import type { Item } from "../types";

type Step = "docs" | "items" | "result";

const STEPS: { key: Step; label: string }[] = [
  { key: "docs", label: "자료 올리기" },
  { key: "items", label: "항목 고르기" },
  { key: "result", label: "분석 결과" },
];

interface Entry {
  file: File;
  kind: MaterialKind;
}

const title = "text-[clamp(28px,4vw,40px)] font-light leading-[1.1] tracking-[-0.035em]";
const lead = "max-w-xl text-base tracking-[-0.01em] text-[#6b6b75]";
const primaryButton =
  "w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]";
const secondButton =
  "w-fit rounded-full bg-[#f1f1f4] px-5 py-3 text-sm text-[#2b2b33] transition-colors hover:bg-[#e4e4ea] disabled:cursor-not-allowed disabled:opacity-40";

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

export default function UploadPage({ api = defaultApi }: { api?: Api }) {
  const [step, setStep] = useState<Step>("docs");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [included, setIncluded] = useState<string[]>([]); // 분석에 넣을 항목 id
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<{ label: string; hint: string } | null>(null); // 진행 중일 때 보여줄 문구
  const [error, setError] = useState("");

  const documents = entries.filter((e) => e.kind === "문서");
  const chats = entries.filter((e) => e.kind === "카톡 대화");
  const pickedCount = items.filter((i) => included.includes(i.id)).length;

  // 문서와 카톡 대화는 둘 다 있어야 한다: 항목은 문서에서, 빠진 곳은 대화에서 찾는다.
  const missing =
    entries.length === 0
      ? ""
      : documents.length === 0
        ? "회칙·공지 같은 문서 파일도 필요해요. 업무 항목은 문서에서 뽑아요."
        : chats.length === 0
          ? "카톡 대화 파일도 필요해요. 업무마다 빠진 곳을 대화에서 찾아요."
          : "";

  async function addFiles(files: File[]) {
    const fresh = await Promise.all(files.map(async (file) => ({ file, kind: await classifyFile(file) })));
    setEntries((prev) => {
      const added: Entry[] = [];
      for (const entry of fresh) {
        if (![...prev, ...added].some((e) => sameFile(e.file, entry.file))) added.push(entry);
      }
      return [...prev, ...added];
    });
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // 같은 파일을 지웠다가 다시 올릴 수 있게 한다
    void addFiles(files);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  async function run<T>(message: string, hint: string, job: () => Promise<T>, onDone: (result: T) => void) {
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
      "대화를 분석하는 중이에요…",
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
      <ol aria-label="진행 단계" className="flex flex-wrap items-center gap-2 text-sm">
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
            정리 안 된 자료도 괜찮아요. 회칙, 공지, 카톡 대화, 메모까지 흩어진 자료를 있는 대로 다 넣어 주세요.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-[#1c1c22] bg-white" : "border-[#d9d9e0] bg-[#f6f6f8]"
            }`}
          >
            <input id="materials-input" type="file" multiple accept=".pdf,.txt" className="peer sr-only" onChange={onPick} />
            <label
              htmlFor="materials-input"
              className="cursor-pointer rounded-full bg-[#1c1c22] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#1c1c22]"
            >
              자료 파일 고르기 (PDF·TXT)
            </label>
            <span className="text-sm text-[#8b8b94]">여러 개를 한꺼번에 고르거나 끌어다 놓을 수 있어요. 나중에 더 추가해도 돼요.</span>
          </div>

          {entries.length > 0 && (
            <ul aria-label="올린 자료" className="flex flex-col gap-2">
              {entries.map(({ file, kind }) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  aria-label={file.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6f6f8] px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="truncate text-sm font-medium">{file.name}</span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs text-[#55555f]">{kind}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`${file.name} 지우기`}
                    onClick={() => setEntries((prev) => prev.filter((e) => !sameFile(e.file, file)))}
                    className="shrink-0 text-sm text-[#8b8b94] underline underline-offset-4 hover:text-[#1c1c22]"
                  >
                    지우기
                  </button>
                </li>
              ))}
            </ul>
          )}

          {missing && <p className="px-1 text-sm text-[#6b6b75]">{missing}</p>}

          <button
            type="button"
            className={primaryButton}
            disabled={documents.length === 0 || chats.length === 0 || busy !== null}
            onClick={extractItems}
          >
            항목 뽑기
          </button>
        </section>
      )}

      {step === "items" && (
        <section className="flex flex-col gap-5">
          <h2 className={title}>업무 항목 고르기</h2>
          <p className={lead}>분석할 항목에 체크하세요. 항목이 틀리면 뒤의 분석도 틀려져요. 빠진 항목은 아래에서 추가할 수 있어요.</p>
          <ItemsEditor items={items} onChange={setItems} included={included} onIncludedChange={setIncluded} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={pickedCount === 0 || busy !== null}
              onClick={analyze}
            >
              선택한 항목으로 분석하기
            </button>
            <button type="button" className={secondButton} disabled={busy !== null} onClick={() => setStep("docs")}>
              자료 더 올리기
            </button>
          </div>
        </section>
      )}

      {step === "result" && <AnalysisView api={api} initialItems={items} />}
    </div>
  );
}
