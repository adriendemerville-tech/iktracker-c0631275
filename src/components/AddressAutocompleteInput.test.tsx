import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import type { AddressSuggestion } from "@/hooks/useAddressAutocomplete";

const suggestions: AddressSuggestion[] = [
  {
    fulltext: "1 Rue du Test, 75001 Paris",
    street: "1 Rue du Test",
    city: "Paris",
    zipcode: "75001",
    lat: 48.86,
    lng: 2.33,
  },
  {
    fulltext: "2 Rue du Test, 75002 Paris",
    street: "2 Rue du Test",
    city: "Paris",
    zipcode: "75002",
    lat: 48.87,
    lng: 2.34,
  },
];

const mocks = vi.hoisted(() => ({
  suggestions: [] as AddressSuggestion[],
  search: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@/hooks/useAddressAutocomplete", () => ({
  useAddressAutocomplete: () => ({
    suggestions: mocks.suggestions,
    isLoading: false,
    search: mocks.search,
    clear: mocks.clear,
  }),
}));

function renderInput(value: string) {
  const onSelect = vi.fn();
  const onChange = vi.fn();
  const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <AddressAutocompleteInput value={value} onChange={onChange} onSelect={onSelect} />
      <button type="submit">Enregistrer</button>
    </form>,
  );
  return { onSelect, onChange, onSubmit };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Entrée dans la saisie d'adresse", () => {
  it("choisit la première suggestion quand aucune n'est surlignée", () => {
    mocks.suggestions = suggestions;
    const { onSelect, onSubmit } = renderInput("1 rue du test");
    const input = screen.getByPlaceholderText("Adresse...");

    const submitted = fireEvent.keyDown(input, { key: "Enter" });

    expect(submitted).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("choisit la suggestion surlignée plutôt que la première", () => {
    mocks.suggestions = suggestions;
    const { onSelect } = renderInput("1 rue du test");
    const input = screen.getByPlaceholderText("Adresse...");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
  });

  it("laisse le formulaire partir quand aucune suggestion n'est ouverte", () => {
    mocks.suggestions = suggestions;
    const { onSelect } = renderInput("ab");
    const input = screen.getByPlaceholderText("Adresse...");

    const submitted = fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(submitted).toBe(true);
  });
});

describe("géocodage à la sélection", () => {
  it("remplace le placeholder 0,0 avant d'appeler onSelect", async () => {
    mocks.suggestions = [
      {
        fulltext: "1 Rue du Test, 75001 Paris",
        street: "1 Rue du Test",
        city: "Paris",
        zipcode: "75001",
        lat: 0,
        lng: 0,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            features: [
              {
                properties: { label: "1 Rue du Test 75001 Paris" },
                geometry: { coordinates: [2.33, 48.86] },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const { onSelect } = renderInput("1 rue du test");

    fireEvent.mouseDown(screen.getByRole("button", { name: /1 Rue du Test, 75001 Paris/ }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        fulltext: "1 Rue du Test 75001 Paris",
        lat: 48.86,
        lng: 2.33,
      }),
    );
  });
});
