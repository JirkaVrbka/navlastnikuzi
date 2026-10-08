import { describe, it, expect } from "vitest";
import { propSchema } from "@/lib/validation/props";

describe("propSchema", () => {
  it("accepts a valid prop", () => {
    const r = propSchema.safeParse({
      name: "Pohár",
      count: 3,
      haveIt: true,
      note: "ve skladu",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Pohár");
      expect(r.data.count).toBe(3);
      expect(r.data.haveIt).toBe(true);
    }
  });

  it("coerces a string count to a number", () => {
    const r = propSchema.safeParse({
      name: "Svíce",
      count: "7",
      haveIt: false,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.count).toBe(7);
  });

  it("rejects a negative count", () => {
    const r = propSchema.safeParse({ name: "Maska", count: -1, haveIt: false });
    expect(r.success).toBe(false);
  });

  it("rejects a non-integer count", () => {
    const r = propSchema.safeParse({
      name: "Maska",
      count: 2.5,
      haveIt: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects a missing / blank name", () => {
    expect(propSchema.safeParse({ count: 1, haveIt: false }).success).toBe(
      false,
    );
    expect(
      propSchema.safeParse({ name: "   ", count: 1, haveIt: false }).success,
    ).toBe(false);
  });
});
