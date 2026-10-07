// Built-in tasks and their help ladders, in Uzbek, Russian and English.
//
// Every ladder follows the same rule as the AI: hint, question and the
// similar example never contain the answer to the child's task. The similar
// example is always a different task solved in full.

import { parseSimpleExample } from "./expression";
import type { BarSpec, Grade, Lang, Lesson, Step, Topic } from "./types";
import { count, enPlural, ITEMS, PEOPLE, ruPlural, type Item, type Person, type Tr } from "./words";

export type Rng = () => number;

function int(r: Rng, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

function pick<T>(r: Rng, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function two<T>(r: Rng, xs: T[]): [T, T] {
  const i = Math.floor(r() * xs.length);
  const j = (i + 1 + Math.floor(r() * (xs.length - 1))) % xs.length;
  return [xs[i], xs[j]];
}

const t = (lang: Lang, s: Tr) => s[lang];

/** Operation choice for word problems: 1 = add, 2 = subtract. */
const ADD = 1;
const SUB = 2;
function opOptions(lang: Lang): Step["options"] {
  return [
    { label: t(lang, { uz: "+ qo‘shish", ru: "+ сложить", en: "+ add" }), value: ADD },
    { label: t(lang, { uz: "− ayirish", ru: "− вычесть", en: "− subtract" }), value: SUB },
  ];
}

function tensOnes(lang: Lang, tens: number, ones: number): string {
  if (lang === "uz") return `${tens} ta o‘nlik va ${ones} ta birlik`;
  if (lang === "ru")
    return `${tens} ${ruPlural(tens, ["десяток", "десятка", "десятков"])} и ${ones} ${ruPlural(ones, ["единица", "единицы", "единиц"])}`;
  return `${tens} ${enPlural(tens, ["ten", "tens"])} and ${ones} ${enPlural(ones, ["one", "ones"])}`;
}

function assembleStep(lang: Lang, tens: number, ones: number, answer: number): Step {
  return {
    prompt: t(lang, {
      uz: `Javobni yig‘: ${tensOnes(lang, tens, ones)}. Bu qaysi son?`,
      ru: `Собери ответ: ${tensOnes(lang, tens, ones)}. Какое это число?`,
      en: `Put it together: ${tensOnes(lang, tens, ones)}. What number is it?`,
    }),
    expect: answer,
  };
}

const similar = (lang: Lang) => t(lang, { uz: "O‘xshash misol", ru: "Похожий пример", en: "A similar example" });
const similarTask = (lang: Lang) => t(lang, { uz: "O‘xshash masala", ru: "Похожая задача", en: "A similar problem" });
const answerWord = (lang: Lang) => t(lang, { uz: "Javob", ru: "Ответ", en: "Answer" });

interface Spec<P> {
  topic: Topic;
  gen(r: Rng, g: Grade): P;
  answer(p: P): number;
  task(p: P, l: Lang): string;
  hint(p: P, l: Lang): string;
  question(p: P, l: Lang): Step;
  together(p: P, l: Lang): Step[];
  /** Full solution of a task with these params, shown as a similar example. */
  solved(p: P, l: Lang): string[];
  bar?(p: P, l: Lang): BarSpec;
  /** Extra constraints so ladder texts can never reveal the answer. */
  valid?(p: P): boolean;
}

// ---------- 8 + 5: making ten ----------

interface AB {
  a: number;
  b: number;
}

const add10: Spec<AB> = {
  topic: "add10",
  gen(r) {
    const a = int(r, 6, 9);
    return { a, b: int(r, 11 - a, 9) };
  },
  answer: (p) => p.a + p.b,
  task: (p) => `${p.a} + ${p.b} = ?`,
  hint: (p, l) =>
    t(l, {
      uz: `Avval 10 ni hosil qilib ko‘r: ${p.a} + ? = 10`,
      ru: `Попробуй сначала дополнить до 10: ${p.a} + ? = 10`,
      en: `Try to make 10 first: ${p.a} + ? = 10`,
    }),
  question: (p, l) => ({
    prompt: t(l, {
      uz: `${p.a} + ? = 10. So‘roq belgisi o‘rnida qaysi son turadi?`,
      ru: `${p.a} + ? = 10. Какое число вместо знака вопроса?`,
      en: `${p.a} + ? = 10. Which number goes in place of the question mark?`,
    }),
    expect: 10 - p.a,
  }),
  together(p, l) {
    const k = 10 - p.a;
    const rest = p.b - k;
    return [
      { prompt: t(l, { uz: `Avval 10 ni hosil qilamiz: ${p.a} + ? = 10`, ru: `Сначала дополним до 10: ${p.a} + ? = 10`, en: `First make 10: ${p.a} + ? = 10` }), expect: k },
      { prompt: t(l, { uz: `Ikkinchi sondan ${k} tasini oldik. Qancha qoldi? ${p.b} − ${k} = ?`, ru: `Мы взяли ${k} из ${p.b}. Сколько осталось? ${p.b} − ${k} = ?`, en: `We took ${k} from ${p.b}. How many are left? ${p.b} − ${k} = ?` }), expect: rest },
      { prompt: t(l, { uz: `Endi oson: 10 + ${rest} = ?`, ru: `Теперь легко: 10 + ${rest} = ?`, en: `Now it's easy: 10 + ${rest} = ?` }), expect: p.a + p.b },
    ];
  },
  solved(p, l) {
    const k = 10 - p.a;
    const rest = p.b - k;
    const s = p.a + p.b;
    return [
      `${similar(l)}: ${p.a} + ${p.b}`,
      `${p.a} + ${k} = 10`,
      `${p.b} − ${k} = ${rest}`,
      `10 + ${rest} = ${s}`,
      `${answerWord(l)}: ${p.a} + ${p.b} = ${s}`,
    ];
  },
};

// ---------- 35 + 27: adding with carrying ----------

const addCarry: Spec<AB> = {
  topic: "addCarry",
  gen(r) {
    const ua = int(r, 2, 9);
    const ub = int(r, 10 - ua, 9);
    const ta = int(r, 1, 6);
    const tb = int(r, 1, 7 - ta);
    return { a: ta * 10 + ua, b: tb * 10 + ub };
  },
  valid: (p) => (p.a % 10) + (p.b % 10) >= 10 && p.a >= 10 && p.b >= 10 && p.a + p.b < 100,
  answer: (p) => p.a + p.b,
  task: (p) => `${p.a} + ${p.b} = ?`,
  hint: (_p, l) =>
    t(l, {
      uz: "Avval birliklarni, keyin o‘nliklarni qo‘sh. Birliklar yig‘indisi o‘ndan oshsa, bitta o‘nlikni o‘nliklarga qo‘sh.",
      ru: "Сложи сначала единицы, потом десятки. Если единиц получится больше десяти — один десяток перенеси к десяткам.",
      en: "Add the ones first, then the tens. If the ones make more than ten, carry one ten over to the tens.",
    }),
  question: (p, l) => ({
    prompt: t(l, {
      uz: `Birliklarni qo‘sh: ${p.a % 10} + ${p.b % 10} = ?`,
      ru: `Сложи единицы: ${p.a % 10} + ${p.b % 10} = ?`,
      en: `Add the ones: ${p.a % 10} + ${p.b % 10} = ?`,
    }),
    expect: (p.a % 10) + (p.b % 10),
  }),
  together(p, l) {
    const ua = p.a % 10, ub = p.b % 10, ta = Math.floor(p.a / 10), tb = Math.floor(p.b / 10);
    const us = ua + ub;
    const ts = ta + tb + 1;
    return [
      { prompt: t(l, { uz: `Birliklar: ${ua} + ${ub} = ?`, ru: `Единицы: ${ua} + ${ub} = ?`, en: `Ones: ${ua} + ${ub} = ?` }), expect: us },
      { prompt: t(l, { uz: `${us} chiqdi. Bu 1 ta o‘nlik va nechta birlik?`, ru: `Получилось ${us}. Это 1 десяток и сколько единиц?`, en: `You got ${us}. That is 1 ten and how many ones?` }), expect: us - 10 },
      { prompt: t(l, { uz: `O‘nliklar, o‘tkazilgan 1 ni ham qo‘shamiz: ${ta} + ${tb} + 1 = ?`, ru: `Десятки, не забудь перенесённый: ${ta} + ${tb} + 1 = ?`, en: `Tens, don't forget the one you carried: ${ta} + ${tb} + 1 = ?` }), expect: ts },
      assembleStep(l, ts, us - 10, p.a + p.b),
    ];
  },
  solved(p, l) {
    const ua = p.a % 10, ub = p.b % 10, ta = Math.floor(p.a / 10), tb = Math.floor(p.b / 10);
    const us = ua + ub;
    return [
      `${similar(l)}: ${p.a} + ${p.b}`,
      t(l, { uz: `Birliklar: ${ua} + ${ub} = ${us}`, ru: `Единицы: ${ua} + ${ub} = ${us}`, en: `Ones: ${ua} + ${ub} = ${us}` }),
      t(l, { uz: `Yozamiz: ${us - 10}, 1 ta o‘nlik esda`, ru: `Пишем ${us - 10}, 1 десяток переносим`, en: `Write ${us - 10}, carry 1 ten` }),
      t(l, { uz: `O‘nliklar: ${ta} + ${tb} + 1 = ${ta + tb + 1}`, ru: `Десятки: ${ta} + ${tb} + 1 = ${ta + tb + 1}`, en: `Tens: ${ta} + ${tb} + 1 = ${ta + tb + 1}` }),
      `${answerWord(l)}: ${p.a} + ${p.b} = ${p.a + p.b}`,
    ];
  },
};

// ---------- 52 − 27: subtracting with borrowing ----------

const subBorrow: Spec<AB> = {
  topic: "subBorrow",
  gen(r) {
    const ta = int(r, 3, 9);
    const ua = int(r, 0, 8);
    const ub = int(r, ua + 1, 9);
    const tb = int(r, 1, ta - 2);
    return { a: ta * 10 + ua, b: tb * 10 + ub };
  },
  valid: (p) =>
    p.a < 100 && p.b >= 10 && p.a % 10 < p.b % 10 && Math.floor(p.a / 10) - 1 - Math.floor(p.b / 10) >= 1,
  answer: (p) => p.a - p.b,
  task: (p) => `${p.a} − ${p.b} = ?`,
  hint: (_p, l) =>
    t(l, {
      uz: "Avval birliklarni ayir. Birliklar yetmasa, bitta o‘nlikni ol — u 10 ta birlik beradi.",
      ru: "Вычитай сначала единицы. Если единиц не хватает — займи один десяток: он даст 10 единиц.",
      en: "Subtract the ones first. If there aren't enough ones, borrow one ten: it gives you 10 ones.",
    }),
  question: (p, l) => ({
    prompt: t(l, {
      uz: `${p.a % 10} − ${p.b % 10} bo‘lmaydi. Bitta o‘nlikni olamiz: 10 + ${p.a % 10} = ?`,
      ru: `Из ${p.a % 10} нельзя вычесть ${p.b % 10}. Займём десяток: 10 + ${p.a % 10} = ?`,
      en: `You can't take ${p.b % 10} from ${p.a % 10}. Borrow a ten: 10 + ${p.a % 10} = ?`,
    }),
    expect: 10 + (p.a % 10),
  }),
  together(p, l) {
    const ua = p.a % 10, ub = p.b % 10, ta = Math.floor(p.a / 10), tb = Math.floor(p.b / 10);
    const big = 10 + ua;
    const us = big - ub;
    const ts = ta - 1 - tb;
    return [
      { prompt: t(l, { uz: `Bitta o‘nlikni oldik: 10 + ${ua} = ?`, ru: `Заняли десяток: 10 + ${ua} = ?`, en: `We borrowed a ten: 10 + ${ua} = ?` }), expect: big },
      { prompt: t(l, { uz: `Birliklarni ayir: ${big} − ${ub} = ?`, ru: `Вычти единицы: ${big} − ${ub} = ?`, en: `Subtract the ones: ${big} − ${ub} = ?` }), expect: us },
      { prompt: t(l, { uz: `O‘nliklar bittaga kamaydi: ${ta} − 1 = ?`, ru: `Десятков стало на один меньше: ${ta} − 1 = ?`, en: `Now there is one ten less: ${ta} − 1 = ?` }), expect: ta - 1 },
      { prompt: t(l, { uz: `O‘nliklarni ayir: ${ta - 1} − ${tb} = ?`, ru: `Вычти десятки: ${ta - 1} − ${tb} = ?`, en: `Subtract the tens: ${ta - 1} − ${tb} = ?` }), expect: ts },
      assembleStep(l, ts, us, p.a - p.b),
    ];
  },
  solved(p, l) {
    const ua = p.a % 10, ub = p.b % 10, ta = Math.floor(p.a / 10), tb = Math.floor(p.b / 10);
    return [
      `${similar(l)}: ${p.a} − ${p.b}`,
      t(l, { uz: `O‘nlikni olamiz: 10 + ${ua} = ${10 + ua}`, ru: `Занимаем десяток: 10 + ${ua} = ${10 + ua}`, en: `Borrow a ten: 10 + ${ua} = ${10 + ua}` }),
      t(l, { uz: `Birliklar: ${10 + ua} − ${ub} = ${10 + ua - ub}`, ru: `Единицы: ${10 + ua} − ${ub} = ${10 + ua - ub}`, en: `Ones: ${10 + ua} − ${ub} = ${10 + ua - ub}` }),
      t(l, { uz: `O‘nliklar: ${ta} − 1 − ${tb} = ${ta - 1 - tb}`, ru: `Десятки: ${ta} − 1 − ${tb} = ${ta - 1 - tb}`, en: `Tens: ${ta} − 1 − ${tb} = ${ta - 1 - tb}` }),
      `${answerWord(l)}: ${p.a} − ${p.b} = ${p.a - p.b}`,
    ];
  },
};

// ---------- Word problems ----------

interface Word {
  a: number;
  b: number;
  A: Person;
  B: Person;
  item: Item;
}

function genWord(r: Rng, lo: [number, number], hi: [number, number]): Word {
  const [A, B] = two(r, PEOPLE);
  return { a: int(r, lo[0], lo[1]), b: int(r, hi[0], hi[1]), A, B, item: pick(r, ITEMS) };
}

const gen = (l: Lang, p: Person) => (l === "ru" ? p.ruGen : l === "uz" ? p.uz : p.en);
const nm = (l: Lang, p: Person) => p[l];
const many = (l: Lang, item: Item) => (l === "uz" ? item.uz : l === "ru" ? item.ru[2] : item.en[1]);

function wordSolved(l: Lang, task: string, sign: "+" | "−", a: number, b: number, res: number, item: Item, why: Tr): string[] {
  return [`${similarTask(l)}: ${task}`, t(l, why), `${a} ${sign} ${b} = ${res}`, `${answerWord(l)}: ${count(l, res, item)}.`];
}

const wordTotal: Spec<Word> = {
  topic: "wordTotal",
  gen: (r, g) => (g === 1 ? genWord(r, [2, 9], [2, 9]) : genWord(r, [11, 60], [11, 39])),
  answer: (p) => p.a + p.b,
  task: (p, l) =>
    t(l, {
      uz: `${p.A.uz}da ${count(l, p.a, p.item)} bor, ${p.B.uz}da ${count(l, p.b, p.item)} bor. Ularda hammasi bo‘lib nechta ${p.item.uz} bor?`,
      ru: `У ${p.A.ruGen} ${count(l, p.a, p.item)}, у ${p.B.ruGen} ${count(l, p.b, p.item)}. Сколько ${p.item.ru[2]} у них всего?`,
      en: `${p.A.en} has ${count(l, p.a, p.item)}, ${p.B.en} has ${count(l, p.b, p.item)}. How many ${p.item.en[1]} do they have altogether?`,
    }),
  hint: (_p, l) =>
    t(l, {
      uz: "Masalani chizib ko‘r: ikki qism va butun. Ikkala qismni bilamiz, butunni — hammasi qanchaligini topamiz.",
      ru: "Нарисуй задачу: две части и целое. Обе части мы знаем, а ищем целое — сколько всего.",
      en: "Draw the problem: two parts and a whole. We know both parts and look for the whole — how many altogether.",
    }),
  question: (_p, l) => ({
    prompt: t(l, {
      uz: "Hammasi qanchaligini topamiz. Qaysi amal kerak?",
      ru: "Ищем, сколько всего. Какое действие нужно?",
      en: "We are looking for how many altogether. Which operation do we need?",
    }),
    expect: ADD,
    options: opOptions(l),
  }),
  together: (p, l) => [
    { prompt: t(l, { uz: `${p.A.uz}da nechta ${p.item.uz} bor?`, ru: `Сколько ${p.item.ru[2]} у ${p.A.ruGen}?`, en: `How many ${p.item.en[1]} does ${p.A.en} have?` }), expect: p.a },
    { prompt: t(l, { uz: `${p.B.uz}da-chi?`, ru: `А у ${p.B.ruGen}?`, en: `And ${p.B.en}?` }), expect: p.b },
    { prompt: t(l, { uz: `Qismlarni qo‘shamiz: ${p.a} + ${p.b} = ?`, ru: `Складываем части: ${p.a} + ${p.b} = ?`, en: `Add the parts: ${p.a} + ${p.b} = ?` }), expect: p.a + p.b },
  ],
  solved: (p, l) =>
    wordSolved(l, wordTotal.task(p, l), "+", p.a, p.b, p.a + p.b, p.item, {
      uz: "Hammasini topamiz — qo‘shamiz.",
      ru: "Ищем всё вместе — складываем.",
      en: "We look for the total — so we add.",
    }),
  bar: (p, l) => ({ kind: "total", a: p.a, b: p.b, nameA: nm(l, p.A), nameB: nm(l, p.B) }),
};

const wordRemain: Spec<Word> = {
  topic: "wordRemain",
  gen(r, g) {
    const p = g === 1 ? genWord(r, [11, 18], [3, 9]) : genWord(r, [30, 90], [11, 29]);
    return p;
  },
  valid: (p) => p.b < p.a,
  answer: (p) => p.a - p.b,
  task: (p, l) =>
    t(l, {
      uz: `${p.A.uz}da ${count(l, p.a, p.item)} bor edi. U ${p.b} ta ${p.item.uzAcc} do‘stiga berdi. Nechta ${p.item.uz} qoldi?`,
      ru: `У ${p.A.ruGen} было ${count(l, p.a, p.item)}. ${p.A.female ? "Она отдала" : "Он отдал"} другу ${count(l, p.b, p.item)}. Сколько ${p.item.ru[2]} осталось?`,
      en: `${p.A.en} had ${count(l, p.a, p.item)}. ${p.A.female ? "She" : "He"} gave ${count(l, p.b, p.item)} to a friend. How many ${p.item.en[1]} are left?`,
    }),
  hint: (p, l) =>
    t(l, {
      uz: `Butun — boshida bor bo‘lgani: ${p.a}. Bir qismini berib yubordi. Qolgan qismini topamiz.`,
      ru: `Целое — это сколько было сначала: ${p.a}. Часть отдали. Ищем другую часть — сколько осталось.`,
      en: `The whole is how many there were at first: ${p.a}. Part was given away. We look for the other part — what is left.`,
    }),
  question: (_p, l) => ({
    prompt: t(l, {
      uz: "Bir qismini berib yubordi. Qaysi amal kerak?",
      ru: "Часть отдали. Какое действие нужно?",
      en: "Part was given away. Which operation do we need?",
    }),
    expect: SUB,
    options: opOptions(l),
  }),
  together: (p, l) => [
    { prompt: t(l, { uz: `Boshida nechta ${p.item.uz} bor edi?`, ru: `Сколько ${p.item.ru[2]} было сначала?`, en: `How many ${p.item.en[1]} were there at first?` }), expect: p.a },
    { prompt: t(l, { uz: "Nechtasini berdi?", ru: "Сколько отдали?", en: "How many were given away?" }), expect: p.b },
    { prompt: t(l, { uz: `Ayiramiz: ${p.a} − ${p.b} = ?`, ru: `Вычитаем: ${p.a} − ${p.b} = ?`, en: `Subtract: ${p.a} − ${p.b} = ?` }), expect: p.a - p.b },
  ],
  solved: (p, l) =>
    wordSolved(l, wordRemain.task(p, l), "−", p.a, p.b, p.a - p.b, p.item, {
      uz: "Qolganini topamiz — ayiramiz.",
      ru: "Ищем, сколько осталось, — вычитаем.",
      en: "We look for what is left — so we subtract.",
    }),
  bar: (p, l) => ({ kind: "remain", a: p.a, b: p.b, nameA: nm(l, p.A), nameB: nm(l, p.B) }),
};

const wordMore: Spec<Word> = {
  topic: "wordMore",
  gen: (r, g) => (g <= 2 ? genWord(r, [11, 50], [3, 19]) : g === 3 ? genWord(r, [20, 80], [5, 19]) : genWord(r, [100, 500], [20, 150])),
  answer: (p) => p.a + p.b,
  task: (p, l) =>
    t(l, {
      uz: `${p.A.uz}da ${count(l, p.a, p.item)} bor, ${p.B.uz}da esa ${p.b} ta ko‘p. ${p.B.uz}da nechta ${p.item.uz} bor?`,
      ru: `У ${p.A.ruGen} ${count(l, p.a, p.item)}, а у ${p.B.ruGen} на ${p.b} больше. Сколько ${p.item.ru[2]} у ${p.B.ruGen}?`,
      en: `${p.A.en} has ${count(l, p.a, p.item)}. ${p.B.en} has ${p.b} more. How many ${p.item.en[1]} does ${p.B.en} have?`,
    }),
  hint: (p, l) =>
    t(l, {
      uz: `«${p.b} ta ko‘p» — demak, ${p.A.uz}dagicha va yana ${p.b} ta.`,
      ru: `«На ${p.b} больше» — значит, столько же, сколько у ${p.A.ruGen}, и ещё ${p.b}.`,
      en: `"${p.b} more" means as many as ${p.A.en} has, and ${p.b} more.`,
    }),
  question: (_p, l) => ({
    prompt: t(l, { uz: "Qaysi amal kerak?", ru: "Какое действие нужно?", en: "Which operation do we need?" }),
    expect: ADD,
    options: opOptions(l),
  }),
  together: (p, l) => [
    { prompt: t(l, { uz: `${p.A.uz}da nechta ${p.item.uz} bor?`, ru: `Сколько ${p.item.ru[2]} у ${p.A.ruGen}?`, en: `How many ${p.item.en[1]} does ${p.A.en} have?` }), expect: p.a },
    { prompt: t(l, { uz: `${p.B.uz}da nechta ko‘p?`, ru: `На сколько больше у ${p.B.ruGen}?`, en: `How many more does ${p.B.en} have?` }), expect: p.b },
    { prompt: t(l, { uz: `Qo‘shamiz: ${p.a} + ${p.b} = ?`, ru: `Складываем: ${p.a} + ${p.b} = ?`, en: `Add: ${p.a} + ${p.b} = ?` }), expect: p.a + p.b },
  ],
  solved: (p, l) =>
    wordSolved(l, wordMore.task(p, l), "+", p.a, p.b, p.a + p.b, p.item, {
      uz: "«Ko‘p» — shunchasi va yana — qo‘shamiz.",
      ru: "«На … больше» — столько же и ещё — складываем.",
      en: '"More" means the same and some extra — so we add.',
    }),
  bar: (p, l) => ({ kind: "more", a: p.a, b: p.b, nameA: nm(l, p.A), nameB: nm(l, p.B) }),
};

const wordLess: Spec<Word> = {
  topic: "wordLess",
  gen: (r, g) => (g <= 2 ? genWord(r, [20, 60], [3, 15]) : g === 3 ? genWord(r, [30, 90], [5, 25]) : genWord(r, [150, 600], [20, 120])),
  // The hint shows b, so the answer a − b must differ from it.
  valid: (p) => p.a - p.b >= 2 && p.a - p.b !== p.b,
  answer: (p) => p.a - p.b,
  task: (p, l) =>
    t(l, {
      uz: `${p.A.uz}da ${count(l, p.a, p.item)} bor, ${p.B.uz}da esa ${p.b} ta kam. ${p.B.uz}da nechta ${p.item.uz} bor?`,
      ru: `У ${p.A.ruGen} ${count(l, p.a, p.item)}, а у ${p.B.ruGen} на ${p.b} меньше. Сколько ${p.item.ru[2]} у ${p.B.ruGen}?`,
      en: `${p.A.en} has ${count(l, p.a, p.item)}. ${p.B.en} has ${p.b} fewer. How many ${p.item.en[1]} does ${p.B.en} have?`,
    }),
  hint: (p, l) =>
    t(l, {
      uz: `«${p.b} ta kam» — demak, ${p.A.uz}dagidan ${p.b} tasi kam.`,
      ru: `«На ${p.b} меньше» — значит, столько же, сколько у ${p.A.ruGen}, но без ${p.b}.`,
      en: `"${p.b} fewer" means as many as ${p.A.en} has, but without ${p.b}.`,
    }),
  question: (_p, l) => ({
    prompt: t(l, { uz: "Qaysi amal kerak?", ru: "Какое действие нужно?", en: "Which operation do we need?" }),
    expect: SUB,
    options: opOptions(l),
  }),
  together: (p, l) => [
    { prompt: t(l, { uz: `${p.A.uz}da nechta ${p.item.uz} bor?`, ru: `Сколько ${p.item.ru[2]} у ${p.A.ruGen}?`, en: `How many ${p.item.en[1]} does ${p.A.en} have?` }), expect: p.a },
    { prompt: t(l, { uz: `${p.B.uz}da nechta kam?`, ru: `На сколько меньше у ${p.B.ruGen}?`, en: `How many fewer does ${p.B.en} have?` }), expect: p.b },
    { prompt: t(l, { uz: `Ayiramiz: ${p.a} − ${p.b} = ?`, ru: `Вычитаем: ${p.a} − ${p.b} = ?`, en: `Subtract: ${p.a} − ${p.b} = ?` }), expect: p.a - p.b },
  ],
  solved: (p, l) =>
    wordSolved(l, wordLess.task(p, l), "−", p.a, p.b, p.a - p.b, p.item, {
      uz: "«Kam» — shunchasidan olib tashlaymiz — ayiramiz.",
      ru: "«На … меньше» — столько же, но без части — вычитаем.",
      en: '"Fewer" means the same minus some — so we subtract.',
    }),
  bar: (p, l) => ({ kind: "less", a: p.a, b: p.b, nameA: nm(l, p.A), nameB: nm(l, p.B) }),
};

// ---------- Multiplication and division ----------

const sumOf = (x: number, times: number) => Array.from({ length: times }, () => x).join(" + ");

const mult: Spec<AB> = {
  topic: "mult",
  gen: (r, g) => (g <= 2 ? { a: int(r, 2, 5), b: int(r, 2, 5) } : { a: int(r, 2, 9), b: int(r, 2, 9) }),
  valid: (p) => p.a >= 2 && p.b >= 2 && p.a <= 10 && p.b <= 10,
  answer: (p) => p.a * p.b,
  task: (p) => `${p.a} × ${p.b} = ?`,
  hint: (p, l) =>
    t(l, {
      uz: `Ko‘paytirish — bir xil sonlarni qo‘shish. ${p.a} × ${p.b} — bu ${p.b} marta ${p.a}: ${p.a} + ${p.a} + …`,
      ru: `Умножение — это сложение одинаковых чисел. ${p.a} × ${p.b} — это ${p.b} раз по ${p.a}: ${p.a} + ${p.a} + …`,
      en: `Multiplication is adding equal numbers. ${p.a} × ${p.b} means ${p.b} times ${p.a}: ${p.a} + ${p.a} + …`,
    }),
  question: (p, l) => ({
    prompt: t(l, {
      uz: `${p.a} sonini necha marta qo‘shish kerak?`,
      ru: `Сколько раз нужно сложить число ${p.a}?`,
      en: `How many times do we add ${p.a}?`,
    }),
    expect: p.b,
  }),
  together(p, l) {
    const steps: Step[] = [];
    for (let k = 2; k <= p.b; k++) {
      const eq = `${(k - 1) * p.a} + ${p.a} = ?`;
      const lead =
        k === 2
          ? t(l, { uz: "Boshlaymiz", ru: "Начнём", en: "Let's start" })
          : k === p.b
            ? t(l, { uz: "Va oxirgi marta", ru: "И последний раз", en: "And the last time" })
            : t(l, { uz: `Yana ${p.a}`, ru: `Ещё ${p.a}`, en: `One more ${p.a}` });
      steps.push({ prompt: `${lead}: ${eq}`, expect: k * p.a });
    }
    return steps;
  },
  solved: (p, l) => [`${similar(l)}: ${p.a} × ${p.b}`, `${sumOf(p.a, p.b)} = ${p.a * p.b}`, `${answerWord(l)}: ${p.a} × ${p.b} = ${p.a * p.b}`],
};

/** a = divisor, b = quotient; the task is (a·b) : a. */
const div: Spec<AB> = {
  topic: "div",
  gen: (r) => ({ a: int(r, 2, 9), b: int(r, 3, 9) }),
  // The hint and question show a and 2a, so the answer must differ from both.
  valid: (p) => p.b >= 3 && p.b <= 9 && p.a >= 2 && p.b !== p.a && p.b !== 2 * p.a,
  answer: (p) => p.b,
  task: (p, l) => `${p.a * p.b} ${l === "en" ? "÷" : ":"} ${p.a} = ?`,
  hint: (p, l) =>
    t(l, {
      uz: `Bo‘lish — teng bo‘lish. ${p.a * p.b} ichida ${p.a} necha marta borligini topamiz.`,
      ru: `Деление — это поровну. Узнаем, сколько раз по ${p.a} помещается в ${p.a * p.b}.`,
      en: `Division means sharing equally. Let's find how many times ${p.a} fits into ${p.a * p.b}.`,
    }),
  question: (p, l) => ({
    prompt: t(l, {
      uz: `${p.a} tadan sanaymiz: ${p.a}, ${2 * p.a}, … Keyingi son qaysi?`,
      ru: `Считаем по ${p.a}: ${p.a}, ${2 * p.a}, … Какое число следующее?`,
      en: `Count by ${p.a}: ${p.a}, ${2 * p.a}, … What comes next?`,
    }),
    expect: 3 * p.a,
  }),
  together(p, l) {
    const n = p.a * p.b;
    const steps: Step[] = [];
    for (let k = 1; k < p.b; k++) {
      const eq = `${k * p.a} + ${p.a} = ?`;
      const lead = k === 1 ? t(l, { uz: `${p.a} tadan yig‘amiz`, ru: `Набираем по ${p.a}`, en: `Count up by ${p.a}` }) : t(l, { uz: "Yana", ru: "Ещё", en: "Again" });
      steps.push({ prompt: `${lead}: ${eq}`, expect: (k + 1) * p.a });
    }
    steps.push({
      prompt: t(l, {
        uz: `Mana ${n} hosil bo‘ldi. Necha marta ${p.a} oldik? Qadamlarni sana.`,
        ru: `Мы дошли до ${n}. Сколько раз мы взяли по ${p.a}? Посчитай шаги.`,
        en: `We reached ${n}. How many times did we take ${p.a}? Count the steps.`,
      }),
      expect: p.b,
    });
    return steps;
  },
  solved: (p, l) => {
    const n = p.a * p.b;
    const sign = l === "en" ? "÷" : ":";
    return [`${similar(l)}: ${n} ${sign} ${p.a}`, `${sumOf(p.a, p.b)} = ${n}`, `${answerWord(l)}: ${n} ${sign} ${p.a} = ${p.b}`];
  },
};

/** 23 × 4: split into tens and ones. a = two-digit number, b = one digit. */
const mult2d: Spec<AB> = {
  topic: "mult2d",
  gen: (r) => ({ a: int(r, 1, 9) * 10 + int(r, 1, 9), b: int(r, 2, 9) }),
  valid: (p) => p.a >= 11 && p.a <= 99 && p.a % 10 !== 0 && p.b >= 2 && p.b <= 9,
  answer: (p) => p.a * p.b,
  task: (p) => `${p.a} × ${p.b} = ?`,
  hint: (p, l) => {
    const T = Math.floor(p.a / 10) * 10;
    return t(l, {
      uz: `${p.a} sonini xonalarga ajrat: ${T} va ${p.a % 10}. Har bir qismni alohida ko‘paytir.`,
      ru: `Разложи ${p.a} на десятки и единицы: ${T} и ${p.a % 10}. Умножь каждую часть.`,
      en: `Split ${p.a} into tens and ones: ${T} and ${p.a % 10}. Multiply each part.`,
    });
  },
  question: (p, l) => {
    const T = Math.floor(p.a / 10) * 10;
    return {
      prompt: t(l, { uz: `O‘nliklardan boshla: ${T} × ${p.b} = ?`, ru: `Начни с десятков: ${T} × ${p.b} = ?`, en: `Start with the tens: ${T} × ${p.b} = ?` }),
      expect: T * p.b,
    };
  },
  together(p, l) {
    const T = Math.floor(p.a / 10) * 10;
    const u = p.a % 10;
    return [
      { prompt: t(l, { uz: `O‘nliklar: ${T} × ${p.b} = ?`, ru: `Десятки: ${T} × ${p.b} = ?`, en: `Tens: ${T} × ${p.b} = ?` }), expect: T * p.b },
      { prompt: t(l, { uz: `Birliklar: ${u} × ${p.b} = ?`, ru: `Единицы: ${u} × ${p.b} = ?`, en: `Ones: ${u} × ${p.b} = ?` }), expect: u * p.b },
      { prompt: t(l, { uz: `Qo‘sh: ${T * p.b} + ${u * p.b} = ?`, ru: `Сложи: ${T * p.b} + ${u * p.b} = ?`, en: `Add: ${T * p.b} + ${u * p.b} = ?` }), expect: p.a * p.b },
    ];
  },
  solved: (p, l) => {
    const T = Math.floor(p.a / 10) * 10;
    const u = p.a % 10;
    return [
      `${similar(l)}: ${p.a} × ${p.b}`,
      `${T} × ${p.b} = ${T * p.b}`,
      `${u} × ${p.b} = ${u * p.b}`,
      `${T * p.b} + ${u * p.b} = ${p.a * p.b}`,
      `${answerWord(l)}: ${p.a} × ${p.b} = ${p.a * p.b}`,
    ];
  },
};

// ---------- Registry ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SPECS: Record<Topic, Spec<any>> = {
  add10,
  addCarry,
  subBorrow,
  wordTotal,
  wordRemain,
  wordMore,
  wordLess,
  mult,
  div,
  mult2d,
};

export const TOPICS_BY_GRADE: Record<Grade, Topic[]> = {
  1: ["add10", "wordTotal", "wordRemain"],
  2: ["addCarry", "subBorrow", "wordMore", "wordLess", "wordTotal", "mult"],
  3: ["mult", "div", "wordMore", "wordLess", "addCarry", "subBorrow"],
  4: ["mult2d", "div", "wordMore", "wordLess", "subBorrow"],
};

export const WORD_TOPICS: Topic[] = ["wordTotal", "wordRemain", "wordMore", "wordLess"];

export const TOPIC_NAMES: Record<Topic, Tr> = {
  add10: { uz: "10 orqali qo‘shish", ru: "Сложение через десяток", en: "Adding through ten" },
  addCarry: { uz: "Ikki xonali sonlarni qo‘shish", ru: "Сложение двузначных чисел", en: "Adding two-digit numbers" },
  subBorrow: { uz: "Ikki xonali sonlarni ayirish", ru: "Вычитание двузначных чисел", en: "Subtracting two-digit numbers" },
  wordTotal: { uz: "Hammasini topish masalalari", ru: "Задачи «сколько всего»", en: "“How many altogether” problems" },
  wordRemain: { uz: "Qolganini topish masalalari", ru: "Задачи «сколько осталось»", en: "“How many are left” problems" },
  wordMore: { uz: "«…ta ko‘p» masalalari", ru: "Задачи «на … больше»", en: "“… more” problems" },
  wordLess: { uz: "«…ta kam» masalalari", ru: "Задачи «на … меньше»", en: "“… fewer” problems" },
  mult: { uz: "Ko‘paytirish jadvali", ru: "Таблица умножения", en: "Times tables" },
  div: { uz: "Bo‘lish", ru: "Деление", en: "Division" },
  mult2d: { uz: "Ikki xonali sonni ko‘paytirish", ru: "Умножение двузначного числа", en: "Multiplying a two-digit number" },
};

function build<P>(spec: Spec<P>, p: P, lang: Lang, r: Rng, grade: Grade): Lesson {
  const answer = spec.answer(p);
  // A similar example: same kind of task, different numbers, answer not shown anywhere.
  let ex = spec.gen(r, grade);
  for (let i = 0; i < 50; i++) {
    const exLines = spec.solved(ex, lang);
    const ok = (!spec.valid || spec.valid(ex)) && spec.answer(ex) !== answer && !exLines.some((s) => containsNumber(s, answer));
    if (ok) break;
    ex = spec.gen(r, grade);
  }
  return {
    id: `${spec.topic}:${JSON.stringify(p, (_k, v) => (v && typeof v === "object" && "ruGen" in v ? v.en : v))}`,
    topic: spec.topic,
    lang,
    task: spec.task(p, lang),
    answer,
    hint: spec.hint(p, lang),
    question: spec.question(p, lang),
    example: spec.solved(ex, lang),
    together: spec.together(p, lang),
    bar: spec.bar?.(p, lang),
    source: "local",
  };
}

/** True when `n` appears in the text as a whole number (not as part of 125). */
export function containsNumber(text: string, n: number): boolean {
  return new RegExp(`(?<![\\d.,])${n}(?![\\d.,]?\\d)`).test(text);
}

export function makeLesson(topic: Topic, lang: Lang, grade: Grade, r: Rng = Math.random): Lesson {
  const spec = SPECS[topic];
  let p = spec.gen(r, grade);
  for (let i = 0; i < 100 && spec.valid && !spec.valid(p); i++) p = spec.gen(r, grade);
  return build(spec, p, lang, r, grade);
}

/** Builds a ladder for a plain example the child typed or photographed, e.g. "35 + 27". */
export function lessonFromExample(text: string, lang: Lang, grade: Grade, r: Rng = Math.random): Lesson | null {
  const e = parseSimpleExample(text);
  if (!e) return null;
  const { a, b } = e;
  const candidates: [Topic, AB][] = [];
  if (e.op === "+") {
    if (a <= 9 && b <= 9 && a + b > 10) candidates.push(["add10", a >= b ? { a, b } : { a: b, b: a }]);
    candidates.push(["addCarry", { a, b }]);
  } else if (e.op === "-") {
    candidates.push(["subBorrow", { a, b }]);
  } else if (e.op === "*") {
    candidates.push(["mult", { a, b }]);
    candidates.push(["mult2d", a >= 10 ? { a, b } : { a: b, b: a }]);
  } else if (e.op === "/" && b !== 0 && a % b === 0) {
    candidates.push(["div", { a: b, b: a / b }]);
  }
  for (const [topic, p] of candidates) {
    const spec = SPECS[topic];
    if (topic === "add10" && !(p.a >= 2 && p.a <= 9 && p.b <= 9 && p.a + p.b > 10)) continue;
    if (spec.valid && !spec.valid(p)) continue;
    return build(spec, p, lang, r, grade);
  }
  return null;
}

/** Word problem for the bar-model game. */
export function makeBarProblem(lang: Lang, grade: Grade, r: Rng = Math.random): Lesson {
  const g: Grade = grade === 1 ? 1 : 2;
  const topics: Topic[] = grade === 1 ? ["wordTotal", "wordRemain"] : WORD_TOPICS;
  return makeLesson(pick(r, topics), lang, g, r);
}
