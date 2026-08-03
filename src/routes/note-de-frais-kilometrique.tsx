import { createFileRoute } from "@tanstack/react-router";
import NoteDeFraisKilometrique from "@/pages/NoteDeFraisKilometrique";

export const Route = createFileRoute("/note-de-frais-kilometrique")({
  component: NoteDeFraisKilometrique,
});
