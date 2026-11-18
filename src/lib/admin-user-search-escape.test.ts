import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { adminUserSearchArgs } from "./admin-users";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const migrationSql = readFileSync(
  resolve(root, "supabase/migrations/20261118145100_c4e8a1d2-7b3f-4e19-9c6a-2f8d0b5e7a41.sql"),
  "utf8",
);

const previousMigrationSql = readFileSync(
  resolve(root, "supabase/migrations/20261118103000_a7c3e1b4-9d20-4f6a-8c11-6b2e4d8a91f0.sql"),
  "utf8",
);

const verificationSql = readFileSync(
  resolve(root, "supabase/verification/admin_user_search_escape.sql"),
  "utf8",
);

const quote = "'";
const backslash = "\\";
const escapeExpr = `replace(replace(replace(COALESCE(search_term, ''), ${quote}${backslash}${quote}, ${quote}${backslash}${backslash}${quote}), '%', ${quote}${backslash}%${quote}), '_', ${quote}${backslash}_${quote})`;
const escapeClause = `ESCAPE ${quote}${backslash}${quote}`;

const sharedFilter = [
  "term = '' OR",
  `u.email ILIKE '%' || term || '%' ${escapeClause} OR`,
  `u.raw_user_meta_data->>'first_name' ILIKE '%' || term || '%' ${escapeClause} OR`,
  `u.raw_user_meta_data->>'last_name' ILIKE '%' || term || '%' ${escapeClause} OR`,
  `u.id::text ILIKE '%' || term || '%' ${escapeClause}`,
].join("\n");

function normalizedFilters(sql: string): string[] {
  const matches = sql.match(/term = '' OR[\s\S]*?u\.id::text ILIKE[^\n]*/g) ?? [];
  return matches.map((block) =>
    block
      .split("\n")
      .map((line) => line.trim())
      .join("\n"),
  );
}

type Sample = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

const samples: Sample[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "ada.lovelace@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    created_at: "2026-01-06T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "a_b@example.com",
    first_name: "Ann",
    last_name: "Bee",
    created_at: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    email: "axb@example.com",
    first_name: "Ax",
    last_name: "Bee",
    created_at: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "promo100%@example.com",
    first_name: "Promo",
    last_name: "Sold",
    created_at: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    email: "promo1000@example.com",
    first_name: "Promo",
    last_name: "Mille",
    created_at: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    email: "plain@example.com",
    first_name: "Plain",
    last_name: "User",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    email: "under_score@example.com",
    first_name: "Zoe",
    last_name: "Quux",
    created_at: "2025-12-31T00:00:00.000Z",
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    email: "cent@example.com",
    first_name: "No",
    last_name: "100%",
    created_at: "2025-12-30T00:00:00.000Z",
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    email: "a\\b@example.com",
    first_name: "Slash",
    last_name: "User",
    created_at: "2025-12-29T00:00:00.000Z",
  },
];

