import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export const EMAIL_GATE_EVENT = "ik:open-email-gate";

/** Limits applied while the email address is not verified */
export const UNVERIFIED_TRIP_LIMIT = 3;
export const UNVERIFIED_TOUR_LIMIT = 1;

export const openEmailGate = () => {
  window.dispatchEvent(new CustomEvent(EMAIL_GATE_EVENT));
};

type GateFeature = "export" | "trip" | "tour";

const MESSAGES: Record<GateFeature, { title: string; description: string }> = {
  export: {
    title: "Vérifiez votre email pour exporter",
    description:
      "L'export et l'envoi de relevés sont réservés aux comptes dont l'adresse email est confirmée.",
  },
  trip: {
    title: `Limite de ${UNVERIFIED_TRIP_LIMIT} trajets atteinte`,
    description: "Confirmez votre adresse email pour enregistrer un nombre illimité de trajets.",
  },
  tour: {
    title: `Limite de ${UNVERIFIED_TOUR_LIMIT} tournée atteinte`,
    description: "Confirmez votre adresse email pour lancer d'autres tournées.",
  },
};

/** Central place to know whether the account is email-verified and to block features. */
export const useEmailGate = () => {
  const { user } = useAuth();
  const emailVerified = !user || !!user.email_confirmed_at;

  /** Shows an explanatory toast + reopens the verification modal. */
  const blockFeature = useCallback((feature: GateFeature) => {
    const { title, description } = MESSAGES[feature];
    toast.error(title, {
      description,
      action: {
        label: "Vérifier",
        onClick: () => openEmailGate(),
      },
    });
    openEmailGate();
  }, []);

  /** Returns true when the action is allowed; otherwise blocks and warns. */
  const guard = useCallback(
    (feature: GateFeature) => {
      if (emailVerified) return true;
      blockFeature(feature);
      return false;
    },
    [emailVerified, blockFeature],
  );

  return { emailVerified, guard, blockFeature };
};
