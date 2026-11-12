import { useState } from "react";
import type { Fact } from "../types";

const PREVIEW = 3;

/** 항목에서 찾은 사실. 많을 수 있어서 처음에는 앞의 몇 개만 보여주고 나머지는 접어 둔다. */
export default function FactList({ facts }: { facts: Fact[] }) {
  const [open, setOpen] = useState(false);
  if (facts.length === 0) return null;
  const shown = open ? facts : facts.slice(0, PREVIEW);
  const hidden = facts.length - PREVIEW;
  return (
    <div className="flex w-full flex-col gap-2 pt-1">
      <ul className="flex flex-col gap-1.5 text-sm text-[#3d3d46]">
        {shown.map((fact) => (
          <li key={fact.id} className="flex gap-2">
            {fact.date && <span className="shrink-0 text-[#8b8b94]">{fact.date}</span>}
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-fit text-[13px] text-[#6b6b75] underline underline-offset-4"
        >
          {open ? "접기" : `더 보기 (${hidden}개)`}
        </button>
      )}
    </div>
  );
}
