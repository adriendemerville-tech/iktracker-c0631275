import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { TestRouter } from "@/test/router";

it("probe", async () => {
  render(<TestRouter><span>HELLO</span></TestRouter>);
  await screen.findByText("HELLO");
  expect(true).toBe(true);
});
