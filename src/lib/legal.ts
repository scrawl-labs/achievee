import type { Locale } from "./i18n";
import { PRIVACY_ZH } from "./legal-zh";

export type LegalDoc = { title: string; updated: string; sections: { h: string; p: string[] }[] };

export const PRIVACY_UPDATED = "2026-10-09";
const GOOGLE_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";

/** {contact} is replaced with NEXT_PUBLIC_CONTACT_EMAIL. */
export const PRIVACY: Record<Locale, LegalDoc> = {
  zh: PRIVACY_ZH,
  en: {
    title: "Privacy Policy", updated: "Last updated",
    sections: [
      { h: "What Achievee is", p: ["Achievee shows your Google Calendar events and Google Tasks as daily progress, and lets you keep a diary and track spending."] },
      { h: "Data we access from Google", p: [
        "With your consent, Achievee reads (read-only) your Google Calendar events and calendar list, and your Google Tasks. We also receive your Google account ID, email address and name to sign you in.",
        "We never create, edit or delete anything in your Google account.",
        "Google Calendar and Google Tasks data is fetched on demand to draw your screens. It is not stored in our database.",
      ] },
      { h: "Data we store", p: [
        "Only what you type into Achievee: diary entries (with mood) and expenses (category, amount, memo), linked to your Google account ID. Diary text and expense memos are encrypted at rest.",
        "Your language choice is saved in a cookie on your device. Sign-in uses a session cookie.",
      ] },
      { h: "How we use data", p: [
        "Solely to provide Achievee's features to you: showing your progress, statistics, diary and spending. We do not use your data for advertising, do not sell it, and do not use it to train AI models.",
        "Achievee's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements (" + GOOGLE_POLICY + ").",
      ] },
      { h: "Sharing", p: [
        "We do not share your data with third parties, except infrastructure providers that process it for us: Vercel (hosting) and Neon (database). Humans do not read your data unless you ask for support, it is required by law, or it is needed to protect security.",
      ] },
      { h: "Retention and deletion", p: [
        "You can delete everything we store about you at any time with “Delete my data” inside the app. You can also revoke Achievee's access at https://myaccount.google.com/permissions. Without access, no Google data is read.",
      ] },
      { h: "Contact", p: ["Questions or requests: {contact}"] },
    ],
  },
  ko: {
    title: "개인정보처리방침", updated: "최종 수정일",
    sections: [
      { h: "Achievee란", p: ["Achievee는 Google Calendar 일정과 Google Tasks를 하루하루의 성취로 보여주고, 일기와 지출을 기록할 수 있는 서비스입니다."] },
      { h: "Google에서 가져오는 정보", p: [
        "동의하신 경우에 한해 Google Calendar의 일정과 캘린더 목록, Google Tasks를 읽기 전용으로 가져옵니다. 로그인을 위해 Google 계정 ID, 이메일 주소, 이름도 받습니다.",
        "Google 계정의 어떤 정보도 생성, 수정, 삭제하지 않습니다.",
        "Google Calendar와 Google Tasks 정보는 화면을 그릴 때마다 가져오며, 저희 데이터베이스에 저장하지 않습니다.",
      ] },
      { h: "저장하는 정보", p: [
        "이용자가 Achievee에 직접 입력한 일기(기분 포함)와 지출(카테고리, 금액, 메모)만 Google 계정 ID와 연결해 저장합니다. 일기 본문과 지출 메모는 암호화해서 보관합니다.",
        "언어 설정은 이용자 기기의 쿠키에 저장되고, 로그인 유지에는 세션 쿠키를 사용합니다.",
      ] },
      { h: "이용 목적", p: [
        "진행 상황, 통계, 일기, 지출을 보여주는 등 Achievee의 기능을 제공하는 목적으로만 사용합니다. 광고에 쓰지 않고, 판매하지 않으며, AI 모델 학습에도 사용하지 않습니다.",
        "Achievee가 Google API로 받은 정보를 사용하고 다른 곳으로 전달하는 방식은 Limited Use 요건을 포함한 Google API 서비스 사용자 데이터 정책을 준수합니다 (" + GOOGLE_POLICY + ").",
      ] },
      { h: "제3자 제공", p: [
        "이용자의 정보를 제3자에게 제공하지 않습니다. 다만 저희를 대신해 정보를 처리하는 인프라 업체인 Vercel(호스팅)과 Neon(데이터베이스)을 이용합니다. 이용자가 지원을 요청하거나, 법령상 필요하거나, 보안 보호에 필요한 경우를 제외하고 사람이 이용자의 정보를 열람하지 않습니다.",
      ] },
      { h: "보관 및 삭제", p: [
        "앱 안의 “내 데이터 삭제”로 저희가 저장한 모든 정보를 언제든 삭제할 수 있습니다. https://myaccount.google.com/permissions 에서 Achievee의 접근 권한을 취소할 수도 있으며, 권한이 없으면 Google 정보를 읽지 않습니다.",
      ] },
      { h: "문의", p: ["문의 및 요청: {contact}"] },
    ],
  },
  ja: {
    title: "プライバシーポリシー", updated: "最終更新日",
    sections: [
      { h: "Achievee について", p: ["Achievee は、Google Calendar の予定と Google Tasks を毎日の達成状況として表示し、日記や支出を記録できるサービスです。"] },
      { h: "Google から取得する情報", p: [
        "ご同意いただいた場合に限り、Google Calendar の予定とカレンダー一覧、Google Tasks を読み取り専用で取得します。ログインのため、Google アカウント ID、メールアドレス、氏名も受け取ります。",
        "Google アカウント内の情報を作成・編集・削除することはありません。",
        "Google Calendar と Google Tasks の情報は画面表示のたびに取得し、当社のデータベースには保存しません。",
      ] },
      { h: "保存する情報", p: [
        "ユーザーが Achievee に入力した日記（気分を含む）と支出（カテゴリ、金額、メモ）のみを Google アカウント ID と紐付けて保存します。日記本文と支出メモは暗号化して保管します。",
        "言語設定はお使いの端末の Cookie に保存され、ログイン状態の維持にはセッション Cookie を使用します。",
      ] },
      { h: "利用目的", p: [
        "進捗、統計、日記、支出の表示など、Achievee の機能を提供する目的にのみ使用します。広告には使用せず、販売せず、AI モデルの学習にも使用しません。",
        "Achievee による Google API から取得した情報の利用および転送は、限定的な使用（Limited Use）の要件を含む Google API サービスのユーザーデータに関するポリシーを遵守します (" + GOOGLE_POLICY + ")。",
      ] },
      { h: "第三者提供", p: [
        "ユーザーの情報を第三者に提供しません。ただし、当社に代わって情報を処理するインフラ事業者として Vercel（ホスティング）と Neon（データベース）を利用します。サポートをご依頼いただいた場合、法令上必要な場合、セキュリティ保護に必要な場合を除き、人がユーザーの情報を閲覧することはありません。",
      ] },
      { h: "保管と削除", p: [
        "アプリ内の「データを削除」から、当社が保存したすべての情報をいつでも削除できます。https://myaccount.google.com/permissions で Achievee のアクセス権を取り消すこともでき、権限がなければ Google の情報は読み取られません。",
      ] },
      { h: "お問い合わせ", p: ["お問い合わせ・ご請求: {contact}"] },
    ],
  },
  es: {
    title: "Política de privacidad", updated: "Última actualización",
    sections: [
      { h: "Qué es Achievee", p: ["Achievee muestra los eventos de tu Google Calendar y tus Google Tasks como progreso diario, y te permite llevar un diario y registrar tus gastos."] },
      { h: "Datos que obtenemos de Google", p: [
        "Con tu consentimiento, Achievee lee (solo lectura) los eventos y la lista de tus calendarios de Google Calendar y tus Google Tasks. También recibimos el ID de tu cuenta de Google, tu correo electrónico y tu nombre para iniciar sesión.",
        "Nunca creamos, editamos ni eliminamos nada en tu cuenta de Google.",
        "Los datos de Google Calendar y Google Tasks se obtienen en el momento para mostrar tus pantallas. No se guardan en nuestra base de datos.",
      ] },
      { h: "Datos que almacenamos", p: [
        "Solo lo que escribes en Achievee: entradas de diario (con estado de ánimo) y gastos (categoría, importe, nota), vinculados al ID de tu cuenta de Google. El texto del diario y las notas de los gastos se cifran en reposo.",
        "Tu idioma se guarda en una cookie en tu dispositivo. El inicio de sesión usa una cookie de sesión.",
      ] },
      { h: "Cómo usamos los datos", p: [
        "Únicamente para ofrecerte las funciones de Achievee: mostrar tu progreso, estadísticas, diario y gastos. No usamos tus datos para publicidad, no los vendemos y no los usamos para entrenar modelos de IA.",
        "El uso y la transferencia que hace Achievee de la información recibida de las API de Google cumple la Política de datos de usuario de los servicios de API de Google, incluidos los requisitos de uso limitado (" + GOOGLE_POLICY + ").",
      ] },
      { h: "Compartir datos", p: [
        "No compartimos tus datos con terceros, salvo los proveedores de infraestructura que los procesan por nosotros: Vercel (alojamiento) y Neon (base de datos). Ninguna persona lee tus datos, salvo que solicites soporte, lo exija la ley o sea necesario para proteger la seguridad.",
      ] },
      { h: "Conservación y eliminación", p: [
        "Puedes eliminar todo lo que guardamos sobre ti en cualquier momento con “Eliminar mis datos” dentro de la app. También puedes revocar el acceso de Achievee en https://myaccount.google.com/permissions; sin acceso, no se lee ningún dato de Google.",
      ] },
      { h: "Contacto", p: ["Preguntas o solicitudes: {contact}"] },
    ],
  },
};
