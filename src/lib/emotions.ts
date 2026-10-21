import type { Locale } from "./i18n";
import { FAMILY_TR, WORD_TR } from "./emotions-i18n";

/**
 * Emotion vocabulary for the diary ("what exactly am I feeling?").
 * Every word, description and grouping below was written for this app. It is NOT derived from the EVOKE dataset
 * (Jung, Shin & Bergen, 2026, arXiv:2602.10414, CC BY-NC 4.0); the idea of widening one's emotion vocabulary was
 * inspired by that research and is credited in the app and README.
 * Words are language-specific, not translations of each other: `ko` and `en` each name the closest feeling in that language.
 */
export type EmoLang = Locale;
/** Every locale has its own list of words and descriptions. */
export const emoLang = (l: Locale): EmoLang => l;

type Pair = [word: string, description: string];
type BaseFamily = { id: string; ko: string; en: string };
export type Family = BaseFamily & { ja: string; es: string; zh: string };
type BaseWord = { id: string; family: string; ko: Pair; en: Pair; near?: string[] };
export type Word = BaseWord & { ja: Pair; es: Pair; zh: Pair };

const BASE_FAMILIES: BaseFamily[] = [
  { id: "joy", ko: "기쁨", en: "Joy" },
  { id: "calm", ko: "편안함", en: "Calm" },
  { id: "warm", ko: "따뜻함", en: "Warmth" },
  { id: "moved", ko: "감동", en: "Moved" },
  { id: "sad", ko: "슬픔", en: "Sadness" },
  { id: "hurt", ko: "서운함", en: "Hurt" },
  { id: "mixed", ko: "복잡한 마음", en: "Mixed feelings" },
  { id: "anger", ko: "분노", en: "Anger" },
  { id: "envy", ko: "부러움", en: "Envy" },
  { id: "anx", ko: "불안", en: "Anxiety" },
  { id: "lonely", ko: "외로움", en: "Loneliness" },
  { id: "shame", ko: "부끄러움", en: "Shame" },
  { id: "weary", ko: "지침", en: "Weariness" },
  { id: "surprise", ko: "놀람", en: "Surprise" },
];
export const FAMILIES: Family[] = BASE_FAMILIES.map((f) => ({ ...f, ...FAMILY_TR[f.id] }));

