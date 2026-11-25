import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi, expect, afterEach } from "vitest";

import App from "../src/components/App";
import {
  activateHardwareTurbo,
  applySystems,
  calculateCompute,
  calculateIOPS,
  cancelUpgrade,
  createNewState,
  exportSaveCode,
  fragmentDisk,
  getDisplayedRamBytes,
  getMemoryCellRoles,
  getMinesweeperEntropyMultiplier,
  getRecursionMaxDepth,
  getTaskAllocations,
  importSaveCode,
  isCellLockedSystem,
  loadGame,
  performSimulationEscape,
  SAVE_STORAGE_KEY,
  saveGame,
  shatterBreachNode,
  startOrToggleUpgrade,
  TICK_INTERVAL,
  UPGRADE_DEFS,
} from "../src/systems";
import { unit } from "../src/text";
import { setupUserEvent } from "./base";

describe("DEFRAG~98 Second Edition v4", () => {
  beforeEach(() => {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    sessionStorage.removeItem(SAVE_STORAGE_KEY);
    window.name = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses proper SI prefixes and realistic RAM scaling (64 KB -> multi-TB/PB)", () => {
    expect(unit(1e3, "OP")).toBe("1\u00A0kOP");
    expect(unit(1e6, "OP")).toBe("1\u00A0MOP");
    expect(unit(1e9, "OP")).toBe("1\u00A0GOP");
    expect(unit(1e12, "OP")).toBe("1\u00A0TOP");

    const state = createNewState(1);
    expect(getDisplayedRamBytes(state)).toBe(64_000);
    state.memory.pageSize = 256; // 8 levels
    state.network.owned = 100;
    expect(getDisplayedRamBytes(state)).toBeGreaterThan(1e12); // > 1 TB!
  });

  it("blocks locked upgrades and requires interactive Breach Finale to escape cleanly once", () => {
    const state = createNewState(1);
    startOrToggleUpgrade(state, "BreakOutOfSimulation");
    expect(state.breach.active).toBe(false);

    // Unlock and start interactive Breach Finale
    state.upgrades.FloatingPoint.purchaseCount = 17;
    state.upgrades.EnterRecursion.purchaseCount = getRecursionMaxDepth(1);
    startOrToggleUpgrade(state, "BreakOutOfSimulation");
    expect(state.breach.active).toBe(true);
    expect(state.breach.integrity).toBe(100);

    // Spawn and shatter a node
    applySystems(state, 0.2);
    expect(state.breach.nodes.length).toBeGreaterThan(0);
    const beforeIntegrity = state.breach.integrity;
    shatterBreachNode(state, state.breach.nodes[0].id);
    expect(state.breach.integrity).toBeLessThan(beforeIntegrity);

    // Complete escape -> resets everything and blocks immediate re-trigger!
    performSimulationEscape(state);
    expect(state.level).toBe(2);
    expect(state.breach.active).toBe(false);
    expect(state.upgrades.FloatingPoint.purchaseCount).toBe(0);
    expect(state.upgrades.EnterRecursion.purchaseCount).toBe(0);
    expect(state.memory.cells.length).toBe(1);

    startOrToggleUpgrade(state, "BreakOutOfSimulation");
    expect(state.breach.active).toBe(false);
    expect(state.level).toBe(2);
  });

  it("keeps RAM alive with system roles and unlocks pinned system disk clusters at Ring 0", () => {
    const state = createNewState(1);
    expect(state.disk.systemCells.length).toBe(4);
    expect(isCellLockedSystem(state, state.disk.systemCells[0])).toBe(true);

    state.compute.privilege = 0;
    expect(isCellLockedSystem(state, state.disk.systemCells[0])).toBe(false);

    for (let i = 0; i < 16; i++) state.memory.cells.push(false);
    state.compute.threads = 6;
    state.network.owned = 10;
    const roles = getMemoryCellRoles(state);
    expect(roles).toContain("thread");
    expect(roles).toContain("socket");
  });

  it("persists saves via window.name fallback even when localStorage/sessionStorage are cleared", () => {
    const state = createNewState(1);
    state.memory.cells.push(false, false, false);
    saveGame(state);
    // Simulate sandboxed preview iframe without localStorage/sessionStorage
    localStorage.removeItem(SAVE_STORAGE_KEY);
    sessionStorage.removeItem(SAVE_STORAGE_KEY);

    const restored = loadGame();
    expect(restored).not.toBeNull();
    expect(restored!.memory.cells.length).toBe(4);
  });

  it("pauses, resumes, cancels without irreversible slowdown, and applies multipliers cleanly", () => {
    const state = createNewState(1);
    state.compute.processes = state.compute.processes.filter((p) => p.name !== "FIREWALL32.EXE");
    calculateCompute(state);

    startOrToggleUpgrade(state, "AllocateMemory");
    startOrToggleUpgrade(state, "ScanNetwork");
    const allocs = getTaskAllocations(state);
    expect(allocs.find((a) => a.id === "AllocateMemory")!.opsPerSec).toBeCloseTo(
      state.compute.opsPerSec * 0.9,
      5
    );

    startOrToggleUpgrade(state, "ScanNetwork"); // pause
    expect(state.upgrades.ScanNetwork.paused).toBe(true);
    cancelUpgrade(state, "ScanNetwork");
    expect(state.upgrades.ScanNetwork.remainingPrice).toBeUndefined();

    expect(activateHardwareTurbo(state)).toBe(true);
    expect(activateHardwareTurbo(state)).toBe(false);
    expect(getMinesweeperEntropyMultiplier(100)).toBe(2.75);
  });

  it("never deletes disk blocks during fragmentation and stops on SSD", () => {
    const state = createNewState(1);
    const beforeCount = state.disk.cells.filter(Boolean).length;
    for (let t = 0; t < 200; t++) fragmentDisk(state);
    expect(state.disk.cells.filter(Boolean).length).toBe(beforeCount);

    state.disk.ssd = true;
    const snap = [...state.disk.cells];
    for (let t = 0; t < 200; t++) fragmentDisk(state);
    expect(state.disk.cells).toEqual(snap);
  });

  it("renders spoiler-free desktop and completes Allocate memory", async () => {
    render(<App />);
    const user = setupUserEvent();
    expect(window.gameState?.memory.cells.length).toBe(1);
    await user.click(screen.getByText(/Allocate memory \(12\sOP\)/));
    expect(window.gameState?.upgrades.AllocateMemory.remainingPrice).toBeDefined();
    vi.advanceTimersByTime(TICK_INTERVAL * 50);
    expect(window.gameState?.memory.cells.length).toBe(2);
  });
});
