import { describe, it, expect } from "vitest";
import { summarizeBank, formatKc } from "@/lib/domain/bank";
import { bankEntrySchema } from "@/lib/validation/bank";

const NBSP = " ";

describe("summarizeBank", () => {
  it("empty bank → 0 / 0", () => {
    expect(summarizeBank([])).toEqual({ totalProfit: 0, unrealized: 0 });
  });

  it("potential equal to profit → unrealized 0", () => {
    expect(
      summarizeBank([
        { profit: 500, potential: 500 },
        { profit: 250, potential: 250 },
      ]),
    ).toEqual({ totalProfit: 750, unrealized: 0 });
  });

  it("mixed entries → sums profit and the unrealized remainder", () => {
    expect(
      summarizeBank([
        { profit: 1000, potential: 1500 },
        { profit: 200, potential: 200 },
        { profit: 0, potential: 300 },
      ]),
    ).toEqual({ totalProfit: 1200, unrealized: 800 });
  });
});

describe("formatKc", () => {
  it("groups a 4+ digit number with a non-breaking space", () => {
    expect(formatKc(1250)).toBe(`1${NBSP}250 Kč`);
    expect(formatKc(1234567)).toBe(`1${NBSP}234${NBSP}567 Kč`);
  });

  it("formats zero without grouping", () => {
    expect(formatKc(0)).toBe("0 Kč");
  });

  it("renders negative amounts with a leading minus, grouping the magnitude", () => {
    expect(formatKc(-1250)).toBe(`-1${NBSP}250 Kč`);
    expect(formatKc(-5)).toBe("-5 Kč");
    expect(formatKc(-1234567)).toBe(`-1${NBSP}234${NBSP}567 Kč`);
  });
});

describe("bankEntrySchema", () => {
  it("defaults an omitted potential to the profit", () => {
    const r = bankEntrySchema.safeParse({ mission: "Mise A", profit: 500 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.potential).toBe(500);
  });

  it("accepts a negative profit (a mission can lose money)", () => {
    const r = bankEntrySchema.safeParse({
      mission: "Mise A",
      profit: -1250,
      potential: 0,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.profit).toBe(-1250);
      expect(r.data.potential).toBe(0);
    }
  });

  it("defaults potential to a negative profit when potential is blank", () => {
    const r = bankEntrySchema.safeParse({ mission: "Mise A", profit: -300 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.profit).toBe(-300);
      expect(r.data.potential).toBe(-300);
    }
  });

  it("rejects a negative potential lower than a negative profit", () => {
    const r = bankEntrySchema.safeParse({
      mission: "Mise A",
      profit: -100,
      potential: -200,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["potential"]);
      expect(r.error.issues[0].message).toMatch(/nižší než zisk/);
    }
  });

  it("rejects a potential lower than the profit", () => {
    const r = bankEntrySchema.safeParse({
      mission: "Mise A",
      profit: 500,
      potential: 100,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["potential"]);
      expect(r.error.issues[0].message).toMatch(/nižší než zisk/);
    }
  });

  it("rejects a blank/empty profit instead of coercing it to 0", () => {
    for (const profit of ["", "  ", undefined, null]) {
      const r = bankEntrySchema.safeParse({ mission: "Mise A", profit });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0].path).toEqual(["profit"]);
        expect(r.error.issues[0].message).toBe("Zadejte zisk.");
      }
    }
  });

  it("rejects an empty mission", () => {
    expect(
      bankEntrySchema.safeParse({ mission: "  ", profit: 0 }).success,
    ).toBe(false);
  });
});
