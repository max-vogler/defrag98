import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

export function setupUserEvent() {
  return userEvent.setup({
    advanceTimers: (delay) => vi.advanceTimersByTime(delay),
  });
}

export function triggerChangeDetection(
  user: ReturnType<typeof setupUserEvent>
) {
  return user.click(screen.getByText("Command Prompt"));
}
