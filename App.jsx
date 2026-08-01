import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, Flame, Sparkles, Moon, Sun, ChevronRight, Clock, Check, X, Award, BarChart3, Home } from "lucide-react";

// ---------- MOCK QUESTION BANK ----------
// In production these come from AI analysis of uploaded docs (PDF/DOCX/TXT).
// Placeholder content below stands in for that — replace via admin panel.
// Тематика: ответы в соцсетях (комментарии, директ) и на отзывы в Play Market / App Store.
const BANK = {
  beginner: {
    mc: [
      { q: "Как правильно ответить на негативный комментарий в соцсетях?", options: ["Удалить комментарий, не отвечая", "Спокойно признать проблему и предложить решение", "Ответить в том же резком тоне", "Игнорировать, если у комментария мало лайков"], correct: 1 },
      { q: "Пользователь оставил отзыв «1 звезда» в Play Market без текста. Что делать?", options: ["Ничего не отвечать — текста нет", "Вежливо уточнить, что именно не понравилось", "Пожаловаться на отзыв в поддержку сторов", "Написать пользователю в личные сообщения без публичного ответа"], correct: 1 },
      { q: "В течение какого времени по регламенту нужно отвечать на комментарии в соцсетях?", options: ["В течение нескольких часов по регламенту компании", "В течение недели", "Регламент не определён", "Только по будням до обеда"], correct: 0 },
      { q: "Что НЕЛЬЗЯ делать при ответе на отзыв в App Store?", options: ["Благодарить за отзыв", "Спорить и переходить на личности", "Извиняться за неудобства", "Предлагать написать в поддержку для решения"], correct: 1 },
      { q: "Что является приоритетом при первом ответе на негативный отзыв в сторе?", options: ["Скорость закрытия обращения любой ценой", "Показать, что компания услышала пользователя, и предложить помощь", "Убедить пользователя удалить отзыв", "Ответить шаблоном без учёта сути жалобы"], correct: 1 },
    ],
    open: [
      { q: "Опишите своими словами, как правильно поблагодарить пользователя за позитивный отзыв.", keywords: ["спасибо", "благодар", "приятно", "рады", "оценка"] },
      { q: "Почему важно отвечать на все отзывы в сторах, а не только на негативные?", keywords: ["внимание", "репутация", "лояльн", "все пользователи", "имидж"] },
      { q: "Что делать, если пользователь написал в директ соцсетей с жалобой на баг в приложении?", keywords: ["уточнить", "версия", "скриншот", "эскалац", "техническ"] },
      { q: "Как объяснить пользователю простыми словами, что обновление приложения решит его проблему?", keywords: ["просто", "обновит", "понятно", "магазин приложений", "шаг"] },
      { q: "Почему важно использовать единый стиль общения бренда (tone of voice) во всех соцсетях?", keywords: ["узнаваем", "единый стиль", "доверие", "бренд", "последовательн"] },
    ],
  },
  middle: {
    mc: [
      { q: "Пользователь оставил отзыв с нецензурной лексикой, но по существу проблемы. Ваши действия?", options: ["Проигнорировать весь отзыв из-за лексики", "Ответить по существу проблемы, сохраняя вежливый тон", "Пожаловаться на отзыв в стор без ответа", "Ответить такой же резкой лексикой"], correct: 1 },
      { q: "Что важнее при ответе на отзыв с низкой оценкой в App Store?", options: ["Скорость ответа любой ценой", "Разобраться в сути проблемы и предложить конкретное решение", "Формальный шаблонный ответ", "Попросить пользователя удалить отзыв"], correct: 1 },
      { q: "Пользователь жалуется в комментариях на списание денег внутри приложения. Что делать?", options: ["Обсуждать детали платежа публично в комментариях", "Попросить написать в поддержку/директ для проверки платежа", "Игнорировать финансовые жалобы", "Пообещать возврат без проверки"], correct: 1 },
      { q: "Какой показатель лучше всего отражает качество работы с отзывами и комментариями?", options: ["Количество удалённых негативных комментариев", "Динамика рейтинга и доля отвеченных обращений", "Скорость закрытия тикета без анализа сути", "Число заблокированных пользователей"], correct: 1 },
      { q: "Что делать, если в разных отзывах повторяется жалоба на один и тот же баг?", options: ["Отвечать каждому одинаковым шаблоном без эскалации", "Зафиксировать как системную проблему и передать в техническую команду", "Отказать в рассмотрении повторных жалоб", "Удалить повторяющиеся отзывы"], correct: 1 },
    ],
    open: [
      { q: "Опишите алгоритм ответа на отзыв, в котором пользователь обвиняет компанию в мошенничестве.", keywords: ["спокойств", "факты", "уточнить", "поддержка", "разобраться"] },
      { q: "Как отличить реальную проблему пользователя от накрученного/фейкового отзыва?", keywords: ["детали", "проверить", "конкретика", "паттерн", "аккаунт"] },
      { q: "Почему технические жалобы из соцсетей важно передавать в отдельную команду разработки?", keywords: ["специалист", "исправлен", "баг", "эскалац", "компетенц"] },
      { q: "Как убедить пользователя изменить оценку в сторе после решения его проблемы?", keywords: ["вежливо", "попросить", "после решения", "обновить отзыв", "не давить"] },
      { q: "Что означает «работа с репутацией бренда» в социальных сетях и сторах на практике?", keywords: ["рейтинг", "доверие", "публичн", "имидж", "своевременн"] },
    ],
  },
  professional: {
    mc: [
      { q: "После обновления приложения — волна негативных отзывов и комментариев. Что приоритетно?", options: ["Удалять негативные отзывы одинаково для всех", "Признать проблему публично, дать статус и сроки исправления", "Отвечать только на самые заметные отзывы", "Молчать до выхода фикса"], correct: 1 },
      { q: "Какая метрика лучше всего показывает системную проблему приложения, а не единичный случай?", options: ["Один резкий комментарий в соцсетях", "Рост однотипных жалоб/отзывов за короткий период", "Личное мнение сотрудника поддержки", "Случайный негативный отзыв конкурента"], correct: 1 },
      { q: "Сотрудник ответил пользователю в соцсети некорректно, задев его публично. Правильное действие?", options: ["Оставить как есть, если пользователь не пожаловался дальше", "Связаться с пользователем, извиниться и скорректировать ответ", "Удалить комментарий пользователя, чтобы скрыть ситуацию", "Заблокировать пользователя"], correct: 1 },
      { q: "Жалоба пользователя касается юридического вопроса (возврат средств, персональные данные). Как поступить?", options: ["Ответить самостоятельно без согласования", "Эскалировать по установленному процессу с объяснением пользователю сроков", "Проигнорировать как не относящееся к соцсетям", "Удалить обращение"], correct: 1 },
      { q: "Что отличает эксперта ГЦО в работе с отзывами и соцсетями от новичка?", options: ["Скорость ответа любой ценой без анализа", "Умение видеть системные проблемы за отдельными отзывами и предлагать решения", "Строгое использование только шаблонных фраз", "Полное игнорирование негативных отзывов"], correct: 1 },
    ],
    open: [
      { q: "Опишите свои действия при массовом падении рейтинга приложения в сторах после релиза.", keywords: ["анализ", "приоритет", "коммуникац", "статус", "команда разработки"] },
      { q: "Как выявить системный баг по потоку однотипных отзывов и комментариев?", keywords: ["паттерн", "статистика", "анализ", "версия приложения", "причина"] },
      { q: "Приведите пример нестандартного ответа, который сохраняет лояльность резко недовольного пользователя.", keywords: ["индивидуальн", "решение", "компенсац", "лояльн", "внимание"] },
      { q: "Как обучать менее опытных модераторов соцсетей на основе разбора реальных кейсов?", keywords: ["пример", "разбор", "наставник", "делиться опыт", "обучение"] },
      { q: "Почему баланс между скоростью ответа и качеством важен в публичных каналах (соцсети, сторы)?", keywords: ["баланс", "скорость", "качество", "публичн", "репутация"] },
    ],
  },
};

