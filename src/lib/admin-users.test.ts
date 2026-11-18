import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADMIN_USERS_PAGE_SIZE,
  adminAccountCountLabel,
  adminUserPageCount,
  adminUserRangeLabel,
  adminUserSearchArgs,
  parseAdminAccountCount,
} from "./admin-users";

const migrationSql = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../supabase/migrations/20261118103000_a7c3e1b4-9d20-4f6a-8c11-6b2e4d8a91f0.sql",
  ),
  "utf8",
);

describe("comptage admin des comptes", () => {
  it("accepte un entier renvoyé en nombre ou en texte", () => {
    expect(parseAdminAccountCount(609)).toBe(609);
    expect(parseAdminAccountCount("609")).toBe(609);
    expect(parseAdminAccountCount(0n)).toBe(0);
  });

  it("refuse un comptage absent ou négatif", () => {
    expect(() => parseAdminAccountCount(null)).toThrow(/invalide/);
    expect(() => parseAdminAccountCount(-1)).toThrow(/invalide/);
    expect(() => parseAdminAccountCount(1.5)).toThrow(/invalide/);
  });

  it("affiche le total exact, pas la taille de la page", () => {
    expect(adminAccountCountLabel(609, false, false)).toBe("609");
    expect(adminAccountCountLabel(609, false, false)).not.toBe(String(ADMIN_USERS_PAGE_SIZE));
    expect(adminAccountCountLabel(undefined, true, false)).toBe("…");
    expect(adminAccountCountLabel(undefined, false, true)).toBe("–");
    expect(adminAccountCountLabel(undefined, false, false)).toBe("–");
  });
});

describe("pagination admin des comptes", () => {
  it("découpe 609 comptes en pages de 50", () => {
    expect(adminUserPageCount(609)).toBe(13);
    expect(adminUserPageCount(0)).toBe(1);
    expect(adminUserPageCount(50)).toBe(1);
    expect(adminUserPageCount(51)).toBe(2);
  });

  it("demande au serveur la page demandée, sans plafond de 500", () => {
    expect(adminUserSearchArgs("", 0)).toEqual({
      search_term: "",
      limit_count: 50,
      offset_count: 0,
    });
    expect(adminUserSearchArgs("martin", 2)).toEqual({
      search_term: "martin",
      limit_count: 50,
      offset_count: 100,
    });
    expect(adminUserSearchArgs("ada", -3).offset_count).toBe(0);
    expect(adminUserSearchArgs("", 12).limit_count).not.toBe(500);
  });

  it("indique l'intervalle et le total en français", () => {
    expect(adminUserRangeLabel(0, 0)).toBe("Aucun compte");
    expect(adminUserRangeLabel(0, 1)).toBe("1 compte");
    expect(adminUserRangeLabel(0, 609)).toBe("1–50 sur 609 comptes");
    expect(adminUserRangeLabel(12, 609)).toBe("601–609 sur 609 comptes");
    expect(adminUserRangeLabel(4, 3)).toBe("1–3 sur 3 comptes");
  });
});

describe("migration de pagination admin", () => {
  it("compte exactement, pagine, et reste réservée aux admins", () => {
    expect(migrationSql).toMatch(/CREATE FUNCTION public\.count_admin_users/);
    expect(migrationSql).toMatch(/SELECT COUNT\(\*\)\s+FROM auth\.users/);
    expect(migrationSql).toMatch(/OFFSET safe_offset/);
    expect(migrationSql).toMatch(/LEAST\(GREATEST\(COALESCE\(limit_count, 50\), 1\), 100\)/);
    expect(migrationSql).not.toMatch(/LIMIT\s+500/);
    expect(migrationSql.match(/has_role\(auth\.uid\(\), 'admin'\)/g)).toHaveLength(2);
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.count_admin_users\(text\) FROM PUBLIC, anon/,
    );
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.search_users\(text, integer, integer\) FROM PUBLIC, anon/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.count_admin_users\(text\) TO[^;]*anon/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.search_users\(text, integer, integer\) TO[^;]*anon/,
    );
    expect(migrationSql).toMatch(/DROP FUNCTION IF EXISTS public\.search_users\(text\)/);
  });
});

describe("branchement de la page admin", () => {
  const adminPage = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../pages/Admin.tsx"),
    "utf8",
  );

  it("ne reprend plus la longueur de la liste pour le bandeau", () => {
    expect(adminPage).not.toMatch(/\{users\.length\}/);
    expect(adminPage).not.toMatch(/limit_count:\s*500/);
    expect(adminPage).toMatch(/count_admin_users/);
    expect(adminPage).toMatch(/adminUserSearchArgs/);
    expect(adminPage).toMatch(/AdminAccountCountValue/);
    expect(adminPage).toMatch(/AdminUserPagination/);
  });
});