const BASE_WORDS: BaseWord[] = [
  // ---- joy
  { id: "glad", family: "joy", ko: ["기쁘다", "바라던 일이 이루어지거나 좋은 소식을 들어 마음이 환해질 때"], en: ["glad", "Good news, or something you hoped for, brightens your mood."], near: ["enjoy", "grateful", "excited"] },
  { id: "enjoy", family: "joy", ko: ["즐겁다", "하고 있는 일이나 함께 있는 시간이 신나고 유쾌할 때"], en: ["cheerful", "You are enjoying what you are doing or who you are with."], near: ["glad", "excited", "light"] },
  { id: "proud", family: "joy", ko: ["뿌듯하다", "애쓴 일이 결과로 이어져 가슴이 가득 찰 때"], en: ["proud", "Your effort paid off and it fills you up."], near: ["content", "glad", "relieved"] },
  { id: "excited", family: "joy", ko: ["설레다", "곧 일어날 좋은 일을 기대하며 마음이 두근거릴 때"], en: ["excited", "You look forward to something good, with a flutter in your chest."], near: ["glad", "nervous", "enjoy"] },
  { id: "grateful", family: "joy", ko: ["감사하다", "누군가의 도움이나 좋은 일에 고마운 마음이 들 때"], en: ["grateful", "You feel thankful for someone's help or for something good."], near: ["glad", "supported", "warm"] },
  { id: "relieved", family: "joy", ko: ["후련하다", "답답하던 일이 풀려서 속이 시원할 때"], en: ["relieved", "A weight you were carrying is gone and you can breathe again."], near: ["light", "reassured", "proud"] },
  { id: "light", family: "joy", ko: ["홀가분하다", "부담이나 걱정을 내려놓아 몸과 마음이 가벼울 때"], en: ["light", "You have set down a burden or a worry and feel light."], near: ["relieved", "relaxed", "reassured"] },
  { id: "overjoyed", family: "joy", ko: ["벅차다", "기쁨이나 감동이 너무 커서 가슴이 가득 찰 때"], en: ["overwhelmed with joy", "Joy or emotion so big that your chest feels full."], near: ["glad", "proud", "chokedup"] },
  // ---- calm
  { id: "comfy", family: "calm", ko: ["편안하다", "몸도 마음도 긴장 없이 안정돼 있을 때"], en: ["comfortable", "Your body and mind are both at ease."], near: ["serene", "cozy", "relaxed"] },
  { id: "serene", family: "calm", ko: ["평온하다", "마음이 잔잔해서 흔들리는 것이 없을 때"], en: ["serene", "Your mind is still and nothing is stirring it."], near: ["comfy", "content", "relaxed"] },
  { id: "reassured", family: "calm", ko: ["안심되다", "걱정하던 일이 괜찮다는 걸 알게 되어 마음이 놓일 때"], en: ["reassured", "You learn the thing you feared is fine, and you can relax."], near: ["relieved", "supported", "light"] },
  { id: "relaxed", family: "calm", ko: ["느긋하다", "서두를 것 없이 여유 있게 지낼 때"], en: ["relaxed", "There is no rush and you are taking it slow."], near: ["comfy", "light", "serene"] },
  { id: "content", family: "calm", ko: ["만족스럽다", "지금 가진 것이나 상황이 충분하다고 느낄 때"], en: ["content", "What you have right now feels like enough."], near: ["proud", "serene", "grateful"] },
  { id: "cozy", family: "calm", ko: ["포근하다", "따뜻하고 부드럽게 감싸 안긴 듯 아늑할 때"], en: ["cozy", "Warm and softly wrapped up."], near: ["comfy", "warm", "homey"] },
  { id: "refreshed", family: "calm", ko: ["개운하다", "푹 쉬거나 씻어낸 듯 몸과 마음이 맑을 때"], en: ["refreshed", "Rested or washed clean, body and mind feel clear."] },
  { id: "hushed", family: "calm", ko: ["고요하다", "소리도 생각도 가라앉아 조용할 때"], en: ["hushed", "Sound and thoughts have both settled into quiet."] },
  { id: "composed", family: "calm", ko: ["차분하다", "들뜨거나 걱정하지 않고 마음이 가라앉아 있을 때"], en: ["composed", "You are neither wound up nor worried; your mind is settled."] },
  { id: "stable", family: "calm", ko: ["안정되다", "흔들림 없이 마음의 균형이 잡혀 있을 때"], en: ["steady", "Nothing shakes you and you feel balanced."] },
  { id: "leisurely", family: "calm", ko: ["여유롭다", "시간과 마음에 넉넉한 틈이 있을 때"], en: ["leisurely", "There is plenty of room in your time and in your mind."] },
  { id: "snug", family: "calm", ko: ["아늑하다", "작고 따뜻한 공간에 안겨 있는 듯 편안할 때"], en: ["snug", "You feel held, as if in a small warm space."] },
  // ---- warm
  { id: "warm", family: "warm", ko: ["따뜻하다", "다정한 말이나 손길에 마음이 훈훈해질 때"], en: ["warm", "A kind word or gesture makes you feel warm inside."], near: ["tender", "grateful", "cozy"] },
  { id: "tender", family: "warm", ko: ["애틋하다", "소중한 사람이 안쓰럽고 정이 깊을 때"], en: ["tender", "Deep fondness mixed with a gentle ache for someone dear."], near: ["warm", "longing", "adoring"] },
  { id: "supported", family: "warm", ko: ["든든하다", "믿고 기댈 사람이나 것이 있어서 마음이 놓일 때"], en: ["supported", "You have someone or something to lean on."], near: ["reassured", "grateful", "warm"] },
  { id: "adoring", family: "warm", ko: ["사랑스럽다", "보고만 있어도 귀엽고 아끼고 싶을 때"], en: ["adoring", "Just looking at them makes you smile and want to cherish them."], near: ["tender", "warm", "glad"] },
  { id: "gladtosee", family: "warm", ko: ["반갑다", "오랜만에 만나거나 좋은 소식을 접해 기쁠 때"], en: ["glad to see", "You are delighted to meet again or to hear something good."], near: ["glad", "warm", "excited"] },
  { id: "homey", family: "warm", ko: ["정겹다", "익숙하고 다정한 분위기가 마음을 푸근하게 할 때"], en: ["homey", "A familiar, friendly atmosphere eases your heart."], near: ["cozy", "warm", "comfy"] },
  // ---- sadness
  { id: "sad", family: "sad", ko: ["슬프다", "소중한 것을 잃었거나 마음 아픈 일이 있을 때"], en: ["sad", "You lost something dear, or something hurts."], near: ["gloomy", "chokedup", "longing"] },
  { id: "gloomy", family: "sad", ko: ["우울하다", "뚜렷한 이유가 없어도 마음이 가라앉고 어두울 때"], en: ["gloomy", "Your mood sinks, even without a clear reason."], near: ["sad", "listless", "empty"] },
  { id: "deflated", family: "sad", ko: ["허탈하다", "애쓰던 일이 끝나거나 틀어져 힘이 쑥 빠질 때"], en: ["deflated", "After a lot of effort ends or falls through, the energy drains out."], near: ["disappointed", "wornout", "hollow"] },
  { id: "longing", family: "sad", ko: ["그립다", "지금 곁에 없는 사람이나 때가 자꾸 떠오를 때"], en: ["longing", "Someone or some time that is no longer here keeps coming to mind."], near: ["tender", "sad", "lonely"] },
  { id: "desolate", family: "sad", ko: ["쓸쓸하다", "주위가 텅 빈 듯 마음이 허하고 적적할 때"], en: ["desolate", "Everything around you feels empty and quiet."], near: ["lonely", "hollow", "sad"] },
  { id: "chokedup", family: "sad", ko: ["먹먹하다", "슬픔이나 감동이 가슴을 막아 말이 잘 안 나올 때"], en: ["choked up", "Sadness or deep feeling blocks your chest and the words will not come."], near: ["sad", "overjoyed", "tender"] },
  { id: "miserable", family: "sad", ko: ["비참하다", "처지가 초라하고 괴로워서 견디기 힘들 때"], en: ["miserable", "Your situation feels so wretched that it is hard to bear."], near: ["sad", "humiliated", "gloomy"] },
  // ---- hurt (letting down / unmet expectation)
  { id: "letdown", family: "hurt", ko: ["서운하다", "기대한 만큼 마음을 받지 못해 쓸쓸하고 아쉬울 때"], en: ["let down", "You did not get the care you expected, and it stings quietly."], near: ["anxious", "sad", "illwill", "wistful"] },
  { id: "slighted", family: "hurt", ko: ["섭섭하다", "가까운 사람의 말이나 행동이 마음에 걸려 작게 아플 때"], en: ["slighted", "Something a close person said or did leaves a small ache."], near: ["letdown", "resentful", "hollow"] },
  { id: "resentful", family: "hurt", ko: ["야속하다", "내 마음을 몰라주는 것 같아 원망스러울 때"], en: ["resentful", "It feels like they do not understand your heart, and you hold it against them."], near: ["slighted", "indignant", "illwill"] },
  { id: "wistful", family: "hurt", ko: ["아쉽다", "더 잘할 수 있었거나 끝나버려서 미련이 남을 때"], en: ["wistful", "It could have gone better, or it ended, and a little regret lingers."], near: ["disappointed", "longing", "regret"] },
  { id: "upset", family: "hurt", ko: ["속상하다", "일이 뜻대로 안 되거나 마음 아픈 일이 생겨 마음이 상할 때"], en: ["upset", "Things did not go your way, or something pained you."], near: ["sad", "irritated", "wronged"] },
  { id: "wronged", family: "hurt", ko: ["억울하다", "잘못이 없는데 부당한 대우를 받았다고 느낄 때"], en: ["wronged", "You did nothing wrong and still feel treated unfairly."], near: ["indignant", "upset", "resentful"] },
  { id: "hollow", family: "hurt", ko: ["허전하다", "있어야 할 것이 없어서 마음이 빈 듯할 때"], en: ["hollow", "Something that should be there is missing, and you feel empty."], near: ["empty", "lonely", "deflated"] },
  { id: "disappointed", family: "hurt", ko: ["실망스럽다", "기대했던 것과 달라서 마음이 식을 때"], en: ["disappointed", "It turned out different from what you hoped."], near: ["wistful", "deflated", "letdown"] },
  // ---- anger
  { id: "irritated", family: "anger", ko: ["짜증나다", "작은 일이 거슬려서 신경질이 날 때"], en: ["irritated", "Small things grate on you."], near: ["angry", "stuck", "displeased"] },
  { id: "angry", family: "anger", ko: ["화나다", "부당하거나 싫은 일에 거센 감정이 치밀 때"], en: ["angry", "Something unfair or unwanted brings up a strong heat."], near: ["indignant", "offended", "irritated"] },
  { id: "stuck", family: "anger", ko: ["답답하다", "일이 안 풀리거나 말이 통하지 않아 속이 막힌 듯할 때"], en: ["frustrated", "Things stall or no one gets it, and you feel stuck."], near: ["irritated", "lost", "burdened"] },
  { id: "illwill", family: "anger", ko: ["밉다", "누군가에게 좋지 않은 마음이 들어 외면하고 싶을 때"], en: ["ill will", "A sour feeling toward someone; you would rather not look at them."], near: ["resentful", "angry", "letdown"] },
  { id: "indignant", family: "anger", ko: ["분하다", "당하기만 했다는 생각에 억울하고 화가 치밀 때"], en: ["indignant", "You feel wronged and it makes you burn."], near: ["angry", "wronged", "offended"] },
  { id: "offended", family: "anger", ko: ["괘씸하다", "나를 얕보거나 예의 없이 대해 불쾌할 때"], en: ["offended", "Someone disrespected you and it riles you."], near: ["indignant", "displeased", "angry"] },
  { id: "displeased", family: "anger", ko: ["불쾌하다", "기분이 상하고 불편한 느낌이 남을 때"], en: ["displeased", "Something leaves a bad, uneasy taste."], near: ["irritated", "offended", "awkward"] },
  // ---- anxiety
  { id: "anxious", family: "anx", ko: ["불안하다", "무슨 일이 생길지 몰라 마음이 놓이지 않을 때"], en: ["anxious", "You cannot settle because you do not know what will happen."], near: ["worried", "onedge", "afraid"] },
  { id: "onedge", family: "anx", ko: ["초조하다", "기다리는 일 앞에서 마음이 급하고 안절부절못할 때"], en: ["on edge", "You are waiting for something and cannot sit still."], near: ["anxious", "nervous", "tense"] },
  { id: "worried", family: "anx", ko: ["걱정되다", "일이 잘못될까 봐 자꾸 마음이 쓰일 때"], en: ["worried", "You keep thinking it might go wrong."], near: ["anxious", "burdened", "tense"] },
  { id: "afraid", family: "anx", ko: ["두렵다", "무섭고 겁이 나서 피하고 싶을 때"], en: ["afraid", "You are frightened and want to get away."], near: ["anxious", "nervous", "lost"] },
  { id: "lost", family: "anx", ko: ["막막하다", "어디서부터 어떻게 해야 할지 몰라 앞이 캄캄할 때"], en: ["lost", "You do not know where to start and the way ahead looks dark."], near: ["stuck", "afraid", "burdened"] },
  { id: "nervous", family: "anx", ko: ["조마조마하다", "나쁜 일이 생길까 봐 가슴을 졸일 때"], en: ["nervous", "You brace yourself, afraid something bad is about to happen."], near: ["onedge", "excited", "tense"] },
  { id: "burdened", family: "anx", ko: ["부담스럽다", "해야 할 일이나 기대가 무겁게 느껴질 때"], en: ["burdened", "A task or an expectation feels heavy."], near: ["worried", "stuck", "lost"] },
  { id: "tense", family: "anx", ko: ["긴장되다", "중요한 순간 앞에서 몸이 굳고 신경이 곤두설 때"], en: ["tense", "Before something that matters, your body tightens."], near: ["onedge", "nervous", "worried"] },
  // ---- loneliness
  { id: "lonely", family: "lonely", ko: ["외롭다", "곁에 마음 나눌 사람이 없다고 느낄 때"], en: ["lonely", "You feel there is no one to share your heart with."], near: ["leftout", "empty", "longing"] },
  { id: "leftout", family: "lonely", ko: ["소외되다", "무리에서 나만 빠진 것 같을 때"], en: ["left out", "You feel like the only one missing from the group."], near: ["lonely", "awkward", "slighted"] },
  { id: "empty", family: "lonely", ko: ["공허하다", "마음속이 텅 비어 무엇으로도 채워지지 않는 듯할 때"], en: ["empty", "Inside you is empty and nothing seems to fill it."], near: ["hollow", "lonely", "gloomy"] },
  { id: "awkward", family: "lonely", ko: ["어색하다", "상대나 상황이 편하지 않아 자연스럽지 못할 때"], en: ["awkward", "You cannot act naturally around someone or in a situation."], near: ["embarrassed", "distant", "tense"] },
  { id: "distant", family: "lonely", ko: ["서먹하다", "친했던 사이가 멀어져 대하기 어색할 때"], en: ["distant", "A once-close relationship has drifted and feels stiff."], near: ["awkward", "leftout", "lonely"] },
  { id: "alone", family: "lonely", ko: ["고독하다", "혼자라는 사실이 선명하게 느껴질 때"], en: ["solitary", "The fact that you are alone feels vivid."] },
  { id: "cutoff", family: "lonely", ko: ["단절되다", "사람들과 이어진 끈이 끊어진 듯할 때"], en: ["cut off", "The thread to other people feels cut."] },
  { id: "missing", family: "lonely", ko: ["보고 싶다", "누군가를 만나고 싶은 마음이 클 때"], en: ["missing someone", "You long to see someone."] },
  // ---- shame / guilt
  { id: "ashamed", family: "shame", ko: ["부끄럽다", "내 모습이나 행동이 떳떳하지 못하다고 느낄 때"], en: ["ashamed", "You feel you cannot hold your head up about who you are or what you did."], near: ["embarrassed", "guilty", "humiliated"] },
  { id: "embarrassed", family: "shame", ko: ["민망하다", "뜻밖의 상황에서 얼굴이 화끈할 때"], en: ["embarrassed", "An unexpected moment makes your face go warm."], near: ["humiliated", "awkward", "ashamed"] },
  { id: "humiliated", family: "shame", ko: ["창피하다", "남들 앞에서 체면이 깎인 것 같을 때"], en: ["humiliated", "You feel you lost face in front of others."], near: ["embarrassed", "ashamed", "miserable"] },
  { id: "sorry", family: "shame", ko: ["미안하다", "누군가에게 폐를 끼쳤다는 마음이 들 때"], en: ["sorry", "You feel you have troubled someone."], near: ["guilty", "regret", "ashamed"] },
  { id: "guilty", family: "shame", ko: ["죄스럽다", "잘못했다는 마음이 무겁게 가슴을 누를 때"], en: ["guilty", "A sense of having done wrong weighs on you."], near: ["sorry", "regret", "ashamed"] },
  { id: "regret", family: "shame", ko: ["후회되다", "지난 선택을 되돌리고 싶을 때"], en: ["regretful", "You wish you could undo a past choice."], near: ["wistful", "guilty", "sorry"] },
  // ---- weariness
  { id: "tired", family: "weary", ko: ["피곤하다", "몸이 지쳐 쉬고 싶을 때"], en: ["tired", "Your body is spent and wants rest."], near: ["wornout", "listless", "bored"] },
  { id: "wornout", family: "weary", ko: ["지치다", "오랫동안 애쓰느라 힘이 다 빠졌을 때"], en: ["worn out", "You have pushed for so long that you have run out."], near: ["tired", "deflated", "listless"] },
  { id: "listless", family: "weary", ko: ["무기력하다", "아무것도 하고 싶은 의욕이 나지 않을 때"], en: ["listless", "You have no drive to do anything."], near: ["gloomy", "wornout", "bothered"] },
  { id: "bothered", family: "weary", ko: ["귀찮다", "해야 하는 일이 번거로워서 하기 싫을 때"], en: ["can't be bothered", "A needed task feels like too much trouble."], near: ["listless", "bored", "tired"] },
  { id: "bored", family: "weary", ko: ["지루하다", "시간이 더디게 가고 흥미가 생기지 않을 때"], en: ["bored", "Time drags and nothing holds your interest."], near: ["bothered", "tired", "listless"] },
  { id: "blank", family: "weary", ko: ["멍하다", "생각이 멈춘 듯 정신이 없는 상태일 때"], en: ["blank", "Your mind feels switched off."], near: ["bewildered", "tired", "wornout"] },
  // ---- surprise
  { id: "surprised", family: "surprise", ko: ["놀랍다", "뜻밖의 일에 깜짝 놀랄 때"], en: ["surprised", "An unexpected thing startles you."], near: ["amazed", "flustered", "bewildered"] },
  { id: "flustered", family: "surprise", ko: ["당황스럽다", "갑작스러운 일에 어찌할 바를 모를 때"], en: ["flustered", "A sudden turn leaves you not knowing what to do."], near: ["surprised", "embarrassed", "bewildered"] },
  { id: "baffled", family: "surprise", ko: ["황당하다", "어이가 없어서 말이 안 나올 때"], en: ["baffled", "It is so absurd that you are speechless."], near: ["bewildered", "displeased", "surprised"] },
  { id: "bewildered", family: "surprise", ko: ["어리둥절하다", "무슨 일인지 몰라 멍하고 헷갈릴 때"], en: ["bewildered", "You do not know what is going on and feel muddled."], near: ["baffled", "blank", "flustered"] },
  { id: "amazed", family: "surprise", ko: ["신기하다", "처음 보는 것이 재미있고 놀라울 때"], en: ["amazed", "Something new strikes you as wonderful."], near: ["surprised", "excited", "enjoy"] },
  { id: "dazed", family: "surprise", ko: ["얼떨떨하다", "갑작스러운 일에 정신이 얼얼할 때"], en: ["dazed", "A sudden event leaves you spinning."] },
  { id: "stunned", family: "surprise", ko: ["어안이 벙벙하다", "뜻밖의 일에 말이 안 나올 때"], en: ["stunned", "Something unexpected leaves you speechless."] },
  { id: "curious", family: "surprise", ko: ["궁금하다", "알고 싶은 마음이 솟아오를 때"], en: ["curious", "You feel a pull to find out."] },
  { id: "intrigued", family: "surprise", ko: ["흥미롭다", "새로운 것에 마음이 끌려 더 보고 싶을 때"], en: ["intrigued", "Something new draws you in and you want more."] },
  // ---- added after checking coverage against common Korean emotion words (see credits); all wording is original
  { id: "happy", family: "joy", ko: ["행복하다", "마음이 가득 채워져 지금 이대로가 좋다고 느낄 때"], en: ["happy", "You feel full inside and glad that things are just as they are."], near: ["glad", "content", "grateful"] },
  { id: "thrilled", family: "joy", ko: ["신나다", "몸과 마음이 들떠서 흥이 절로 오를 때"], en: ["thrilled", "Your energy lifts and you cannot help being lively."], near: ["enjoy", "excited", "glad"] },
  { id: "exhilarated", family: "joy", ko: ["통쾌하다", "막혔던 일이 시원하게 풀려서 속이 확 트일 때"], en: ["exhilarated", "Something that blocked you breaks open, and it feels great."], near: ["relieved", "light", "proud"] },
  { id: "thankful", family: "joy", ko: ["고맙다", "누군가의 도움이나 마음을 받아 그 사람이 있어 다행이라고 느낄 때"], en: ["thankful", "You received someone's help or kindness and are glad to have them."], near: ["grateful", "warm", "supported"] },
  { id: "fulfilled", family: "joy", ko: ["보람차다", "한 일이 의미 있었다고 느껴져 마음이 채워질 때"], en: ["fulfilled", "What you did felt meaningful and it fills you up."] },
  { id: "hopeful", family: "joy", ko: ["기대되다", "앞으로 좋아질 것 같아 마음이 밝아질 때"], en: ["hopeful", "You sense things getting better and it lifts you."] },
  { id: "confident", family: "joy", ko: ["당당하다", "스스로를 믿고 어깨를 펴고 있을 때"], en: ["confident", "You trust yourself and stand tall."] },
  { id: "giddy", family: "joy", ko: ["들뜨다", "기분이 붕 떠서 가만히 있기 어려울 때"], en: ["giddy", "Your mood floats and it is hard to sit still."] },
  { id: "electrified", family: "joy", ko: ["짜릿하다", "온몸에 찌르르 전기가 흐르듯 기쁠 때"], en: ["electrified", "A jolt of joy runs through your whole body."] },
  { id: "pleased", family: "warm", ko: ["흐뭇하다", "보기만 해도 마음이 따뜻하고 조용히 만족스러울 때"], en: ["pleased", "Just seeing it fills you with warm, quiet satisfaction."], near: ["content", "proud", "warm"] },
  { id: "sympathetic", family: "warm", ko: ["안쓰럽다", "애쓰는 모습이 딱해서 마음이 쓰이고 도와주고 싶을 때"], en: ["sympathetic", "You see someone struggling and ache for them."], near: ["tender", "worried", "pained"] },
  { id: "affectionate", family: "warm", ko: ["다정하다", "누군가에게 따뜻한 마음을 건네고 싶을 때"], en: ["affectionate", "You want to offer someone a warm word or gesture."] },
  { id: "chummy", family: "warm", ko: ["정답다", "가까운 사람과 마음이 통해 정이 느껴질 때"], en: ["close", "You feel a bond with someone close."] },
  { id: "caring", family: "warm", ko: ["챙겨주고 싶다", "누군가를 돌보고 보살피고 싶을 때"], en: ["caring", "You want to look after someone."] },
  { id: "admiring", family: "warm", ko: ["존경스럽다", "누군가의 태도나 실력에 고개가 숙여질 때"], en: ["admiring", "Someone's attitude or skill makes you look up to them."] },
  { id: "reliable", family: "warm", ko: ["믿음직하다", "이 사람이라면 맡겨도 되겠다고 느껴질 때"], en: ["reliable", "You feel you can leave it to this person."] },
  { id: "moved", family: "moved", ko: ["감동받다", "누군가의 말이나 행동, 이야기가 마음을 크게 울릴 때"], en: ["moved", "Someone's words, actions or story touch you deeply."], near: ["touched", "grateful", "overjoyed"] },
  { id: "touched", family: "moved", ko: ["뭉클하다", "갑자기 가슴이 뜨거워지고 눈시울이 붉어질 때"], en: ["touched", "Your chest warms suddenly and your eyes may sting."], near: ["moved", "chokedup", "tender"] },
  { id: "awed", family: "moved", ko: ["경이롭다", "대단한 것을 보고 저절로 감탄이 나올 때"], en: ["awed", "You see something remarkable and wonder rises on its own."], near: ["amazed", "moved", "overjoyed"] },
  { id: "stirred", family: "moved", ko: ["찡하다", "코끝이 시큰해질 만큼 마음이 건드려질 때"], en: ["stirred", "Something touches you so much that your nose tingles."] },
  { id: "inspired", family: "moved", ko: ["영감받다", "누군가나 무언가에 자극받아 해보고 싶은 마음이 들 때"], en: ["inspired", "Someone or something sparks the urge to try."] },
  { id: "welledup", family: "moved", ko: ["울컥하다", "감정이 갑자기 치밀어 목이 메일 때"], en: ["welled up", "Emotion suddenly rises and your throat tightens."] },
  { id: "solemn", family: "moved", ko: ["숙연하다", "엄숙하게 마음이 가라앉고 조용해질 때"], en: ["solemn", "Your mind turns quiet and serious."] },
  { id: "forlorn", family: "sad", ko: ["서럽다", "억울하거나 외로워서 눈물이 날 만큼 마음이 북받칠 때"], en: ["forlorn", "Feeling wronged or alone to the point of tears."], near: ["sad", "wronged", "lonely"] },
  { id: "sorrowful", family: "sad", ko: ["서글프다", "처지가 딱해 보여 쓸쓸하고 슬퍼질 때"], en: ["sorrowful", "Your lot looks pitiful and a quiet sadness settles in."], near: ["sad", "desolate", "bitter"] },
  { id: "futile", family: "sad", ko: ["허무하다", "애써 얻은 것이 덧없어서 아무 의미가 없는 듯할 때"], en: ["futile", "What you worked for suddenly feels meaningless."], near: ["deflated", "empty", "hollow"] },
  { id: "down", family: "sad", ko: ["울적하다", "마음이 답답하고 기분이 가라앉아 있을 때"], en: ["down", "Your mood sags and a heaviness sits on your chest."], near: ["gloomy", "sad", "listless"] },
  { id: "downcast", family: "sad", ko: ["시무룩하다", "기운이 없고 말수가 줄어 풀이 죽어 있을 때"], en: ["downcast", "You have lost your spark and gone quiet."], near: ["gloomy", "deflated", "down"] },
  { id: "pained", family: "sad", ko: ["안타깝다", "바라던 대로 되지 않아 가슴이 아프고 어쩌지 못해 애가 탈 때"], en: ["pained", "It did not go as hoped, and you ache because you cannot change it."], near: ["wistful", "sad", "sympathetic"] },
  { id: "heartsore", family: "sad", ko: ["마음이 아프다", "가슴 한쪽이 쿡쿡 아플 때"], en: ["heartsore", "One side of your chest keeps aching."] },
  { id: "stinging", family: "sad", ko: ["쓰라리다", "아문 줄 알았던 상처가 따끔하게 느껴질 때"], en: ["stinging", "A wound you thought had healed smarts again."] },
  { id: "weepy", family: "sad", ko: ["눈물나다", "이유가 분명하지 않아도 눈물이 날 것 같을 때"], en: ["tearful", "You feel like crying, even without a clear reason."] },
  { id: "betrayed", family: "hurt", ko: ["배신감이 들다", "믿었던 사람에게 뒤통수를 맞은 듯 충격과 분함이 클 때"], en: ["betrayed", "Someone you trusted let you down, with shock and anger."], near: ["wronged", "angry", "letdown"] },
  { id: "ignored", family: "hurt", ko: ["무시당하다", "내 말이나 존재가 가볍게 여겨진 것 같을 때"], en: ["dismissed", "What you said, or you yourself, felt brushed aside."] },
  { id: "wounded", family: "hurt", ko: ["상처받다", "누군가의 말이나 행동에 마음이 베인 것 같을 때"], en: ["wounded", "Someone's words or actions cut you."] },
  { id: "sulky", family: "hurt", ko: ["토라지다", "서운해서 말없이 마음을 닫고 싶을 때"], en: ["sulky", "Hurt, you want to close up without a word."] },
  { id: "crestfallen", family: "hurt", ko: ["허망하다", "기대가 무너져 맥이 풀릴 때"], en: ["crestfallen", "Your hopes collapsed and the strength drains out."] },
  { id: "conflicted", family: "mixed", ko: ["착잡하다", "여러 마음이 뒤섞여 어떤 감정인지 딱 잡히지 않을 때"], en: ["conflicted", "Several feelings mix and you cannot pin down a single one."], near: ["unsettled", "bittersweet", "restless"] },
  { id: "unsettled", family: "mixed", ko: ["심란하다", "마음이 어수선해서 차분히 있기 어려울 때"], en: ["unsettled", "Your mind is scattered and cannot settle."], near: ["anxious", "conflicted", "worried"] },
  { id: "restless", family: "mixed", ko: ["싱숭생숭하다", "뚜렷한 이유 없이 마음이 들뜨고 어수선할 때"], en: ["restless", "A vague stirring with no clear reason."], near: ["unsettled", "excited", "conflicted"] },
  { id: "bittersweet", family: "mixed", ko: ["시원섭섭하다", "끝나서 후련하면서도 한편으로 아쉬울 때"], en: ["bittersweet", "Relieved that it is over, yet a little sad that it is."], near: ["relieved", "wistful", "light"] },
  { id: "bitter", family: "mixed", ko: ["씁쓸하다", "기대와 달라 입맛이 쓴 듯 허탈하고 언짢을 때"], en: ["bitter", "It differed from what you hoped and leaves a sour taste."], near: ["disappointed", "deflated", "wistful"] },
  { id: "nostalgic", family: "mixed", ko: ["아련하다", "지난 일이 흐릿하게 떠올라 애틋하고 아득할 때"], en: ["faintly nostalgic", "A past moment returns softly, dim and dear."], near: ["longing", "tender", "wistful"] },
  { id: "wavering", family: "mixed", ko: ["갈팡질팡하다", "마음이 이리저리 오가 갈피를 못 잡을 때"], en: ["torn", "Your mind swings back and forth with no direction."] },
  { id: "scattered", family: "mixed", ko: ["뒤숭숭하다", "마음이 어수선해 일이 손에 잡히지 않을 때"], en: ["all over the place", "Your mind is in disarray and you cannot settle to anything."] },
  { id: "flat", family: "mixed", ko: ["담담하다", "감정이 크게 일지 않고 평평할 때"], en: ["level", "Nothing stirs strongly; your feelings run flat."] },
  { id: "envious", family: "envy", ko: ["부럽다", "남이 가진 것이나 모습을 나도 갖고 싶을 때"], en: ["envious", "You want what someone else has or is."], near: ["jealous", "inadequate", "wistful"] },
  { id: "jealous", family: "envy", ko: ["질투나다", "소중한 사람이나 것을 다른 사람이 차지한 것 같아 속이 탈 때"], en: ["jealous", "It feels like someone is taking what is dear to you."], near: ["envious", "letdown", "angry"] },
  { id: "inadequate", family: "envy", ko: ["열등감이 들다", "남과 비교해서 내가 부족하다고 느껴질 때"], en: ["inadequate", "Next to others, you feel you fall short."], near: ["envious", "ashamed", "upset"] },
  { id: "covetous", family: "envy", ko: ["샘나다", "다른 사람이 가진 것이 탐나 속이 쓰릴 때"], en: ["covetous", "You want what someone else has and it stings."] },
  { id: "small", family: "envy", ko: ["위축되다", "남과 견주어 스스로가 작아지는 느낌일 때"], en: ["diminished", "Next to others, you feel yourself shrinking."] },
  { id: "aspiring", family: "envy", ko: ["동경하다", "닮고 싶은 마음으로 누군가를 바라볼 때"], en: ["aspiring", "You look at someone wishing to be like them."] },
  { id: "grudging", family: "anger", ko: ["얄밉다", "잘난 척하거나 약삭빠르게 구는 모습이 괜히 미울 때"], en: ["grudging", "Someone's smug or slick manner just rubs you the wrong way."], near: ["illwill", "irritated", "offended"] },
  { id: "blaming", family: "anger", ko: ["원망스럽다", "누구 때문에 일이 틀어진 것 같아 탓하고 싶을 때"], en: ["blaming", "It feels like someone ruined it, and you want to put it on them."], near: ["resentful", "wronged", "angry"] },
  { id: "fuming", family: "anger", ko: ["열받다", "화가 속에서 확 치밀어 오를 때"], en: ["fuming", "Anger shoots up from inside."] },
  { id: "seething", family: "anger", ko: ["부글부글하다", "겉으로 못 풀고 속에서 화가 끓을 때"], en: ["seething", "You cannot let it out and anger boils inside."] },
  { id: "annoyed", family: "anger", ko: ["성가시다", "자꾸 신경 쓰이게 하는 일이 거슬릴 때"], en: ["annoyed", "Something keeps nagging at you."] },
  { id: "disapproving", family: "anger", ko: ["못마땅하다", "마음에 들지 않아 눈살이 찌푸려질 때"], en: ["disapproving", "It displeases you and your brow furrows."] },
  { id: "scared", family: "anx", ko: ["무섭다", "위험하거나 기분 나쁜 것이 닥칠까 봐 몸이 움츠러들 때"], en: ["scared", "You shrink back, afraid something harmful is coming."], near: ["afraid", "nervous", "chilled"] },
  { id: "chilled", family: "anx", ko: ["섬뜩하다", "갑자기 소름이 돋을 만큼 서늘하게 놀랄 때"], en: ["chilled", "A sudden cold shock raises goosebumps."], near: ["scared", "afraid", "surprised"] },
  { id: "uneasy", family: "anx", ko: ["불편하다", "마음이나 상황이 편치 않아 자리가 불안정할 때"], en: ["uneasy", "Something about the moment will not let you relax."], near: ["awkward", "anxious", "displeased"] },
  { id: "impatient", family: "anx", ko: ["조바심나다", "일이 더디게 풀려 마음이 졸아들 때"], en: ["impatient", "Things are slow and your mind shrinks with worry."], near: ["onedge", "anxious", "nervous"] },
  { id: "dread", family: "anx", ko: ["겁나다", "앞으로 닥칠 일이 겁이 날 때"], en: ["dreading", "You are afraid of what is coming."] },
  { id: "rushed", family: "anx", ko: ["쫓기다", "시간이나 일에 쫓겨 숨이 찰 때"], en: ["pressed", "Time or work is chasing you and you are out of breath."] },
  { id: "vague", family: "anx", ko: ["막연하다", "어떻게 될지 윤곽이 잡히지 않아 불안할 때"], en: ["uncertain", "You cannot make out what will happen and it unsettles you."] },
  { id: "pounding", family: "anx", ko: ["가슴이 두근거리다", "긴장해서 심장이 빠르게 뛸 때"], en: ["heart racing", "Tension makes your heart beat fast."] },
  { id: "fedup", family: "weary", ko: ["지겹다", "같은 일이 되풀이돼 더는 못 참겠다 싶을 때"], en: ["fed up", "The same thing again and again, and you have had enough."], near: ["bored", "bothered", "wornout"] },
  { id: "sleepy", family: "weary", ko: ["졸리다", "눈이 감기고 몸에서 힘이 빠질 때"], en: ["sleepy", "Your eyes close and strength drains from your body."] },
  { id: "drained", family: "weary", ko: ["방전되다", "에너지가 바닥나 아무것도 못 하겠을 때"], en: ["drained", "Your energy is at zero and you can do nothing."] },
  { id: "heavybody", family: "weary", ko: ["몸이 무겁다", "몸이 천근만근처럼 느껴질 때"], en: ["heavy-limbed", "Your body feels like lead."] },
  { id: "burnedout", family: "weary", ko: ["소진되다", "오래 쏟아부어 더 낼 힘이 남지 않았을 때"], en: ["burned out", "After pouring yourself out for long, nothing is left."] },
  { id: "languid", family: "weary", ko: ["나른하다", "몸이 늘어지고 느슨하게 풀릴 때"], en: ["languid", "Your body loosens and slows."] },
  { id: "selfblame", family: "shame", ko: ["자책하다", "잘못이 내 탓 같아서 스스로를 몰아세울 때"], en: ["self-blaming", "It feels like your fault, and you turn on yourself."], near: ["guilty", "regret", "ashamed"] },
  { id: "blushing", family: "shame", ko: ["얼굴이 화끈거리다", "부끄러움에 얼굴에 열이 오를 때"], en: ["flushed", "Your face heats up with shame."] },
  { id: "remorseful", family: "shame", ko: ["뉘우치다", "내가 잘못한 것을 깨닫고 마음이 무거울 때"], en: ["remorseful", "You see what you did wrong and it weighs on you."] },
  { id: "abashed", family: "shame", ko: ["면목없다", "상대 앞에 얼굴을 들기 어려울 때"], en: ["abashed", "You can hardly look the other person in the face."] },
];
export const WORDS: Word[] = BASE_WORDS.map((w) => ({
  ...w, ja: WORD_TR.ja[w.id] ?? w.en, es: WORD_TR.es[w.id] ?? w.en, zh: WORD_TR.zh[w.id] ?? w.en,
}));

