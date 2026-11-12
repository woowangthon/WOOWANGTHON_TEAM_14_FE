import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Note } from "./handbook";
import { NotesProvider, useNotes } from "./NotesContext";

const note: Note = {
  item_title: "회비 정산",
  annotation: {
    id: "ann_q_01",
    item_id: "item_01",
    element: "연락경로",
    text: "단톡 공지",
    slots: {},
    source: { type: "전임답변", ids: ["answer#1"] },
    label: "전임경험",
    status: "approved",
  },
};

const wrapper = ({ children }: { children: ReactNode }) => <NotesProvider>{children}</NotesProvider>;

describe("NotesContext: 화면 2에서 한 결정을 화면 3이 쓰도록 모은다", () => {
  it("처음에는 비어 있고, 기록하면 쌓인다", () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    expect(result.current.notes).toEqual([]);

    act(() => result.current.record(note));

    expect(result.current.notes).toEqual([note]);
  });

  it("같은 질문을 다시 결정하면 앞의 결정을 바꾼다", () => {
    const { result } = renderHook(() => useNotes(), { wrapper });

    act(() => result.current.record(note));
    act(() => result.current.record({ ...note, annotation: { ...note.annotation, status: "rejected" } }));

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].annotation.status).toBe("rejected");
  });

  it("새로고침해도 남도록 세션 저장소에 둔다", () => {
    const first = renderHook(() => useNotes(), { wrapper });
    act(() => first.result.current.record(note));
    first.unmount();

    const second = renderHook(() => useNotes(), { wrapper });

    expect(second.result.current.notes).toEqual([note]);
  });
});
