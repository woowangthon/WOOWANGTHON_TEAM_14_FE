import type { ReactElement } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { defaultApi } from "./api";
import type { Api } from "./api/types";
import { TONE, type FolderTone } from "./components/Folders";
import { useNotes } from "./lib/NotesContext";
import { useSession } from "./lib/SessionContext";
import HandbookPage from "./pages/HandbookPage";
import InterviewPage from "./pages/InterviewPage";
import StartPage from "./pages/StartPage";
import UploadPage from "./pages/UploadPage";

// 화면마다 폴더 색이 하나씩 있다. 탭의 점과 현재 화면 표시가 이 색을 따른다.
const tabs: { to: string; label: string; tone: FolderTone }[] = [
  { to: "/upload", label: "자료", tone: "yellow" },
  { to: "/interview", label: "질문", tone: "indigo" },
  { to: "/handbook", label: "문서", tone: "sky" },
];

/** 시작 화면에서 조직·업무 부서를 입력하지 않았다면 시작 화면으로 보낸다. */
function RequireSession({ children }: { children: ReactElement }) {
  const { session } = useSession();
  return session ? children : <Navigate to="/start" replace />;
}

/** 로고: 가는 글씨, 괄호 안의 off만 한 단계 굵게. */
function Logo({ large }: { large: boolean }) {
  return (
    <h1
      className={`leading-none tracking-[-0.05em] ${
        large ? "text-[clamp(52px,9vw,96px)]" : "text-[26px] sm:text-[30px]"
      }`}
    >
      <span className="font-extralight">Hand(</span>
      <b className="font-semibold">off</b>
      <span className="font-extralight">)</span>
    </h1>
  );
}

const pill = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm";

export default function App({ api = defaultApi }: { api?: Api }) {
  const { session } = useSession();
  const { notes, record } = useNotes();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
      {session ? (
        <>
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-6 sm:pt-8">
            <Logo large={false} />
            <div className="flex items-center gap-3 text-sm">
              <p aria-label="현재 조직" className="rounded-full bg-[#f1f1f4] px-4 py-2 text-[#3d3d46]">
                {session.orgName} · {session.department}
              </p>
              <button type="button" onClick={() => navigate("/start")} className="text-[#6b6b75] underline underline-offset-4">
                다시 설정
              </button>
            </div>
          </header>

          <nav aria-label="화면 이동" className="mt-8 flex flex-wrap gap-2 sm:mt-10">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `${pill} ${isActive ? "bg-[#1c1c22] font-semibold text-white" : "bg-[#f1f1f4] text-[#4a4a54] hover:bg-[#e7e7ec]"}`
                }
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `linear-gradient(150deg, ${TONE[tab.tone].from}, ${TONE[tab.tone].to})` }}
                />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </>
      ) : (
        <header className="flex flex-col items-center gap-3 pt-6 text-center sm:pt-8">
          <span className={`${pill} bg-[#f1f1f4] py-1 text-[13px] text-[#8b8b94]`}>시작</span>
          <Logo large />
        </header>
      )}

      <main className={session ? "mt-10 sm:mt-14" : "mt-5"}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/start" element={<StartPage api={api} />} />
          <Route
            path="/upload"
            element={
              <RequireSession>
                <UploadPage api={api} />
              </RequireSession>
            }
          />
          <Route
            path="/interview"
            element={
              <RequireSession>
                <InterviewPage api={api} decided={notes.map((n) => n.annotation)} onDecide={(annotation, item_title) => record({ annotation, item_title })} />
              </RequireSession>
            }
          />
          <Route
            path="/handbook"
            element={
              <RequireSession>
                <HandbookPage api={api} notes={notes} />
              </RequireSession>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
