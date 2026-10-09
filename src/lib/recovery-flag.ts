// Le client d'auth efface le hash (#type=recovery) dès son initialisation :
// on le capture le plus tôt possible et on le garde pour la session d'onglet.
const KEY = "ik_password_recovery";

export function captureRecoveryFlag() {
  if (typeof window === "undefined") return;
  if (window.location.hash.includes("type=recovery")) sessionStorage.setItem(KEY, "1");
}

export function isRecoveryFlow(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("type=recovery") || sessionStorage.getItem(KEY) === "1";
}

export function setRecoveryFlag() {
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, "1");
}

export function clearRecoveryFlag() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

captureRecoveryFlag();
