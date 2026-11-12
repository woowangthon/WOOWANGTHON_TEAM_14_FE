import type { SetupValues } from "../lib/setup";
import type { Annotation, AskResponse, ElementKey, Item, Question } from "../types";

/** 질문 카드: 계약의 Question에 화면이 보여줄 항목 이름을 붙인 것. 백엔드가 주지 않으면 화면이 항목 목록으로 채운다. */
export type QuestionCard = Question & { item_title: string };

/** 화면이 서버와 이야기하는 방법. 지금은 목 구현이고, 서버가 준비되면 실제 구현으로 바꿔 끼운다. */
export interface Api {
  /** API 2: 확정 자료(PDF·TXT) → 업무 항목과 키워드. 사실은 아직 비어 있다. */
  uploadDocs(files: File[]): Promise<Item[]>;
  /** API 4: 카톡 대화(TXT, 여러 개 가능) → 항목마다 사실과 6요소 판정이 채워진 결과. 사용자가 고른 항목 목록을 함께 보낸다. */
  uploadChat(files: File[], items: Item[]): Promise<Item[]>;
  /** 빈 곳이 큰 순서(rank)로 정렬된 질문 목록. */
  getQuestions(): Promise<QuestionCard[]>;
  /** 전임의 단계별 답변(3칸, 비어 있을 수 있음) → 확인 전의 초안(draft). 후임에게는 전임이 확정해야 보인다. */
  draftAnnotation(question: Question, answers: string[]): Promise<Annotation>;
  /** 후임 질문. 확정된 기록만 근거로 답하고, 없으면 none. 실제 서버는 질문만 받고 확정 기록은 서버가 갖고 있다(목은 넘겨받는다). */
  ask(question: string, annotations: Annotation[]): Promise<AskResponse>;
  /** (실제 서버만) 시작 화면의 조직 정보로 서버에 새 작업(세션)을 연다. */
  startSession?(values: SetupValues): Promise<void>;
  /** (실제 서버만) 전임·후임이 칸을 '해당 없음'으로 닫았다고 서버에 알린다. 질문을 만들기 전에 해야 반영된다. */
  closeElement?(itemId: string, key: ElementKey, closedBy: "전임" | "후임"): Promise<void>;
  /** (실제 서버만) 전임이 초안을 맞음·수정·삭제로 정한 결과를 서버에 저장한다. */
  saveDecision?(annotation: Annotation): Promise<void>;
  /** (실제 서버만) 기록이 없을 때 후임의 질문을 전임에게 보낸다. */
  forward?(question: string): Promise<void>;
}
