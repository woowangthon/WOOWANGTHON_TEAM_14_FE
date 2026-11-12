import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { loadSession, saveSession } from "./session";
import type { SetupValues } from "./setup";

interface SessionContextValue {
  session: SetupValues | null;
  start: (values: SetupValues) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** 시작 화면에서 입력한 조직·업무 부서를 앱 전체가 쓸 수 있게 한다. `initial`은 테스트용으로 값을 직접 넣을 때 쓴다. */
export function SessionProvider({ children, initial }: { children: ReactNode; initial?: SetupValues | null }) {
  const [session, setSession] = useState<SetupValues | null>(() => (initial !== undefined ? initial : loadSession()));

  const start = useCallback((values: SetupValues) => {
    saveSession(values);
    setSession(values);
  }, []);

  const value = useMemo(() => ({ session, start }), [session, start]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider 안에서만 쓸 수 있어요");
  return ctx;
}
