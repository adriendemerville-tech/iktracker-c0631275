import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ADMIN_USERS_PAGE_SIZE,
  adminAccountCountLabel,
  adminUserPageCount,
  adminUserRangeLabel,
} from "@/lib/admin-users";

export function AdminAccountCountValue({
  count,
  isLoading,
  isError,
}: {
  count: number | null | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  return <span>{adminAccountCountLabel(count, isLoading, isError)}</span>;
}

export function AdminUserPagination({
  page,
  total,
  pageSize = ADMIN_USERS_PAGE_SIZE,
  onPageChange,
  disabled = false,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!Number.isFinite(total) || total <= 0) return null;

  const pageCount = adminUserPageCount(total, pageSize);
  const safePage = Math.min(Math.max(0, page), pageCount - 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
      <p className="text-sm text-muted-foreground">
        {adminUserRangeLabel(safePage, total, pageSize)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || safePage <= 0}
        >
          <ChevronLeft />
          Précédent
        </Button>
        <span className="text-sm tabular-nums">
          Page {safePage + 1} sur {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || safePage + 1 >= pageCount}
        >
          Suivant
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
