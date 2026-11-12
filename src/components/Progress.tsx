import { useEffect, useState } from "react";

/** 오래 걸리는 일의 진행 표시: 무엇을 하는지, 지난 시간, 보통 걸리는 시간. 멈춘 줄 알지 않게 한다. */
export default function Progress({ label, hint }: { label: string; hint?: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;

  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {label}{" "}
        <span className="font-normal text-[#8b8b94]">
          {elapsed} 지났어요{hint ? ` · ${hint}` : ""}
        </span>
      </p>
      <div aria-hidden="true" className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-[#f1f1f4]">
        <div className="progress-bar h-full w-1/3 rounded-full bg-[#1c1c22]" />
      </div>
    </div>
  );
}
