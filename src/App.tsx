import type { ReactElement } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { BinderClip, PaperClip, PropDefs } from "./components/Props";
import { useNotes } from "./lib/NotesContext";
import { useSession } from "./lib/SessionContext";
import HandbookPage from "./pages/HandbookPage";
import InterviewPage from "./pages/InterviewPage";
import StartPage from "./pages/StartPage";
import UploadPage from "./pages/UploadPage";

const tabs = [
  { to: "/upload", label: "자료" },
  { to: "/interview", label: "질문" },
  { to: "/handbook", label: "문서" },
];

/** 시작 화면에서 조직·업무 부서를 입력하지 않았다면 시작 화면으로 보낸다. */
function RequireSession({ children }: { children: ReactElement }) {
  const { session } = useSession();
  return session ? children : <Navigate to="/start" replace />;
}

/** 로고: 괄호는 가늘게, 안의 글자는 굵게 (굵기 대비로 강조). */
function Logo({ large }: { large: boolean }) {
  return (
    <h1
      className={`leading-none tracking-[-0.05em] ${
        large ? "text-[clamp(54px,12vw,120px)]" : "text-[clamp(30px,5vw,46px)]"
      }`}
    >
      <span className="font-light">Hand(</span>
      <b className="font-bold">off</b>
      <span className="font-light">)</span>
    </h1>
  );
}

const tabBase = "self-end rounded-t-[18px] px-5 text-sm";
const tabOn = `${tabBase} paper h-full pt-1 font-semibold flex items-center`;
const tabOff = `${tabBase} h-[82%] bg-paper-back text-white flex items-center hover:bg-[#808080]`;

export default function App() {
  const { session } = useSession();
  const { notes, record } = useNotes();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl px-3 pb-16 sm:px-6">
      <PropDefs />

      <header className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8 sm:pt-12">
        <Logo large={!session} />
        {session && (
          <div className="flex items-center gap-4 text-sm">
            <p aria-label="현재 조직" className="sticker">
              {session.orgName} · {session.department}
            </p>
            <button type="button" onClick={() => navigate("/start")} className="underline underline-offset-4">
              다시 설정
            </button>
          </div>
        )}
      </header>

      <div className="relative">
        {/* 뒤 폴더: 오른쪽 탭과 띠 */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-12 sm:h-14">
          <div className="absolute bottom-0 right-0 top-0 w-[38%] rounded-t-[22px] bg-paper-back" />
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-paper-back" />
        </div>

        {/* 앞 폴더 탭 */}
        <div className="relative flex h-12 items-end gap-0.5 sm:h-14">
          {session ? (
            <nav aria-label="화면 이동" className="flex h-full items-end gap-0.5">
              {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? tabOn : tabOff)}>
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          ) : (
            <span className={tabOn}>시작</span>
          )}
        </div>

        <div className="paper relative px-5 py-8 shadow-[0_-2px_3px_rgba(0,0,0,0.22)] sm:px-10 sm:py-12">
          <PaperClip className="pointer-events-none absolute -top-12 left-[44%] hidden w-9 -rotate-[4deg] sm:block" />
          <BinderClip className="pointer-events-none absolute -top-16 right-[4%] hidden w-24 rotate-[10deg] drop-shadow-[5px_7px_5px_rgba(0,0,0,0.3)] sm:block" />
          <main>
            <Routes>
              <Route path="/" element={<Navigate to="/upload" replace />} />
              <Route path="/start" element={<StartPage />} />
              <Route
                path="/upload"
                element={
                  <RequireSession>
                    <UploadPage />
                  </RequireSession>
                }
              />
              <Route
                path="/interview"
                element={
                  <RequireSession>
                    <InterviewPage decided={notes.map((n) => n.annotation)} onDecide={(annotation, item_title) => record({ annotation, item_title })} />
                  </RequireSession>
                }
              />
              <Route
                path="/handbook"
                element={
                  <RequireSession>
                    <HandbookPage notes={notes} />
                  </RequireSession>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
