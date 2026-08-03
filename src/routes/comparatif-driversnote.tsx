import { createFileRoute } from "@tanstack/react-router";
import ComparatifDriversNote from "@/pages/ComparatifDriversNote";

export const Route = createFileRoute("/comparatif-driversnote")({
  component: ComparatifDriversNote,
});