/**
 * How pleasant each word feels, on our own scale from -2 (very unpleasant) to +2 (very pleasant).
 * Judged by us for this app, following the dimensional view of emotion (pleasantness / arousal / dominance) described by
 * Bradley & Lang (1999). No ANEW words or ratings are used.
 */
export const VALENCE: Record<string, number> = {
  glad: 2, enjoy: 2, proud: 2, excited: 2, grateful: 2, relieved: 1,
  light: 1, overjoyed: 2, happy: 2, thrilled: 2, exhilarated: 2, thankful: 2,
  comfy: 1, serene: 1, reassured: 1, relaxed: 1, content: 1, cozy: 1,
  warm: 2, tender: 1, supported: 1, adoring: 2, gladtosee: 2, homey: 1,
  pleased: 1, sympathetic: 0, moved: 1, touched: 1, awed: 2, sad: -2,
  gloomy: -2, deflated: -1, longing: -1, desolate: -2, chokedup: -1, miserable: -2,
  forlorn: -2, sorrowful: -2, futile: -1, down: -1, downcast: -1, pained: -1,
  letdown: -1, slighted: -1, resentful: -1, wistful: -1, upset: -1, wronged: -2,
  hollow: -1, disappointed: -1, betrayed: -2, conflicted: 0, unsettled: -1, restless: 0,
  bittersweet: 0, bitter: -1, nostalgic: 0, irritated: -1, angry: -2, stuck: -1,
  illwill: -2, indignant: -2, offended: -1, displeased: -1, grudging: -1, blaming: -1,
  envious: -1, jealous: -1, inadequate: -2, anxious: -1, onedge: -1, worried: -1,
  afraid: -2, lost: -1, nervous: -1, burdened: -1, tense: -1, scared: -2,
  chilled: -1, uneasy: -1, impatient: -1, lonely: -2, leftout: -2, empty: -2,
  awkward: -1, distant: -1, ashamed: -2, embarrassed: -1, humiliated: -2, sorry: -1,
  guilty: -2, regret: -1, selfblame: -2, tired: -1, wornout: -1, listless: -1,
  bothered: -1, bored: -1, blank: 0, fedup: -1, surprised: 0, flustered: -1,
  fulfilled: 2,
  hopeful: 1,
  confident: 1,
  giddy: 1,
  electrified: 2,
  refreshed: 1,
  hushed: 1,
  composed: 1,
  stable: 1,
  leisurely: 1,
  snug: 1,
  affectionate: 2,
  chummy: 2,
  caring: 1,
  admiring: 1,
  reliable: 1,
  stirred: 1,
  inspired: 2,
  welledup: 0,
  solemn: 0,
  heartsore: -2,
  stinging: -2,
  weepy: -1,
  ignored: -2,
  wounded: -2,
  sulky: -1,
  crestfallen: -1,
  wavering: 0,
  scattered: -1,
  flat: 0,
  fuming: -2,
  seething: -2,
  annoyed: -1,
  disapproving: -1,
  covetous: -1,
  small: -2,
  aspiring: 1,
  dread: -2,
  rushed: -1,
  vague: -1,
  pounding: -1,
  alone: -1,
  cutoff: -2,
  missing: -1,
  blushing: -1,
  remorseful: -1,
  abashed: -2,
  sleepy: 0,
  drained: -2,
  heavybody: -1,
  burnedout: -2,
  languid: 0,
  dazed: 0,
  stunned: 0,
  curious: 1,
  intrigued: 1,
  baffled: -1, bewildered: 0, amazed: 1,
};

