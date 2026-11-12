import { createHttpApi } from "./httpApi";
import { createMockApi } from "./mockApi";
import type { Api } from "./types";

/**
 * 앱 전체가 쓰는 서버 연결. `VITE_API_BASE`(예: http://localhost:8000)가 있으면 실제 백엔드에,
 * 없으면 목 데이터로 동작한다.
 */
const base = import.meta.env.VITE_API_BASE as string | undefined;

export const defaultApi: Api = base ? createHttpApi({ base }) : createMockApi();
