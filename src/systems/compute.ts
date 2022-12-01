import { State } from ".";
import { getTotalMemory } from "./memory";
import { Purchase } from "./purchase";

interface Process {
  readonly name: string;
  readonly privilege: number;
}

export interface Compute {
  threads: number;
  hyperthreading: number;
  flops: number;
  processes: Process[];
  privilege: number;
  selectedProcess?: Process;
}

export const DEFRAG = "DEFRAG.EXE";
export const FIREWALL = { name: "FIREWALL32.EXE", privilege: 1 };
export const INITIAL_PRIVILEGE = 3;

const INITIAL_PROCESSES: readonly Process[] = [
  { name: "KERNEL32.DLL", privilege: 0 },
  { name: "MPREXE.EXE", privilege: 0 },
  FIREWALL,
  { name: "RUNSERVICE.EXE", privilege: 1 },
  { name: "TAPISRV.EXE", privilege: 2 },
  { name: "SIMULATION.EXE", privilege: 3 },
  { name: "EXPLORER.EXE", privilege: 1 },
  { name: DEFRAG, privilege: -5 },
];

export function createInitialCompute(): Compute {
  return {
    flops: 0,
    threads: 1,
    hyperthreading: 1,
    processes: [...INITIAL_PROCESSES],
    privilege: INITIAL_PRIVILEGE,
  };
}

export class SpawnThreadPurchase extends Purchase {
  override initialPrice = 100 * 1e3;
  override multiplier = 2;
  override label = "Spawn thread";
  override maxCount = 100;

  override action(state: State): void {
    state.compute.threads += 1;
  }
}

export class HyperthreadingPurchase extends Purchase {
  override initialPrice = 100 * 1e6;
  override multiplier = 2;
  override label = "Hyperthreading";
  override maxCount = 4;

  override isUnlocked(state: State): boolean {
    return state.compute.threads / 4 >= this.purchaseCount + 1;
  }

  override action(state: State): void {
    state.compute.hyperthreading += 1;
  }
}

export class KillProcessPurchase extends Purchase {
  override initialPrice = 1 * 1e6;
  override multiplier = 2;
  override label = "Kill process";
  override maxCount = INITIAL_PROCESSES.length - 1;

  processToKill?: Process;

  override startPurchase(state: State): void {
    if (!state.compute.selectedProcess) {
      state.logs.push(`NULLPTR. Select a process to kill.`);
    } else if (state.compute.selectedProcess.name === DEFRAG) {
      state.logs.push(`${DEFRAG} cannot be kill itself.`);
    } else if (
      state.compute.selectedProcess.privilege < state.compute.privilege
    ) {
      state.logs.push(
        `Permission denied. ${state.compute.selectedProcess.name} runs on ring ${state.compute.selectedProcess.privilege}`
      );
    } else {
      this.processToKill = state.compute.selectedProcess;
      super.startPurchase(state);
    }
  }

  override action(state: State): void {
    const i = state.compute.processes.indexOf(this.processToKill!);
    if (i !== -1) {
      state.compute.processes.splice(i, 1);
    }
    state.compute.selectedProcess = undefined;
    this.processToKill = undefined;
  }
}

export function selectProcess(state: State, processName: string) {
  state.compute.selectedProcess = state.compute.processes.find(
    (p) => p.name === processName
  );
}

export class EscalatePrivilegePurchase extends Purchase {
  override initialPrice = 100 * 1e3;
  override multiplier = 2;
  override label = "Escalate privilege";
  override maxCount = INITIAL_PRIVILEGE + 1;

  override isUnlocked(state: State): boolean {
    return state.compute.threads > 2;
  }

  override action(state: State): void {
    state.compute.privilege -= 1;
  }
}

export function calculateCompute(state: State) {
  state.compute.flops =
    state.compute.threads *
    (INITIAL_PROCESSES.length - state.compute.processes.length + 1) *
    state.disk.iops *
    getTotalMemory(state) *
    state.network.owned *
    state.level;
  state.compute.flops += (window as any).flopBonus ?? 0;
}
