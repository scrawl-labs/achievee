import { LAND, type LandKey } from "./i18n-landing";
import { ZH } from "./i18n-zh";

export const LOCALES = ["en", "ko", "ja", "es", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ko: "한국어", ja: "日本語", es: "Español", zh: "繁體中文" };
/** Value for <html lang> and for Google's hl= (so the consent screen follows the app language). */
export const HTML_LANG: Record<Locale, string> = { en: "en", ko: "ko", ja: "ja", es: "es", zh: "zh-Hant" };
export const GOOGLE_HL: Record<Locale, string> = { en: "en", ko: "ko", ja: "ja", es: "es", zh: "zh-TW" };
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
  "login.tagline": "Capture your days beautifully with Google Calendar and Google Tasks!",
  "login.cta": "Continue with Google",
  "login.note": "Achievee reads your calendar and tasks (read-only) to show your progress. It never changes them.",
  "legal.privacy": "Privacy Policy", "legal.terms": "Terms of Service", "account.delete": "Delete my data", "account.deleteConfirm": "Permanently delete your diary and spending data and sign out? This can't be undone.",
  "account.signOut": "Sign out", "account.language": "Language",
  "common.today": "Today", "common.prev": "Previous", "common.next": "Next", "common.save": "Save", "common.add": "Add",
  "common.close": "Close", "common.edit": "Edit", "common.cancel": "Cancel", "inc.income": "Income", "inc.balance": "Remaining", "inc.new": "New income", "inc.addAria": "Add income", "inc.empty": "No income yet", "inc.startDay": "Month starts on", "inc.startHint": "Your month runs from this day to the day before it next month.", "inc.day": "Day {n}",
  "wk.tab": "Weekly review", "wk.good": "What I did well", "wk.hard": "What weighed on me", "wk.plan": "One thing to change next week (optional)", "wk.note": "A note to myself (optional)", "wk.sundayTitle": "It's Sunday. Wrap up your week?", "wk.write": "Write a review", "wk.past": "Past reviews", "wk.empty": "No reviews yet", "wk.mood": "Avg mood", "wk.saved": "Saved", "wk.sundaySub": "A few lines are enough.",
  "emo.title": "What exactly are you feeling?", "emo.hint": "Pick up to 3 words that fit best. It's okay if you're not sure.", "emo.pick": "Pick words", "emo.near": "Similar, but different", "emo.dictTab": "Emotion dictionary", "emo.dictIntro": "Different words name different feelings. Browse them and notice which one fits you today.", "emo.sourceTitle": "Sources & credits", "emo.sourceBody": "The idea of widening our emotion vocabulary was inspired by the research below. The words and descriptions in this app were written independently; the dataset itself is not used or redistributed.", "emo.weekTitle": "Emotion words this week", "emo.newWords": "New this week: {n}", "emo.vocab": "My emotion vocabulary: {n} words", "emo.none": "No emotion words yet", "emo.langNote": "Emotion words are shown in English for now.", "emo.max": "Up to 3 words", "common.delete": "Delete", "common.loadFail": "Couldn't load. Please try again.",
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
  "g.day": "Day", "g.week": "Week", "g.month": "Month", "g.agenda": "List", "g.open": "Open in Google Calendar", "g.tasks": "Google Tasks",
  "g.more": "+{n} more", "hour": "{h}:00",
} as const;

type BaseKey = keyof typeof en;
export type Key = BaseKey | LandKey;
type BaseDict = Record<BaseKey, string>;
type Dict = Record<Key, string>;

