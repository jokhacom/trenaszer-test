import type { Grade, Lang } from "./types";
import type { Tr } from "./words";

// Uzbek: Latin alphabet; o‘/g‘ written with ‘ (U+2018) as on gov.uz — the
// U+02BB letter is missing from the site font and renders with a gap.
// Spelling must be checked against imlo.uz before release.

const S = {
  appName: { uz: "Mirodil", ru: "Миродил", en: "Mirodil" },
  tagline: {
    uz: "Javobni aytmayman — o‘zing topishingga yordam beraman",
    ru: "Я не говорю ответ — я помогаю найти его самому",
    en: "I don't tell the answer — I help you find it yourself",
  },

  // Welcome
  hello: { uz: "Salom! Men Mirodilman.", ru: "Привет! Я Миродил.", en: "Hi! I'm Mirodil." },
  helloMore: {
    uz: "Masalalarni birga yechamiz. Lekin javobni o‘zing topasan!",
    ru: "Будем решать задачи вместе. Но ответ ты найдёшь сам!",
    en: "Let's solve problems together. But you will find the answer yourself!",
  },
  chooseLang: { uz: "Tilni tanla", ru: "Выбери язык", en: "Choose a language" },
  chooseAvatar: { uz: "Qahramoningni tanla", ru: "Выбери своего героя", en: "Choose your hero" },
  chooseGrade: { uz: "Nechanchi sinfda o‘qiysan?", ru: "В каком ты классе?", en: "What grade are you in?" },
  start: { uz: "Boshladik!", ru: "Начинаем!", en: "Let's go!" },

  // Home
  homeHello: { uz: "Bugun nima qilamiz?", ru: "Что будем делать сегодня?", en: "What shall we do today?" },
  photoTitle: { uz: "Masalani suratga ol", ru: "Сфотографируй задачу", en: "Take a photo of a problem" },
  photoDesc: { uz: "Bitta masala ham bo‘ladi", ru: "Можно даже одну задачу", en: "Even just one problem" },
  sessionTitle: { uz: "10 daqiqalik dars", ru: "Занятие на 10 минут", en: "10-minute lesson" },
  sessionDesc: { uz: "Bugungi masalalar", ru: "Задачи на сегодня", en: "Today's problems" },
  barTitle: { uz: "Masala chizmasini yig‘", ru: "Собери схему задачи", en: "Build the problem picture" },
  barDesc: { uz: "Kesmalar bilan o‘yin", ru: "Игра с отрезками", en: "A game with bars" },
  readTitle: { uz: "Birga o‘qiymiz", ru: "Читаем вместе", en: "Let's read together" },
  soon: { uz: "Tez orada", ru: "Скоро", en: "Coming soon" },
  repeatTitle: { uz: "Takrorlab olamiz", ru: "Повторим", en: "Let's practise again" },
  settings: { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },

  // Photo
  takePhoto: { uz: "Suratga olish", ru: "Сфотографировать", en: "Take a photo" },
  orType: { uz: "Yoki masalani yozib yubor", ru: "Или напиши задачу", en: "Or type the problem" },
  typePlaceholder: { uz: "Masalan: 35 + 27", ru: "Например: 35 + 27", en: "For example: 35 + 27" },
  send: { uz: "Yuborish", ru: "Отправить", en: "Send" },
  reading: { uz: "Masalani o‘qiyapman…", ru: "Читаю задачу…", en: "Reading the problem…" },
  thinking: { uz: "O‘ylayapman…", ru: "Думаю…", en: "Thinking…" },
  isThisIt: { uz: "Bu sening masalangmi?", ru: "Это твоя задача?", en: "Is this your problem?" },
  pickOne: { uz: "Qaysi masalani yechamiz?", ru: "Какую задачу решаем?", en: "Which problem shall we solve?" },
  yes: { uz: "Ha, shu", ru: "Да, эта", en: "Yes, that's it" },
  fix: {
    uz: "Xato bo‘lsa, matnni shu yerda tuzat.",
    ru: "Если есть ошибка, поправь текст прямо здесь.",
    en: "If something is wrong, fix the text right here.",
  },
  retake: { uz: "Qaytadan suratga olish", ru: "Сфотографировать заново", en: "Take another photo" },
  aiOff: {
    uz: "Suratdan o‘qish hali ulanmagan. Hozircha misolni yozib yubor, masalan: 35 + 27",
    ru: "Чтение фото пока не подключено. Пока можно написать пример, например: 35 + 27",
    en: "Reading photos isn't connected yet. For now, type an example, like 35 + 27",
  },
  aiOffWord: {
    uz: "Matnli masalalarni tushunish uchun sunʼiy intellekt kerak — u hali ulanmagan. Hozircha misol yozib ko‘r yoki «10 daqiqalik dars»ni och.",
    ru: "Чтобы понимать текстовые задачи, нужен ИИ — он пока не подключён. Пока напиши пример или открой «Занятие на 10 минут».",
    en: "Word problems need the AI, which isn't connected yet. For now, type an example or open the “10-minute lesson”.",
  },
  notSupported: {
    uz: "Bu masalani hozircha tushunmadim. Matnini yozib ko‘r yoki boshqa masala tanla.",
    ru: "Эту задачу я пока не понимаю. Попробуй написать её текстом или выбери другую.",
    en: "I couldn't understand this problem yet. Try typing it, or choose another one.",
  },
  busy: {
    uz: "Hozir so‘rovlar juda ko‘p. Bir daqiqadan keyin yana urinib ko‘r.",
    ru: "Сейчас слишком много запросов. Попробуй ещё раз через минуту.",
    en: "Too many requests right now. Try again in a minute.",
  },
  error: {
    uz: "Nimadir xato ketdi. Yana bir bor urinib ko‘r.",
    ru: "Что-то пошло не так. Попробуй ещё раз.",
    en: "Something went wrong. Please try again.",
  },

  // Lesson
  yourTask: { uz: "Masala", ru: "Задача", en: "Problem" },
  tryAlone: { uz: "O‘zing yechib ko‘r. Javobni yoz:", ru: "Попробуй решить сам. Напиши ответ:", en: "Try it yourself. Write your answer:" },
  answerPlaceholder: { uz: "Javob", ru: "Ответ", en: "Answer" },
  check: { uz: "Tekshirish", ru: "Проверить", en: "Check" },
  helpMe: { uz: "Yordam ber", ru: "Помоги", en: "Help me" },
  dontKnow: { uz: "Bilmayman", ru: "Не знаю", en: "I don't know" },
  listen: { uz: "Tinglash", ru: "Послушать", en: "Listen" },
  noVoice: {
    uz: "Bu tilda ovoz hali yo‘q",
    ru: "Для этого языка голос пока недоступен",
    en: "Voice isn't available for this language yet",
  },
  levelHint: { uz: "Maslahat", ru: "Подсказка", en: "Hint" },
  levelQuestion: { uz: "Savol", ru: "Наводящий вопрос", en: "A leading question" },
  levelExample: { uz: "O‘xshash misol", ru: "Похожий пример", en: "A similar example" },
  levelTogether: { uz: "Birga yechamiz", ru: "Решаем вместе", en: "Let's solve it together" },
  exampleIntro: {
    uz: "Mana o‘xshash masala. Qanday yechilishini qara:",
    ru: "Вот похожая задача. Посмотри, как она решается:",
    en: "Here is a similar problem. Watch how it is solved:",
  },
  exampleNow: {
    uz: "Endi xuddi shunday o‘z masalangni yech!",
    ru: "Теперь реши так же свою задачу!",
    en: "Now solve your own problem the same way!",
  },
  stepRight: { uz: "To‘g‘ri!", ru: "Верно!", en: "Right!" },
  stepTryAgain: { uz: "Yana bir bor hisoblab ko‘r.", ru: "Посчитай ещё раз.", en: "Count once more." },
  nowFinal: {
    uz: "Zo‘r! Endi o‘z masalangning javobini yoz:",
    ru: "Отлично! Теперь напиши ответ своей задачи:",
    en: "Great! Now write the answer to your problem:",
  },
  refuse: {
    uz: "Javobni aytmayman — lekin o‘zing topishingga albatta yordam beraman.",
    ru: "Ответ я не скажу — но обязательно помогу тебе найти его самому.",
    en: "I won't tell you the answer — but I'll definitely help you find it yourself.",
  },
  stuck: {
    uz: "Hech gap yo‘q, bu qiyin masala. Birga o‘ylaymiz.",
    ru: "Ничего страшного, это сложная задача. Давай подумаем вместе.",
    en: "That's okay, this is a tricky one. Let's think together.",
  },
  notNumber: {
    uz: "Javobni son bilan yoz yoki «Yordam ber» tugmasini bos.",
    ru: "Напиши ответ числом или нажми «Помоги».",
    en: "Write your answer as a number, or press “Help me”.",
  },
  pause: {
    uz: "Sen juda harakat qilding! Keling, biroz dam olamiz yoki boshqa masalani yechamiz. Bu masalaga keyin qaytamiz.",
    ru: "Это было непросто, а ты не сдаёшься — это здорово! Давай немного отдохнём или решим другую задачу. К этой вернёмся позже.",
    en: "You tried really hard! Let's take a short break or solve another problem. We'll come back to this one later.",
  },
  solvedSelf: { uz: "O‘zing yechding!", ru: "Ура! Задача решена — это твоя победа!", en: "You solved it yourself!" },
  whyQuestion: {
    uz: "Qanday yechganingni o‘ylab ko‘r: qaysi amalni tanlading va nima uchun?",
    ru: "Подумай: какое действие нужно в этой задаче и почему?",
    en: "Think about how you solved it: which operation did you choose, and why?",
  },
  another: { uz: "Yana masala", ru: "Ещё задача", en: "Another problem" },
  next: { uz: "Keyingisi", ru: "Дальше", en: "Next" },
  home: { uz: "Bosh sahifa", ru: "На главную", en: "Home" },
  back: { uz: "Orqaga", ru: "Назад", en: "Back" },

  // Session
  sessionDone: { uz: "Dars tugadi!", ru: "Занятие закончено!", en: "Lesson finished!" },
  sessionSolved: {
    uz: "Bugun o‘zing yechgan masalalar:",
    ru: "Задач решено самостоятельно:",
    en: "Problems you solved yourself:",
  },
  comeTomorrow: { uz: "Ertaga yana kel!", ru: "Приходи завтра!", en: "Come back tomorrow!" },
  timeUp: {
    uz: "10 daqiqa o‘tdi — bugun yetarli. Zo‘r ishlading!",
    ru: "10 минут прошли — на сегодня хватит. Отличная работа!",
    en: "10 minutes are up — that's enough for today. Great work!",
  },
  skip: { uz: "Boshqa masala", ru: "Другая задача", en: "Another problem" },

  // Bar model game
  barStep1: { uz: "Qaysi chizma masalaga mos keladi?", ru: "Какая схема подходит к задаче?", en: "Which picture matches the problem?" },
  barStep2: { uz: "Chizmaga qara. Qaysi amal kerak?", ru: "Посмотри на схему. Какое действие нужно?", en: "Look at the picture. Which operation do we need?" },
  barStep3: { uz: "Endi hisobla:", ru: "Теперь посчитай:", en: "Now work it out:" },
  barWrong: {
    uz: "Yana bir qara: kimda ko‘p? So‘roq belgisi qayerda bo‘lishi kerak?",
    ru: "Посмотри ещё раз: у кого больше? Где должен быть знак вопроса?",
    en: "Look again: who has more? Where should the question mark be?",
  },
  barOpWrong: {
    uz: "Chizmaga qara: biz butunni topyapmizmi yoki qismni?",
    ru: "Посмотри на схему: мы ищем целое или часть?",
    en: "Look at the picture: are we looking for the whole or a part?",
  },
  whole: { uz: "hammasi", ru: "всего", en: "total" },
  gave: { uz: "berdi", ru: "отдал", en: "gave" },
  left: { uz: "qoldi", ru: "осталось", en: "left" },
} satisfies Record<string, Tr>;

