// Texts of the landing page (www.mirodil.site) in Uzbek, Russian and English.
// Uzbek: Latin script, o‘ and g‘ with ‘ (U+2018), tutuq belgisi ʼ (U+02BC).

import type { Lang } from "./types";

type T = Record<Lang, string>;

export const L = {
  start: { uz: "Bepul boshlash", ru: "Начать бесплатно", en: "Start for free" },
  continue: { uz: "Mashg‘ulotni davom ettirish", ru: "Продолжить заниматься", en: "Continue learning" },
  login: { uz: "Pochta orqali kirish", ru: "Войти по почте", en: "Log in with email" },
  heroTitle: {
    uz: "Bola uchun yechmaydi — o‘zi yechishga o‘rgatadi",
    ru: "Не решает за ребёнка — учит решать самому",
    en: "It does not solve for your child — it teaches them to solve",
  },
  heroText: {
    uz: "Masalani suratga oling: Mirodil uni Singapurcha — rasm, misol va savollar bilan tushuntiradi. 1–4-sinflar uchun, o‘zbek, rus va ingliz tillarida.",
    ru: "Сфотографируйте задачу — Миродил объяснит её как в Сингапуре: картинками, похожим примером и вопросами. Для 1–4 классов, на узбекском, русском и английском.",
    en: "Take a photo of the task — Mirodil explains it the Singapore way: with pictures, a similar example and questions. For grades 1–4, in Uzbek, Russian and English.",
  },
  bubble: {
    uz: "Javobni aytmayman — o‘zing topishingga yordam beraman!",
    ru: "Я не говорю ответ — я помогаю найти его самому!",
    en: "I don't tell the answer — I help you find it!",
  },
  stepsTitle: { uz: "Qanday ishlaydi", ru: "Как это работает", en: "How it works" },
  step1: { uz: "Suratga ol", ru: "Сфотографируй", en: "Take a photo" },
  step1Text: {
    uz: "Uy vazifasi, darslikdagi mashq yoki bitta masala.",
    ru: "Домашнее задание, упражнение из учебника или одну задачу.",
    en: "Homework, a textbook exercise or just one task.",
  },
  step2: { uz: "Qadamma-qadam", ru: "Шаг за шагом", en: "Step by step" },
  step2Text: {
    uz: "Avval o‘zi urinadi. Qiyin bo‘lsa — rasm, o‘xshash misol, yo‘naltiruvchi savol.",
    ru: "Сначала ребёнок пробует сам. Если трудно — картинка, похожий пример, наводящий вопрос.",
    en: "First the child tries alone. If it is hard — a picture, a similar example, a leading question.",
  },
  step3: { uz: "O‘zi yechdi!", ru: "Решил сам!", en: "Solved it alone!" },
  step3Text: {
    uz: "Javobni bola o‘zi topadi va konfet, stiker, daraja oladi.",
    ru: "Ответ ребёнок находит сам — и получает конфеты, стикеры и новые уровни.",
    en: "The child finds the answer and gets candies, stickers and new levels.",
  },
  featuresTitle: { uz: "Mirodilda nima bor", ru: "Что есть в Миродиле", en: "What Mirodil has" },
  f1: { uz: "Tayyor javob yo‘q", ru: "Без готовых ответов", en: "No ready answers" },
  f1t: {
    uz: "Sun’iy intellekt uy vazifasini bola o‘rniga bajarmaydi. Sayt har bir maslahatni tekshiradi.",
    ru: "ИИ не делает домашку вместо ребёнка. Сайт проверяет каждую подсказку, чтобы в ней не было ответа.",
    en: "The AI never does the homework for the child. The site checks every hint for the answer.",
  },
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
  parentsTitle: { uz: "Ota-onalar uchun", ru: "Для родителей", en: "For parents" },
  p1: {
    uz: "Bola uy vazifasini o‘zi bajaradi — siz yonida o‘tirmasangiz ham.",
    ru: "Ребёнок делает домашку сам — даже когда вас нет рядом.",
    en: "Your child does the homework alone — even when you are not around.",
  },
  p2: {
    uz: "Pochta orqali kirsangiz, natijalar har qanday telefonda saqlanadi. Parol kerak emas.",
    ru: "Войдите по почте — прогресс сохранится на любом телефоне. Пароль не нужен.",
    en: "Log in with email — progress is kept on any phone. No password needed.",
  },
  p3: {
    uz: "Reklama yo‘q. Ma’lumotlarni faqat siz ko‘rasiz.",
    ru: "Без рекламы. Данные видите только вы.",
    en: "No ads. Only you can see the data.",
  },
  finalTitle: { uz: "Bugunoq sinab ko‘ring", ru: "Попробуйте сегодня", en: "Try it today" },
  finalText: {
    uz: "Bitta masalani suratga oling va Mirodil qanday o‘rgatishini ko‘ring.",
    ru: "Сфотографируйте одну задачу и посмотрите, как учит Миродил.",
    en: "Take a photo of one task and see how Mirodil teaches.",
  },
  footer: { uz: "Mirodil — o‘zing yech!", ru: "Миродил — реши сам!", en: "Mirodil — solve it yourself!" },
} satisfies Record<string, T>;

export type LKey = keyof typeof L;
