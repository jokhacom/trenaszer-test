// В артефакте Claude был доступен window.storage (хранилище, привязанное к
// вашему аккаунту Claude). В обычном сайте на Vercel такого API нет — поэтому
// здесь эмулируем тот же интерфейс через localStorage браузера.
//
// Важно понимать ограничение: это ХРАНИЛИЩЕ ОДНОГО БРАУЗЕРА. Если сотрудник
// откроет сайт с телефона и с компьютера — это будут две разные истории.
// И "общий" рейтинг (leaderboard) на самом деле не общий — каждый видит только
// то, что сохранилось в его собственном браузере. Чтобы рейтинг был по-настоящему
// общим для всех сотрудников, нужна настоящая база данных (см. проект gco-trainer
// с Supabase — там это уже решено правильно).

const PREFIX = "gco_demo_storage:";

function fullKey(key, shared) {
  return PREFIX + (shared ? "shared:" : "personal:") + key;
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(fullKey(key, shared));
      if (raw === null) throw new Error("Key not found: " + key);
      return { key, value: raw, shared };
    },
    async set(key, value, shared = false) {
      localStorage.setItem(fullKey(key, shared), value);
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      localStorage.removeItem(fullKey(key, shared));
      return { key, deleted: true, shared };
    },
    async list(prefix = "", shared = false) {
      const base = PREFIX + (shared ? "shared:" : "personal:");
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(base + prefix))
        .map((k) => k.slice(base.length));
      return { keys, prefix, shared };
    },
  };
}
