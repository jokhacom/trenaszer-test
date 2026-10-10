// Short stories for "Read together" (Singapore STELLAR: shared reading, then
// questions about the text). Every question points to the sentence that holds
// the answer, so a wrong answer sends the child back to the text, not to the answer.
// Uzbek texts must be checked by a native speaker before release.

import type { Lang } from "./types";

export interface StoryQuestion {
  q: string;
  options: string[];
  /** Index of the right option in `options`. */
  correct: number;
  /** Index of the sentence that holds the answer. */
  evidence: number;
}

export interface StoryText {
  title: string;
  sentences: string[];
  questions: StoryQuestion[];
}

export interface Story {
  id: string;
  emoji: string;
  text: Record<Lang, StoryText>;
}

export const STORIES: Story[] = [
  {
    id: "kite",
    emoji: "🪁",
    text: {
      ru: {
        title: "Синий воздушный змей",
        sentences: [
          "Летом Азиз приехал к дедушке в кишлак.",
          "Дедушка сделал для него синего воздушного змея.",
          "Утром дул сильный ветер.",
          "Азиз побежал по полю, и змей поднялся высоко в небо.",
          "Вдруг верёвка выскользнула у него из рук.",
          "Змей зацепился за ветку старого тута.",
          "Дедушка взял лестницу и снял змея, а Азиз сказал: «Спасибо, бобо!»",
        ],
        questions: [
          { q: "Куда приехал Азиз?", options: ["К дедушке в кишлак", "В школу", "На море"], correct: 0, evidence: 0 },
          { q: "Какого цвета был змей?", options: ["Красного", "Синего", "Жёлтого"], correct: 1, evidence: 1 },
          { q: "Почему змей поднялся высоко?", options: ["Дул сильный ветер", "Шёл дождь", "Была ночь"], correct: 0, evidence: 2 },
          { q: "За что зацепился змей?", options: ["За крышу", "За ветку тута", "За провод"], correct: 1, evidence: 5 },
        ],
      },
      uz: {
        title: "Ko‘k varrak",
        sentences: [
          "Yozda Aziz qishloqqa, bobosinikiga keldi.",
          "Bobosi unga ko‘k varrak yasab berdi.",
          "Ertalab kuchli shamol esdi.",
          "Aziz dalada yugurdi, varrak esa osmonga baland ko‘tarildi.",
          "To‘satdan ip qo‘lidan chiqib ketdi.",
          "Varrak keksa tut daraxtining shoxiga ilinib qoldi.",
          "Bobosi narvon olib, varrakni tushirdi. Aziz: «Rahmat, bobojon!» — dedi.",
        ],
        questions: [
          { q: "Aziz qayerga keldi?", options: ["Qishloqqa, bobosinikiga", "Maktabga", "Dengizga"], correct: 0, evidence: 0 },
          { q: "Varrak qanday rangda edi?", options: ["Qizil", "Ko‘k", "Sariq"], correct: 1, evidence: 1 },
          { q: "Nega varrak baland ko‘tarildi?", options: ["Kuchli shamol esdi", "Yomg‘ir yog‘di", "Kechasi edi"], correct: 0, evidence: 2 },
          { q: "Varrak nimaga ilinib qoldi?", options: ["Tomga", "Tut shoxiga", "Simga"], correct: 1, evidence: 5 },
        ],
      },
      en: {
        title: "The Blue Kite",
        sentences: [
          "In summer, Aziz went to visit his grandpa in the village.",
          "Grandpa made him a blue kite.",
          "In the morning, a strong wind was blowing.",
          "Aziz ran across the field, and the kite flew high into the sky.",
          "Suddenly, the string slipped out of his hands.",
          "The kite got stuck on a branch of an old mulberry tree.",
          "Grandpa took a ladder and got the kite down. Aziz said, “Thank you, Grandpa!”",
        ],
        questions: [
          { q: "Where did Aziz go?", options: ["To his grandpa's village", "To school", "To the sea"], correct: 0, evidence: 0 },
          { q: "What colour was the kite?", options: ["Red", "Blue", "Yellow"], correct: 1, evidence: 1 },
          { q: "Why did the kite fly high?", options: ["A strong wind was blowing", "It was raining", "It was night"], correct: 0, evidence: 2 },
          { q: "Where did the kite get stuck?", options: ["On a roof", "On a mulberry branch", "On a wire"], correct: 1, evidence: 5 },
        ],
      },
    },
  },
  {
    id: "kitten",
    emoji: "🐱",
    text: {
      ru: {
        title: "Малика и котёнок",
        sentences: [
          "Малика шла из школы домой.",
          "Под скамейкой она услышала тихое «мяу».",
          "Там сидел маленький серый котёнок.",
          "Котёнок был голодный и дрожал от холода.",
          "Малика завернула его в свой шарф и принесла домой.",
          "Мама налила котёнку тёплого молока.",
          "Малика назвала котёнка Пахта, потому что он был мягкий, как хлопок.",
        ],
        questions: [
          { q: "Где Малика нашла котёнка?", options: ["На дереве", "Под скамейкой", "В школе"], correct: 1, evidence: 1 },
          { q: "Какого цвета был котёнок?", options: ["Серый", "Чёрный", "Белый"], correct: 0, evidence: 2 },
          { q: "Что сделала мама?", options: ["Прогнала котёнка", "Купила игрушку", "Налила тёплого молока"], correct: 2, evidence: 5 },
          { q: "Почему котёнка назвали Пахта?", options: ["Он любил молоко", "Он был мягкий, как хлопок", "Он был серый"], correct: 1, evidence: 6 },
        ],
      },
      uz: {
        title: "Malika va mushukcha",
        sentences: [
          "Malika maktabdan uyga qaytayotgan edi.",
          "Skameyka tagidan sekin «miyov» degan ovoz eshitildi.",
          "U yerda kichkina kulrang mushukcha o‘tirardi.",
          "Mushukcha och edi va sovuqdan titrardi.",
          "Malika uni sharfiga o‘rab, uyga olib keldi.",
          "Onasi mushukchaga iliq sut quyib berdi.",
          "Malika mushukchaga Paxta deb ism qo‘ydi, chunki u paxtadek yumshoq edi.",
        ],
        questions: [
          { q: "Malika mushukchani qayerdan topdi?", options: ["Daraxtdan", "Skameyka tagidan", "Maktabdan"], correct: 1, evidence: 1 },
          { q: "Mushukcha qanday rangda edi?", options: ["Kulrang", "Qora", "Oq"], correct: 0, evidence: 2 },
          { q: "Onasi nima qildi?", options: ["Mushukchani haydab yubordi", "O‘yinchoq sotib oldi", "Iliq sut quyib berdi"], correct: 2, evidence: 5 },
          { q: "Nega mushukchaning ismi Paxta?", options: ["U sutni yaxshi ko‘rardi", "U paxtadek yumshoq edi", "U kulrang edi"], correct: 1, evidence: 6 },
        ],
      },
      en: {
        title: "Malika and the Kitten",
        sentences: [
          "Malika was walking home from school.",
          "Under a bench, she heard a quiet “meow”.",
          "A small grey kitten was sitting there.",
          "The kitten was hungry and shaking with cold.",
          "Malika wrapped it in her scarf and took it home.",
          "Mum poured the kitten some warm milk.",
          "Malika named the kitten Pakhta, because it was as soft as cotton — “pakhta” means cotton in Uzbek.",
        ],
        questions: [
          { q: "Where did Malika find the kitten?", options: ["In a tree", "Under a bench", "At school"], correct: 1, evidence: 1 },
          { q: "What colour was the kitten?", options: ["Grey", "Black", "White"], correct: 0, evidence: 2 },
          { q: "What did Mum do?", options: ["Sent it away", "Bought a toy", "Gave it warm milk"], correct: 2, evidence: 5 },
          { q: "Why is the kitten called Pakhta?", options: ["It liked milk", "It was as soft as cotton", "It was grey"], correct: 1, evidence: 6 },
        ],
      },
    },
  },
  {
    id: "navruz",
    emoji: "🌷",
    text: {
      ru: {
        title: "Навруз и сумаляк",
        sentences: [
          "Весной наступил праздник Навруз.",
          "Вся махалля собралась готовить сумаляк.",
          "Бабушка Дильнозы мешала сумаляк большой деревянной ложкой.",
          "Его варили всю ночь, до самого утра.",
          "Дети пели песни и играли во дворе.",
          "Утром бабушка дала каждому по пиале сумаляка.",
          "Дильноза загадала желание и улыбнулась.",
        ],
        questions: [
          { q: "Какой праздник наступил?", options: ["Новый год", "Навруз", "День рождения"], correct: 1, evidence: 0 },
          { q: "Чем бабушка мешала сумаляк?", options: ["Деревянной ложкой", "Вилкой", "Палкой"], correct: 0, evidence: 2 },
          { q: "Сколько времени варили сумаляк?", options: ["Один час", "Всю ночь", "Неделю"], correct: 1, evidence: 3 },
          { q: "Что делали дети?", options: ["Спали", "Смотрели мультфильмы", "Пели песни и играли"], correct: 2, evidence: 4 },
        ],
      },
      uz: {
        title: "Navro‘z va sumalak",
        sentences: [
          "Bahorda Navro‘z bayrami keldi.",
          "Butun mahalla sumalak pishirish uchun yig‘ildi.",
          "Dilnozaning buvisi sumalakni katta yog‘och cho‘mich bilan aralashtirdi.",
          "Sumalak tun bo‘yi, tonggacha qaynadi.",
          "Bolalar hovlida qo‘shiq aytib, o‘ynashdi.",
          "Ertalab buvisi hammaga bir piyoladan sumalak berdi.",
          "Dilnoza niyat qildi va jilmaydi.",
        ],
        questions: [
          { q: "Qaysi bayram keldi?", options: ["Yangi yil", "Navro‘z", "Tug‘ilgan kun"], correct: 1, evidence: 0 },
          { q: "Buvisi sumalakni nima bilan aralashtirdi?", options: ["Yog‘och cho‘mich bilan", "Sanchqi bilan", "Tayoq bilan"], correct: 0, evidence: 2 },
          { q: "Sumalak qancha vaqt qaynadi?", options: ["Bir soat", "Tun bo‘yi", "Bir hafta"], correct: 1, evidence: 3 },
          { q: "Bolalar nima qilishdi?", options: ["Uxlashdi", "Multfilm ko‘rishdi", "Qo‘shiq aytib, o‘ynashdi"], correct: 2, evidence: 4 },
        ],
      },
      en: {
        title: "Navruz and Sumalak",
        sentences: [
          "In spring, the Navruz holiday came.",
          "The whole neighbourhood gathered to cook sumalak.",
          "Dilnoza's grandma stirred the sumalak with a big wooden spoon.",
          "It cooked all night, until the morning.",
          "The children sang songs and played in the yard.",
          "In the morning, Grandma gave everyone a bowl of sumalak.",
          "Dilnoza made a wish and smiled.",
        ],
        questions: [
          { q: "Which holiday came?", options: ["New Year", "Navruz", "A birthday"], correct: 1, evidence: 0 },
          { q: "What did Grandma stir the sumalak with?", options: ["A wooden spoon", "A fork", "A stick"], correct: 0, evidence: 2 },
          { q: "How long did the sumalak cook?", options: ["One hour", "All night", "A week"], correct: 1, evidence: 3 },
          { q: "What did the children do?", options: ["Slept", "Watched cartoons", "Sang songs and played"], correct: 2, evidence: 4 },
        ],
      },
    },
  },
];
