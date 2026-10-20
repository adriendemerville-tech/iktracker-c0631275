import { beforeEach, describe, expect, it, vi } from "vitest";

// trackSignupEvent délègue à supabase.functions.invoke : on le stubbe.
vi.mock("./signup-tracking", () => ({
  trackSignupEvent: vi.fn().mockResolvedValue(undefined),
}));

import { settleOAuthSignupSuccess, markOAuthStart } from "./oauth-return-tracking";

describe("settleOAuthSignupSuccess", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("trace une inscription Google la première fois que le navigateur voit le compte", async () => {
    markOAuthStart("google", "signup");
    const tracked = settleOAuthSignupSuccess("google", "user-1");
    expect(tracked).toBe(true);
    const known = JSON.parse(localStorage.getItem("ik_known_user_ids") ?? "[]");
    expect(known).toContain("user-1");
  });

  it("ne retrace pas le même compte lors d'une connexion ultérieure", () => {
    markOAuthStart("google", "signup");
    expect(settleOAuthSignupSuccess("google", "user-1")).toBe(true);
    markOAuthStart("google", "auth");
    expect(settleOAuthSignupSuccess("google", "user-1")).toBe(false);
  });

  it("ne trace rien sans marqueur de départ OAuth", () => {
    expect(settleOAuthSignupSuccess("google", "user-2")).toBe(false);
  });
});
