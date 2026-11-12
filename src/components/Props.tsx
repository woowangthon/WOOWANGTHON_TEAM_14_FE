// 소품(클립). 장식이라서 모두 스크린 리더에서 숨긴다. 가이드: 소품은 모서리에만, 한 화면에 세 개까지.

/** 앱에 한 번만 두는 그림 정의. PaperClip·BinderClip이 <use>로 가져다 쓴다. */
export function PropDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9d9d9" />
          <stop offset=".22" stopColor="#ffffff" />
          <stop offset=".48" stopColor="#8f8f8f" />
          <stop offset=".74" stopColor="#f2f2f2" />
          <stop offset="1" stopColor="#777" />
        </linearGradient>
        <linearGradient id="chrome-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".75" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".25" />
        </linearGradient>
        <symbol id="paperclip" viewBox="0 0 60 130">
          <path
            d="M20 104 V30 C20 6 48 6 48 30 V108 C48 130 12 130 12 108 V40 C12 20 34 20 34 40 V92"
            fill="none"
            stroke="#8d8d8d"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 104 V30 C20 6 48 6 48 30 V108 C48 130 12 130 12 108 V40 C12 20 34 20 34 40 V92"
            fill="none"
            stroke="#fff"
            strokeOpacity=".75"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-.7 -.7)"
          />
        </symbol>
        <symbol id="binder" viewBox="0 0 160 150">
          <path d="M56 60 C50 30 110 30 104 60" fill="none" stroke="#6f6f6f" strokeWidth="9" strokeLinecap="round" />
          <path d="M56 60 C50 30 110 30 104 60" fill="none" stroke="url(#chrome)" strokeWidth="6.5" strokeLinecap="round" />
          <path
            d="M8 70 Q8 58 22 58 H138 Q152 58 152 70 L141 128 Q139 140 126 140 H34 Q21 140 19 128 Z"
            fill="url(#chrome)"
            stroke="#6a6a6a"
            strokeWidth="1.6"
          />
          <path
            d="M8 70 Q8 58 22 58 H138 Q152 58 152 70 L141 128 Q139 140 126 140 H34 Q21 140 19 128 Z"
            fill="url(#chrome-v)"
          />
          <rect x="24" y="116" width="112" height="14" rx="6" fill="#4d4d4d" opacity=".35" />
        </symbol>
      </defs>
    </svg>
  );
}

export function PaperClip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 130" aria-hidden="true" focusable="false" className={className}>
      <use href="#paperclip" width="60" height="130" />
    </svg>
  );
}

export function BinderClip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 150" aria-hidden="true" focusable="false" className={className}>
      <use href="#binder" width="160" height="150" />
    </svg>
  );
}
