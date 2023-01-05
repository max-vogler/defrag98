import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi, expect, afterEach } from "vitest";

import App from "../src/components/App";
import { TICK_INTERVAL } from "../src/systems";
import { setupUserEvent, triggerChangeDetection } from "./base";

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicking button triggers purchase", async () => {
    render(<App />);
    const user = setupUserEvent();

    expect(window.gameState?.purchases.AllocateMemory.inProgress).toBe(false);
    expect(window.gameState?.purchases.AllocateMemory.purchaseCount).toBe(0);
    expect(window.gameState?.memory.cells.length).toBe(1);

    await user.click(screen.getByText("Allocate memory (10 OP)"));

    expect(window.gameState?.purchases.AllocateMemory.inProgress).toBe(true);
  });

  it("purchase completes after 1s", async () => {
    render(<App />);
    const user = setupUserEvent();

    await user.click(screen.getByText("Allocate memory (10 OP)"));
    vi.advanceTimersByTime(TICK_INTERVAL * 10); // 10 OP / (at least) 10 OP/s => wait 1s.

    expect(window.gameState?.purchases.AllocateMemory.inProgress).toBe(false);
    expect(window.gameState?.purchases.AllocateMemory.purchaseCount).toBe(1);
    expect(window.gameState?.memory.cells.length).toBe(2);
  });

  it("purchase updates UI", async () => {
    render(<App />);
    const user = setupUserEvent();

    screen.getByText("Allocated 1 B");

    await user.click(screen.getByText("Allocate memory (10 OP)"));
    vi.advanceTimersByTime(TICK_INTERVAL * 10);
    await triggerChangeDetection(user);

    screen.getByText("Allocated 2 B");
    screen.getByText("Allocate memory (20 OP)");
  });
});
