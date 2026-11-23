/** The pages of /design, in sidebar order. Shared by the route (static params) and the docs component. */
export type DocPage = { slug: string; title: string; group: "시작하기" | "파운데이션" | "컴포넌트"; summary: string; tag?: string };

export const DOC_PAGES: DocPage[] = [
  { slug: "intro", title: "소개", group: "시작하기", summary: "Achievee 디자인 시스템의 구성과 사용 방법을 설명함." },
  { slug: "principles", title: "원칙", group: "시작하기", summary: "화면을 설계할 때 따르는 기본 규칙." },
  { slug: "ux-writing", title: "UX writing", group: "시작하기", summary: "버튼, 안내, 오류 문구의 작성 기준." },
  { slug: "color", title: "색", group: "파운데이션", summary: "색상 토큰과 사용 기준." },
  { slug: "typography", title: "글자", group: "파운데이션", summary: "서체와 텍스트 스타일." },
  { slug: "shape", title: "간격 · 모서리 · 그림자", group: "파운데이션", summary: "간격, 모서리 반경, 그림자 토큰." },
  { slug: "icons", title: "아이콘", group: "파운데이션", summary: "아이콘 사용 기준과 전체 목록." },
  { slug: "components", title: "전체 컴포넌트", group: "컴포넌트", summary: "Achievee에서 사용하는 컴포넌트 목록." },
  { slug: "button", title: "Button", group: "컴포넌트", summary: "Button은 저장, 삭제처럼 사용자가 작업을 실행할 때 사용함.", tag: "Action" },
  { slug: "chip", title: "Chip", group: "컴포넌트", summary: "Chip은 감정 단어 선택이나 목록 필터처럼 짧은 항목을 고를 때 사용함.", tag: "Action" },
  { slug: "paper", title: "Paper", group: "컴포넌트", summary: "Paper는 일기처럼 긴 글을 작성하는 입력 영역.", tag: "Input" },
  { slug: "field", title: "Field", group: "컴포넌트", summary: "Field는 금액, 메모처럼 한 줄 값을 입력받음.", tag: "Input" },
  { slug: "select", title: "Select", group: "컴포넌트", summary: "Select는 분류, 요일처럼 정해진 값 중 하나를 고를 때 사용함.", tag: "Input" },
  { slug: "checkbox", title: "Checkbox", group: "컴포넌트", summary: "Checkbox는 할 일 완료나 캘린더 표시처럼 켜고 끄는 값을 표시함.", tag: "Input" },
  { slug: "surface", title: "Surface", group: "컴포넌트", summary: "Surface는 관련된 콘텐츠를 하나로 묶는 컨테이너.", tag: "Layout" },
  { slug: "list-row", title: "ListRow", group: "컴포넌트", summary: "ListRow는 지출 내역처럼 날짜별로 묶인 기록을 한 줄씩 표시함.", tag: "Data Display" },
  { slug: "event-row", title: "EventRow", group: "컴포넌트", summary: "EventRow는 다가오는 일정을 남은 날짜와 함께 한 줄씩 표시함.", tag: "Data Display" },
  { slug: "entry-card", title: "EntryCard", group: "컴포넌트", summary: "EntryCard는 지난 일기, 주간 회고처럼 펼쳐서 읽는 기록을 표시함.", tag: "Data Display" },
  { slug: "tag", title: "Tag", group: "컴포넌트", summary: "Tag는 기록에 붙은 감정 단어처럼 누를 수 없는 짧은 단어를 표시함.", tag: "Data Display" },
  { slug: "day-flower", title: "DayFlower", group: "컴포넌트", summary: "DayFlower는 하루 계획의 달성 정도를 꽃 모양으로 표시함.", tag: "Data Display" },
  { slug: "tabs", title: "Tabs", group: "컴포넌트", summary: "Tabs는 같은 화면 안에서 보기를 전환함.", tag: "Navigation" },
  { slug: "dialog", title: "Dialog", group: "컴포넌트", summary: "Dialog는 기록 삭제처럼 되돌릴 수 없는 작업 전에 확인을 받음.", tag: "Overlay" },
];