export type Key = keyof typeof S;

export function tr(lang: Lang, key: Key): string {
  return S[key][lang];
}

export function gradeLabel(lang: Lang, g: Grade): string {
  if (lang === "uz") return `${g}-sinf`;
  if (lang === "ru") return `${g} класс`;
  return `Grade ${g}`;
}

export const PRAISE: Record<Lang, string[]> = {
  uz: ["Barakalla!", "Zo‘r!", "Ofarin!", "Ajoyib!"],
  ru: ["Молодец!", "Отлично!", "Здорово!", "Супер!"],
  en: ["Well done!", "Great!", "Brilliant!", "Super!"],
};

export const GENTLE_WRONG: Record<Lang, string[]> = {
  uz: ["Hali emas. Yana bir urinib ko‘r!", "Deyarli! Yana bir bor tekshirib ko‘r.", "Xato — bu ham o‘rganish. Yana urin!"],
  ru: ["Пока нет. Попробуй ещё раз!", "Почти! Проверь ещё раз.", "Ошибка — это тоже учёба. Попробуй снова!"],
  en: ["Not yet. Try again!", "Almost! Check once more.", "Mistakes help us learn. Try again!"],
};

export const LANG_NAMES: Record<Lang, string> = { uz: "O‘zbekcha", ru: "Русский", en: "English" };
