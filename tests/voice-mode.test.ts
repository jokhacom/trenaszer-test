import { describe, expect, it } from "vitest";
import { forReading } from "@/lib/speech";

describe("voice mode reads what a person sees", () => {
  it("drops pictures and marks, keeps math signs and Uzbek letters", () => {
    expect(forReading("✓ Javobni bermaydi → 📧 8 + 5 − 2 × 3 = ? 🇺🇿")).toBe("Javobni bermaydi 8 + 5 − 2 × 3 = ?");
    expect(forReading("👨‍👩‍👧 Ota-onalar uchun   hisobot")).toBe("Ota-onalar uchun hisobot");
    expect(forReading("O‘zbek, g‘isht")).toBe("O‘zbek, g‘isht");
  });
});