const ko: BaseDict = {
  "nav.calendar": "달력", "nav.stats": "통계", "nav.diary": "일기", "nav.expense": "지출", "nav.google": "Google Calendar",
  "login.tagline": "Google Calendar와 Google Tasks로 예쁘고 알차게 기록해봐요!",
  "login.cta": "Google로 계속하기",
  "login.note": "Achievee는 진행 상황을 보여주기 위해 Google Calendar와 Google Tasks를 읽기 전용으로만 가져오며, 절대 수정하지 않아요.",
  "legal.privacy": "개인정보처리방침", "legal.terms": "이용약관", "account.delete": "내 데이터 삭제", "account.deleteConfirm": "일기와 지출 데이터를 모두 영구 삭제하고 로그아웃할까요? 되돌릴 수 없어요.",
  "account.signOut": "로그아웃", "account.language": "언어",
  "common.today": "오늘", "common.prev": "이전", "common.next": "다음", "common.save": "저장", "common.add": "추가",
  "common.close": "닫기", "common.edit": "수정", "common.cancel": "취소", "inc.income": "수입", "inc.balance": "남은 돈", "inc.new": "새 수입", "inc.addAria": "수입 추가", "inc.empty": "수입 내역이 없어요", "inc.startDay": "월 시작일", "inc.startHint": "이 날부터 다음 달 전날까지를 한 달로 계산해요.", "inc.day": "{n}일",
  "wk.tab": "주간 회고", "wk.good": "내가 잘한 점", "wk.hard": "나를 힘들게 했던 점", "wk.plan": "다음 주에 바꿔 볼 한 가지 (선택)", "wk.note": "나에게 한마디 (선택)", "wk.sundayTitle": "오늘은 일요일이에요. 한 주를 마무리해 볼까요?", "wk.write": "회고 쓰기", "wk.past": "지난 회고", "wk.empty": "아직 회고가 없어요", "wk.mood": "기분 평균", "wk.saved": "저장됐어요", "wk.sundaySub": "몇 줄이면 충분해요.",
  "emo.title": "지금 어떤 감정일까요?", "emo.hint": "가장 가까운 단어를 3개까지 골라 보세요. 잘 모르겠어도 괜찮아요.", "emo.pick": "단어 고르기", "emo.near": "비슷하지만 달라요", "emo.dictTab": "감정 사전", "emo.dictIntro": "다른 단어는 다른 마음을 가리켜요. 둘러보면서 오늘의 나와 맞는 단어를 찾아보세요.", "emo.sourceTitle": "출처와 참고", "emo.sourceBody": "감정 어휘를 넓혀 보자는 아이디어는 아래 연구에서 영감을 받았어요. 이 앱의 단어와 설명은 직접 작성한 것이며, 해당 데이터셋은 사용하거나 재배포하지 않아요.", "emo.weekTitle": "이번 주 감정 단어", "emo.newWords": "이번 주 새로 쓴 단어 {n}개", "emo.vocab": "내 감정 어휘 {n}개", "emo.none": "아직 고른 감정 단어가 없어요", "emo.langNote": "감정 단어는 지금은 영어로 보여요.", "emo.max": "최대 3개", "common.delete": "삭제", "common.loadFail": "불러오지 못했어요. 다시 시도해 주세요.",
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
  "g.day": "일", "g.week": "주", "g.month": "월", "g.agenda": "목록", "g.open": "Google Calendar에서 보기", "g.tasks": "Google Tasks",
  "g.more": "+{n}개", "hour": "{h}시",
};

const ja: BaseDict = {
  "nav.calendar": "カレンダー", "nav.stats": "統計", "nav.diary": "日記", "nav.expense": "支出", "nav.google": "Google Calendar",
  "login.tagline": "Google Calendar と Google Tasks で、\nきれいに充実した記録を残そう！",
  "login.cta": "Google で続ける",
  "login.note": "Achievee は進捗を表示するために Google Calendar と Google Tasks を読み取り専用で取得します。変更することはありません。",
  "legal.privacy": "プライバシーポリシー", "legal.terms": "利用規約", "account.delete": "データを削除", "account.deleteConfirm": "日記と支出のデータをすべて完全に削除してログアウトしますか？ 元に戻せません。",
  "account.signOut": "ログアウト", "account.language": "言語",
  "common.today": "今日", "common.prev": "前へ", "common.next": "次へ", "common.save": "保存", "common.add": "追加",
  "common.close": "閉じる", "common.edit": "編集", "common.cancel": "キャンセル", "inc.income": "収入", "inc.balance": "残り", "inc.new": "新しい収入", "inc.addAria": "収入を追加", "inc.empty": "収入はまだありません", "inc.startDay": "月の開始日", "inc.startHint": "この日から翌月の前日までを1か月として計算します。", "inc.day": "{n}日",
  "wk.tab": "週間振り返り", "wk.good": "うまくできたこと", "wk.hard": "つらかったこと", "wk.plan": "来週変えてみたいこと（任意）", "wk.note": "自分へのひとこと（任意）", "wk.sundayTitle": "今日は日曜日。一週間を締めくくりませんか？", "wk.write": "振り返りを書く", "wk.past": "これまでの振り返り", "wk.empty": "まだ振り返りはありません", "wk.mood": "平均の気分", "wk.saved": "保存しました", "wk.sundaySub": "数行で十分です。",
  "emo.title": "今どんな気持ちでしょう？", "emo.hint": "いちばん近い言葉を3つまで選んでみましょう。分からなくても大丈夫です。", "emo.pick": "言葉を選ぶ", "emo.near": "似ているけれど違う気持ち", "emo.dictTab": "感情辞典", "emo.dictIntro": "違う言葉は、違う気持ちを指します。眺めながら、今日の自分に合う言葉を探してみましょう。", "emo.sourceTitle": "出典と参考", "emo.sourceBody": "感情の語彙を広げるというアイデアは、下記の研究に着想を得ました。このアプリの言葉と説明は独自に書いたもので、データセット自体は使用・再配布していません。", "emo.weekTitle": "今週の感情の言葉", "emo.newWords": "今週あたらしく使った言葉 {n}個", "emo.vocab": "私の感情語彙 {n}個", "emo.none": "まだ選んだ感情の言葉はありません", "emo.langNote": "感情の言葉は今のところ英語で表示されます。", "emo.max": "最大3つ", "common.delete": "削除", "common.loadFail": "読み込めませんでした。もう一度お試しください。",
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
  "g.day": "日", "g.week": "週", "g.month": "月", "g.agenda": "リスト", "g.open": "Google Calendar で開く", "g.tasks": "Google Tasks",
  "g.more": "+{n}件", "hour": "{h}時",
};

