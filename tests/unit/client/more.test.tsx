import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ThemeProvider from "@/components/providers/ThemeProvider";
import ToastProvider from "@/components/providers/ToastProvider";
import NameProvider from "@/components/providers/NameProvider";
import More from "@/components/More";
import type { GameRoom } from "@/libs/room";
import { makeFakeRoom } from "./harness";

/**
 * Renders `More` the way the app mounts it: the root layout wraps everything
 * in `ThemeProvider` + `ToastProvider`, `page.tsx` adds `NameProvider`, then
 * `More` renders with an optional room. `localStorage` is seeded with a name
 * so `NameProvider` does not draw a random one from faker.
 * @param room The room passed to `More`, if any.
 * @returns The RTL render result.
 */
function renderMore(room: GameRoom | undefined = undefined) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <NameProvider>
          <More room={room} />
        </NameProvider>
      </ToastProvider>
    </ThemeProvider>,
  );
}

/**
 * The settings modal is always in the DOM (`Modal.Legacy` toggles styling
 * and `aria-hidden`, not mounting). Reach it through the container instead
 * of an accessible query so the hidden state can be inspected too.
 */
function getModal(container: HTMLElement): HTMLElement {
  const modal = container.querySelector('[aria-label="Modal"]');
  if (modal === null) throw new Error("Modal not found in the container");
  return modal as HTMLElement;
}

/** Clicks the icon-only button housing the given lucide icon class. */
function clickIcon(container: HTMLElement, iconClass: string): void {
  const icon = container.querySelector(`.${iconClass}`);
  const button = icon?.closest("button");
  if (button === null || button === undefined)
    throw new Error(`Button containing .${iconClass} not found`);
  fireEvent.click(button);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("name", "Alice");
  document.documentElement.removeAttribute("data-theme");
});

describe("More", () => {
  it("should open the settings modal when the menu button is clicked", () => {
    const { container } = renderMore();
    const modal = getModal(container);
    expect(modal).toHaveAttribute("aria-hidden", "true");

    clickIcon(container, "lucide-ellipsis-vertical");

    expect(modal).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("should close the modal when the close button is clicked", () => {
    const { container } = renderMore();
    const modal = getModal(container);
    clickIcon(container, "lucide-ellipsis-vertical");
    expect(modal).toHaveAttribute("aria-hidden", "false");

    clickIcon(container, "lucide-x");

    expect(modal).toHaveAttribute("aria-hidden", "true");
  });

  it("should close the modal when the backdrop is clicked", () => {
    const { container } = renderMore();
    const modal = getModal(container);
    clickIcon(container, "lucide-ellipsis-vertical");
    expect(modal).toHaveAttribute("aria-hidden", "false");

    fireEvent.click(modal as HTMLElement);

    expect(modal).toHaveAttribute("aria-hidden", "true");
  });

  it("should update the stored name when the form is submitted", () => {
    const { container } = renderMore();
    clickIcon(container, "lucide-ellipsis-vertical");
    const input = screen.getByRole("textbox");
    const form = input.closest("form");
    expect(form).not.toBeNull();

    fireEvent.change(input, { target: { value: "marie" } });
    fireEvent.submit(form as HTMLFormElement);

    expect(localStorage.getItem("name")).toBe("Marie");
    expect(input).toHaveValue("Marie");
    expect(
      screen.getByText("Votre nom a été mis à jour !"),
    ).toBeInTheDocument();
  });

  it("should send the new name to the room when one is connected", () => {
    const send = jest.fn();
    const room = makeFakeRoom({ send });
    const { container } = renderMore(room);
    clickIcon(container, "lucide-ellipsis-vertical");
    const input = screen.getByRole("textbox");
    const form = input.closest("form");
    expect(form).not.toBeNull();

    fireEvent.change(input, { target: { value: "marie" } });
    fireEvent.submit(form as HTMLFormElement);

    expect(send).toHaveBeenCalledWith("update-name", "marie");
  });

  it("should keep the stored name when the submitted draft is empty", () => {
    const { container } = renderMore();
    clickIcon(container, "lucide-ellipsis-vertical");
    const input = screen.getByRole("textbox");
    const form = input.closest("form");
    expect(form).not.toBeNull();

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(form as HTMLFormElement);

    expect(localStorage.getItem("name")).toBe("Alice");
    expect(screen.queryByText("Votre nom a été mis à jour !")).toBeNull();
  });

  it("should switch the theme when a theme is selected", () => {
    const { container } = renderMore();
    clickIcon(container, "lucide-ellipsis-vertical");
    const select = container.querySelector("select");
    expect(select).not.toBeNull();

    fireEvent.change(select as HTMLSelectElement, {
      target: { value: "dark" },
    });

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
