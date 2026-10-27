export const DANGER_ZONE_COPY = {
  bannerInside: "Zone de danger",
  bannerLeaving: "Fin de zone de danger",
  speedLimit: (vma: number) => `VMA ${vma}`,
  overLimit: "Au-dessus de la limitation",
  settingLabel: "Zones de danger",
  settingDescription:
    "Aide à la conduite pendant la tournée. Un son à l'entrée d'une zone de danger, un autre à la fin. Respectez les limitations.",
  muteLabel: "Couper le son",
  muteDescription: "Le bandeau reste affiché, sans son ni vibration.",
  promptTitle: "Aide à la conduite",
  promptBody:
    "Pendant la tournée, un son signale l'entrée dans une zone de danger, et un autre signale la fin de cette zone. Gardez l'écran allumé : le rappel s'arrête si l'application passe en arrière-plan. Respectez les limitations.",
  promptEnable: "Activer",
  promptLater: "Pas maintenant",
  muteOn: "Couper le son des zones de danger",
  muteOff: "Réactiver le son des zones de danger",
  unavailable: "Zones de danger indisponibles pour cette tournée.",
} as const;
