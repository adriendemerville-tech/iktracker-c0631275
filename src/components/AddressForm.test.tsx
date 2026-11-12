import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddressForm } from "./AddressForm";
import type { AddressSuggestion } from "@/hooks/useAddressAutocomplete";

const toast = vi.hoisted(() => vi.fn());
const autocomplete = vi.hoisted(() => ({
  suggestions: [] as AddressSuggestion[],
  search: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/hooks/useAddressAutocomplete", () => ({
  useAddressAutocomplete: () => ({
    suggestions: autocomplete.suggestions,
    isLoading: false,
    search: autocomplete.search,
    clear: autocomplete.clear,
  }),
}));

const geocodedBody = {
  features: [
    {
      properties: { label: "1 Rue du Test 75001 Paris" },
      geometry: { coordinates: [2.33, 48.86] },
    },
  ],
};

const zeroSuggestion: AddressSuggestion = {
  fulltext: "1 Rue du Test, 75001 Paris",
  street: "1 Rue du Test",
  city: "Paris",
  zipcode: "75001",
  lat: 0,
  lng: 0,
};

function mockGeopf(status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(status === 200 ? JSON.stringify(geocodedBody) : JSON.stringify({ code: status }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderForm() {
  const onSave = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  render(<AddressForm open onOpenChange={onOpenChange} onSave={onSave} />);
  return { onSave, onOpenChange };
}

async function fillNameAndAddress() {
  fireEvent.change(screen.getByLabelText("Nom du lieu"), { target: { value: "Maison" } });
  fireEvent.change(screen.getByPlaceholderText("Rechercher une adresse..."), {
    target: { value: "1 rue du test" },
  });
}

afterEach(() => {
  autocomplete.suggestions = [];
  toast.mockClear();
  vi.unstubAllGlobals();
});

describe("AddressForm", () => {
  it("valide une saisie libre via la Géoplateforme sans type combiné", async () => {
    const fetchMock = mockGeopf();
    const { onSave, onOpenChange } = renderForm();
    await fillNameAndAddress();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      name: "Maison",
      address: "1 Rue du Test 75001 Paris",
      type: "home",
      latitude: 48.86,
      longitude: 2.33,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/geocodage/search");
    expect(url.searchParams.get("type")).toBeNull();
    expect(url.search).not.toContain("housenumber,street");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Adresse corrigée" }));
  });

  it("affiche l'erreur et n'enregistre pas quand le géocodage échoue", async () => {
    mockGeopf(400);
    const { onSave, onOpenChange } = renderForm();
    await fillNameAndAddress();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Adresse non trouvée",
          description: "Impossible de valider cette adresse. Veuillez sélectionner une suggestion.",
        }),
      ),
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("géocode une suggestion Google 0,0 avant de la marquer validée", async () => {
    autocomplete.suggestions = [zeroSuggestion];
    const fetchMock = mockGeopf();
    const { onSave } = renderForm();
    await fillNameAndAddress();

    fireEvent.mouseDown(screen.getByRole("button", { name: /1 Rue du Test, 75001 Paris/ }));

    await waitFor(() => expect(screen.getByText("Validée")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].latitude).toBe(48.86);
    expect(onSave.mock.calls[0][0].longitude).toBe(2.33);
    expect(onSave.mock.calls[0][0].latitude).not.toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("la touche Entrée prend la première suggestion au lieu d'enregistrer sans coordonnées", async () => {
    autocomplete.suggestions = [zeroSuggestion];
    mockGeopf();
    const { onSave } = renderForm();
    await fillNameAndAddress();

    const keptOpen = fireEvent.keyDown(screen.getByPlaceholderText("Rechercher une adresse..."), {
      key: "Enter",
    });

    expect(keptOpen).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Validée")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ latitude: 48.86, longitude: 2.33 });
  });
});
