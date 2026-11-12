import { useState, type FormEvent } from "react";
import { addItem, mergeItems, removeItem } from "../lib/items";
import type { Item } from "../types";

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
}

const lineInput =
  "w-full rounded-none border-0 border-b border-black bg-transparent py-2 text-base placeholder:text-neutral-700";

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
        <p className="text-sm font-semibold">{`항목 ${items.length}개`}</p>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={merge}
            disabled={selectedIds.length < 2}
            className="rounded-[2px] border border-black bg-white px-4 py-2 text-sm transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-black"
          >
            선택한 항목 합치기
          </button>
          <span className="text-xs text-neutral-900">두 개 이상 고르면 먼저 고른 항목에 합쳐져요</span>
        </div>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2">
        {items.map((item, index) => {
          const picked = selectedIds.includes(item.id);
          return (
            <li
              key={item.id}
              aria-label={item.title}
              className={`flex flex-col gap-3 bg-[#f4f3ef] p-4 shadow-[0_2px_5px_rgba(0,0,0,0.28)] transition-transform ${
                index % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.5deg]"
              } ${picked ? "outline outline-[3px] outline-black" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    aria-label={`${item.title} 선택`}
                    checked={picked}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 accent-black"
                  />
                  <span aria-hidden="true" className="text-xs font-light tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </label>
                {picked && <span className="bg-black px-1.5 py-0.5 text-[11px] font-bold text-white">선택됨</span>}
              </div>
              <h3 className="text-2xl font-bold leading-tight tracking-[-0.03em]">{item.title}</h3>
              <ul className="flex flex-1 flex-wrap content-start gap-1.5">
                {item.keywords.map((keyword) => (
                  <li key={keyword}>
                    <span className="border border-black px-1.5 py-0.5 text-xs">{keyword}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                aria-label={`${item.title} 빼기`}
                onClick={() => remove(item.id)}
                className="w-fit self-end text-sm underline underline-offset-4"
              >
                빼기
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="new-item-name" className="text-xs text-neutral-900">
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
        <div className="flex flex-col gap-0.5">
          <label htmlFor="new-item-keywords" className="text-xs text-neutral-900">
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
          className="rounded-[2px] border border-black bg-black px-5 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black disabled:hover:text-white"
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
