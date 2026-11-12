import { useState, type FormEvent } from "react";
import { addItem, mergeItems, removeItem } from "../lib/items";
import type { Item } from "../types";

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
}

const lineInput =
  "w-full rounded-2xl border border-transparent bg-[#f3f3f6] px-4 py-2.5 text-base placeholder:text-[#9a9aa4] focus:border-[#1c1c22] focus:bg-white focus:outline-none";

/** 확정 자료에서 뽑은 업무 항목을 전임이 확인하는 화면: 합치기·빼기·추가. 항목이 틀리면 뒤가 다 틀리므로 여기서 사람이 바로잡는다. */
export default function ItemsEditor({ items, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>([]); // 고른 순서를 지킨다
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("");

  // 이미 빠진 항목이 선택에 남아 있어도 세지 않는다
  const selectedIds = selected.filter((id) => items.some((i) => i.id === id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function merge() {
    onChange(mergeItems(items, selectedIds));
    setSelected([]);
  }

  function remove(id: string) {
    onChange(removeItem(items, id));
    setSelected((prev) => prev.filter((x) => x !== id));
  }

  function add(event: FormEvent) {
    event.preventDefault();
    const next = addItem(items, name, keywords);
    if (next === items) {
      setMessage("이미 있는 항목이에요");
      return;
    }
    onChange(next);
    setName("");
    setKeywords("");
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#55555f]">{`항목 ${items.length}개`}</p>
        <div className="flex flex-col items-end gap-1">
          <button type="button" onClick={merge} disabled={selectedIds.length < 2} className="w-fit rounded-full bg-[#f1f1f4] px-5 py-2.5 text-sm text-[#2b2b33] transition-colors hover:bg-[#e4e4ea] disabled:cursor-not-allowed disabled:opacity-40">
            선택한 항목 합치기
          </button>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const picked = selectedIds.includes(item.id);
          return (
            <li
              key={item.id}
              aria-label={item.title}
              className={`flex flex-col gap-3 rounded-3xl p-5 transition-colors ${
                picked ? "bg-white ring-2 ring-[#1c1c22]" : "bg-[#f6f6f8]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    aria-label={`${item.title} 선택`}
                    checked={picked}
                    onChange={() => toggle(item.id)}
                    className="h-5 w-5 accent-[#1c1c22]"
                  />
                </label>
                {picked && <span className="rounded-full bg-[#1c1c22] px-2.5 py-0.5 text-[11px] font-medium text-white">선택됨</span>}
              </div>
              <h3 className="text-xl font-semibold leading-tight tracking-[-0.03em]">{item.title}</h3>
              <ul className="flex flex-1 flex-wrap content-start gap-1.5">
                {item.keywords.map((keyword) => (
                  <li key={keyword}>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#55555f]">{keyword}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                aria-label={`${item.title} 빼기`}
                onClick={() => remove(item.id)}
                className="w-fit self-end text-sm text-[#8b8b94] underline underline-offset-4 hover:text-[#1c1c22]"
              >
                빼기
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="grid gap-4 rounded-3xl bg-[#f6f6f8] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-item-name" className="px-1 text-[13px] text-[#6b6b75]">
            새 항목 이름
          </label>
          <input
            id="new-item-name"
            className={lineInput}
            placeholder="예: 장비 관리"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setMessage("");
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-item-keywords" className="px-1 text-[13px] text-[#6b6b75]">
            키워드 (쉼표로 구분)
          </label>
          <input
            id="new-item-keywords"
            className={lineInput}
            placeholder="예: 장비, 보관"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={name.trim() === ""}
          className="w-fit rounded-full bg-[#1c1c22] px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a2fd8] disabled:cursor-not-allowed disabled:bg-[#d9d9e0] disabled:text-[#8b8b94] disabled:hover:bg-[#d9d9e0]"
        >
          항목 추가
        </button>
        {message && (
          <p role="alert" className="text-sm sm:col-span-3">
            <b className="underline underline-offset-4">(오류)</b> {message}
          </p>
        )}
      </form>
    </div>
  );
}
