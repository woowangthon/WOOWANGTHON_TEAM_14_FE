import { useState, type FormEvent } from "react";
import { addItem } from "../lib/items";
import type { Item } from "../types";

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
  /** 분석에 넣을 항목의 id. 체크를 풀면 빠진다. */
  included: string[];
  onIncludedChange: (ids: string[]) => void;
}

const lineInput =
  "w-full rounded-2xl border border-transparent bg-[#f3f3f6] px-4 py-2.5 text-base placeholder:text-[#9a9aa4] focus:border-[#1c1c22] focus:bg-white focus:outline-none";
const labelClass = "px-1 text-[13px] text-[#6b6b75]";

/** 자료에서 뽑은 업무 항목을 전임이 고르는 화면: 분석할 항목에 체크하고, 빠진 항목은 직접 추가한다. */
export default function ItemsEditor({ items, onChange, included, onIncludedChange }: Props) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("");

  const picked = items.filter((item) => included.includes(item.id));

  const toggle = (id: string) =>
    onIncludedChange(included.includes(id) ? included.filter((x) => x !== id) : [...included, id]);

  function add(event: FormEvent) {
    event.preventDefault();
    const next = addItem(items, name, keywords);
    if (next === items) {
      setMessage("이미 있는 항목이에요");
      return;
    }
    const created = next.find((item) => !items.some((old) => old.id === item.id));
    onChange(next);
    if (created) onIncludedChange([...included, created.id]); // 직접 추가한 항목은 처음부터 선택돼 있다
    setName("");
    setKeywords("");
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm font-medium text-[#55555f]">{`항목 ${items.length}개 중 ${picked.length}개 선택`}</p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const on = included.includes(item.id);
          return (
            <li
              key={item.id}
              aria-label={item.title}
              className={`rounded-3xl transition-colors ${on ? "bg-white ring-2 ring-[#1c1c22]" : "bg-[#f6f6f8] opacity-70"}`}
            >
              <label className="flex cursor-pointer items-start gap-3 p-5">
                <input
                  type="checkbox"
                  aria-label={`${item.title} 선택`}
                  checked={on}
                  onChange={() => toggle(item.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#1c1c22]"
                />
                <span className="flex min-w-0 flex-col gap-3">
                  <h3 className="text-xl font-semibold leading-tight tracking-[-0.03em]">{item.title}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {item.keywords.map((keyword) => (
                      <li key={keyword}>
                        <span className="rounded-full bg-[#f1f1f4] px-2.5 py-1 text-xs text-[#55555f]">{keyword}</span>
                      </li>
                    ))}
                  </ul>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="grid gap-4 rounded-3xl bg-[#f6f6f8] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-item-name" className={labelClass}>
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
          <label htmlFor="new-item-keywords" className={labelClass}>
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
