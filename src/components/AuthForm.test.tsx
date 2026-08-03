import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "@/lib/router-compat";
import { AuthForm } from "./AuthForm";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderAuth(props = {}) {
  return render(
    <BrowserRouter>
      <TooltipProvider>
        <AuthForm {...props} />
      </TooltipProvider>
    </BrowserRouter>
  );
}

describe("AuthForm", () => {
  it("renders login mode by default", () => {
    renderAuth();
    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mot de passe")).toBeInTheDocument();
  });

  it("shows Google OAuth button", () => {
    renderAuth();
    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
  });

  it("shows forgot password link in login mode", () => {
    renderAuth();
    expect(screen.getByText("Mot de passe oublié ?")).toBeInTheDocument();
  });

  it("switches to forgot-password mode", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Mot de passe oublié ?"));
    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.getByText("Envoyer le lien")).toBeInTheDocument();
    // Password field should be hidden
    expect(screen.queryByPlaceholderText("Mot de passe")).not.toBeInTheDocument();
  });

  it("has back button in forgot-password mode", () => {
    renderAuth();
    fireEvent.click(screen.getByText("Mot de passe oublié ?"));
    expect(screen.getByText("Retour à la connexion")).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    renderAuth();
    const passwordInput = screen.getByPlaceholderText("Mot de passe");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByLabelText("Afficher le mot de passe");
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("renders in compact mode without header", () => {
    renderAuth({ compact: true });
    expect(screen.queryByText("Connexion")).not.toBeInTheDocument();
    // But form fields should still be there
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("email and password fields are required", () => {
    renderAuth();
    const emailInput = screen.getByPlaceholderText("Email");
    const passwordInput = screen.getByPlaceholderText("Mot de passe");
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it("has proper accessibility attributes", () => {
    renderAuth();
    expect(screen.getByLabelText("Formulaire d'authentification")).toBeInTheDocument();
    expect(screen.getByLabelText("Se connecter avec Google")).toBeInTheDocument();
  });
});
