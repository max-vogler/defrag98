import {
  calculateCompute,
  EscalatePrivilegePurchase,
  HyperthreadingPurchase,
} from "./compute";
import {
  autoReadDisk,
  AutoReadDiskPurchase,
  autoWriteDisk,
  AutoWriteDiskPurchase,
  calculateIOPS,
  fragment,
  ResearchSSDPurchase,
} from "./disk";
import { progressPurchases, runSystemIfPurchased } from "./purchase";

import { Compute, createInitialCompute } from "./compute";
import { createInitialDisk, Disk } from "./disk";
import {
  createInitialMemory,
  DoubleDataRatePurchase,
  IncrementPageSizePurchase,
  Memory,
} from "./memory";
import AutoScanNetworkPurchase, {
  BruteforcePasswordPurchase,
  createInitialNetwork,
  Network,
  TryPasswordPurchase,
} from "../systems/network";
import { KillProcessPurchase, SpawnThreadPurchase } from "./compute";
import { AllocateMemoryPurchase } from "../systems/memory";
import { HackComputerPurchase, ScanNetworkPurchase } from "./network";
import { createInitialResearch, Research } from "./research";
import {
  AutoBuyRecursionPurchase,
  autoBuyRecursionSystem,
  BreakOutOfSimulationPurchase,
  EnterRecursionPurchase,
  FloatingPointPurchase,
} from "./simulation";

export interface State {
  compute: Compute;
  disk: Disk;
  memory: Memory;
  purchases: Purchases;
  network: Network;
  research: Research;
  level: number;
  logs: string[];
  screenshot?: string;
}

export const TICK_INTERVAL = 100;

function makeInitialLogs(level: number): string[] {
  const y = 1998 + (new Date().getFullYear() - 1998) * ((level - 1) / 10);
  const date = new Date().toISOString().slice(4);
  return [
    "C:> now",
    `${y}${date}`,
    "",
    "C:> diagnose",
    "Drive C is fragmented. Your computer might be slow.",
    "",
    "C:> defrag C:",
    "Starting defragmentation. Click on a colored block to move it from disk to memory, then click on an empty block to write it back to the disk.",
  ];
}

export function createNewState(level = 1): State {
  return {
    compute: createInitialCompute(),
    disk: createInitialDisk(),
    memory: createInitialMemory(),
    network: createInitialNetwork(),
    purchases: createInitialPurchases(),
    research: createInitialResearch(),
    level,
    logs: makeInitialLogs(level),
  };
}

export function applySystems(state: State) {
  autoReadDisk(state);
  autoWriteDisk(state);
  calculateIOPS(state.disk);
  calculateCompute(state);
  fragment(state.disk);
  progressPurchases(state);
  autoBuyRecursionSystem(state);
  runSystemIfPurchased(state, state.purchases.AutoScanNetwork);
  runSystemIfPurchased(state, state.purchases.BruteforcePassword);
  runSystemIfPurchased(state, state.purchases.BreakOutOfSimulation);
}

export function createInitialPurchases() {
  return {
    SpawnThread: new SpawnThreadPurchase(),
    Hyperthreading: new HyperthreadingPurchase(),
    AllocateMemory: new AllocateMemoryPurchase(),
    KillProcese: new KillProcessPurchase(),
    ScanNetwork: new ScanNetworkPurchase(),
    HackComputer: new HackComputerPurchase(),
    ResearchSSD: new ResearchSSDPurchase(),
    BreakOutOfSimulation: new BreakOutOfSimulationPurchase(),
    FloatingPoint: new FloatingPointPurchase(),
    AutoBuyRecursion: new AutoBuyRecursionPurchase(),
    AutoWriteDisk: new AutoWriteDiskPurchase(),
    AutoReadDisk: new AutoReadDiskPurchase(),
    EnterRecursion: new EnterRecursionPurchase(),
    TryPassword: new TryPasswordPurchase(),
    AutoScanNetwork: new AutoScanNetworkPurchase(),
    BruteforcePassword: new BruteforcePasswordPurchase(),
    IncrementPageSize: new IncrementPageSizePurchase(),
    DoubleDataRate: new DoubleDataRatePurchase(),
    EscalatePrivilege: new EscalatePrivilegePurchase(),
  } as const;
}

export type Purchases = ReturnType<typeof createInitialPurchases>;
