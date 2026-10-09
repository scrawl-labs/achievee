import { LAND, type LandKey } from "./i18n-landing";

export const LOCALES = ["en", "ko", "ja", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ko: "한국어", ja: "日本語", es: "Español" };
export const DEFAULT_LOCALE: Locale = "en";
export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** Best match from an Accept-Language header ("ko-KR,ko;q=0.9,en;q=0.8"). */
export function fromAcceptLanguage(h: string | null): Locale {
  for (const part of (h ?? "").split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

const en = {
  "nav.calendar": "Calendar", "nav.stats": "Stats", "nav.diary": "Diary", "nav.expense": "Spending", "nav.google": "Google Calendar",
  "login.tagline": "Turn your Google Calendar and Tasks into daily progress.",
  "login.cta": "Continue with Google",
  "login.note": "Achievee reads your calendar and tasks (read-only) to show your progress. It never changes them.",
  "legal.privacy": "Privacy Policy", "legal.terms": "Terms of Service", "account.delete": "Delete my data", "account.deleteConfirm": "Permanently delete your diary and spending data and sign out? This can't be undone.",
  "account.signOut": "Sign out", "account.language": "Language",
  "common.today": "Today", "common.prev": "Previous", "common.next": "Next", "common.save": "Save", "common.add": "Add",
  "common.close": "Close", "common.delete": "Delete", "common.loadFail": "Couldn't load. Please try again.",
  "common.untitled": "(no title)", "common.allDay": "All day", "common.none": "None", "common.noEvents": "No events",
  "cal.rate": "Completion", "cal.done": "Done", "cal.streak": "Streak", "cal.days": "{n} days", "cal.spent": "Spent",
  "stats.bestStreak": "Best streak", "stats.mostDone": "Most done", "stats.events": "Events", "stats.weekday": "By weekday",
  "stats.daily": "By day", "stats.count": "{n}",
  "diary.mood": "Mood", "diary.m1": "Very bad", "diary.m2": "Bad", "diary.m3": "Okay", "diary.m4": "Good", "diary.m5": "Very good",
  "exp.thisMonth": "This month", "exp.need": "Needed", "exp.waste": "Unneeded", "exp.wasteRatio": "Unneeded share",
  "exp.new": "New expense", "exp.addAria": "Add expense", "exp.history": "History", "exp.all": "All", "exp.filter": "Filter",
  "exp.category": "Category", "exp.needOrNot": "Needed or not", "exp.needOpt": "Needed expense", "exp.wasteOpt": "Unneeded expense",
  "exp.amount": "Amount", "exp.memo": "Memo", "exp.toggle": "Click to switch",
  "cat.food": "Food", "cat.cafe": "Café", "cat.transport": "Transport", "cat.shopping": "Shopping", "cat.culture": "Culture", "cat.other": "Other",
  "g.day": "Day", "g.week": "Week", "g.month": "Month", "g.agenda": "List", "g.open": "Open in Google Calendar", "g.tasks": "Tasks",
  "g.more": "+{n} more", "hour": "{h}:00",
} as const;

type BaseKey = keyof typeof en;
export type Key = BaseKey | LandKey;
type BaseDict = Record<BaseKey, string>;
type Dict = Record<Key, string>;

const ko: BaseDict = {
  "nav.calendar": "달력", "nav.stats": "통계", "nav.diary": "일기", "nav.expense": "지출", "nav.google": "구글 캘린더",
  "login.tagline": "구글 캘린더와 할 일을 매일의 성취로 바꿔 보세요.",
  "login.cta": "Google로 계속하기",
  "login.note": "Achievee는 진행 상황을 보여주기 위해 캘린더와 할 일을 읽기 전용으로만 가져오며, 절대 수정하지 않아요.",
  "legal.privacy": "개인정보처리방침", "legal.terms": "이용약관", "account.delete": "내 데이터 삭제", "account.deleteConfirm": "일기와 지출 데이터를 모두 영구 삭제하고 로그아웃할까요? 되돌릴 수 없어요.",
  "account.signOut": "로그아웃", "account.language": "언어",
  "common.today": "오늘", "common.prev": "이전", "common.next": "다음", "common.save": "저장", "common.add": "추가",
  "common.close": "닫기", "common.delete": "삭제", "common.loadFail": "불러오지 못했어요. 다시 시도해 주세요.",
  "common.untitled": "(제목 없음)", "common.allDay": "종일", "common.none": "없음", "common.noEvents": "일정이 없어요",
  "cal.rate": "달성률", "cal.done": "완료", "cal.streak": "연속 달성", "cal.days": "{n}일", "cal.spent": "지출",
  "stats.bestStreak": "최장 연속", "stats.mostDone": "최다 완료", "stats.events": "일정", "stats.weekday": "요일",
  "stats.daily": "일별", "stats.count": "{n}개",
  "diary.mood": "기분", "diary.m1": "매우 나쁨", "diary.m2": "나쁨", "diary.m3": "보통", "diary.m4": "좋음", "diary.m5": "매우 좋음",
  "exp.thisMonth": "이번 달", "exp.need": "필요", "exp.waste": "불필요", "exp.wasteRatio": "불필요 비율",
  "exp.new": "새 지출", "exp.addAria": "지출 추가", "exp.history": "내역", "exp.all": "전체", "exp.filter": "필터",
  "exp.category": "카테고리", "exp.needOrNot": "필요 여부", "exp.needOpt": "필요한 지출", "exp.wasteOpt": "불필요한 지출",
  "exp.amount": "금액", "exp.memo": "메모", "exp.toggle": "눌러서 바꾸기",
  "cat.food": "식비", "cat.cafe": "카페", "cat.transport": "교통", "cat.shopping": "쇼핑", "cat.culture": "문화", "cat.other": "기타",
  "g.day": "일", "g.week": "주", "g.month": "월", "g.agenda": "목록", "g.open": "구글 캘린더에서 보기", "g.tasks": "할 일",
  "g.more": "+{n}개", "hour": "{h}시",
};

const ja: BaseDict = {
  "nav.calendar": "カレンダー", "nav.stats": "統計", "nav.diary": "日記", "nav.expense": "支出", "nav.google": "Google カレンダー",
  "login.tagline": "Google カレンダーとタスクを、毎日の達成感に。",
  "login.cta": "Google で続ける",
  "login.note": "Achievee は進捗を表示するためにカレンダーとタスクを読み取り専用で取得します。変更することはありません。",
  "legal.privacy": "プライバシーポリシー", "legal.terms": "利用規約", "account.delete": "データを削除", "account.deleteConfirm": "日記と支出のデータをすべて完全に削除してログアウトしますか？ 元に戻せません。",
  "account.signOut": "ログアウト", "account.language": "言語",
  "common.today": "今日", "common.prev": "前へ", "common.next": "次へ", "common.save": "保存", "common.add": "追加",
  "common.close": "閉じる", "common.delete": "削除", "common.loadFail": "読み込めませんでした。もう一度お試しください。",
  "common.untitled": "(タイトルなし)", "common.allDay": "終日", "common.none": "なし", "common.noEvents": "予定はありません",
  "cal.rate": "達成率", "cal.done": "完了", "cal.streak": "連続達成", "cal.days": "{n}日", "cal.spent": "支出",
  "stats.bestStreak": "最長連続", "stats.mostDone": "最多完了", "stats.events": "予定", "stats.weekday": "曜日別",
  "stats.daily": "日別", "stats.count": "{n}件",
  "diary.mood": "気分", "diary.m1": "とても悪い", "diary.m2": "悪い", "diary.m3": "普通", "diary.m4": "良い", "diary.m5": "とても良い",
  "exp.thisMonth": "今月", "exp.need": "必要", "exp.waste": "不要", "exp.wasteRatio": "不要の割合",
  "exp.new": "新しい支出", "exp.addAria": "支出を追加", "exp.history": "履歴", "exp.all": "すべて", "exp.filter": "フィルター",
  "exp.category": "カテゴリ", "exp.needOrNot": "必要かどうか", "exp.needOpt": "必要な支出", "exp.wasteOpt": "不要な支出",
  "exp.amount": "金額", "exp.memo": "メモ", "exp.toggle": "クリックで切り替え",
  "cat.food": "食費", "cat.cafe": "カフェ", "cat.transport": "交通", "cat.shopping": "買い物", "cat.culture": "文化", "cat.other": "その他",
  "g.day": "日", "g.week": "週", "g.month": "月", "g.agenda": "リスト", "g.open": "Google カレンダーで開く", "g.tasks": "タスク",
  "g.more": "+{n}件", "hour": "{h}時",
};

const es: BaseDict = {
  "nav.calendar": "Calendario", "nav.stats": "Estadísticas", "nav.diary": "Diario", "nav.expense": "Gastos", "nav.google": "Google Calendar",
  "login.tagline": "Convierte tu Google Calendar y tus tareas en progreso diario.",
  "login.cta": "Continuar con Google",
  "login.note": "Achievee lee tu calendario y tus tareas (solo lectura) para mostrar tu progreso. Nunca los modifica.",
  "legal.privacy": "Política de privacidad", "legal.terms": "Términos del servicio", "account.delete": "Eliminar mis datos", "account.deleteConfirm": "¿Eliminar de forma permanente tu diario y tus gastos y cerrar sesión? No se puede deshacer.",
  "account.signOut": "Cerrar sesión", "account.language": "Idioma",
  "common.today": "Hoy", "common.prev": "Anterior", "common.next": "Siguiente", "common.save": "Guardar", "common.add": "Añadir",
  "common.close": "Cerrar", "common.delete": "Eliminar", "common.loadFail": "No se pudo cargar. Inténtalo de nuevo.",
  "common.untitled": "(sin título)", "common.allDay": "Todo el día", "common.none": "Ninguno", "common.noEvents": "Sin eventos",
  "cal.rate": "Cumplimiento", "cal.done": "Hechas", "cal.streak": "Racha", "cal.days": "{n} días", "cal.spent": "Gasto",
  "stats.bestStreak": "Mejor racha", "stats.mostDone": "Más hechas", "stats.events": "Eventos", "stats.weekday": "Por día de la semana",
  "stats.daily": "Por día", "stats.count": "{n}",
  "diary.mood": "Ánimo", "diary.m1": "Muy mal", "diary.m2": "Mal", "diary.m3": "Normal", "diary.m4": "Bien", "diary.m5": "Muy bien",
  "exp.thisMonth": "Este mes", "exp.need": "Necesario", "exp.waste": "Innecesario", "exp.wasteRatio": "% innecesario",
  "exp.new": "Nuevo gasto", "exp.addAria": "Añadir gasto", "exp.history": "Historial", "exp.all": "Todos", "exp.filter": "Filtro",
  "exp.category": "Categoría", "exp.needOrNot": "¿Necesario?", "exp.needOpt": "Gasto necesario", "exp.wasteOpt": "Gasto innecesario",
  "exp.amount": "Importe", "exp.memo": "Nota", "exp.toggle": "Clic para cambiar",
  "cat.food": "Comida", "cat.cafe": "Café", "cat.transport": "Transporte", "cat.shopping": "Compras", "cat.culture": "Cultura", "cat.other": "Otros",
  "g.day": "Día", "g.week": "Semana", "g.month": "Mes", "g.agenda": "Lista", "g.open": "Abrir en Google Calendar", "g.tasks": "Tareas",
  "g.more": "+{n} más", "hour": "{h}:00",
};

export const DICT: Record<Locale, Dict> = {
  en: { ...en, ...LAND.en }, ko: { ...ko, ...LAND.ko }, ja: { ...ja, ...LAND.ja }, es: { ...es, ...LAND.es },
};

export const CATEGORIES = ["food", "cafe", "transport", "shopping", "culture", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
/** Rows saved by the first (Korean-only) release stored the label itself. */
const LEGACY_CAT: Record<string, Category> = { 식비: "food", 카페: "cafe", 교통: "transport", 쇼핑: "shopping", 문화: "culture", 기타: "other" };
export const categoryOf = (v: string): Category => ((CATEGORIES as readonly string[]).includes(v) ? (v as Category) : LEGACY_CAT[v] ?? "other");

const CURRENCY: Record<Locale, string> = { en: "USD", ko: "KRW", ja: "JPY", es: "EUR" };
const INTL: Record<Locale, string> = { en: "en-US", ko: "ko-KR", ja: "ja-JP", es: "es-ES" };

/** Locale-aware formatters; calendar dates are plain YYYY-MM-DD so everything formats in UTC. */
export function makeFormat(locale: Locale) {
  const l = INTL[locale];
  const utc = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(l, { timeZone: "UTC", ...o });
  const f = {
    monthYear: utc({ year: "numeric", month: "long" }),
    monthDay: utc({ month: "long", day: "numeric" }),
    full: utc({ weekday: "long", month: "long", day: "numeric" }),
    weekdayShort: utc({ weekday: "short" }),
    weekdayLong: utc({ weekday: "long" }),
    money: new Intl.NumberFormat(l, { style: "currency", currency: CURRENCY[locale], maximumFractionDigits: 0 }),
  };
  const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const sunday = at("2023-01-01").getTime(); // a Sunday
  return {
    monthYear: (ym: string) => f.monthYear.format(at(`${ym}-01`)),
    monthDay: (iso: string) => f.monthDay.format(at(iso)),
    full: (iso: string) => f.full.format(at(iso)),
    weekdayShort: (dow: number) => f.weekdayShort.format(sunday + dow * 864e5),
    weekdayLong: (dow: number) => f.weekdayLong.format(sunday + dow * 864e5),
    money: (n: number) => f.money.format(n),
  };
}