/** The day's mood (1..5, 3 = neutral) derived from the chosen emotion words: the average pleasantness mapped onto 1..5. */
export function moodFromEmotions(ids: string[]): number | null {
  const v = ids.map((i) => VALENCE[i]).filter((n): n is number => typeof n === "number");
  if (v.length === 0) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.min(5, Math.max(1, Math.round(3 + mean)));
}
/** Who or what a feeling is about: yourself, another person, or a situation. Our own judgement (a word with no tag fits any answer). */
export type Focus = "self" | "other" | "situation";
/** How energised the feeling is: wound-up / activated (high) vs heavy / quiet (low). Our own judgement. */
export type Energy = "high" | "low";
export const FOCUS: Record<string, Focus> = {
  proud: "self", light: "self", happy: "self", comfy: "self", serene: "self", relaxed: "self", content: "self",
  sad: "self", gloomy: "self", desolate: "self", miserable: "self", forlorn: "self", sorrowful: "self", down: "self",
  downcast: "self", hollow: "self", unsettled: "self", restless: "self", inadequate: "self", lonely: "self", empty: "self",
  ashamed: "self", embarrassed: "self", humiliated: "self", guilty: "self", regret: "self", selfblame: "self", tired: "self",
  wornout: "self", listless: "self", blank: "self",
  grateful: "other", thankful: "other", warm: "other", tender: "other", supported: "other", adoring: "other", gladtosee: "other",
  sympathetic: "other", moved: "other", touched: "other", longing: "other", letdown: "other", slighted: "other", resentful: "other",
  wronged: "other", betrayed: "other", angry: "other", illwill: "other", indignant: "other", offended: "other", grudging: "other",
  blaming: "other", envious: "other", jealous: "other", leftout: "other", awkward: "other", distant: "other", sorry: "other",
  glad: "situation", enjoy: "situation", excited: "situation", relieved: "situation", overjoyed: "situation", thrilled: "situation", exhilarated: "situation",
  reassured: "situation", cozy: "situation", homey: "situation", pleased: "situation", awed: "situation", deflated: "situation", chokedup: "situation",
  futile: "situation", pained: "situation", wistful: "situation", upset: "situation", disappointed: "situation", conflicted: "situation", bittersweet: "situation",
  bitter: "situation", nostalgic: "situation", irritated: "situation", stuck: "situation", displeased: "situation", anxious: "situation", onedge: "situation",
  worried: "situation", afraid: "situation", lost: "situation", nervous: "situation", burdened: "situation", tense: "situation", scared: "situation",
  chilled: "situation", uneasy: "situation", impatient: "situation", bothered: "situation", bored: "situation", fedup: "situation", surprised: "situation",
  fulfilled: "self",
  hopeful: "situation",
  confident: "self",
  giddy: "situation",
  electrified: "situation",
  refreshed: "self",
  hushed: "self",
  composed: "self",
  stable: "self",
  leisurely: "situation",
  snug: "situation",
  affectionate: "other",
  chummy: "other",
  caring: "other",
  admiring: "other",
  reliable: "other",
  stirred: "situation",
  inspired: "situation",
  welledup: "situation",
  solemn: "situation",
  heartsore: "situation",
  stinging: "situation",
  weepy: "self",
  ignored: "other",
  wounded: "other",
  sulky: "other",
  crestfallen: "situation",
  wavering: "self",
  scattered: "self",
  flat: "self",
  fuming: "other",
  seething: "other",
  annoyed: "situation",
  disapproving: "other",
  covetous: "other",
  small: "self",
  aspiring: "other",
  dread: "situation",
  rushed: "situation",
  vague: "situation",
  pounding: "self",
  alone: "self",
  cutoff: "other",
  missing: "other",
  blushing: "self",
  remorseful: "self",
  abashed: "other",
  sleepy: "self",
  drained: "self",
  heavybody: "self",
  burnedout: "self",
  languid: "self",
  dazed: "situation",
  stunned: "situation",
  curious: "situation",
  intrigued: "situation",
  flustered: "situation", baffled: "situation", bewildered: "situation", amazed: "situation",
};

