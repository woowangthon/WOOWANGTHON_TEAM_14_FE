import type { Annotation } from "../types";

export type Decision = "맞음" | "수정" | "삭제";

/** 전임이 AI 초안에 내린 결정을 반영한 새 주석. 원본은 바꾸지 않는다. 확정되기 전의 글은 후임에게 보이지 않는다. */
export function decide(draft: Annotation, decision: Decision, editedText?: string): Annotation {
  if (decision === "맞음") return { ...draft, status: "approved" };
  if (decision === "삭제") return { ...draft, status: "rejected" };

  const text = editedText?.trim() ?? "";
  if (text === "") throw new Error("수정할 내용을 적어 주세요");
  return { ...draft, text, status: "edited" };
}

/** 결정한 주석 목록과 전체 질문 수로 확정·삭제·건너뜀 개수를 센다. */
export function tally(decided: Annotation[], totalQuestions: number) {
  const confirmed = decided.filter((a) => a.status === "approved" || a.status === "edited").length;
  const rejected = decided.filter((a) => a.status === "rejected").length;
  return { confirmed, rejected, skipped: totalQuestions - confirmed - rejected };
}
