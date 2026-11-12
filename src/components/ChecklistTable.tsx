import { useState } from "react";
import {
  canCloseElement,
  cellVariant,
  elementLabel,
  evidenceText,
  stateLabel,
  summarize,
  topItems,
  type CellVariant,
  type Mode,
} from "../lib/checklist";
import { ELEMENT_KEYS, type ElementKey, type Item } from "../types";

// 검은 칸 = 채워진 정보, 하얀 점선 칸 = 빠진 정보(종이에 뚫린 구멍). 모양만으로 구분하지 않도록 칸 안에 글자도 함께 넣는다.
const VARIANT_STYLE: Record<CellVariant, string> = {
  ok: "bg-[#1c1c22] text-white",
  weak: "bg-[#6b6b75] text-white",
  missing: "border-[1.5px] border-dashed border-[#b4b4c0] bg-white text-black",
  vague: "hatch text-black",
  closed: "border border-[#cfcfd8] bg-transparent text-[#8b8b94] line-through",
};

const VARIANT_TEXT: Record<CellVariant, string> = {
  ok: "확인됨",
  weak: "확인 권장",
  missing: "없음",
  vague: "모호함",
  closed: "해당 없음",
};

// 칸 안에는 글자 대신 기호만 둔다(같은 말이 스무 번 반복되면 눈이 어지럽다). 뜻은 색 설명과 칸의 이름표(title·aria-label)로 전한다.
const GLYPH: Record<CellVariant, string> = { ok: "●", weak: "◐", missing: "", vague: "", closed: "–" };

interface Props {
  items: Item[];
  mode: Mode;
  onClose?: (itemId: string, key: ElementKey) => void;
}

export default function ChecklistTable({ items, mode, onClose }: Props) {
  const [selected, setSelected] = useState<{ itemId: string; key: ElementKey } | null>(null);
  const rows = topItems(items, items.length);
  const summary = summarize(items);

  const selectedItem = selected ? items.find((i) => i.id === selected.itemId) : undefined;
  const selectedElement = selectedItem && selected ? selectedItem.elements[selected.key] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="요약" className="flex flex-col gap-1 rounded-3xl bg-[#f6f6f8] px-5 py-4">
        <p className="text-lg tracking-[-0.02em]">
          먼저 물어볼 업무: <b className="font-bold">{summary.first?.title ?? "없음"}</b>
          {summary.first && ` (빈 곳 ${summary.first.score}/6)`}
        </p>
        <p className="text-sm">{`전체 ${summary.total}칸 중 확인됨 ${summary.counts.ok} · 빈 곳 ${summary.counts.weak + summary.counts.missing + summary.counts.vague}`}</p>
      </section>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="색 설명">
        {(Object.keys(VARIANT_TEXT) as CellVariant[]).map((variant) => (
          <li key={variant} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`flex h-5 w-8 items-center justify-center rounded-md text-[10px] ${VARIANT_STYLE[variant]}`}>
              {GLYPH[variant]}
            </span>
            {VARIANT_TEXT[variant]}
          </li>
        ))}
      </ul>

      <p className="text-xs md:hidden">표를 옆으로 밀어서 보세요</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
          <caption className="sr-only">항목 × 6요소 체크표</caption>
          <thead>
            <tr className="text-left text-xs text-[#55555f]">
              <th scope="col" className="paper sticky left-0 z-10 py-1 pr-3 font-normal">
                항목
              </th>
              {ELEMENT_KEYS.map((key) => (
                <th key={key} scope="col" className="px-1 py-1 font-normal">
                  {elementLabel(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="paper sticky left-0 z-10 py-2 pr-3 text-left text-sm font-semibold tracking-[-0.02em]">
                  {item.title}
                  <span className="block text-xs font-normal">빈 곳 {item.score}</span>
                </th>
                {ELEMENT_KEYS.map((key) => {
                  const element = item.elements[key];
                  const variant = cellVariant(element);
                  const isSelected = selected?.itemId === item.id && selected.key === key;
                  return (
                    <td key={key} className="p-0">
                      <button
                        type="button"
                        aria-label={`${item.title} · ${elementLabel(key)}: ${stateLabel(element)}`}
                        title={stateLabel(element)}
                        aria-pressed={isSelected}
                        onClick={() => setSelected({ itemId: item.id, key })}
                        className={`flex min-h-10 w-full items-center justify-center rounded-lg px-1 py-1 text-center text-xs ${VARIANT_STYLE[variant]} ${
                          isSelected ? "ring-2 ring-[#1c1c22] ring-offset-2 ring-offset-paper" : ""
                        }`}
                      >
                        <span aria-hidden="true">{GLYPH[variant]}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-label="선택한 칸 상세" className="rounded-3xl bg-[#f6f6f8] p-5 text-sm">
        {selectedItem && selected && selectedElement ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.02em]">
              {selectedItem.title} · {elementLabel(selected.key)}
            </h3>
            <p>{stateLabel(selectedElement)}</p>
            <p className="text-[#55555f]">
              {evidenceText(selectedItem, selectedElement) || "근거로 삼을 문장이 자료에 없어요."}
            </p>
            {canCloseElement(mode, selectedElement) && (
              <button
                type="button"
                onClick={() => onClose?.(selectedItem.id, selected.key)}
                className="w-fit rounded-full bg-[#f1f1f4] px-5 py-2.5 text-sm text-[#2b2b33] transition-colors hover:bg-[#e4e4ea] disabled:cursor-not-allowed disabled:opacity-40"
              >
                해당 없음으로 닫기
              </button>
            )}
            {mode === "후임" && <p className="text-xs">'해당 없음'으로 닫는 일은 전임만 할 수 있어요.</p>}
          </div>
        ) : (
          <p>칸을 눌러 근거를 확인하세요</p>
        )}
      </section>
    </div>
  );
}