export const ENERGY: Record<string, Energy> = {
  glad: "high", enjoy: "high", proud: "high", excited: "high", overjoyed: "high", happy: "high", thrilled: "high",
  exhilarated: "high", awed: "high", irritated: "high", angry: "high", stuck: "high", indignant: "high", offended: "high",
  blaming: "high", grudging: "high", illwill: "high", jealous: "high", envious: "high", anxious: "high", onedge: "high",
  worried: "high", afraid: "high", nervous: "high", tense: "high", scared: "high", chilled: "high", impatient: "high",
  unsettled: "high", restless: "high", flustered: "high", baffled: "high", surprised: "high", amazed: "high", upset: "high",
  embarrassed: "high", humiliated: "high", betrayed: "high", wronged: "high", resentful: "high",
  relieved: "low", light: "low", comfy: "low", serene: "low", reassured: "low", relaxed: "low", content: "low",
  cozy: "low", homey: "low", sad: "low", gloomy: "low", deflated: "low", longing: "low", desolate: "low",
  miserable: "low", forlorn: "low", sorrowful: "low", futile: "low", down: "low", downcast: "low", hollow: "low",
  wistful: "low", disappointed: "low", letdown: "low", slighted: "low", bitter: "low", nostalgic: "low", lonely: "low",
  leftout: "low", empty: "low", distant: "low", regret: "low", selfblame: "low", tired: "low", wornout: "low",
  listless: "low", bothered: "low", bored: "low", blank: "low", fedup: "low", burdened: "low", lost: "low",
  fulfilled: "low",
  hopeful: "high",
  confident: "high",
  giddy: "high",
  electrified: "high",
  refreshed: "low",
  hushed: "low",
  composed: "low",
  stable: "low",
  leisurely: "low",
  snug: "low",
  affectionate: "low",
  chummy: "low",
  caring: "low",
  admiring: "low",
  reliable: "low",
  stirred: "low",
  inspired: "high",
  welledup: "high",
  solemn: "low",
  heartsore: "low",
  stinging: "low",
  weepy: "low",
  ignored: "low",
  wounded: "low",
  sulky: "low",
  crestfallen: "low",
  wavering: "high",
  scattered: "high",
  flat: "low",
  fuming: "high",
  seething: "high",
  annoyed: "high",
  disapproving: "high",
  covetous: "high",
  small: "low",
  aspiring: "high",
  dread: "high",
  rushed: "high",
  vague: "low",
  pounding: "high",
  alone: "low",
  cutoff: "low",
  missing: "low",
  blushing: "high",
  remorseful: "low",
  abashed: "low",
  sleepy: "low",
  drained: "low",
  heavybody: "low",
  burnedout: "low",
  languid: "low",
  dazed: "high",
  stunned: "high",
  curious: "high",
  intrigued: "high",
  pained: "low", sorry: "low",
};

