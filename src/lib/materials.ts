export type MaterialKind = "문서" | "카톡 대화";

const CHAT_NAME = /카카오톡|카톡|kakaotalk/i;

// 카톡 내보내기의 한 줄: PC(날짜선, [이름] [시간] 글)와 모바일(2026. 4. 2. 오후 7:45, 이름 : 글) 두 형식
const CHAT_LINE =
  /^(?:-{5,}\s*\d{4}년[^\n]*|\[[^\]\n]+\]\s*\[(?:오전|오후)\s*\d{1,2}:\d{2}\][^\n]*|\d{4}(?:년\s*\d{1,2}월\s*\d{1,2}일|\.\s*\d{1,2}\.\s*\d{1,2}\.)\s*(?:오전|오후)\s*\d{1,2}:\d{2},\s*[^\n:]+?\s:\s[^\n]*)$/gm;

/** 카톡 내보내기 파일처럼 생긴 글인지. 대화 줄이 세 줄 이상 있어야 한다. */
export function isKakaoChat(text: string): boolean {
  return (text.match(CHAT_LINE) ?? []).length >= 3;
}

export const readText = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했어요"));
    reader.readAsText(file);
  });

/** 올린 파일을 문서와 카톡 대화로 나눈다. PDF는 문서, TXT는 이름이나 내용을 보고 정한다. */
export async function classifyFile(file: File): Promise<MaterialKind> {
  if (/\.pdf$/i.test(file.name)) return "문서";
  if (CHAT_NAME.test(file.name)) return "카톡 대화";
  if (!/\.txt$/i.test(file.name)) return "문서";
  try {
    return isKakaoChat(await readText(file)) ? "카톡 대화" : "문서";
  } catch {
    return "문서";
  }
}
