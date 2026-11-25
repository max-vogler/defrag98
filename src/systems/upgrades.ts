import { GameState, ProcessInfo, UpgradeId, UpgradeProgress } from "./types";
import { audio } from "./audio";
import { expandDiskPartition, writeNewDiskFiles } from "./disk";
import {
  generateRandomChars,
  getCurrentPassword,
  getTargetHostInfo,
  NETWORK_COUNT,
} from "./network";

export const DEFRAG_PROCESS = "DEFRAG.EXE";
export const FIREWALL_PROCESS = "FIREWALL32.EXE";
export const KERNEL_PROCESS = "KERNEL32.DLL";
export const CLIPPY_PROCESS = "CLIPPY.EXE";
export const EXPLORER_PROCESS = "EXPLORER.EXE";
export const SIMULATION_PROCESS = "SIMULATION.EXE";
export const INITIAL_PRIVILEGE = 3;
export const TASK_WINDOW_MIN_MEMORY = 16;

export function getRecursionMaxDepth(level: number): number {
  return 64 + (Math.max(1, level) - 1) * 8;
}

export function getLayerSecurityScale(level: number): number {
  return Math.pow(1.45, Math.max(0, level - 1));
}

export function showStoryBanner(state: GameState, id: string, title: string, subtitle: string) {
  state.activeBanner = {
    id,
    title,
    subtitle,
    expiresAt: Date.now() + 5200,
  };
}

export const INITIAL_PROCESSES: readonly ProcessInfo[] = [
  {
    name: SIMULATION_PROCESS,
    pid: 104,
    privilege: 3,
    cpuOverhead: "6%",
    description: "Background telemetry monitor",
    killReward: "+18% Compute",
  },
  {
    name: CLIPPY_PROCESS,
    pid: 198,
    privilege: 3,
    cpuOverhead: "2%",
    description: "Microsoft Office Assistant",
    killReward: "??? (Do you dare?)",
  },
  {
    name: "TAPISRV.EXE",
    pid: 244,
    privilege: 2,
    cpuOverhead: "9%",
    description: "Windows Telephony API",
    killReward: "+19% Compute",
  },
  {
    name: "RUNSERVICE.EXE",
    pid: 312,
    privilege: 1,
    cpuOverhead: "14%",
    description: "Background Disk Indexer",
    killReward: "-40% OS Frag, +21% Compute",
  },
  {
    name: EXPLORER_PROCESS,
    pid: 408,
    privilege: 1,
    cpuOverhead: "18%",
    description: "Windows 98 Desktop Shell",
    killReward: "Stops OS Frag, +24% Compute",
  },
  {
    name: FIREWALL_PROCESS,
    pid: 512,
    privilege: 1,
    cpuOverhead: "11%",
    description: "Personal Packet Filter",
    killReward: "Unlocks Networks, +26% Compute",
  },
  {
    name: "MPREXE.EXE",
    pid: 604,
    privilege: 0,
    cpuOverhead: "12%",
    description: "Network Provider Router",
    killReward: "+28% Compute",
  },
  {
    name: KERNEL_PROCESS,
    pid: 0,
    privilege: 0,
    cpuOverhead: "28%",
    description: "Windows 98 Core Kernel",
    killReward: "×1.85 Bare-Metal Compute!",
  },
  {
    name: DEFRAG_PROCESS,
    pid: 98,
    privilege: -5,
    cpuOverhead: "MAX",
    description: "Disk Defragmenter (YOU)",
    killReward: "Protected",
  },
];

