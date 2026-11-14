// 색색의 유리 느낌 폴더. 화면마다 색이 정해져 있다: 자료=노랑, 질문=남보라, 문서=하늘.
export type FolderTone = "yellow" | "indigo" | "sky";

export const TONE: Record<
  FolderTone,
  { from: string; to: string; shade: string; glow: string }
> = {
  yellow: {
    from: "#ffe58f",
    to: "#ffc83d",
    shade: "#f2b51f",
    glow: "rgba(242,181,31,.45)",
  },
  indigo: {
    from: "#6f62ff",
    to: "#3a2fd8",
    shade: "#2f25b8",
    glow: "rgba(58,47,216,.45)",
  },
  sky: {
    from: "#93d5ff",
    to: "#3ea0ff",
    shade: "#2f8ae6",
    glow: "rgba(62,160,255,.45)",
  },
};

const SIZE = "h-[140px] w-[200px] sm:h-[160px] sm:w-[232px]";

/** 폴더 한 개의 모양. 올려 두면(hover) 위로 들린다. */
function FolderFace({
  tone,
  label,
  big = false,
  hint,
}: {
  tone: FolderTone;
  label?: string; // 양옆 폴더는 글자 없이 모양만 둔다
  big?: boolean;
  hint?: string;
}) {
  const c = TONE[tone];
  return (
    <div
      className={`relative h-full w-full transition-transform duration-200 ease-out origin-bottom group-hover:-translate-y-4 group-focus-visible:-translate-y-4 ${
        big
          ? "group-hover:scale-[1.4] group-focus-visible:scale-[1.4] group-active:scale-[1.34]"
          : ""
      }`}
    >
      <div
        className="absolute -top-3 left-0 h-8 w-24 rounded-t-2xl sm:w-28"
        style={{ background: c.shade }}
      />
      <div
        className="absolute inset-0 rounded-[22px] transition-[filter] duration-200 group-hover:brightness-105"
        style={{
          background: `linear-gradient(155deg, ${c.from}, ${c.to})`,
          boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.75), inset 0 -10px 24px rgba(255,255,255,.12), 0 24px 36px -14px ${c.glow}`,
        }}
      >
        {label && (
          <span
            className={`absolute right-5 top-4 font-semibold leading-none tracking-[-0.04em] ${
              big
                ? "text-[30px] text-white/90 sm:text-[34px]"
                : "text-[36px] text-white/35 sm:text-[44px]"
            }`}
          >
            {label}
          </span>
        )}
        {hint && (
          <span
            id="start-hint"
            className="absolute inset-x-5 top-[60px] text-[12px] sm:top-[66px] font-medium leading-snug text-white/90 opacity-0 transition-opacity delay-75 duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 바닥선에 걸쳐 있는 폴더 더미. 양옆 폴더는 올려 두면 들리기만 하고,
 * 가운데 폴더는 '시작하기' 버튼이다(같은 form 안에 둔다).
 */
export function FolderStack({ startHint }: { startHint: string }) {
  return (
    <div className="relative mx-auto h-[236px] w-full max-w-[680px] overflow-hidden sm:h-[268px]">
      <div
        aria-hidden="true"
        className={`group absolute bottom-[-14px] left-[0%] -rotate-[8deg] sm:left-[2%] ${SIZE}`}
      >
        <FolderFace tone="yellow" />
      </div>
      <div
        aria-hidden="true"
        className={`group absolute bottom-[-22px] right-[0%] rotate-[8deg] sm:right-[2%] ${SIZE}`}
      >
        <FolderFace tone="sky" />
      </div>

      {/* 폴더 사이로 삐져나온 카드: 이 서비스가 찾는 '빠진 곳' */}
      <div
        aria-hidden="true"
        className="absolute bottom-[96px] left-1/2 z-10 w-[168px] -translate-x-[48%] rotate-[5deg] rounded-2xl bg-[#fafafb] p-4 shadow-[0_14px_30px_-12px_rgba(20,20,40,.35)] sm:bottom-[112px] sm:w-[190px]"
      >
        <p className="text-[15px] font-bold leading-tight tracking-[-0.02em]">
          빠진 곳
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[12px] text-[#8b8b94]">
          <li className="flex justify-between border-b border-[#ececf0] pb-1">
            <span>회비 정산</span>
            <span>연락 경로</span>
          </li>
          <li className="flex justify-between border-b border-[#ececf0] pb-1">
            <span>코트 대관</span>
            <span>시기</span>
          </li>
          <li className="flex justify-between">
            <span>신입 모집</span>
            <span>판단 기준</span>
          </li>
        </ul>
      </div>

      <div
        className={`absolute bottom-[-6px] left-1/2 z-20 -translate-x-1/2 ${SIZE}`}
      >
        <button
          type="submit"
          aria-label="시작하기"
          aria-describedby="start-hint"
          className="group relative block h-full w-full cursor-pointer rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#1c1c22]"
        >
          <FolderFace tone="indigo" label="시작하기" big hint={startHint} />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-30 h-3 bg-[#ececef]"
      />
    </div>
  );
}
