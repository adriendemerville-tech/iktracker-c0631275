import type { ReactNode } from "react";
import { Bike, Car } from "lucide-react";
import { IK_BAREME_2026 } from "@/types/trip";
import { formatBaremeFormula, formatBaremePerKm } from "@/lib/format-fr";

export type BaremeScaleRow = {
  id: string;
  label: ReactNode;
  cells: string[];
};

type BaremeScaleTableProps = {
  ariaLabel: string;
  caption: string;
  rowHeader: string;
  columns: readonly string[];
  rows: readonly BaremeScaleRow[];
  /** « code » pour les formules d × …, « text » pour un taux au kilomètre. */
  presentation?: "code" | "text";
};

/**
 * Tableau de barème lisible sans défilement horizontal.
 * Sous lg, chaque puissance devient un bloc : les trois tranches, dont
 * 5 001–20 000 km, restent visibles. Au-dessus, colonnes classiques.
 */
export function BaremeScaleTable({
  ariaLabel,
  caption,
  rowHeader,
  columns,
  rows,
  presentation = "code",
}: BaremeScaleTableProps) {
  return (
    <div className="w-full max-w-full">
      <table
        className="w-full max-w-full border-collapse text-sm max-lg:block"
        aria-label={ariaLabel}
      >
        <caption className="sr-only">{caption}</caption>
        <thead className="max-lg:hidden">
          <tr className="border-b bg-muted/50">
            <th scope="col" className="p-3 text-left align-middle font-bold text-foreground">
              {rowHeader}
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="p-3 text-center align-middle font-bold text-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-lg:block">
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className={
                index % 2 === 0
                  ? "border-b bg-background max-lg:block max-lg:p-4"
                  : "border-b bg-muted/20 max-lg:block max-lg:p-4"
              }
            >
              <th
                scope="row"
                className="p-3 text-left align-middle font-semibold text-foreground max-lg:block max-lg:px-0 max-lg:pt-0"
              >
                {row.label}
              </th>
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={columns[cellIndex] ?? cellIndex}
                  className="p-3 text-center align-middle max-lg:block max-lg:px-0 max-lg:py-2 max-lg:text-left"
                >
                  <span className="mb-1 block text-xs font-medium text-muted-foreground lg:hidden">
                    {columns[cellIndex]}
                  </span>
                  {presentation === "code" ? (
                    <code className="inline-block max-w-full whitespace-normal break-words rounded bg-primary/10 px-2 py-1 font-mono text-sm text-primary">
                      {cell}
                    </code>
                  ) : (
                    <span className="inline-block max-w-full whitespace-normal break-words text-muted-foreground">
                      {cell}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function powerLabel(cv: string) {
  const text = cv === "7+" ? "7 CV et plus" : `${cv} CV`;
  return (
    <span className="inline-flex items-center gap-2">
      <Car className="h-4 w-4 text-primary" aria-hidden="true" />
      {text}
    </span>
  );
}

function bikeLabel(text: string) {
  return (
    <span className="inline-flex items-center gap-2">
      <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
      {text}
    </span>
  );
}

export const CAR_COLUMNS_PLUS = [
  "Jusqu'à 5 000 km",
  "De 5 001 à 20 000 km",
  "Plus de 20 000 km",
] as const;

export const CAR_COLUMNS_AU_DELA = [
  "Jusqu'à 5 000 km",
  "De 5 001 à 20 000 km",
  "Au-delà de 20 000 km",
] as const;

export const MOTO_COLUMNS = [
  "Jusqu'à 3 000 km",
  "De 3 001 à 6 000 km",
  "Au-delà de 6 000 km",
] as const;

export function carFormulaRows(): BaremeScaleRow[] {
  return IK_BAREME_2026.map((row) => ({
    id: row.cv,
    label: powerLabel(row.cv),
    cells: [
      formatBaremeFormula(row.upTo5000),
      formatBaremeFormula(row.from5001To20000),
      formatBaremeFormula(row.over20000),
    ],
  }));
}

export function carPerKmRows(): BaremeScaleRow[] {
  return IK_BAREME_2026.map((row) => ({
    id: row.cv,
    label: row.cv === "7+" ? "7 CV et plus" : `${row.cv} CV`,
    cells: [
      formatBaremePerKm(row.upTo5000),
      formatBaremePerKm(row.from5001To20000),
      formatBaremePerKm(row.over20000),
    ],
  }));
}

const MOTO_SCALE = [
  {
    id: "1-2",
    label: "1 ou 2 CV",
    cells: [{ rate: 0.395 }, { rate: 0.099, fixed: 891 }, { rate: 0.248 }],
  },
  {
    id: "3-5",
    label: "3, 4, 5 CV",
    cells: [{ rate: 0.468 }, { rate: 0.082, fixed: 1158 }, { rate: 0.275 }],
  },
  {
    id: "5+",
    label: "Plus de 5 CV",
    cells: [{ rate: 0.606 }, { rate: 0.079, fixed: 1583 }, { rate: 0.343 }],
  },
] as const;

const CYCLO_SCALE = [
  {
    id: "cyclo",
    label: "Cyclomoteurs et scooters < 50 cm³",
    cells: [{ rate: 0.315 }, { rate: 0.079, fixed: 711 }, { rate: 0.198 }],
  },
] as const;

export function motoFormulaRows(): BaremeScaleRow[] {
  return MOTO_SCALE.map((row) => ({
    id: row.id,
    label: bikeLabel(row.label),
    cells: row.cells.map((cell) => formatBaremeFormula(cell)),
  }));
}

export function cycloFormulaRows(): BaremeScaleRow[] {
  return CYCLO_SCALE.map((row) => ({
    id: row.id,
    label: bikeLabel(row.label),
    cells: row.cells.map((cell) => formatBaremeFormula(cell)),
  }));
}
