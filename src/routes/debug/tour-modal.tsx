import { createFileRoute } from "@tanstack/react-router";
import DebugTourModal from "@/pages/DebugTourModal";

export const Route = createFileRoute("/debug/tour-modal")({
  component: DebugTourModal,
});
