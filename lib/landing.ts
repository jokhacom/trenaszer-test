// Texts of the landing page (www.mirodil.site), written for parents, in
// Uzbek, Russian and English. Uzbek: Latin script, o‘ and g‘ with ‘ (U+2018).
// Comparisons with other services stay fair: no brand names, "usually", and
// the note that some AI services have a study mode.

import type { Lang } from "./types";

type T = Record<Lang, string>;

export const L = {
  login: { uz: "Pochta orqali kirish", ru: "Войти по почте", en: "Log in with email" },
  loginNote: {
    uz: "Parol kerak emas — pochtangizga havola keladi.",
    ru: "Пароль не нужен — на почту придёт ссылка.",
    en: "No password — a link comes to your email.",
  },
  loginShort: { uz: "Kirish", ru: "Войти", en: "Log in" },
  heroBadge: {
    uz: "1–4-sinflar · Singapur metodikasi",
    ru: "1–4 классы · Методика Сингапура",
    en: "Grades 1–4 · The Singapore approach",
  },
  trust1: { uz: "Tayyor javob bermaydi", ru: "Не даёт готовых ответов", en: "Never gives the ready answer" },
  trust2: { uz: "O‘zbek, rus, ingliz tilida", ru: "На узбекском, русском, английском", en: "In Uzbek, Russian, English" },
  trust3: { uz: "Telefonda ishlaydi", ru: "Работает на телефоне", en: "Works on a phone" },
  heroTitle: {
    uz: "Farzandingiz javobni ko‘chirmaydi — tushunib yechadi",
    ru: "Ваш ребёнок не списывает ответ — а понимает и решает сам",
    en: "Your child doesn't copy the answer — they understand and solve it",
  },
  heroText: {
    uz: "Oddiy chat-botlar va tayyor javoblar saytlari odatda darhol yechimni beradi. Mirodil esa bolani qadamma-qadam olib boradi: rasm → o‘xshash misol → savol. 1–4-sinflar uchun, Singapur metodikasi asosida.",
    ru: "Обычные чат-боты и сайты с готовыми ответами обычно сразу дают решение. Миродил ведёт ребёнка шаг за шагом: картинка → похожий пример → вопрос. Для 1–4 классов, по методике Сингапура.",
    en: "Usual chatbots and answer sites usually give the solution right away. Mirodil leads the child step by step: a picture → a similar example → a question. For grades 1–4, based on the Singapore approach.",
  },
  bubble: {
    uz: "Keling, birga o‘ylaymiz!",
    ru: "Давайте подумаем вместе!",
    en: "Let's think it through together!",
  },

  compareTitle: { uz: "Oddiy AI va Mirodil", ru: "Обычный ИИ и Миродил", en: "A usual AI and Mirodil" },
  compareUsual: { uz: "Oddiy AI va tayyor javoblar", ru: "Обычный ИИ и готовые ответы", en: "A usual AI and answer sites" },
  compareOurs: { uz: "Mirodil", ru: "Миродил", en: "Mirodil" },
  c1a: { uz: "Darhol tayyor javob beradi", ru: "Сразу даёт готовый ответ", en: "Gives the ready answer at once" },
  c1b: { uz: "Javobni bermaydi — bola o‘zi topadi", ru: "Не даёт ответ — ребёнок находит его сам", en: "Gives no answer — the child finds it" },
  c2a: { uz: "Bola ko‘chiradi, lekin tushunmaydi", ru: "Ребёнок списывает, но не понимает", en: "The child copies but does not understand" },
  c2b: {
    uz: "Bola usulni tushunadi va keyingi safar o‘zi yechadi",
    ru: "Ребёнок понимает способ и в следующий раз решает сам",
    en: "The child understands the method and solves alone next time",
  },
  c3a: { uz: "Kattalar uchun yozilgan murakkab matn", ru: "Сложный текст для взрослых", en: "Complex text written for adults" },
  c3b: {
    uz: "7–10 yoshli bola uchun sodda so‘zlar, rasmlar va ovoz",
    ru: "Простые слова, картинки и голос для детей 7–10 лет",
    en: "Simple words, pictures and voice for children aged 7–10",
  },
  c4a: {
    uz: "Bola nimani tushunmaganini ota-ona bilmaydi",
    ru: "Родитель не знает, что ребёнок не понял",
    en: "The parent doesn't know what the child did not understand",
  },
  c4b: { uz: "Ota-onaga hisobot: nima yaxshi, nima qiyin", ru: "Отчёт родителю: что получается, что трудно", en: "A report for the parent: what goes well, what is hard" },
  c5a: { uz: "Maktab dasturiga bog‘lanmagan", ru: "Не связан со школьной программой", en: "Not tied to the school curriculum" },
  c5b: { uz: "1–4-sinf mavzulari va sizning darsliklaringiz", ru: "Темы 1–4 классов и ваши учебники", en: "Grade 1–4 topics and your own textbooks" },
  c6a: { uz: "Faqat matn — tez zeriktiradi", ru: "Только текст — быстро надоедает", en: "Text only — gets boring fast" },
  c6b: { uz: "O‘yinlar, konfetlar, stikerlar va darajalar", ru: "Игры, конфеты, стикеры и уровни", en: "Games, candies, stickers and levels" },
  compareNote: {
    uz: "Ba’zi AI xizmatlarida o‘quv rejimi bor, lekin uni odatda bir bosishda o‘chirib qo‘yish mumkin. Mirodilda tayyor javob umuman yo‘q.",
    ru: "У некоторых ИИ-сервисов есть учебный режим, но его обычно можно выключить одним нажатием. В Миродиле готового ответа нет совсем.",
    en: "Some AI services have a study mode, but it can usually be switched off with one tap. Mirodil has no ready answers at all.",
  },

  stepsTitle: { uz: "Qanday ishlaydi", ru: "Как это работает", en: "How it works" },
  step1: { uz: "Pochta orqali kiring", ru: "Войдите по почте", en: "Log in with email" },
  step1Text: {
    uz: "Bir daqiqa: pochtangizni yozing va xatdagi havolani bosing.",
    ru: "Одна минута: введите почту и нажмите на ссылку в письме.",
    en: "One minute: type your email and tap the link in the letter.",
  },
  step2: { uz: "Farzandingiz suratga oladi", ru: "Ребёнок фотографирует задачу", en: "Your child takes a photo" },
  step2Text: {
    uz: "Uy vazifasi, darslikdagi mashq yoki bitta masala.",
    ru: "Домашнее задание, упражнение из учебника или одну задачу.",
    en: "Homework, a textbook exercise or just one task.",
  },
  step3: { uz: "Mirodil o‘rgatadi", ru: "Миродил учит, вы видите отчёт", en: "Mirodil teaches, you see the report" },
  step3Text: {
    uz: "Bola o‘zi yechadi, siz esa hisobotda nima yaxshi va nima qiyinligini ko‘rasiz.",
    ru: "Ребёнок решает сам, а вы в отчёте видите, что получается и что трудно.",
    en: "The child solves it alone, and the report shows you what goes well and what is hard.",
  },

  featuresTitle: { uz: "Mirodilda nima bor", ru: "Что есть в Миродиле", en: "What Mirodil has" },
  f2: { uz: "Singapur metodikasi", ru: "Методика Сингапура", en: "The Singapore approach" },
  f2t: {
    uz: "Avval narsa va rasm, keyin sonlar. Kesmalar modeli, son uychalari, bir nechta yechim yo‘li.",
    ru: "Сначала предметы и картинки, потом числа. Модель отрезков, числовые домики, несколько способов решения.",
    en: "Objects and pictures first, numbers next. Bar models, number bonds, more than one way to solve.",
  },
  f3: { uz: "O‘yinlar", ru: "Игры", en: "Games" },
  f3t: {
    uz: "«Masala sxemasini yig‘», «Son uychalari», «Ko‘paytirish jadvali», qoida + mini-o‘yin.",
    ru: "«Собери схему задачи», «Числовые домики», «Таблица умножения», правило + мини-игра.",
    en: "“Build the bar model”, “Number bonds”, “Times tables”, one rule + a mini-game.",
  },
  f4: { uz: "Bosimsiz mukofotlar", ru: "Награды без давления", en: "Rewards without pressure" },
  f4t: {
    uz: "Mehnat uchun konfetlar, stikerlar, bronza–kumush–oltin. Hech narsa olib qo‘yilmaydi, bolalar o‘rtasida reyting yo‘q.",
    ru: "Конфеты за труд, стикеры, бронза–серебро–золото. Ничего не отнимается, рейтинга между детьми нет.",
    en: "Candies for effort, stickers, bronze–silver–gold. Nothing is taken away, no ranking between children.",
  },
  f5: { uz: "Darslikdan", ru: "Из учебника", en: "From the textbook" },
  f5t: {
    uz: "PDF darslikni bir marta yuklang — keyin «21-bet, 5-mashq» deb yozish kifoya.",
    ru: "Загрузите PDF учебника один раз — дальше достаточно написать «стр. 21, упр. 5».",
    en: "Upload the textbook PDF once — then just type “page 21, exercise 5”.",
  },
  f6: { uz: "Uch til va ovoz", ru: "Три языка и голос", en: "Three languages and voice" },
  f6t: {
    uz: "O‘zbek, rus, ingliz. Mirodil matnni ovoz chiqarib o‘qiydi — 1-sinf uchun ayniqsa qulay.",
    ru: "Узбекский, русский, английский. Миродил читает вслух — особенно удобно в 1 классе.",
    en: "Uzbek, Russian, English. Mirodil reads aloud — great for grade 1.",
  },
  f7: { uz: "10 daqiqalik dars", ru: "Занятия по 10 минут", en: "10-minute lessons" },
  f7t: {
    uz: "Badantarbiya, qiyin mavzular takrori va qisqa xulosa — bola charchamaydi.",
    ru: "Разминка, повтор трудных тем и короткий итог — ребёнок не устаёт.",
    en: "A warm-up, practice of hard topics and a short summary — the child does not get tired.",
  },
  f8: { uz: "Ota-onalar uchun hisobot", ru: "Отчёт для родителей", en: "A report for parents" },
  f8t: {
    uz: "Grafiklarsiz, oddiy so‘zlar bilan: nima yaxshi chiqyapti, nima qiyin va nimani mashq qilish kerak.",
    ru: "Без графиков, простыми словами: что получается, что трудно и что потренировать.",
    en: "No charts, plain words: what goes well, what is hard and what to practise.",
  },
  f9: { uz: "Hamma narsa saqlanadi", ru: "Всё сохраняется", en: "Everything is saved" },
  f9t: {
    uz: "Masalalar, konfetlar va natijalar bulutda. Istalgan telefonda oching — qayta ochish bepul.",
    ru: "Задачи, конфеты и прогресс — в облаке. Открывайте на любом телефоне, повторно — бесплатно.",
    en: "Tasks, candies and progress are in the cloud. Open them on any phone, again for free.",
  },

  demoTitle: { uz: "Bu qanday ko‘rinadi", ru: "Как это выглядит", en: "What it looks like" },
  demoTask: { uz: "Azizda 8 ta olma, Malikada 5 ta. Hammasi nechta?", ru: "У Азиза 8 яблок, у Малики 5. Сколько всего?", en: "Aziz has 8 apples, Malika has 5. How many in all?" },
  demoHint: {
    uz: "Avval 10 ni to‘ldiramiz: 8 ga nechta qo‘shsak, 10 bo‘ladi?",
    ru: "Сначала дополним до 10: сколько прибавить к 8, чтобы стало 10?",
    en: "First make a ten: what do we add to 8 to make 10?",
  },
  demoKid: { uz: "2!", ru: "2!", en: "2!" },
  demoPraise: {
    uz: "To‘g‘ri! Endi 5 dan 2 ni oldik — yana nechta qoldi?",
    ru: "Верно! Из 5 мы взяли 2 — сколько ещё осталось?",
    en: "Right! We took 2 from the 5 — how many are left?",
  },

  faqTitle: { uz: "Ko‘p beriladigan savollar", ru: "Частые вопросы", en: "Questions parents ask" },
  q1: { uz: "Bu bepulmi?", ru: "Это бесплатно?", en: "Is it free?" },
  a1: { uz: "Ha, hozircha Mirodil bepul.", ru: "Да, сейчас Миродил бесплатный.", en: "Yes, Mirodil is free for now." },
  q2: { uz: "Mirodil javobni umuman aytmaydimi?", ru: "Миродил совсем не говорит ответ?", en: "Does Mirodil never give the answer?" },
  a2: {
    uz: "Aytmaydi. Bola qiynalsa — rasm, o‘xshash misol va savollar bilan yordam beradi, oxirida birga qadamma-qadam yechadi. Lekin oxirgi javobni bola o‘zi yozadi.",
    ru: "Не говорит. Если трудно — помогает картинкой, похожим примером и вопросами, в конце решает вместе по шагам. Но последний ответ ребёнок пишет сам.",
    en: "No. If it is hard, Mirodil helps with a picture, a similar example and questions, and at the end solves it together step by step. But the child writes the final answer.",
  },
  q3: { uz: "Qaysi sinflar va fanlar uchun?", ru: "Для каких классов и предметов?", en: "Which grades and subjects?" },
  a3: {
    uz: "1–4-sinflar: matematika, ona tili va rus tili, o‘qish, ingliz tili, atrofimizdagi olam. Eng chuqur ishlangani — matematika.",
    ru: "1–4 классы: математика, родной и русский язык, чтение, английский, окружающий мир. Глубже всего проработана математика.",
    en: "Grades 1–4: maths, mother tongue and Russian, reading, English, the world around us. Maths is the most developed.",
  },
  q4: { uz: "Qaysi tillarda ishlaydi?", ru: "На каких языках?", en: "Which languages?" },
  a4: {
    uz: "O‘zbek, rus va ingliz tillarida. Mirodil matnni ovoz chiqarib ham o‘qiydi.",
    ru: "На узбекском, русском и английском. Миродил ещё и читает вслух.",
    en: "Uzbek, Russian and English. Mirodil also reads aloud.",
  },
  q5: { uz: "Ma’lumotlar xavfsizmi?", ru: "Это безопасно?", en: "Is it safe?" },
  a5: {
    uz: "Siz faqat pochta bilan kirasiz, natijalarni faqat siz ko‘rasiz, reklama yo‘q. Suratlar saytda saqlanmaydi: ular faqat o‘qish uchun AI xizmatiga (Google Gemini) yuboriladi. Bolaning ismi yoki yuzi tushgan rasmni yubormang — faqat vazifani.",
    ru: "Вы входите только по почте, данные видите только вы, рекламы нет. Фото на сайте не хранятся: они только отправляются для чтения в ИИ-сервис (Google Gemini). Не фотографируйте лицо или имя ребёнка — только задание.",
    en: "You log in with email only, only you see the data, there are no ads. Photos are not kept on the site: they are only sent to an AI service (Google Gemini) to be read. Do not photograph your child's face or name — only the task.",
  },
  q6: { uz: "Telefondan ishlaydimi?", ru: "Работает на телефоне?", en: "Does it work on a phone?" },
  a6: {
    uz: "Ha: telefon, planshet va kompyuterda. Ilova o‘rnatish shart emas.",
    ru: "Да: на телефоне, планшете и компьютере. Ничего устанавливать не нужно.",
    en: "Yes: on a phone, tablet and computer. Nothing to install.",
  },
  q7: { uz: "Nega pochta orqali kirish kerak?", ru: "Зачем входить по почте?", en: "Why log in with email?" },
  a7: {
    uz: "Masalalar, konfetlar va natijalar bulutda saqlanadi va istalgan qurilmada ochiladi. Kirish uchun parol kerak emas.",
    ru: "Задачи, конфеты и прогресс хранятся в облаке и открываются на любом устройстве. Пароль не нужен.",
    en: "Tasks, candies and progress are kept in the cloud and open on any device. No password needed.",
  },

  finalTitle: { uz: "Bugunoq sinab ko‘ring", ru: "Попробуйте сегодня", en: "Try it today" },
  finalText: {
    uz: "Kiring, bitta masalani suratga oling va Mirodil qanday o‘rgatishini ko‘ring.",
    ru: "Войдите, сфотографируйте одну задачу и посмотрите, как учит Миродил.",
    en: "Log in, take a photo of one task and see how Mirodil teaches.",
  },
  footer: { uz: "Mirodil — o‘zing yech!", ru: "Миродил — реши сам!", en: "Mirodil — solve it yourself!" },
} satisfies Record<string, T>;

export type LKey = keyof typeof L;