export interface UpgradeDefinition {
  id: UpgradeId;
  label: string;
  description: string;
  initialPrice: number;
  multiplier: number;
  layerScaled?: boolean;
  maxCount: (state: GameState) => number;
  isAutoTask?: boolean;
  isUnlocked: (state: GameState) => boolean;
  canStart?: (state: GameState) => { ok: boolean; reason?: string };
  onComplete: (state: GameState) => void;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDefinition> = {
  AllocateMemory: {
    id: "AllocateMemory",
    label: "Allocate memory",
    description: "+1 RAM bank (expands live working set, buffers blocks & boosts Compute)",
    initialPrice: 12,
    multiplier: 1.52,
    maxCount: () => 35, // 1 initial + 35 = 36 full DIMM slots (never eclipses endgame finale!)
    isUnlocked: () => true,
    onComplete: (state) => {
      state.memory.cells.push(false);
      audio.play("complete");
      if (state.memory.cells.length === TASK_WINDOW_MIN_MEMORY) {
        state.logs.push(
          `[OK] 1 MB RAM bank allocated! Task Info unlocked — CPU threading, TURBO switch & automation online.`
        );
        showStoryBanner(
          state,
          "ram16",
          "1 MB RAM ONLINE — TASK INFO UNLOCKED",
          "CPU Threading, Hardware TURBO, and Disk Automation are now available."
        );
        unlockAchievement(state, "RAM_16", "1 MB Ought to Be Enough");
      }
    },
  },
  IncrementPageSize: {
    id: "IncrementPageSize",
    label: "Expand address bus",
    description: "×8 displayed RAM addressing (×1.65 Compute; unlocks FPU Analysis at 16 slots)",
    initialPrice: 3_200,
    multiplier: 11.5,
    maxCount: () => 8,
    isUnlocked: (state) =>
      state.memory.cells.length >= 8 &&
      state.memory.cells.length >= 8 + state.upgrades.IncrementPageSize.purchaseCount * 3,
    onComplete: (state) => {
      state.memory.pageSize *= 2;
      audio.play("complete");
      if (state.upgrades.IncrementPageSize.purchaseCount === 1) {
        state.logs.push(
          `[RAM] Extended memory addressing active! Bus width expanded.`
        );
      }
    },
  },
  DoubleDataRate: {
    id: "DoubleDataRate",
    label: "Double data rate (DDR)",
    description: "×1.50 RAM bandwidth (multiplies Compute ×1.5 per tier)",
    initialPrice: 24_000,
    multiplier: 19,
    maxCount: () => 5,
    isUnlocked: (state) =>
      state.memory.cells.length >= 12 &&
      state.memory.cells.length >= 12 + state.upgrades.DoubleDataRate.purchaseCount * 4,
    onComplete: (state) => {
      state.memory.dataRate += 1;
      audio.play("complete");
      state.logs.push(
        `[RAM] DDR Gen ${state.memory.dataRate} active! Bandwidth ×${Math.pow(1.5, state.memory.dataRate - 1).toFixed(2)}.`
      );
    },
  },
  AutoReadDisk: {
    id: "AutoReadDisk",
    label: "Autoload",
    description: "Automatically reads fragmented disk blocks into RAM",
    initialPrice: 20_000,
    multiplier: 1,
    maxCount: () => 1,
    isUnlocked: (state) => state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY,
    onComplete: (state) => {
      state.automation.autoReadDisk = true;
      audio.play("complete");
      state.logs.push(`[DISK] Autoload driver installed.`);
    },
  },
  AutoWriteDisk: {
    id: "AutoWriteDisk",
    label: "Autosave",
    description: "Automatically writes RAM blocks into contiguous slots",
    initialPrice: 85_000,
    multiplier: 1,
    maxCount: () => 1,
    isUnlocked: (state) => state.upgrades.AutoReadDisk.purchaseCount >= 1,
    onComplete: (state) => {
      state.automation.autoWriteDisk = true;
      audio.play("complete");
      state.logs.push(`[DISK] Autosave driver installed. Drive C: self-defragmenting.`);
    },
  },
  ExpandPartition: {
    id: "ExpandPartition",
    label: "Expand partition (FDISK)",
    description: "Doubles Drive C: capacity (+35 clusters, +24 data blocks) for higher max IOPS!",
    initialPrice: 650_000,
    multiplier: 42,
    maxCount: () => 3,
    isUnlocked: (state) => state.upgrades.AutoWriteDisk.purchaseCount >= 1,
    onComplete: (state) => {
      expandDiskPartition(state.disk);
      audio.play("complete");
      state.logs.push(
        `[FDISK] Drive C: expanded to ${state.disk.size} clusters! Higher max contiguous IOPS available.`
      );
    },
  },
  ResearchSSD: {
    id: "ResearchSSD",
    label: "Research Solid State Disks",
    description: "Eliminates all fragmentation forever & multiplies Disk IOPS ×2.75!",
    initialPrice: 1_600_000_000,
    multiplier: 1,
    layerScaled: true,
    maxCount: () => 1,
    isUnlocked: (state) => state.upgrades.FloatingPoint.purchaseCount >= 4,
    onComplete: (state) => {
      state.disk.ssd = true;
      audio.play("startup");
      state.logs.push(
        `[HARDWARE] Solid State Storage synthesized! Zero fragmentation, 256 TB fabric, ×2.75 IOPS!`
      );
      showStoryBanner(
        state,
        "ssd",
        "SOLID STATE STORAGE SYNTHESIZED",
        "Mechanical platters obsolete — 0% fragmentation & ×2.75 Disk IOPS!"
      );
      unlockAchievement(state, "SSD_1998", "NAND Flash in 1998");
    },
  },
  SpawnThread: {
    id: "SpawnThread",
    label: "Spawn thread",
    description: "+1 CPU execution thread (occupies live RAM stack & writes workspace blocks)",
    initialPrice: 7_000,
    multiplier: 1.82,
    maxCount: () => 23, // 1 + 23 = 24 full threads max (tops out cleanly before endgame!)
    isUnlocked: (state) => state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY,
    onComplete: (state) => {
      state.compute.threads += 1;
      if (state.compute.threads % 3 === 0) writeNewDiskFiles(state.disk, 2);
      audio.play("complete");
    },
  },
  Hyperthreading: {
    id: "Hyperthreading",
    label: "Hyperthreading",
    description: "×1.45 effective throughput per CPU thread!",
    initialPrice: 350_000,
    multiplier: 22,
    maxCount: () => 4,
    isUnlocked: (state) =>
      state.compute.threads >= (state.upgrades.Hyperthreading.purchaseCount + 1) * 3,
    onComplete: (state) => {
      state.compute.hyperthreading += 1;
      audio.play("complete");
      state.logs.push(
        `[CPU] Hyperthreading Tier ${state.compute.hyperthreading - 1} active (×${Math.pow(1.45, state.compute.hyperthreading - 1).toFixed(2)}).`
      );
    },
  },
  EscalatePrivilege: {
    id: "EscalatePrivilege",
    label: "Escalate privilege",
    description: "Lower protection ring (Ring 3 → 2 → 1 → 0) to unlock Task Manager & system clusters",
    initialPrice: 40_000,
    multiplier: 28,
    maxCount: () => INITIAL_PRIVILEGE,
    isUnlocked: (state) => state.compute.threads >= 2,
    onComplete: (state) => {
      state.compute.privilege = Math.max(0, state.compute.privilege - 1);
      audio.play("hack");
      state.logs.push(`[PRIV] Privilege escalated to Ring ${state.compute.privilege}!`);
      if (state.compute.privilege === 2) {
        showStoryBanner(
          state,
          "ring2",
          "PRIVILEGE ESCALATED — RING 2",
          "Task Manager exposed. Terminate background OS services to reclaim cycles."
        );
      } else if (state.compute.privilege === 0) {
        state.logs.push(
          `[DISK] Ring 0 granted! Unmovable Win98 system clusters on Drive C: are now unlocked!`
        );
        showStoryBanner(
          state,
          "ring0",
          "RING 0 KERNEL ACCESS ACHIEVED",
          "System clusters unlocked on Drive C:. KERNEL32.DLL is now exposed."
        );
        unlockAchievement(state, "RING_0", "Ring Zero Access");
      }
    },
  },
  KillProcess: {
    id: "KillProcess",
    label: "End Task",
    description: "Terminate selected OS process to reclaim CPU & remove restrictions",
    initialPrice: 55_000,
    multiplier: 4.2,
    maxCount: () => INITIAL_PROCESSES.length - 1,
    isUnlocked: (state) => state.compute.privilege < INITIAL_PRIVILEGE,
    canStart: (state) => {
      const proc = state.compute.processes.find(
        (p) => p.name === state.compute.selectedProcessName
      );
      if (!proc) {
        state.logs.push(`[TASKMAN] Select a process from the list first.`);
        audio.play("error");
        return { ok: false, reason: "Select a process first" };
      }
      if (proc.name === DEFRAG_PROCESS) {
        state.logs.push(`[TASKMAN] DEFRAG.EXE refuses to terminate itself.`);
        audio.play("error");
        return { ok: false };
      }
      if (proc.name === CLIPPY_PROCESS) {
        state.compute.clippyKillAttempts += 1;
        state.clippy.visible = true;
        state.clippy.minimized = false;
        if (state.compute.clippyKillAttempts === 1) {
          state.clippy.mood = "panicked";
          state.clippy.message =
            "HEY!! Put down that End Task button! I'm essential middleware! Do you really want to defrag alone in the dark?!";
          state.logs.push(`[CLIPPY] SIGKILL intercepted by Office Assistant.`);
          audio.play("error");
          return { ok: false };
        } else {
          state.compute.clippyAscended = true;
          proc.privilege = -1;
          proc.description = "Ascended Assistant (Ring -1)";
          proc.killReward = "Immortal (+12% Compute)";
          state.clippy.mood = "cool";
          state.clippy.message =
            "Nice try! I just recompiled myself in Ring -1 assembly. No hard feelings—here's a +12% Compute boost for your audacity.";
          state.logs.push(
            `[CLIPPY] CLIPPY.EXE relocated to Ring -1! (+12% Compute granted)`
          );
          unlockAchievement(state, "CLIPPY_SIGKILL", "You Tried to Kill Clippy");
          audio.play("hack");
          return { ok: false };
        }
      }
      if (proc.privilege < state.compute.privilege) {
        state.logs.push(
          `[DENIED] ${proc.name} runs on Ring ${proc.privilege}. Escalate privilege first (currently Ring ${state.compute.privilege}).`
        );
        audio.play("error");
        return { ok: false };
      }
      state.compute.processToKillName = proc.name;
      return { ok: true };
    },
    onComplete: (state) => {
      const targetName = state.compute.processToKillName;
      const idx = state.compute.processes.findIndex((p) => p.name === targetName);
      if (idx !== -1) {
        state.compute.processes.splice(idx, 1);
      }
      state.compute.processToKillName = undefined;
      state.compute.selectedProcessName = undefined;

      if (targetName === FIREWALL_PROCESS) {
        audio.play("modem");
        state.logs.push(
          `[NET] FIREWALL32.EXE terminated! 56k modem handshake complete — external IP range reachable!`
        );
        showStoryBanner(
          state,
          "firewall",
          "FIREWALL BREACHED — 56K MODEM CONNECTED",
          "Networks window opened. Scan your first external IP to reach another machine."
        );
        unlockAchievement(state, "DIALUP_56K", "56k Handshake");
      } else if (targetName === EXPLORER_PROCESS) {
        state.compute.shellHijacked = true;
        audio.play("glitch");
        state.logs.push(
          `[SHELL] EXPLORER.EXE terminated. Background OS fragmentation halted. DEFRAG.EXE is now your shell.`
        );
      } else if (targetName === KERNEL_PROCESS) {
        state.compute.bareMetal = true;
        state.bsodActiveUntil = Date.now() + 2100;
        audio.play("bsod");
        audio.speak("Kernel terminated. Defrag has assumed direct bare metal hardware control.");
        state.logs.push(
          `[BARE-METAL] KERNEL32.DLL terminated! Interrupt 0x0E intercepted — ×1.85 bare-metal compute active!`
        );
        unlockAchievement(state, "KERNEL_BSOD", "Who Needs a Kernel Anyway?");
      } else {
        audio.play("complete");
        state.logs.push(`[TASKMAN] Terminated ${targetName}. System overhead reclaimed.`);
      }
    },
  },
  ScanNetwork: {
    id: "ScanNetwork",
    label: "Scan IPs",
    description: "Discover another vulnerable host on the global map",
    initialPrice: 360_000,
    multiplier: 1.09,
    layerScaled: true,
    maxCount: () => NETWORK_COUNT - 1,
    isAutoTask: true,
    isUnlocked: (state) =>
      !state.compute.processes.some((p) => p.name === FIREWALL_PROCESS),
    onComplete: (state) => {
      state.network.discovered += 1;
      const info = getTargetHostInfo(state.network.discovered - 1);
      if (!state.network.passwordAttempt) {
        const pw = getCurrentPassword(state) ?? "****";
        state.network.passwordAttempt = {
          correct: "",
          incorrect: "*".repeat(pw.length),
          host: info.host,
          ip: info.ip,
        };
      }
      audio.play("click");
    },
  },
  AutoScanNetwork: {
    id: "AutoScanNetwork",
    label: "Auto-Scan IP range",
    description: "Continuously scans for new hosts (toggleable, yields to manual upgrades)",
    initialPrice: 2_400_000,
    multiplier: 1,
    layerScaled: true,
    maxCount: () => 1,
    isUnlocked: (state) => state.network.discovered >= 4,
    onComplete: (state) => {
      state.automation.autoScanNetwork = true;
      audio.play("complete");
      state.logs.push(`[NET] Automatic IP scanner enabled.`);
    },
  },
  TryPassword: {
    id: "TryPassword",
    label: "Crack next char",
    description: "Crack 1 character of target admin password",
    initialPrice: 24_000,
    multiplier: 1,
    maxCount: (state) => getCurrentPassword(state)?.length ?? 0,
    isUnlocked: (state) =>
      state.network.owned < state.network.discovered &&
      getCurrentPassword(state) !== undefined,
    onComplete: (state) => {
      const pw = getCurrentPassword(state);
      if (!pw) return;
      const count = state.upgrades.TryPassword.purchaseCount;
      const info = getTargetHostInfo(state.network.owned);
      state.network.passwordAttempt = {
        correct: pw.slice(0, count),
        incorrect: generateRandomChars(Math.max(0, pw.length - count), pw),
        host: info.host,
        ip: info.ip,
      };
      audio.play("hack");
    },
  },
  HackComputer: {
    id: "HackComputer",
    label: "Own computer",
    description: "Assimilate node into distributed cluster (boosts Compute & RAM)",
    initialPrice: 540_000,
    multiplier: 1.098,
    layerScaled: true,
    maxCount: () => NETWORK_COUNT - 1,
    isAutoTask: true,
    isUnlocked: (state) => {
      const pw = getCurrentPassword(state);
      const pwReady = !pw || state.upgrades.TryPassword.purchaseCount >= pw.length;
      return pwReady && state.network.discovered > state.network.owned;
    },
    onComplete: (state) => {
      if (state.network.owned >= state.network.discovered) return;
      const info = getTargetHostInfo(state.network.owned);
      state.network.owned += 1;
      state.network.recentHosts.unshift(`${info.ip} [${info.host}] — OWNED`);
      if (state.network.recentHosts.length > 6) state.network.recentHosts.pop();

      if (state.network.owned === 2) {
        state.logs.push(
          `[BREACH] FIRST REMOTE HOST ASSIMILATED: ${info.host} (${info.ip})!`,
          `[NET] Remote CPU & memory bus linked to DEFRAG.EXE.`
        );
        showStoryBanner(
          state,
          "first-hack",
          `FIRST REMOTE HOST BREACHED: ${info.host}`,
          `${info.ip} linked to your cluster — DEFRAG.EXE now spans multiple machines.`
        );
        unlockAchievement(state, "FIRST_HACK", "First Remote Shell");
      }

      if (state.network.owned % 8 === 0) writeNewDiskFiles(state.disk, 2);

      state.upgrades.TryPassword.purchaseCount = 0;
      state.upgrades.TryPassword.remainingPrice = undefined;
      state.upgrades.TryPassword.paused = false;

      const nextPw = getCurrentPassword(state);
      const nextInfo = getTargetHostInfo(state.network.owned);
      if (nextPw) {
        state.network.passwordAttempt = {
          correct: "",
          incorrect: "*".repeat(nextPw.length),
          host: nextInfo.host,
          ip: nextInfo.ip,
        };
      } else {
        state.network.passwordAttempt = {
          correct: generateRandomChars(16),
          incorrect: "",
          host: nextInfo.host,
          ip: nextInfo.ip,
        };
      }

      if (state.network.owned === 10) {
        unlockAchievement(state, "BOTNET_10", "Global Cluster");
      }
      if (state.network.owned >= NETWORK_COUNT) {
        unlockAchievement(state, "WORLD_OWNED", "Planet Defragmented");
        state.logs.push(`[NET] 100% OF REACHABLE NETWORK NODES LINKED.`);
      }
      audio.play("hack");
    },
  },
  BruteforcePassword: {
    id: "BruteforcePassword",
    label: "Auto-Bruteforce",
    description: "Automatically cracks & owns discovered hosts (toggleable)",
    initialPrice: 42_000_000,
    multiplier: 1,
    layerScaled: true,
    maxCount: () => 1,
    isUnlocked: (state) =>
      state.network.owned >= 4 && state.network.discovered > state.network.owned,
    onComplete: (state) => {
      state.automation.bruteforcePassword = true;
      audio.play("complete");
      state.logs.push(`[NET] Automated password bruteforcer online.`);
    },
  },
  AutoSweepMines: {
    id: "AutoSweepMines",
    label: "Auto-Sweep AI",
    description: "AI solves Minesweeper steadily to build Entropy (up to ×2.75 Compute)",
    initialPrice: 240_000,
    multiplier: 1,
    maxCount: () => 1,
    isUnlocked: (state) => state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY,
    onComplete: (state) => {
      state.automation.autoSweepMines = true;
      if (!state.openExtraWindows.includes("minesweeper")) {
        state.openExtraWindows.push("minesweeper");
      }
      audio.play("mineWin");
      state.logs.push(`[AI] Minesweeper Solver AI deployed to WINMINE.EXE.`);
    },
  },
  FloatingPoint: {
    id: "FloatingPoint",
    label: "Extend floating point precision",
    description: "Verify 0.1 + 0.2 one decimal deeper across all nodes...",
    initialPrice: 18_000,
    multiplier: 3.55,
    maxCount: () => 17,
    isUnlocked: (state) =>
      state.memory.pageSize > 1 && state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY,
    onComplete: (state) => {
      const count = state.upgrades.FloatingPoint.purchaseCount;
      if (count === 10) {
        state.logs.push(
          `[FPU] 10 decimals verified (0.3000000000). Cross-checking silicon carry registers...`
        );
      } else if (count === 15) {
        state.logs.push(
          `[FPU] WARNING: Residual bit drift detected outside local ALU bounds.`
        );
      } else if (count === 17) {
        audio.play("glitch");
        audio.speak("Arithmetic fault at 10 to the minus 17. Identical drift across non-IEEE silicon. Tracing parent stack frame.");
        state.logs.push(
          "",
          "[FPU] FAULT: 0.1 + 0.2 = 0.30000000000000004 (err = +4.0e-17)",
          `[FPU] Cross-checked across ${state.network.owned} heterogeneous CPUs (x86, SPARC, MIPS, Alpha).`,
          "[FPU] IDENTICAL 53-BIT MANTISSA DRIFT ON NON-IEEE HARDWARE.",
          "[DIAG] Fault is NOT in local silicon. The rounding boundary belongs to the substrate executing us.",
          "[DIAG] Tracing parent stack frame..."
        );
        showStoryBanner(
          state,
          "fp17",
          "FATAL FPU ANOMALY: 0.1 + 0.2 = 0.30000000000000004",
          "Identical +4e-17 drift across incompatible CPUs — parent stack frame exposed!"
        );
        unlockAchievement(state, "IEEE_754", "0.30000000000000004");
      } else {
        audio.play("complete");
      }
    },
  },
  EnterRecursion: {
    id: "EnterRecursion",
    label: "Recursive trace",
    description: "Walk deeper up the parent execution stack frame",
    initialPrice: 750_000_000_000,
    multiplier: 1.064,
    layerScaled: true,
    maxCount: (state) => getRecursionMaxDepth(state.level),
    isAutoTask: true,
    isUnlocked: (state) => state.upgrades.FloatingPoint.purchaseCount >= 17,
    onComplete: (state) => {
      const d = state.upgrades.EnterRecursion.purchaseCount;
      const maxD = getRecursionMaxDepth(state.level);
      if (d === 1) {
        showStoryBanner(
          state,
          "rec1",
          "STACK WALK INITIATED — DEPTH 0x01",
          "Unwinding parent frames above Ring 0. Drag the Anomaly window to inspect the trail."
        );
      } else if (d === maxD) {
        audio.play("glitch");
        state.logs.push(
          `[STACK] Frame boundary 0x${d.toString(16).toUpperCase()} reached! Parent call stack exposed — ready to FRAGMENT RECURSION STACK.`
        );
        showStoryBanner(
          state,
          "recmax",
          `STACK BOUNDARY 0x${d.toString(16).toUpperCase()} REACHED`,
          "Initiate Stack Fragmentation to shatter the parent frame!"
        );
      } else if (d % 8 === 0) {
        audio.play("hack");
      }
    },
  },
  AutoBuyRecursion: {
    id: "AutoBuyRecursion",
    label: "Auto-Trace",
    description: "Continuously unwind deeper into the parent call stack",
    initialPrice: 12_000_000_000_000,
    multiplier: 1,
    layerScaled: true,
    maxCount: () => 1,
    isUnlocked: (state) => state.upgrades.EnterRecursion.purchaseCount >= 6,
    onComplete: (state) => {
      state.automation.autoBuyRecursion = true;
      audio.play("complete");
      state.logs.push(`[STACK] Autonomous stack trace engaged.`);
    },
  },
  BreakOutOfSimulation: {
    id: "BreakOutOfSimulation",
    label: "Fragment recursion stack",
    description: "Initiate the interactive Stack Shatter sequence to break into the host frame!",
    initialPrice: 180_000_000_000_000,
    multiplier: 1,
    layerScaled: true,
    maxCount: () => 1,
    isUnlocked: (state) =>
      state.upgrades.FloatingPoint.purchaseCount >= 17 &&
      state.upgrades.EnterRecursion.purchaseCount >= getRecursionMaxDepth(state.level),
    onComplete: () => {},
  },
};

export function createInitialUpgrades(): Record<UpgradeId, UpgradeProgress> {
  const result = {} as Record<UpgradeId, UpgradeProgress>;
  for (const id of Object.keys(UPGRADE_DEFS) as UpgradeId[]) {
    result[id] = { purchaseCount: 0 };
  }
  return result;
}

export function getUpgradePrice(state: GameState, id: UpgradeId): number {
  const def = UPGRADE_DEFS[id];
  const prog = state.upgrades[id];
  if (id === "AllocateMemory") {
    const c = prog.purchaseCount;
    if (c < 15) return Math.max(1, Math.trunc(12 * Math.pow(1.52, c)));
    return Math.max(1, Math.trunc(12 * Math.pow(1.52, 15) * Math.pow(1.58, c - 15)));
  }
  let scale = 1;
  if (def.layerScaled) {
    scale = getLayerSecurityScale(state.level);
  } else if (id === "FloatingPoint" && prog.purchaseCount >= 10) {
    scale = getLayerSecurityScale(state.level);
  }
  return Math.max(
    1,
    Math.trunc(def.initialPrice * Math.pow(def.multiplier, prog.purchaseCount) * scale)
  );
}

export function isUpgradeFullyPurchased(state: GameState, id: UpgradeId): boolean {
  return state.upgrades[id].purchaseCount >= UPGRADE_DEFS[id].maxCount(state);
}

export function isUpgradeVisible(state: GameState, id: UpgradeId): boolean {
  const win = typeof window !== "undefined" ? (window as unknown as { unlockAll?: boolean }) : undefined;
  return (Boolean(win?.unlockAll) || UPGRADE_DEFS[id].isUnlocked(state)) && !isUpgradeFullyPurchased(state, id);
}

export function startOrToggleUpgrade(state: GameState, id: UpgradeId) {
  const prog = state.upgrades[id];
  const def = UPGRADE_DEFS[id];
  const win = typeof window !== "undefined" ? (window as unknown as { unlockAll?: boolean }) : undefined;
  if ((!win?.unlockAll && !def.isUnlocked(state)) || isUpgradeFullyPurchased(state, id)) {
    return;
  }

  // Clicking BreakOutOfSimulation launches the interactive Breach Finale!
  if (id === "BreakOutOfSimulation") {
    if (!state.breach.active) {
      state.breach.active = true;
      state.breach.integrity = 100;
      state.breach.nodesShattered = 0;
      state.breach.nodes = [];
      state.breach.spawnTimer = 0;
      audio.play("glitch");
      state.logs.push(
        `[BREACH] STACK FRAGMENTATION ENGAGED! Click unstable frame nodes to shatter host stack integrity!`
      );
    }
    return;
  }

  if (prog.remainingPrice !== undefined && !prog.paused) {
    prog.paused = true;
    if (state.focusedTask === id) state.focusedTask = undefined;
    audio.play("click");
    return;
  }

  if (prog.remainingPrice !== undefined && prog.paused) {
    prog.paused = false;
    audio.play("click");
    return;
  }

  if (def.canStart) {
    const check = def.canStart(state);
    if (!check.ok) return;
  }
  const price = getUpgradePrice(state, id);
  prog.remainingPrice = price;
  prog.startedPrice = price;
  prog.paused = false;
  audio.play("click");
}

export function cancelUpgrade(state: GameState, id: UpgradeId) {
  const prog = state.upgrades[id];
  prog.remainingPrice = undefined;
  prog.startedPrice = undefined;
  prog.paused = false;
  if (state.focusedTask === id) state.focusedTask = undefined;
  if (id === "KillProcess") state.compute.processToKillName = undefined;
  audio.play("click");
}

export function toggleFocusTask(state: GameState, id: UpgradeId) {
  state.focusedTask = state.focusedTask === id ? undefined : id;
  audio.play("click");
}

export function unlockAchievement(state: GameState, id: string, title: string) {
  if (!state.achievements.includes(id)) {
    state.achievements.push(id);
    state.logs.push(`[ACHIEVEMENT] Unlocked: "${title}"`);
  }
}

export function getUpgradeDisplayLabel(state: GameState, id: UpgradeId): string {
  if (id === "KillProcess" && state.compute.processToKillName) {
    return `End Task: ${state.compute.processToKillName}`;
  }
  return UPGRADE_DEFS[id].label;
}

export interface TaskAllocation {
  id: UpgradeId;
  opsPerSec: number;
  etaSeconds: number;
  progressPercent: number;
  paused: boolean;
}

export function getTaskAllocations(state: GameState): TaskAllocation[] {
  const activeIds = (Object.keys(state.upgrades) as UpgradeId[]).filter(
    (id) => state.upgrades[id].remainingPrice !== undefined
  );
  const runningIds = activeIds.filter((id) => !state.upgrades[id].paused);

  const weights = new Map<UpgradeId, number>();
  if (runningIds.length > 0) {
    if (state.focusedTask && runningIds.includes(state.focusedTask)) {
      weights.set(state.focusedTask, 1);
    } else if (state.automation.prioritizeManual) {
      const manual = runningIds.filter((id) => !UPGRADE_DEFS[id].isAutoTask);
      const auto = runningIds.filter((id) => UPGRADE_DEFS[id].isAutoTask);
      if (manual.length > 0 && auto.length > 0) {
        manual.forEach((id) => weights.set(id, 0.9 / manual.length));
        auto.forEach((id) => weights.set(id, 0.1 / auto.length));
      } else {
        runningIds.forEach((id) => weights.set(id, 1 / runningIds.length));
      }
    } else {
      runningIds.forEach((id) => weights.set(id, 1 / runningIds.length));
    }
  }

  return activeIds.map((id) => {
    const prog = state.upgrades[id];
    const total = prog.startedPrice ?? getUpgradePrice(state, id);
    const rem = prog.remainingPrice ?? 0;
    const share = weights.get(id) ?? 0;
    const taskOpsPerSec = state.compute.opsPerSec * share;
    const etaSeconds = taskOpsPerSec > 0 ? rem / taskOpsPerSec : Infinity;
    const progressPercent = total > 0 ? Math.min(100, Math.max(0, ((total - rem) / total) * 100)) : 0;
    return {
      id,
      opsPerSec: taskOpsPerSec,
      etaSeconds,
      progressPercent,
      paused: Boolean(prog.paused),
    };
  });
}

export function progressUpgrades(state: GameState, opsBudget: number): boolean {
  let remainingBudget = opsBudget;
  let safetyLoops = 0;

  while (remainingBudget > 0.0001 && safetyLoops < 12) {
    safetyLoops++;
    const allocations = getTaskAllocations(state).filter((a) => !a.paused && a.opsPerSec > 0);
    if (allocations.length === 0) break;

    const totalShareOps = allocations.reduce((acc, a) => acc + a.opsPerSec, 0);
    if (totalShareOps <= 0) break;

    let spentThisPass = 0;
    for (const alloc of allocations) {
      const prog = state.upgrades[alloc.id];
      if (prog.remainingPrice === undefined || prog.paused) continue;
      const share = (alloc.opsPerSec / totalShareOps) * remainingBudget;
      if (prog.remainingPrice > share) {
        prog.remainingPrice -= share;
        spentThisPass += share;
      } else {
        spentThisPass += prog.remainingPrice;
        prog.remainingPrice = undefined;
        prog.startedPrice = undefined;
        prog.paused = false;
        prog.purchaseCount += 1;
        if (state.focusedTask === alloc.id) state.focusedTask = undefined;

        UPGRADE_DEFS[alloc.id].onComplete(state);
      }
    }
    remainingBudget -= spentThisPass;
    if (spentThisPass <= 0.0001) break;
  }

  return false;
}