const ACHIEVEMENTS = [
  { id: "first", label: "Первый тест", icon: "🏆", check: (h) => h.length >= 1 },
  { id: "streak10", label: "10 тестов подряд", icon: "🔥", check: (h) => h.length >= 10 },
  { id: "perfect", label: "Без ошибок", icon: "✨", check: (h) => h.some((r) => r.candies === 100) },
  { id: "expert", label: "Эксперт ГЦО", icon: "👑", check: (h) => h.some((r) => r.level === "professional" && r.candies >= 95) },
];

const LEVEL_META = {
  beginner: { title: "Новичок", emoji: "🟢", color: "#00E5A0" },
  middle: { title: "Middle", emoji: "🟡", color: "#FFC93C" },
  professional: { title: "Professional", emoji: "🔴", color: "#FF6FA5" },
  exam: { title: "Итоговый экзамен (KPI)", emoji: "🎓", color: "#7C4DFF" },
};

function buildQuestions(levelKey) {
  if (levelKey !== "exam") {
    const pool = BANK[levelKey];
    return {
      mc: shuffle(pool.mc).slice(0, 5),
      open: shuffle(pool.open).slice(0, 5),
    };
  }
  // Exam: 3 beginner + 3 middle + 4 professional, mixed into 5 MC + 5 open
  const all = [
    ...shuffle(BANK.beginner.mc).slice(0, 1).map((x) => ({ ...x, tag: "beginner" })),
    ...shuffle(BANK.beginner.open).slice(0, 2).map((x) => ({ ...x, tag: "beginner" })),
    ...shuffle(BANK.middle.mc).slice(0, 2).map((x) => ({ ...x, tag: "middle" })),
    ...shuffle(BANK.middle.open).slice(0, 1).map((x) => ({ ...x, tag: "middle" })),
    ...shuffle(BANK.professional.mc).slice(0, 2).map((x) => ({ ...x, tag: "professional" })),
    ...shuffle(BANK.professional.open).slice(0, 2).map((x) => ({ ...x, tag: "professional" })),
  ];
  return {
    mc: all.filter((x) => x.options).slice(0, 5),
    open: all.filter((x) => x.keywords).slice(0, 5),
  };
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// AI grading via Claude API — evaluates open answers for correctness, spelling, grammar.
async function gradeOpenAnswer(question, expectedKeywords, userAnswer) {
  if (!userAnswer || !userAnswer.trim()) {
    return { correct: false, spelling: 0, grammar: 0, comment: "Ответ не был дан вовремя." };
  }
  try {
    const prompt = `Ты — проверяющий ИИ корпоративной обучающей платформы. Оцени ответ сотрудника на открытый вопрос.
Вопрос: "${question}"
Ожидаемые смысловые темы (не обязательно дословно): ${expectedKeywords.join(", ")}
Ответ сотрудника: "${userAnswer}"

Оцени:
1) correct: true, если ответ по смыслу правильный и достаточно полный (не требуй точного совпадения слов, принимай перефразированный правильный ответ), иначе false.
2) spelling: количество орфографических ошибок в ответе (целое число).
3) grammar: количество грамматических ошибок в ответе (целое число).
4) comment: короткий (одно предложение) дружелюбный комментарий на русском.

Ответь СТРОГО в формате JSON без каких-либо пояснений, без markdown, без обратных кавычек:
{"correct": true/false, "spelling": 0, "grammar": 0, "comment": "..."}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.content.map((b) => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      correct: !!parsed.correct,
      spelling: Number(parsed.spelling) || 0,
      grammar: Number(parsed.grammar) || 0,
      comment: parsed.comment || "",
    };
  } catch (e) {
    // Fallback: simple keyword match if the API call fails
    const lower = userAnswer.toLowerCase();
    const hit = expectedKeywords.some((k) => lower.includes(k.toLowerCase()));
    return { correct: hit, spelling: 0, grammar: 0, comment: "Проверено локально (ИИ недоступен)." };
  }
}

function ResultLabel(candies) {
  if (candies >= 95) return { text: "Эксперт", color: "#7C4DFF" };
  if (candies >= 85) return { text: "Отлично", color: "#00E5A0" };
  if (candies >= 70) return { text: "Хорошо", color: "#FFC93C" };
  if (candies >= 50) return { text: "Нужно повторить материал", color: "#FF9A3C" };
  return { text: "Требуется обучение", color: "#FF5D6C" };
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [name, setName] = useState("");
  const [screen, setScreen] = useState("welcome"); // welcome | levels | quiz | grading | results | leaderboard | admin
  const [levelKey, setLevelKey] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [step, setStep] = useState(0); // index across mc(0-4) then open(5-9)
  const [mcAnswers, setMcAnswers] = useState([]);
  const [openAnswers, setOpenAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [grading, setGrading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const dark = theme === "dark";

  // Load personal history on name set
  useEffect(() => {
    if (!name) return;
    (async () => {
      try {
        const res = await window.storage.get(`history:${name}`);
        setHistory(res ? JSON.parse(res.value) : []);
      } catch {
        setHistory([]);
      }
    })();
  }, [name]);

  const saveHistory = useCallback(
    async (entry) => {
      const updated = [...history, entry];
      setHistory(updated);
      try {
        await window.storage.set(`history:${name}`, JSON.stringify(updated));
        await window.storage.set(
          `leaderboard:${name}`,
          JSON.stringify({
            name,
            tests: updated.length,
            avg: Math.round(updated.reduce((a, r) => a + r.candies, 0) / updated.length),
            best: Math.max(...updated.map((r) => r.candies)),
          }),
          true
        );
      } catch {
        /* storage unavailable — continue silently */
      }
    },
    [history, name]
  );

  function startLevel(key) {
    setLevelKey(key);
    setQuestions(buildQuestions(key));
    setMcAnswers([]);
    setOpenAnswers([]);
    setStep(0);
    setScreen("quiz");
  }

  // Timer for open questions
  useEffect(() => {
    if (screen !== "quiz" || !questions || step < 5) return;
    setTimeLeft(60);
    if (inputRef.current) inputRef.current.value = "";
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submitOpen(inputRef.current ? inputRef.current.value : "");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, screen]);

  function submitMc(optionIdx) {
    const q = questions.mc[step];
    const correct = optionIdx === q.correct;
    setMcAnswers((a) => [...a, { correct }]);
    setStep((s) => s + 1);
  }

  async function submitOpen(text) {
    clearInterval(timerRef.current);
    const q = questions.open[step - 5];
    setOpenAnswers((a) => [...a, { text, question: q.q, keywords: q.keywords }]);
    if (step - 5 === 4) {
      // last open question — go grade everything
      finishQuiz([...openAnswers, { text, question: q.q, keywords: q.keywords }]);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function finishQuiz(finalOpen) {
    setScreen("grading");
    setGrading(true);
    const graded = [];
    for (const oa of finalOpen) {
      const g = await gradeOpenAnswer(oa.question, oa.keywords, oa.text);
      graded.push({ ...oa, ...g });
    }
    let candies = 100;
    const mcWrong = mcAnswers.filter((a) => !a.correct).length;
    candies -= mcWrong * 5;
    graded.forEach((g) => {
      if (!g.correct) candies -= 5;
      candies -= g.spelling;
      candies -= g.grammar;
    });
    candies = Math.max(0, candies);

    const result = {
      level: levelKey,
      candies,
      mcCorrect: 5 - mcWrong,
      openGraded: graded,
      date: new Date().toISOString(),
    };
    setLastResult(result);
    await saveHistory(result);

    const updatedHistory = [...history, result];
    const earned = ACHIEVEMENTS.filter((a) => a.check(updatedHistory));
    setNewAchievements(earned.map((a) => a.id));

    setGrading(false);
    setScreen("results");
  }

  const bg = dark
    ? "linear-gradient(160deg,#1B0B2E 0%,#2A0F45 45%,#1B0B2E 100%)"
    : "linear-gradient(160deg,#F6F0FF 0%,#FDEBF3 50%,#F6F0FF 100%)";
  const cardBg = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)";
  const cardBorder = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.8)";
  const textMain = dark ? "#F3EBFF" : "#2D1B4E";
  const textMuted = dark ? "#B7A6D9" : "#6E5A93";

  const glass = {
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderRadius: 24,
    boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(124,77,255,0.12)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: textMain,
        fontFamily: "'Nunito', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');
        .display-font { font-family: 'Baloo 2', 'Nunito', sans-serif; }
        .float-candy { position:absolute; opacity:0.15; animation: floatY 8s ease-in-out infinite; pointer-events:none; }
        @keyframes floatY { 0%,100%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-24px) rotate(12deg);} }
        .pop-in { animation: popIn .4s cubic-bezier(.34,1.56,.64,1); }
        @keyframes popIn { 0%{transform:scale(0.7); opacity:0;} 100%{transform:scale(1); opacity:1;} }
        .btn-primary { transition: transform .15s ease, box-shadow .15s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124,77,255,0.35); }
        .btn-primary:active { transform: translateY(0); }
        .option-btn { transition: all .15s ease; }
        .option-btn:hover { transform: translateX(4px); }
        ::-webkit-scrollbar { width: 6px; }
      `}</style>

      {/* floating candy decorations */}
      {["🍬", "🍭", "🍫", "🧁"].map((c, i) => (
        <div key={i} className="float-candy" style={{ fontSize: 40 + i * 8, top: `${10 + i * 20}%`, left: `${5 + i * 22}%`, animationDelay: `${i * 1.3}s` }}>
          {c}
        </div>
      ))}

      {/* top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 720, margin: "0 auto 16px", position: "relative", zIndex: 2 }}>
        <div className="display-font" style={{ fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          🍬 Тренажер знаний ГЦО
        </div>
        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          style={{ ...glass, padding: 8, borderRadius: 999, cursor: "pointer", color: textMain, display: "flex" }}
          aria-label="Переключить тему"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {screen === "welcome" && (
          <div style={{ ...glass, padding: 40, textAlign: "center" }} className="pop-in">
            <div style={{ fontSize: 56, marginBottom: 8 }}>🍭</div>
            <h1 className="display-font" style={{ fontSize: 30, margin: "0 0 8px", fontWeight: 800 }}>
              Добро пожаловать!
            </h1>
            <p style={{ color: textMuted, marginBottom: 24 }}>Введите имя, чтобы начать обучение</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 16,
                border: `1px solid ${cardBorder}`,
                background: dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.7)",
                color: textMain,
                fontSize: 16,
                marginBottom: 20,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              disabled={!name.trim()}
              onClick={() => setScreen("levels")}
              className="btn-primary display-font"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg,#FF6FA5,#7C4DFF)",
                color: "white",
                fontWeight: 700,
                fontSize: 16,
                cursor: name.trim() ? "pointer" : "not-allowed",
                opacity: name.trim() ? 1 : 0.5,
              }}
            >
              Начать обучение →
            </button>
          </div>
        )}

        {screen === "levels" && (
          <div className="pop-in">
            <div style={{ ...glass, padding: 24, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: textMuted, fontSize: 13 }}>Сотрудник</div>
                <div className="display-font" style={{ fontSize: 20, fontWeight: 800 }}>{name}</div>
              </div>
              <button onClick={() => setScreen("leaderboard")} style={{ ...glass, padding: "8px 14px", border: "none", cursor: "pointer", color: textMain, display: "flex", gap: 6, alignItems: "center" }}>
                <Trophy size={16} /> Рейтинг
              </button>
            </div>

            {Object.entries(LEVEL_META).map(([key, meta]) => (
              <div
                key={key}
                onClick={() => startLevel(key)}
                className="option-btn"
                style={{ ...glass, padding: 20, marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
              >
                <div style={{ fontSize: 32 }}>{meta.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="display-font" style={{ fontWeight: 800, fontSize: 18 }}>{meta.title}</div>
                  <div style={{ color: textMuted, fontSize: 13 }}>10 вопросов · 15 минут · до 100 🍬</div>
                </div>
                <ChevronRight color={meta.color} />
              </div>
            ))}
          </div>
        )}

        {screen === "quiz" && questions && (
          <div className="pop-in">
            <div style={{ ...glass, padding: "12px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[...Array(10)].map((_, i) => (
                  <div key={i} style={{ width: 22, height: 6, borderRadius: 4, background: i < step ? "#00E5A0" : i === step ? "#FF6FA5" : dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
                ))}
              </div>
              <div style={{ color: textMuted, fontSize: 13 }}>{step + 1} / 10</div>
            </div>

            {step < 5 ? (
              <div style={{ ...glass, padding: 28 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>ВОПРОС С ВАРИАНТОМ ОТВЕТА</div>
                <div className="display-font" style={{ fontSize: 19, fontWeight: 700, marginBottom: 20 }}>{questions.mc[step].q}</div>
                {questions.mc[step].options.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => submitMc(i)}
                    className="option-btn"
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      marginBottom: 10,
                      cursor: "pointer",
                      background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
                      border: `1px solid ${cardBorder}`,
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...glass, padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: textMuted }}>ОТКРЫТЫЙ ВОПРОС</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: timeLeft <= 10 ? "#FF5D6C" : textMuted, fontWeight: 700 }}>
                    <Clock size={14} /> {timeLeft}с
                  </div>
                </div>
                <div className="display-font" style={{ fontSize: 19, fontWeight: 700, marginBottom: 16 }}>{questions.open[step - 5].q}</div>
                <textarea
                  ref={inputRef}
                  rows={5}
                  placeholder="Напишите ваш ответ..."
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 14,
                    border: `1px solid ${cardBorder}`,
                    background: dark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.7)",
                    color: textMain,
                    fontSize: 15,
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={() => submitOpen(inputRef.current.value)}
                  className="btn-primary display-font"
                  style={{ marginTop: 14, width: "100%", padding: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C4DFF,#FF6FA5)", color: "white", fontWeight: 700, cursor: "pointer" }}
                >
                  Ответить →
                </button>
              </div>
            )}
          </div>
        )}

        {screen === "grading" && (
          <div style={{ ...glass, padding: 40, textAlign: "center" }} className="pop-in">
            <div style={{ fontSize: 44, marginBottom: 12 }}>🤖</div>
            <div className="display-font" style={{ fontWeight: 700, fontSize: 18 }}>ИИ проверяет ваши ответы...</div>
            <div style={{ color: textMuted, marginTop: 8 }}>Анализируем смысл, орфографию и грамматику</div>
          </div>
        )}

        {screen === "results" && lastResult && (
          <div className="pop-in">
            <div style={{ ...glass, padding: 32, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 50 }}>🎉</div>
              <div className="display-font" style={{ fontSize: 40, fontWeight: 800, color: ResultLabel(lastResult.candies).color }}>
                {lastResult.candies} 🍬
              </div>
              <div className="display-font" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{ResultLabel(lastResult.candies).text}</div>
              <div style={{ color: textMuted, marginTop: 6 }}>
                {LEVEL_META[lastResult.level].title} · {lastResult.mcCorrect}/5 тестовых верно
              </div>

              {newAchievements.length > 0 && (
                <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  {newAchievements.map((id) => {
                    const a = ACHIEVEMENTS.find((x) => x.id === id);
                    return (
                      <div key={id} style={{ ...glass, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <span>{a.icon}</span> {a.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
              <div className="display-font" style={{ fontWeight: 700, marginBottom: 12 }}>Комментарии ИИ по открытым ответам</div>
              {lastResult.openGraded.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: i ? `1px solid ${cardBorder}` : "none" }}>
                  {g.correct ? <Check size={16} color="#00E5A0" style={{ marginTop: 3 }} /> : <X size={16} color="#FF5D6C" style={{ marginTop: 3 }} />}
                  <div style={{ fontSize: 13, color: textMuted }}>{g.comment}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setScreen("levels")} className="btn-primary display-font" style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C4DFF,#FF6FA5)", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Home size={16} /> К уровням
              </button>
              <button onClick={() => setScreen("leaderboard")} style={{ ...glass, flex: 1, padding: 14, border: "none", cursor: "pointer", color: textMain, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Trophy size={16} /> Рейтинг
              </button>
            </div>
          </div>
        )}

        {screen === "leaderboard" && <Leaderboard glass={glass} textMuted={textMuted} onBack={() => setScreen("levels")} dark={dark} />}
      </div>
    </div>
  );
}

function Leaderboard({ glass, textMuted, onBack, dark }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await window.storage.list("leaderboard:", true);
        const entries = [];
        for (const key of list?.keys || []) {
          try {
            const r = await window.storage.get(key, true);
            if (r) entries.push(JSON.parse(r.value));
          } catch {}
        }
        entries.sort((a, b) => b.best - a.best);
        setRows(entries);
      } catch {
        setRows([]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="pop-in">
      <div style={{ ...glass, padding: 24 }}>
        <div className="display-font" style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Trophy size={20} color="#FFC93C" /> Таблица лидеров
        </div>
        <div style={{ color: textMuted, fontSize: 12, marginBottom: 16 }}>Видна всем сотрудникам</div>

        {loading && <div style={{ color: textMuted }}>Загрузка...</div>}
        {!loading && rows.length === 0 && <div style={{ color: textMuted }}>Пока никто не прошел тест. Будьте первым!</div>}

        {rows.map((r, i) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? `1px solid rgba(255,255,255,0.1)` : "none" }}>
            <div style={{ width: 24, textAlign: "center", fontWeight: 800 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
            <div style={{ flex: 1, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 13, color: textMuted }}>{r.tests} тестов</div>
            <div style={{ fontWeight: 800 }}>{r.best} 🍬</div>
          </div>
        ))}

        <button onClick={onBack} className="btn-primary display-font" style={{ marginTop: 20, width: "100%", padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C4DFF,#FF6FA5)", color: "white", fontWeight: 700, cursor: "pointer" }}>
          Назад
        </button>
      </div>
    </div>
  );
}
