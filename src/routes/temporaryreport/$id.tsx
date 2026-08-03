import { createFileRoute } from "@tanstack/react-router";
import TemporaryReport from "@/pages/TemporaryReport";

export const Route = createFileRoute("/temporaryreport/$id")({
  component: TemporaryReport,
});
