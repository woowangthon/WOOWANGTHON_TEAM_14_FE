// API 계약 (팀 문서 '2인 업무분담' §2). 백엔드 app/models.py와 같은 모양이다.
// 필드 이름을 바꾸려면 문서를 먼저 고치고 상대에게 알린다.
export const ELEMENT_KEYS = ["시기", "연락경로", "판단기준", "자주틀리는점", "미리할일", "배경"] as const;
export type ElementKey = (typeof ELEMENT_KEYS)[number];
export type State = "있음" | "문서에없음" | "모호함" | "해당없음";
export type Fill = "확인됨" | "추가확인권장";
export type SourceType = "자료" | "전임답변";
export type Label = "전임경험" | "규정근거";

export interface Fact {
  id: string;
  text: string;
  date?: string;
  date_estimated?: boolean;
  source: { type: SourceType; ids: string[] };
  status: "확인됨" | "추정" | "확인대기";
  label?: Label;
}

export interface Element {
  state: State;
  fill?: Fill; // state === "있음"일 때만
  evidence?: string; // 근거 문장 또는 fact id
  closed_by?: "전임" | "후임"; // 해당없음일 때만 (사람만 닫는다)
}

export interface Item {
  id: string;
  title: string;
  keywords: string[];
  facts: Fact[];
  elements: Record<ElementKey, Element>;
  score: number; // 문서에없음 + 모호함 + 추가확인권장 (각 1점)
}

export interface Question {
  id: string;
  item_id: string;
  element: ElementKey;
  kind: "빈칸" | "보완" | "확인";
  step1: string;
  step2: string;
  step3: string;
  rank: number;
}

export interface Annotation {
  id: string;
  item_id: string;
  element: ElementKey;
  text: string;
  slots: { 절차?: string; 예외?: string; 사례?: string; 연락?: string; 조건?: string };
  source: { type: "전임답변"; ids: string[] };
  label: Label;
  status: "draft" | "approved" | "edited" | "rejected";
}

export interface AskHit {
  annotation_id: string;
  text: string;
  source: { type: SourceType; ids: string[] };
  label: Label;
  approved_at: string;
}

export interface AskResponse {
  hits: AskHit[];
  summary?: string | null;
  none: boolean;
}

export interface MockData {
  items: Item[];
  questions: Question[];
  annotations: Annotation[];
  ask_with_hit: AskResponse;
  ask_none: AskResponse;
}
