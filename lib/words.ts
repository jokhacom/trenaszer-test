import type { Lang } from "./types";

export type Tr = Record<Lang, string>;

/** Russian plural form: [1 яблоко, 2 яблока, 5 яблок]. */
export function ruPlural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

export function enPlural(n: number, forms: [string, string]): string {
  return n === 1 ? forms[0] : forms[1];
}

export interface Person {
  uz: string;
  ru: string;
  /** Russian genitive: «у Азиза», «у Малики». */
  ruGen: string;
  en: string;
  female: boolean;
}

export const PEOPLE: Person[] = [
  { uz: "Aziz", ru: "Азиз", ruGen: "Азиза", en: "Aziz", female: false },
  { uz: "Malika", ru: "Малика", ruGen: "Малики", en: "Malika", female: true },
  { uz: "Bobur", ru: "Бобур", ruGen: "Бобура", en: "Bobur", female: false },
  { uz: "Dilnoza", ru: "Дильноза", ruGen: "Дильнозы", en: "Dilnoza", female: true },
  { uz: "Jasur", ru: "Жасур", ruGen: "Жасура", en: "Jasur", female: false },
  { uz: "Madina", ru: "Мадина", ruGen: "Мадины", en: "Madina", female: true },
  { uz: "Sardor", ru: "Сардор", ruGen: "Сардора", en: "Sardor", female: false },
  { uz: "Zarina", ru: "Зарина", ruGen: "Зарины", en: "Zarina", female: true },
];

export interface Item {
  emoji: string;
  uz: string;
  /** Uzbek accusative: «olmani». */
  uzAcc: string;
  ru: [string, string, string];
  en: [string, string];
}

export const ITEMS: Item[] = [
  { emoji: "🍎", uz: "olma", uzAcc: "olmani", ru: ["яблоко", "яблока", "яблок"], en: ["apple", "apples"] },
  { emoji: "✏️", uz: "qalam", uzAcc: "qalamni", ru: ["карандаш", "карандаша", "карандашей"], en: ["pencil", "pencils"] },
  { emoji: "🎈", uz: "shar", uzAcc: "sharni", ru: ["шарик", "шарика", "шариков"], en: ["balloon", "balloons"] },
  { emoji: "📕", uz: "kitob", uzAcc: "kitobni", ru: ["книга", "книги", "книг"], en: ["book", "books"] },
  { emoji: "🌰", uz: "yong‘oq", uzAcc: "yong‘oqni", ru: ["орех", "ореха", "орехов"], en: ["nut", "nuts"] },
  { emoji: "🍬", uz: "konfet", uzAcc: "konfetni", ru: ["конфета", "конфеты", "конфет"], en: ["candy", "candies"] },
];

/** «12 яблок» / «12 ta olma» / «12 apples». */
export function count(lang: Lang, n: number, item: Item): string {
  if (lang === "uz") return `${n} ta ${item.uz}`;
  if (lang === "ru") return `${n} ${ruPlural(n, item.ru)}`;
  return `${n} ${enPlural(n, item.en)}`;
}
