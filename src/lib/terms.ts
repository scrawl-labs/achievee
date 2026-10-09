import type { Locale } from "./i18n";
import type { LegalDoc } from "./legal";
import { TERMS_ZH } from "./legal-zh";

export const TERMS_UPDATED = "2026-10-09";

/** {contact} is replaced with NEXT_PUBLIC_CONTACT_EMAIL. */
export const TERMS: Record<Locale, LegalDoc> = {
  zh: TERMS_ZH,
  en: {
    title: "Terms of Service", updated: "Last updated",
    sections: [
      { h: "Using Achievee", p: ["By signing in you agree to these terms. Achievee is a personal tool that shows your Google Calendar and Google Tasks as progress and lets you keep a diary and track spending. You must be old enough to have a Google account in your country."] },
      { h: "Your account and data", p: [
        "You sign in with your Google account. You are responsible for activity under your account. What you write in your diary and spending records belongs to you.",
        "How we handle data is described in the Privacy Policy. You can delete your data at any time with “Delete my data” in the app, and revoke access in your Google account settings.",
      ] },
      { h: "Acceptable use", p: ["Do not misuse the service: no attempts to access other people's data, disrupt or overload the service, reverse engineer it, or use it for anything unlawful."] },
      { h: "Service “as is”", p: [
        "Achievee is provided free of charge and “as is”, without warranties. Features may change or stop, and data shown depends on Google's services, which may be unavailable or inaccurate. Keep your own copy of anything important.",
        "To the extent permitted by law, we are not liable for indirect or consequential losses arising from your use of the service.",
      ] },
      { h: "Ending use", p: ["You can stop using Achievee at any time. We may suspend access that violates these terms or puts the service at risk."] },
      { h: "Changes and contact", p: ["We may update these terms; the date above shows the latest version, and continued use means you accept it. Questions: {contact}"] },
    ],
  },
  ko: {
    title: "서비스 이용약관", updated: "최종 수정일",
    sections: [
      { h: "서비스 이용", p: ["로그인하면 이 약관에 동의한 것으로 봅니다. Achievee는 Google Calendar와 Google Tasks를 성취 현황으로 보여주고 일기와 지출을 기록할 수 있는 개인용 도구입니다. 이용자는 거주 국가에서 Google 계정을 만들 수 있는 연령이어야 합니다."] },
      { h: "계정과 데이터", p: [
        "Google 계정으로 로그인하며, 계정에서 이루어진 활동의 책임은 이용자에게 있습니다. 이용자가 쓴 일기와 지출 기록의 권리는 이용자에게 있습니다.",
        "데이터 처리 방식은 개인정보처리방침에 설명되어 있습니다. 앱의 “내 데이터 삭제”로 언제든 데이터를 삭제할 수 있고, Google 계정 설정에서 접근 권한을 취소할 수 있습니다.",
      ] },
      { h: "금지 행위", p: ["다른 사람의 데이터에 접근하려는 시도, 서비스를 방해하거나 과부하를 주는 행위, 역설계, 불법적인 용도의 사용을 하지 마세요."] },
      { h: "있는 그대로 제공", p: [
        "Achievee는 무료로, 어떠한 보증 없이 “있는 그대로” 제공됩니다. 기능은 변경되거나 중단될 수 있고, 표시되는 정보는 Google 서비스에 의존하므로 일시적으로 불가능하거나 부정확할 수 있습니다. 중요한 내용은 따로 보관해 주세요.",
        "법이 허용하는 범위에서, 서비스 이용으로 생긴 간접 손해나 결과적 손해에 대해 책임지지 않습니다.",
      ] },
      { h: "이용 종료", p: ["이용자는 언제든 이용을 중단할 수 있습니다. 약관을 위반하거나 서비스를 위험에 빠뜨리는 이용은 제한될 수 있습니다."] },
      { h: "변경 및 문의", p: ["약관은 변경될 수 있으며, 위 날짜가 최신 버전입니다. 변경 후 계속 이용하면 동의한 것으로 봅니다. 문의: {contact}"] },
    ],
  },
  ja: {
    title: "利用規約", updated: "最終更新日",
    sections: [
      { h: "サービスの利用", p: ["ログインすることで、この規約に同意したものとみなします。Achievee は、Google Calendar と Google Tasks を達成状況として表示し、日記や支出を記録できる個人向けツールです。お住まいの国で Google アカウントを作成できる年齢である必要があります。"] },
      { h: "アカウントとデータ", p: [
        "Google アカウントでログインします。アカウントでの行動についての責任はユーザーにあります。日記や支出記録の権利はユーザーに帰属します。",
        "データの取り扱いはプライバシーポリシーに記載しています。アプリ内の「データを削除」でいつでも削除でき、Google アカウントの設定でアクセス権を取り消せます。",
      ] },
      { h: "禁止事項", p: ["他人のデータへのアクセス試行、サービスの妨害や過負荷、リバースエンジニアリング、違法な目的での利用はしないでください。"] },
      { h: "現状有姿での提供", p: [
        "Achievee は無料で、いかなる保証もなく「現状有姿」で提供されます。機能は変更・停止されることがあり、表示される情報は Google のサービスに依存するため、一時的に利用できない、または不正確な場合があります。重要な内容は別途保管してください。",
        "法律で認められる範囲で、サービスの利用により生じた間接的・派生的な損害について責任を負いません。",
      ] },
      { h: "利用の終了", p: ["ユーザーはいつでも利用をやめることができます。規約に違反する、またはサービスを危険にさらす利用は制限されることがあります。"] },
      { h: "変更とお問い合わせ", p: ["規約は変更されることがあり、上記の日付が最新版です。変更後も利用を続けた場合は同意したものとみなします。お問い合わせ: {contact}"] },
    ],
  },
  es: {
    title: "Términos del servicio", updated: "Última actualización",
    sections: [
      { h: "Uso de Achievee", p: ["Al iniciar sesión aceptas estos términos. Achievee es una herramienta personal que muestra tu Google Calendar y tus Google Tasks como progreso y te permite llevar un diario y registrar gastos. Debes tener la edad necesaria para tener una cuenta de Google en tu país."] },
      { h: "Tu cuenta y tus datos", p: [
        "Inicias sesión con tu cuenta de Google y eres responsable de la actividad en ella. Lo que escribes en tu diario y tus registros de gastos te pertenece.",
        "El tratamiento de los datos se describe en la Política de privacidad. Puedes eliminar tus datos en cualquier momento con “Eliminar mis datos” en la app y revocar el acceso en la configuración de tu cuenta de Google.",
      ] },
      { h: "Uso aceptable", p: ["No hagas un uso indebido del servicio: no intentes acceder a datos de otras personas, interrumpirlo o sobrecargarlo, aplicar ingeniería inversa ni usarlo para fines ilegales."] },
      { h: "Servicio “tal cual”", p: [
        "Achievee se ofrece gratis y “tal cual”, sin garantías. Las funciones pueden cambiar o cesar, y los datos mostrados dependen de los servicios de Google, que pueden no estar disponibles o ser inexactos. Guarda tu propia copia de lo importante.",
        "En la medida permitida por la ley, no somos responsables de pérdidas indirectas o consecuentes derivadas del uso del servicio.",
      ] },
      { h: "Fin del uso", p: ["Puedes dejar de usar Achievee en cualquier momento. Podemos suspender el acceso que incumpla estos términos o ponga en riesgo el servicio."] },
      { h: "Cambios y contacto", p: ["Podemos actualizar estos términos; la fecha indicada es la de la última versión y seguir usando el servicio implica aceptarla. Preguntas: {contact}"] },
    ],
  },
};
