/** Taille d'une page de la liste admin. Le serveur refuse au-delà de 100. */
export const ADMIN_USERS_PAGE_SIZE = 50;

export type AdminUserRow = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  has_plate_detection: boolean;
};

export function parseAdminAccountCount(data: unknown): number {
  const value =
    typeof data === "bigint"
      ? Number(data)
      : typeof data === "number"
        ? data
        : typeof data === "string"
          ? Number(data)
          : Number.NaN;

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Comptage des comptes invalide");
  }
  return value;
}

export function adminUserSearchArgs(
  search: string,
  page: number,
  pageSize = ADMIN_USERS_PAGE_SIZE,
) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
  return {
    search_term: search,
    limit_count: pageSize,
    offset_count: safePage * pageSize,
  };
}

export function adminUserPageCount(total: number, pageSize = ADMIN_USERS_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function adminUserRangeLabel(
  page: number,
  total: number,
  pageSize = ADMIN_USERS_PAGE_SIZE,
): string {
  if (!Number.isFinite(total) || total <= 0) return "Aucun compte";
  if (total === 1) return "1 compte";
  const pageCount = adminUserPageCount(total, pageSize);
  const safePage = Math.min(Math.max(0, Math.floor(page) || 0), pageCount - 1);
  const start = safePage * pageSize + 1;
  const end = Math.min(total, (safePage + 1) * pageSize);
  return `${start}–${end} sur ${total} comptes`;
}

/** Libellé du bandeau. Il ne doit jamais reprendre la longueur de la page chargée. */
export function adminAccountCountLabel(
  count: number | null | undefined,
  isLoading: boolean,
  isError: boolean,
): string {
  if (isLoading) return "…";
  if (isError || typeof count !== "number" || !Number.isFinite(count)) return "–";
  return String(Math.trunc(count));
}
