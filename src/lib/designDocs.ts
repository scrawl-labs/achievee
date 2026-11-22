/** The pages of /design, in sidebar order. Shared by the route (static params) and the docs component. */
export type DocPage = { slug: string; title: string; group: "시작하기" | "파운데이션" | "컴포넌트"; summary: string; tag?: string };

export const DOC_PAGES: DocPage[] = [
  { slug: "intro", title: "소개", group: "시작하기", summary: "Achievee 디자인 시스템이 무엇이고 왜 이렇게 생겼는지." },
  { slug: "principles", title: "원칙", group: "시작하기", summary: "모든 화면이 지키는 다섯 가지." },
  { slug: "voice", title: "말투", group: "시작하기", summary: "버튼, 안내, 오류를 쓰는 법." },
  { slug: "color", title: "색", group: "파운데이션", summary: "바탕, 글자, 행동색, 상태, 꽃잎 팔레트." },
  { slug: "typography", title: "글자", group: "파운데이션", summary: "두 가지 서체, 일곱 단계." },
  { slug: "shape", title: "간격 · 모서리 · 그림자", group: "파운데이션", summary: "간격 일곱 단계, 모서리 세 가지, 그림자 두 가지." },
  { slug: "icons", title: "아이콘", group: "파운데이션", summary: "직접 그린 선 아이콘 한 벌." },
  { slug: "components", title: "전체 컴포넌트", group: "컴포넌트", summary: "모든 컴포넌트를 한눈에." },
  { slug: "button", title: "Button", group: "컴포넌트", summary: "저장, 취소, 삭제처럼 행동을 시작해요.", tag: "Action" },
  { slug: "chip", title: "Chip", group: "컴포넌트", summary: "감정 단어와 필터처럼 짧은 선택지예요.", tag: "Action" },
  { slug: "paper", title: "Paper", group: "컴포넌트", summary: "일기처럼 글을 쓰는 곳이에요.", tag: "Input" },
  { slug: "field", title: "Field", group: "컴포넌트", summary: "금액, 메모 같은 짧은 값을 적어요.", tag: "Input" },
  { slug: "surface", title: "Surface", group: "컴포넌트", summary: "내용 한 묶음을 담는 단 하나의 면이에요.", tag: "Layout" },
  { slug: "list-row", title: "ListRow", group: "컴포넌트", summary: "날짜별로 묶은 기록 한 줄이에요.", tag: "Data Display" },
  { slug: "day-flower", title: "DayFlower", group: "컴포넌트", summary: "하루를 얼마나 해냈는지 꽃으로 보여줘요.", tag: "Data Display" },
  { slug: "tabs", title: "Tabs", group: "컴포넌트", summary: "한 탭 안에서 보기를 바꿔요.", tag: "Navigation" },
  { slug: "dialog", title: "Dialog", group: "컴포넌트", summary: "지우기 전에 한 번 물어봐요.", tag: "Overlay" },
];
