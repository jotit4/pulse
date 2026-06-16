import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

describe("Smoke: componentes UI base", () => {
  it("renderiza Button con el texto correcto", () => {
    render(<Button>Publicar</Button>);
    expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
  });

  it("renderiza Spinner con rol status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("Button deshabilitado no es clickeable", () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });
});
