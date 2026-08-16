import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/AuthForm";

interface AuthRequiredModalProps {
  open: boolean;
}

export const AuthRequiredModal = ({ open }: AuthRequiredModalProps) => {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md p-0 border-0 bg-transparent shadow-none [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Connexion requise</DialogTitle>
          <DialogDescription>
            Connectez-vous pour accéder à votre espace IKtracker.
          </DialogDescription>
        </DialogHeader>
        <AuthForm compact />
      </DialogContent>
    </Dialog>
  );
};
