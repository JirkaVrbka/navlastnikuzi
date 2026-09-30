import { describe, it, expect } from "vitest";
import { loginSchema, createUserSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const r = loginSchema.safeParse({ email: "a@b.cz", password: "x" });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const r = loginSchema.safeParse({ email: "a@b.cz", password: "" });
    expect(r.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts a valid organizer", () => {
    const r = createUserSchema.safeParse({
      email: "org@b.cz",
      password: "12345678",
      role: "organizer",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const r = createUserSchema.safeParse({
      email: "org@b.cz",
      password: "short",
      role: "organizer",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown role", () => {
    const r = createUserSchema.safeParse({
      email: "org@b.cz",
      password: "12345678",
      role: "player",
    });
    expect(r.success).toBe(false);
  });

  it("allows an optional display name", () => {
    const r = createUserSchema.safeParse({
      email: "org@b.cz",
      password: "12345678",
      role: "admin",
      displayName: "Jana",
    });
    expect(r.success).toBe(true);
  });
});
