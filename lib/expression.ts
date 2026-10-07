// Tiny safe arithmetic parser: digits, + - * / ( ) and the school signs × · : ÷.
// Used to check AI answers and to recognise plain examples like "35 + 27".

type Tok = { t: "num"; v: number } | { t: "op"; v: string };

function normalize(src: string): string {
  return src
    .replace(/[×xх·*]/gi, "*")
    .replace(/[:÷/]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "");
}

function tokenize(src: string): Tok[] | null {
  const s = normalize(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\d/.test(c)) {
      let j = i;
      while (j < s.length && /[\d.,]/.test(s[j])) j++;
      const v = Number(s.slice(i, j).replace(",", "."));
      if (Number.isNaN(v)) return null;
      out.push({ t: "num", v });
      i = j;
    } else if ("+-*/()".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      return null;
    }
  }
  return out;
}

export function evaluate(src: string): number | null {
  const parsed = tokenize(src);
  if (!parsed || parsed.length === 0) return null;
  const toks: Tok[] = parsed;
  let p = 0;
  const peek = () => toks[p];
  function primary(): number | null {
    const tk = toks[p++];
    if (!tk) return null;
    if (tk.t === "num") return tk.v;
    if (tk.v === "(") {
      const v = sum();
      if (v === null || peek()?.v !== ")") return null;
      p++;
      return v;
    }
    if (tk.v === "-") {
      const v = primary();
      return v === null ? null : -v;
    }
    return null;
  }
  function product(): number | null {
    let v = primary();
    while (v !== null && (peek()?.v === "*" || peek()?.v === "/")) {
      const op = toks[p++].v;
      const r = primary();
      if (r === null) return null;
      if (op === "/" && r === 0) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function sum(): number | null {
    let v = product();
    while (v !== null && (peek()?.v === "+" || peek()?.v === "-")) {
      const op = toks[p++].v;
      const r = product();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const v = sum();
  return p === toks.length ? v : null;
}

/** Recognises a plain two-number example like "35 + 27 = ?" or "24 : 4". */
export function parseSimpleExample(
  text: string,
): { a: number; b: number; op: "+" | "-" | "*" | "/" } | null {
  const s = normalize(text).replace(/=\??$/, "").replace(/\?$/, "");
  const m = s.match(/^(\d{1,3})([+\-*/])(\d{1,3})$/);
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[3]), op: m[2] as "+" | "-" | "*" | "/" };
}
