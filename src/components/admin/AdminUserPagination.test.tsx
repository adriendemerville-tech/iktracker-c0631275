import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminAccountCountValue, AdminUserPagination } from "./AdminUserPagination";

describe("AdminAccountCountValue", () => {
  it("affiche le comptage exact, pas le nombre de lignes de la page", () => {
    render(<AdminAccountCountValue count={609} isLoading={false} isError={false} />);
    expect(screen.getByText("609")).toBeInTheDocument();
    expect(screen.queryByText("50")).not.toBeInTheDocument();
    expect(screen.queryByText("500")).not.toBeInTheDocument();
  });

  it("distingue le chargement et l'erreur d'un zéro", () => {
    const { rerender } = render(
      <AdminAccountCountValue count={undefined} isLoading isError={false} />,
    );
    expect(screen.getByText("…")).toBeInTheDocument();

    rerender(<AdminAccountCountValue count={undefined} isLoading={false} isError />);
    expect(screen.getByText("–")).toBeInTheDocument();
  });
});

describe("AdminUserPagination", () => {
  it("affiche le total et avance d'une page", () => {
    const onPageChange = vi.fn();
    render(<AdminUserPagination page={0} total={609} onPageChange={onPageChange} />);

    expect(screen.getByText("1–50 sur 609 comptes")).toBeInTheDocument();
    expect(screen.getByText("Page 1 sur 13")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("bloque la page suivante sur la dernière page", () => {
    const onPageChange = vi.fn();
    render(<AdminUserPagination page={12} total={609} onPageChange={onPageChange} />);

    expect(screen.getByText("601–609 sur 609 comptes")).toBeInTheDocument();
    expect(screen.getByText("Page 13 sur 13")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
    expect(onPageChange).toHaveBeenCalledWith(11);
  });

  it("n'affiche pas de pagination sans compte", () => {
    render(<AdminUserPagination page={0} total={0} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Suivant" })).not.toBeInTheDocument();
  });
});
