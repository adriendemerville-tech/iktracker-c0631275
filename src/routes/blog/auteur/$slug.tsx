import { createFileRoute } from "@tanstack/react-router";
import AuthorPage from "@/pages/AuthorPage";

export const Route = createFileRoute("/blog/auteur/$slug")({
  component: AuthorPage,
});
