import type { LegalDoc } from "./legal";

const GOOGLE_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";

/** Traditional Chinese (zh-TW). {contact} is replaced with NEXT_PUBLIC_CONTACT_EMAIL. */
export const PRIVACY_ZH: LegalDoc = {
  title: "隱私權政策", updated: "最後更新日期",
  sections: [
    { h: "關於 Achievee", p: ["Achievee 會把你的 Google Calendar 行程與 Google Tasks 呈現為每天的成就，並讓你記錄日記與支出。"] },
    { h: "我們從 Google 取得的資料", p: [
      "經你同意後，Achievee 會以唯讀方式讀取你的 Google Calendar 行程與日曆清單，以及 Google Tasks。為了讓你登入，我們也會取得你的 Google 帳戶 ID、電子郵件地址和姓名。",
      "我們絕不會在你的 Google 帳戶中建立、編輯或刪除任何內容。",
      "Google Calendar 與 Google Tasks 的資料只會在畫面需要時即時讀取，不會儲存在我們的資料庫中。",
    ] },
    { h: "我們儲存的資料", p: [
      "僅限你在 Achievee 中親自輸入的內容：日記（含心情）與支出（類別、金額、備註），並與你的 Google 帳戶 ID 關聯。日記內文與支出備註會加密保存。",
      "語言設定會儲存在你裝置的 Cookie 中，登入則使用工作階段 Cookie。",
    ] },
    { h: "資料用途", p: [
      "僅用於向你提供 Achievee 的功能：顯示你的進度、統計、日記與支出。我們不會將你的資料用於廣告、不會出售，也不會用於訓練 AI 模型。",
      "Achievee 對從 Google API 取得之資訊的使用與傳輸，遵循 Google API 服務使用者資料政策，包含有限使用（Limited Use）規定（" + GOOGLE_POLICY + "）。",
    ] },
    { h: "資料分享", p: [
      "除了代我們處理資料的基礎設施供應商 Vercel（代管）與 Neon（資料庫）之外，我們不會與第三方分享你的資料。除非你要求客服協助、法律要求，或為保護安全所需，否則不會有人查看你的資料。",
    ] },
    { h: "保存與刪除", p: [
      "你可以隨時使用 App 內的「刪除我的資料」，刪除我們儲存的所有關於你的資料。你也可以在 https://myaccount.google.com/permissions 撤銷 Achievee 的存取權限；沒有權限就不會讀取任何 Google 資料。",
    ] },
    { h: "聯絡我們", p: ["問題或請求：{contact}"] },
  ],
};

export const TERMS_ZH: LegalDoc = {
  title: "服務條款", updated: "最後更新日期",
  sections: [
    { h: "使用 Achievee", p: ["登入即表示你同意本條款。Achievee 是一款個人工具，將你的 Google Calendar 與 Google Tasks 呈現為進度，並讓你寫日記、記錄支出。你必須達到在所在國家擁有 Google 帳戶的年齡。"] },
    { h: "你的帳戶與資料", p: [
      "你使用 Google 帳戶登入，並對該帳戶下的活動負責。你寫在日記與支出紀錄中的內容屬於你。",
      "我們如何處理資料，請見隱私權政策。你可以隨時使用 App 內的「刪除我的資料」刪除資料，也可以在 Google 帳戶設定中撤銷存取權限。",
    ] },
    { h: "可接受的使用方式", p: ["請勿濫用本服務：不得嘗試存取他人的資料、干擾或使服務過載、進行還原工程，或將其用於任何違法用途。"] },
    { h: "「現狀」提供", p: [
      "Achievee 免費提供，並以「現狀」提供，不附帶任何保證。功能可能變更或停止；顯示的資料取決於 Google 的服務，可能無法使用或不準確。重要內容請自行備份。",
      "在法律允許的範圍內，對於因使用本服務而產生的間接或衍生損失，我們不負賠償責任。",
    ] },
    { h: "終止使用", p: ["你可以隨時停止使用 Achievee。違反本條款或危及服務的存取，我們可能予以暫停。"] },
    { h: "變更與聯絡", p: ["我們可能更新本條款；上方日期為最新版本，繼續使用即表示你接受。問題：{contact}"] },
  ],
};
