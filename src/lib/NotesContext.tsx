import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Note } from "./handbook";

const KEY = "handoff-notes";

// 브라우저 저장소는 막혀 있을 수 있다. 어떤 경우에도 화면이 깨지지 않게 감싼다.
function load(): Note[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    return [];
  }
}

function save(notes: Note[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // 저장하지 못해도 이번 화면에서는 계속 쓸 수 있다
  }
}

interface NotesContextValue {
  notes: Note[];
  record: (note: Note) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

/** 화면 2에서 전임이 한 결정(맞음·수정·삭제)을 모아 화면 3이 쓰게 한다. `initial`은 테스트용이다. */
export function NotesProvider({ children, initial }: { children: ReactNode; initial?: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(() => initial ?? load());

  useEffect(() => save(notes), [notes]);

  // 같은 주석을 다시 결정하면 앞의 결정을 바꾼다
  const record = useCallback((note: Note) => {
    setNotes((prev) => [...prev.filter((n) => n.annotation.id !== note.annotation.id), note]);
  }, []);

  const value = useMemo(() => ({ notes, record }), [notes, record]);
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("NotesProvider 안에서만 쓸 수 있어요");
  return ctx;
}