/** Même ordre que les replace imbriqués du SQL : \ puis % puis _. */
function escapeAdminSearchTerm(searchTerm: string | null | undefined): string {
  return (searchTerm ?? "").replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function ilike(value: string | null | undefined, pattern: string): boolean {
  let expression = "";
  const source = pattern.toLowerCase();
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\\") {
      const escaped = source[index + 1];
      if (escaped === undefined) {
        throw new Error("antislash en fin de motif");
      }
      expression += escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      index += 1;
      continue;
    }
    if (character === "%") {
      expression += "[\\s\\S]*";
      continue;
    }
    if (character === "_") {
      expression += "[\\s\\S]";
      continue;
    }
    expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${expression}$`, "i").test(value ?? "");
}

function matchingEmails(searchTerm: string): string[] {
  const term = escapeAdminSearchTerm(searchTerm);
  return samples
    .filter((sample) => {
      if (term === "") return true;
      const pattern = `%${term}%`;
      return (
        ilike(sample.email, pattern) ||
        ilike(sample.first_name, pattern) ||
        ilike(sample.last_name, pattern) ||
        ilike(sample.id, pattern)
      );
    })
    .sort((left, right) => {
      const byDate = right.created_at.localeCompare(left.created_at);
      if (byDate !== 0) return byDate;
      return right.id.localeCompare(left.id);
    })
    .map((sample) => sample.email);
}

describe("échappement ILIKE de la recherche admin", () => {
  it("échappe d'abord l'antislash, puis % et _", () => {
    expect(escapeAdminSearchTerm("_")).toBe("\\_");
    expect(escapeAdminSearchTerm("%")).toBe("\\%");
    expect(escapeAdminSearchTerm("a_b")).toBe("a\\_b");
    expect(escapeAdminSearchTerm("100%")).toBe("100\\%");
    expect(escapeAdminSearchTerm("ada")).toBe("ada");
    expect(escapeAdminSearchTerm("")).toBe("");
    expect(escapeAdminSearchTerm(null)).toBe("");
    expect(escapeAdminSearchTerm("a\\b")).toBe("a\\\\b");
    expect(escapeAdminSearchTerm("100%_off")).toBe("100\\%\\_off");
  });

  it("traite _, %, a_b, 100%, un terme ordinaire et le terme vide", () => {
    expect(matchingEmails("_")).toEqual(["a_b@example.com", "under_score@example.com"]);
    expect(matchingEmails("%")).toEqual(["promo100%@example.com", "cent@example.com"]);
    expect(matchingEmails("a_b")).toEqual(["a_b@example.com"]);
    expect(matchingEmails("a_b")).not.toContain("axb@example.com");
    expect(matchingEmails("100%")).toEqual(["promo100%@example.com", "cent@example.com"]);
    expect(matchingEmails("100%")).not.toContain("promo1000@example.com");
    expect(matchingEmails("ada")).toEqual(["ada.lovelace@example.com"]);
    expect(matchingEmails("ADA")).toEqual(["ada.lovelace@example.com"]);
    expect(matchingEmails("")).toEqual(samples.map((sample) => sample.email));
    expect(matchingEmails("a\\b")).toEqual(["a\\b@example.com"]);
  });

  it("redéfinit les deux fonctions avec le même filtre et les mêmes droits", () => {
    expect(
      migrationSql.match(/CREATE OR REPLACE FUNCTION public\.count_admin_users/g),
    ).toHaveLength(1);
    expect(migrationSql.match(/CREATE OR REPLACE FUNCTION public\.search_users/g)).toHaveLength(1);
    expect(migrationSql.split(escapeExpr).length - 1).toBe(2);
    expect(normalizedFilters(migrationSql)).toEqual([sharedFilter, sharedFilter]);
    expect(migrationSql.match(/^SECURITY DEFINER$/gm)).toHaveLength(2);
    expect(migrationSql.match(/SET search_path TO 'public'/g)).toHaveLength(2);
    expect(migrationSql.match(/has_role\(auth\.uid\(\), 'admin'\)/g)).toHaveLength(2);
    expect(migrationSql).toMatch(/LEAST\(GREATEST\(COALESCE\(limit_count, 50\), 1\), 100\)/);
    expect(migrationSql).toMatch(/GREATEST\(COALESCE\(offset_count, 0\), 0\)/);
    expect(migrationSql).toMatch(/ORDER BY u\.created_at DESC, u\.id DESC/);
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.count_admin_users\(text\) FROM PUBLIC, anon/,
    );
    expect(migrationSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.count_admin_users\(text\) TO authenticated, service_role/,
    );
    expect(migrationSql).toMatch(
      /REVOKE ALL ON FUNCTION public\.search_users\(text, integer, integer\) FROM PUBLIC, anon/,
    );
    expect(migrationSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.search_users\(text, integer, integer\) TO authenticated, service_role/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.count_admin_users\(text\) TO[^;]*anon/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.search_users\(text, integer, integer\) TO[^;]*anon/,
    );
    expect(migrationSql).not.toMatch(/^DROP FUNCTION/m);
  });

  it("laisse l'ancienne migration inchangée, sans échappement", () => {
    expect(previousMigrationSql).toMatch(/CREATE FUNCTION public\.count_admin_users/);
    expect(previousMigrationSql).not.toMatch(
      /CREATE OR REPLACE FUNCTION public\.count_admin_users/,
    );
    expect(previousMigrationSql).not.toMatch(/ESCAPE/);
    expect(previousMigrationSql).toMatch(/u\.email ILIKE '%' \|\| term \|\| '%'/);
  });

  it("décrit les mêmes cas dans le SQL de vérification", () => {
    expect(verificationSql).toContain(escapeExpr);
    expect(verificationSql).toContain(escapeClause);
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    '_',");
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    '%',");
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    'a_b',");
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    '100%',");
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    'ada',");
    expect(verificationSql).toContain("PERFORM pg_temp.assert_search(\n    '',");
    expect(verificationSql).toMatch(/ROLLBACK;\s*$/);
    expect(verificationSql).not.toMatch(/CREATE OR REPLACE FUNCTION public\./);
    expect(verificationSql).not.toMatch(/auth\.users/);
  });

  it("n'échappe pas une seconde fois le terme côté client", () => {
    expect(adminUserSearchArgs("_", 0).search_term).toBe("_");
    expect(adminUserSearchArgs("%", 0).search_term).toBe("%");
    expect(adminUserSearchArgs("a_b", 0).search_term).toBe("a_b");
    expect(adminUserSearchArgs("100%", 0).search_term).toBe("100%");
    expect(adminUserSearchArgs("ada", 0).search_term).toBe("ada");
    expect(adminUserSearchArgs("", 0).search_term).toBe("");

    const clientSource = readFileSync(resolve(root, "src/lib/admin-users.ts"), "utf8");
    expect(clientSource).not.toMatch(/replaceAll|ESCAPE/);
  });
});