export type Lean = "pos" | "neg" | "mixed";
export type Intensity = "mild" | "strong";
export type Answers = { lean: Lean; focus?: Focus; energy?: Energy; intensity?: Intensity };
/**
 * "Help me find the word": a few easy answers narrow the list. The lean (pleasant / unpleasant / mixed) decides which
 * words are considered; who-it-is-about, energy and strength rank them. Answers left out (skipped) neither help nor hurt.
 * These are suggestions to think with, not a diagnosis. The whole ranked list is returned so "show more" can keep going.
 */
export function rankWords(a: Answers): Word[] {
  const pool = WORDS.filter((w) => {
    const v = VALENCE[w.id] ?? 0;
    return a.lean === "pos" ? v > 0 : a.lean === "neg" ? v < 0 : v === 0 || w.family === "mixed";
  });
  const score = (w: Word) => {
    let s = 0;
    if (a.focus) s += FOCUS[w.id] === a.focus ? 2 : FOCUS[w.id] ? -1 : 0;
    if (a.energy) s += ENERGY[w.id] === a.energy ? 2 : ENERGY[w.id] ? -1 : 0;
    if (a.intensity && a.lean !== "mixed") s += Math.abs(VALENCE[w.id] ?? 0) === (a.intensity === "strong" ? 2 : 1) ? 2 : 0;
    return s;
  };
  return pool
    .map((w, i) => ({ w, s: score(w), strong: Math.abs(VALENCE[w.id] ?? 0), i }))
    .sort((x, y) => y.s - x.s || y.strong - x.strong || x.i - y.i)
    .map((x) => x.w);
}
export const suggestWords = (a: Answers, max = 6): Word[] => rankWords(a).slice(0, max);

export const WORD_IDS = new Set(WORDS.map((w) => w.id));
export const MAX_EMOTIONS = 3;
const byId = new Map(WORDS.map((w) => [w.id, w]));
export const wordById = (id: string) => byId.get(id);
export const familyById = (id: string) => FAMILIES.find((f) => f.id === id);
export const wordsOfFamily = (family: string) => WORDS.filter((w) => w.family === family);
/** The word's display text in the given language (falls back to the id for unknown/removed words). */
export const wordText = (id: string, lang: EmoLang) => byId.get(id)?.[lang][0] ?? id;
/** Keep only known ids, unique, at most MAX_EMOTIONS. */
export const cleanEmotionIds = (ids: unknown): string[] =>
  Array.isArray(ids) ? [...new Set(ids.filter((i): i is string => typeof i === "string" && WORD_IDS.has(i)))].slice(0, MAX_EMOTIONS) : [];