const es: BaseDict = {
  "nav.calendar": "Calendario", "nav.stats": "Estadísticas", "nav.diary": "Diario", "nav.expense": "Gastos", "nav.google": "Google Calendar",
  "login.tagline": "¡Registra tus días de forma bonita con Google Calendar y Google Tasks!",
  "login.cta": "Continuar con Google",
  "login.note": "Achievee lee tu Google Calendar y tus Google Tasks (solo lectura) para mostrar tu progreso. Nunca los modifica.",
  "legal.privacy": "Política de privacidad", "legal.terms": "Términos del servicio", "account.delete": "Eliminar mis datos", "account.deleteConfirm": "¿Eliminar de forma permanente tu diario y tus gastos y cerrar sesión? No se puede deshacer.",
  "account.signOut": "Cerrar sesión", "account.language": "Idioma",
  "common.today": "Hoy", "common.prev": "Anterior", "common.next": "Siguiente", "common.save": "Guardar", "common.add": "Añadir",
  "common.close": "Cerrar", "common.edit": "Editar", "common.cancel": "Cancelar", "inc.income": "Ingresos", "inc.balance": "Restante", "inc.new": "Nuevo ingreso", "inc.addAria": "Añadir ingreso", "inc.empty": "Aún no hay ingresos", "inc.startDay": "El mes empieza el", "inc.startHint": "Tu mes va desde este día hasta el día anterior del mes siguiente.", "inc.day": "Día {n}",
  "wk.tab": "Revisión semanal", "wk.good": "Lo que hice bien", "wk.hard": "Lo que me pesó", "wk.plan": "Una cosa que cambiar la próxima semana (opcional)", "wk.note": "Unas palabras para mí (opcional)", "wk.sundayTitle": "Es domingo. ¿Cerramos la semana?", "wk.write": "Escribir revisión", "wk.past": "Revisiones anteriores", "wk.empty": "Aún no hay revisiones", "wk.mood": "Ánimo medio", "wk.saved": "Guardado", "wk.sundaySub": "Con unas líneas basta.",
  "emo.title": "¿Qué estás sintiendo exactamente?", "emo.hint": "Elige hasta 3 palabras que mejor encajen. Está bien no estar seguro.", "emo.pick": "Elegir palabras", "emo.near": "Parecidas, pero distintas", "emo.dictTab": "Diccionario de emociones", "emo.dictIntro": "Palabras distintas nombran sentimientos distintos. Explóralas y fíjate en cuál te encaja hoy.", "emo.sourceTitle": "Fuentes y créditos", "emo.sourceBody": "La idea de ampliar nuestro vocabulario emocional se inspiró en la investigación siguiente. Las palabras y descripciones de esta app se escribieron de forma independiente; el conjunto de datos en sí no se usa ni se redistribuye.", "emo.weekTitle": "Palabras de emoción de esta semana", "emo.newWords": "Nuevas esta semana: {n}", "emo.vocab": "Mi vocabulario emocional: {n} palabras", "emo.none": "Aún no hay palabras de emoción", "emo.langNote": "Por ahora las palabras de emoción se muestran en inglés.", "emo.max": "Hasta 3 palabras", "common.delete": "Eliminar", "common.loadFail": "No se pudo cargar. Inténtalo de nuevo.",
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
  "g.day": "Día", "g.week": "Semana", "g.month": "Mes", "g.agenda": "Lista", "g.open": "Abrir en Google Calendar", "g.tasks": "Google Tasks",
  "g.more": "+{n} más", "hour": "{h}:00",
};

export const DICT: Record<Locale, Dict> = {
  en: { ...en, ...LAND.en }, ko: { ...ko, ...LAND.ko }, ja: { ...ja, ...LAND.ja }, es: { ...es, ...LAND.es },
  zh: { ...(ZH as BaseDict), ...LAND.zh },
};

export const CATEGORIES = ["food", "cafe", "transport", "shopping", "culture", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
/** Rows saved by the first (Korean-only) release stored the label itself. */
const LEGACY_CAT: Record<string, Category> = { 식비: "food", 카페: "cafe", 교통: "transport", 쇼핑: "shopping", 문화: "culture", 기타: "other" };
export const categoryOf = (v: string): Category => ((CATEGORIES as readonly string[]).includes(v) ? (v as Category) : LEGACY_CAT[v] ?? "other");

const CURRENCY: Record<Locale, string> = { en: "USD", ko: "KRW", ja: "JPY", es: "EUR", zh: "TWD" };
const INTL: Record<Locale, string> = { en: "en-US", ko: "ko-KR", ja: "ja-JP", es: "es-ES", zh: "zh-TW" };

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
