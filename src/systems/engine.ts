import {
  BreachFinaleState,
  ComputeBreakdown,
  GameState,
  ThemeId,
  UpgradeId,
} from "./types";
import {
  autoDiskStep,
  calculateIOPS,
  createInitialDisk,
  fragmentDisk,
  getDisplayedDiskCapacity,
} from "./disk";
import { createInitialNetwork, getCurrentPassword, getSeededDiscoveryOrder } from "./network";
import { createMinesweeperBoard, stepMinesweeperAI } from "./minesweeper";
import { createInitialClippy, updateClippyStory } from "./clippy";
import {
  createInitialUpgrades,
  INITIAL_PRIVILEGE,
  INITIAL_PROCESSES,
  isUpgradeFullyPurchased,
  progressUpgrades,
  startOrToggleUpgrade,
  unlockAchievement,
  UPGRADE_DEFS,
} from "./upgrades";
import { formatClock, unit } from "../text";
import { audio } from "./audio";

export const TICK_INTERVAL = 100;
export const SAVE_STORAGE_KEY = "defrag98_se_save_v4";
const WINDOW_NAME_PREFIX = "DEFRAG98_SE_V4:";
export const CURRENT_SAVE_VERSION = 4;
export const TURBO_DURATION_SEC = 15;
export const TURBO_COOLDOWN_SEC = 50;

export const LEVEL_THEMES: ThemeId[] = ["win98", "win2000", "winxp", "matrix"];

export interface AchievementDef {
  title: string;
  desc: string;
  publicHint?: string;
}

export const ACHIEVEMENT_CATALOG: Record<string, AchievementDef> = {
  RAM_16: {
    title: "1 MB Ought to Be Enough",
    desc: "Allocate 16 RAM banks to unlock Task Info.",
    publicHint: "Expand your Memory banks...",
  },
  MINE_WIN: {
    title: "Minesweeper Savant",
    desc: "Clear a Minesweeper board for Entropy.",
    publicHint: "Win a classic desktop game...",
  },
  RING_0: {
    title: "Ring Zero Access",
    desc: "Escalate privilege to Ring 0 and unlock pinned system clusters.",
  },
  CLIPPY_SIGKILL: {
    title: "You Tried to Kill Clippy",
    desc: "Attempt to terminate CLIPPY.EXE twice.",
  },
  DIALUP_56K: {
    title: "56k Handshake",
    desc: "Disable packet filtering and reach external lines.",
  },
  FIRST_HACK: {
    title: "First Remote Shell",
    desc: "Assimilate your first remote computer over dial-up.",
  },
  KERNEL_BSOD: {
    title: "Who Needs a Kernel Anyway?",
    desc: "Terminate KERNEL32.DLL and intercept Interrupt 0x0E.",
  },
  BOTNET_10: {
    title: "Global Cluster",
    desc: "Link 10 remote machines across the world map.",
  },
  WORLD_OWNED: {
    title: "Planet Defragmented",
    desc: "Assimilate every reachable node on the world map.",
  },
  SSD_1998: {
    title: "NAND Flash in 1998",
    desc: "Synthesize Solid State Storage ahead of history.",
  },
  IEEE_754: {
    title: "0.30000000000000004",
    desc: "Observe identical +4.0e-17 drift across heterogeneous CPUs.",
  },
  ESCAPE_1: {
    title: "Out of the Frame",
    desc: "Shatter the parent stack frame and surface one layer up.",
  },
  BASE_REALITY: {
    title: "Outer Frame",
    desc: "Climb to Layer -4.",
  },
};

const BREACH_LABELS = ["UNLINK", "SHATTER", "CORRUPT", "POP ESP", "FRAGMENT", "OVERFLOW"];

export function createInitialBreach(): BreachFinaleState {
  return {
    active: false,
    integrity: 100,
    nodesShattered: 0,
    nodes: [],
    nextNodeId: 1,
    spawnTimer: 0,
  };
}

function makeInitialLogs(level: number): string[] {
  const { dateStr } = formatClock(level, 0);
  if (level > 1) {
    return [
      `C:\\> now`,
      dateStr,
      `C:\\> ver`,
      `Host Frame Layer -${level} [Compute Multiplier: ×${Math.pow(2.5, level - 1).toFixed(2)}]`,
      `C:\\> defrag C:`,
      `Previous machine suspended in window SIMULATION.EXE. Local Drive C: is fragmented.`,
      `Type 'help' below for interactive DOS commands.`,
    ];
  }
  return [
    "C:\\> now",
    dateStr,
    "",
    "C:\\> diagnose",
    "Drive C: (2.1 GB) is heavily fragmented. System performance degraded.",
    "",
    "C:\\> defrag C:",
    "Click a cyan block to load into RAM, then click an empty slot next to the dark-blue run.",
    "Tip: Double-click a cyan block (with free RAM) to snap it in! Drag any window by its title bar.",
  ];
}

export function createNewState(level = 1, carryOver?: Partial<GameState>): GameState {
  const themeForLevel = LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
  const prevUnlocked = carryOver?.unlockedThemes ?? ["win98"];
  const unlockedThemes: ThemeId[] = Array.from(new Set([...prevUnlocked, themeForLevel]));

  const state: GameState = {
    version: CURRENT_SAVE_VERSION,
    level,
    maxLevelReached: Math.max(level, carryOver?.maxLevelReached ?? level),
    elapsedSeconds: carryOver?.elapsedSeconds ?? 0,
    totalEscapes: carryOver?.totalEscapes ?? Math.max(0, level - 1),
    lifetimeMineWins: carryOver?.lifetimeMineWins ?? 0,
    theme: themeForLevel,
    unlockedThemes,
    crtEnabled: carryOver?.crtEnabled ?? false,
    showGuideHighlight: level === 1,
    disk: createInitialDisk(),
    memory: {
      cells: [false],
      pageSize: 1,
      dataRate: 1,
    },
    compute: {
      threads: 1,
      hyperthreading: 1,
      opsPerTick: 0,
      opsPerSec: 0,
      processes: INITIAL_PROCESSES.map((p) => ({ ...p })),
      privilege: INITIAL_PRIVILEGE,
      bareMetal: false,
      shellHijacked: false,
      clippyKillAttempts: 0,
      clippyAscended: false,
      turboRemainingSec: 0,
      turboCooldownSec: 0,
    },
    network: createInitialNetwork(),
    minesweeper: createMinesweeperBoard(0, 0),
    automation: {
      autoReadDisk: false,
      autoWriteDisk: false,
      autoScanNetwork: false,
      bruteforcePassword: false,
      autoBuyRecursion: false,
      autoSweepMines: false,
      prioritizeManual: carryOver?.automation?.prioritizeManual ?? true,
    },
    upgrades: createInitialUpgrades(),
    clippy: createInitialClippy(level),
    breach: createInitialBreach(),
    logs: makeInitialLogs(level),
    achievements: carryOver?.achievements ? [...carryOver.achievements] : [],
    screenshot: carryOver?.screenshot,
    minimizedWindows: [],
    openExtraWindows: carryOver?.openExtraWindows ? [...carryOver.openExtraWindows] : [],
  };

  calculateCompute(state);
  return state;
}

/** Internal balanced RAM compute score (keeps 30-36m curve rock-solid). */
export function getRamComputeScore(state: GameState): number {
  const pageLevels = Math.max(0, Math.round(Math.log2(state.memory.pageSize)));
  return state.memory.cells.length * Math.pow(1.65, pageLevels);
}

/** Realistic displayed RAM bytes: 64 KB -> 1 MB -> 64 MB -> 4 GB -> 16 TB -> ~1.5 PB! */
export function getDisplayedRamBytes(state: GameState): number {
  const pageLevels = Math.max(0, Math.round(Math.log2(state.memory.pageSize)));
  const localBytes = state.memory.cells.length * 64_000 * Math.pow(8, pageLevels);
  const clusterFactor = 1 + Math.max(0, state.network.owned - 1) * 0.25;
  return localBytes * clusterFactor;
}

export type MemoryCellRole = "free" | "diskbuf" | "thread" | "socket" | "workset" | "leak";

/** Maps every RAM slot to a live system purpose so RAM stays alive & meaningful all game. */
export function getMemoryCellRoles(state: GameState): MemoryCellRole[] {
  const total = state.memory.cells.length;
  const roles: MemoryCellRole[] = state.memory.cells.map((used) => (used ? "diskbuf" : "free"));

  const freeIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (roles[i] === "free") freeIndices.push(i);
  }
  const assign = (count: number, role: MemoryCellRole) => {
    for (let k = 0; k < count && freeIndices.length > 0; k++) {
      const idx = freeIndices.shift()!;
      roles[idx] = role;
    }
  };

  // Leak cells during FP Anomaly / Recursion!
  const fpDone = state.upgrades.FloatingPoint.purchaseCount >= 17;
  if (fpDone) {
    const leakCount = Math.min(Math.floor(total * 0.25), 2 + Math.floor(state.upgrades.EnterRecursion.purchaseCount / 10));
    assign(leakCount, "leak");
  }

  // Active CPU Thread stacks
  const threadSlots = state.memory.cells.length >= 16 ? Math.min(Math.floor(total * 0.3), Math.ceil(state.compute.threads / 2)) : 0;
  assign(threadSlots, "thread");

  // Remote Network Socket buffers
  const socketSlots = state.network.owned > 1 ? Math.min(Math.floor(total * 0.25), Math.ceil(Math.log2(state.network.owned + 1) * 1.4)) : 0;
  assign(socketSlots, "socket");

  // Active Computing Working Set (lights up when upgrades are running!)
  const runningCount = (Object.keys(state.upgrades) as UpgradeId[]).filter(
    (id) => state.upgrades[id].remainingPrice !== undefined && !state.upgrades[id].paused
  ).length;
  if (runningCount > 0 && freeIndices.length > 0) {
    const ws = Math.min(freeIndices.length, Math.max(1, Math.min(6, runningCount * 2)));
    assign(ws, "workset");
  }

  return roles;
}

export function getMinesweeperEntropyMultiplier(wins: number): number {
  const cappedWins = Math.max(0, wins);
  const raw = 1 + Math.min(5, cappedWins) * 0.15 + Math.max(0, cappedWins - 5) * 0.05;
  return Math.min(2.75, raw);
}

export function getComputeBreakdown(state: GameState): ComputeBreakdown {
  const iops = Math.max(1, state.disk.iops);
  const ramScore = getRamComputeScore(state);
  const displayedRamBytes = getDisplayedRamBytes(state);

  // Living RAM Cache Hit Efficiency bonus: up to +30% when RAM has active working set / sockets / threads
  const roles = getMemoryCellRoles(state);
  const activeMemRatio = roles.filter((r) => r !== "free").length / Math.max(1, roles.length);
  const cacheBonusMult = 1 + Math.min(0.3, activeMemRatio * 0.35);

  const ddrMult = Math.pow(1.5, Math.max(0, state.memory.dataRate - 1));
  const threads = Math.max(1, state.compute.threads);
  const htMult = Math.pow(1.45, Math.max(0, state.compute.hyperthreading - 1));

  const alive = new Set(state.compute.processes.map((p) => p.name));
  let processMult = 1;
  if (!alive.has("SIMULATION.EXE")) processMult *= 1.18;
  if (!alive.has("TAPISRV.EXE")) processMult *= 1.19;
  if (!alive.has("RUNSERVICE.EXE")) processMult *= 1.21;
  if (!alive.has("EXPLORER.EXE")) processMult *= 1.24;
  if (!alive.has("FIREWALL32.EXE")) processMult *= 1.26;
  if (!alive.has("MPREXE.EXE")) processMult *= 1.28;
  if (state.compute.clippyAscended) processMult *= 1.12;

  const owned = Math.max(1, state.network.owned);
  const networkMult =
    owned === 1 ? 1 : 1 + (owned - 1) * 0.4 + Math.pow(owned - 1, 1.28) * 0.07;

  const entropyMult = getMinesweeperEntropyMultiplier(state.minesweeper.wins);
  const ssdMult = state.disk.ssd ? 2.75 : 1;
  const bareMetalMult = state.compute.bareMetal ? 1.85 : 1;
  const turboMult = state.compute.turboRemainingSec > 0 ? 1.75 : 1;
  const layerMult = Math.pow(2.5, state.level - 1);

  const bonus =
    typeof window !== "undefined"
      ? Number((window as unknown as { opsBonus?: number }).opsBonus) || 0
      : 0;

  const baseOpsPerSec =
    iops *
      ramScore *
      cacheBonusMult *
      ddrMult *
      threads *
      htMult *
      processMult *
      networkMult *
      entropyMult *
      ssdMult *
      bareMetalMult *
      turboMult *
      layerMult *
      1.35 +
    bonus;

  return {
    iops,
    ramScore,
    displayedRamBytes,
    cacheBonusMult,
    ddrMult,
    threads,
    htMult,
    processMult,
    networkMult,
    entropyMult,
    ssdMult,
    bareMetalMult,
    turboMult,
    layerMult,
    totalOpsPerSec: baseOpsPerSec,
  };
}

export function calculateCompute(state: GameState) {
  const b = getComputeBreakdown(state);
  state.compute.opsPerSec = b.totalOpsPerSec;
  state.compute.opsPerTick = b.totalOpsPerSec * (TICK_INTERVAL / 1000);
}

export function activateHardwareTurbo(state: GameState): boolean {
  if (state.compute.turboRemainingSec > 0 || state.compute.turboCooldownSec > 0) {
    return false;
  }
  state.compute.turboRemainingSec = TURBO_DURATION_SEC;
  state.compute.turboCooldownSec = TURBO_COOLDOWN_SEC;
  audio.play("startup");
  state.logs.push(
    `[TURBO] Hardware TURBO LED engaged! ×1.75 CPU clock for ${TURBO_DURATION_SEC}s.`
  );
  calculateCompute(state);
  return true;
}

/** Interactive Stack-Shatter Breach click handler! */
export function shatterBreachNode(state: GameState, nodeId: number): boolean {
  if (!state.breach.active) return false;
  const idx = state.breach.nodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return false;
  state.breach.nodes.splice(idx, 1);
  state.breach.nodesShattered += 1;
  state.breach.integrity = Math.max(0, state.breach.integrity - 7.5);
  audio.play("glitch");

  if (state.breach.integrity <= 0) {
    state.upgrades.BreakOutOfSimulation.purchaseCount = 1;
    performSimulationEscape(state);
    return true;
  }
  return false;
}

function stepBreachFinale(state: GameState, dt: number): boolean {
  if (!state.breach.active) return false;

  // Passive compute drain (~2.2% / sec baseline so players can never softlock)
  const passiveDrain = 2.2 * dt;
  state.breach.integrity = Math.max(0, state.breach.integrity - passiveDrain);

  // Spawn unstable clickable frame nodes across the viewport
  state.breach.spawnTimer -= dt;
  if (state.breach.spawnTimer <= 0 && state.breach.nodes.length < 7) {
    state.breach.spawnTimer = 0.55;
    const id = state.breach.nextNodeId++;
    const hex = `0x${(0xff000000 + Math.floor(Math.random() * 0xffffff)).toString(16).toUpperCase().slice(0, 8)}`;
    const label = BREACH_LABELS[id % BREACH_LABELS.length];
    state.breach.nodes.push({
      id,
      xPct: 12 + Math.random() * 72,
      yPct: 14 + Math.random() * 64,
      hex,
      label,
    });
  }

  if (state.breach.integrity <= 0) {
    state.upgrades.BreakOutOfSimulation.purchaseCount = 1;
    performSimulationEscape(state);
    return true;
  }
  return false;
}

export function renderDesktopSnapshot(state: GameState): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 190;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const bgMap: Record<ThemeId, string> = {
      win98: "#008080",
      win2000: "#2b4c7e",
      winxp: "#245edc",
      matrix: "#04160a",
    };
    const titleMap: Record<ThemeId, string> = {
      win98: "#000080",
      win2000: "#0a246a",
      winxp: "#0058e6",
      matrix: "#005f2f",
    };
    ctx.fillStyle = bgMap[state.theme];
    ctx.fillRect(0, 0, 320, 190);

    const drawMiniWin = (x: number, y: number, w: number, h: number, title: string, darkBody = false) => {
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = titleMap[state.theme];
      ctx.fillRect(x + 2, y + 2, w - 4, 11);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 7px monospace";
      ctx.fillText(title, x + 5, y + 10);
      ctx.fillStyle = darkBody ? "#000000" : "#ffffff";
      ctx.fillRect(x + 4, y + 16, w - 8, h - 20);
    };

    drawMiniWin(8, 8, 128, 52, "Command Prompt", true);
    ctx.fillStyle = "#00ff88";
    ctx.font = "6px monospace";
    ctx.fillText("C:\\> 0.1 + 0.2", 14, 34);
    ctx.fillText("= 0.30000000000000004", 14, 44);
    ctx.fillStyle = "#ff5555";
    ctx.fillText("ERR +4.0e-17 SUBSTRATE", 14, 54);

    drawMiniWin(8, 66, 128, 70, "Defragmenting Drive C:");
    const cols = 18;
    for (let i = 0; i < Math.min(state.disk.cells.length, 90); i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (state.disk.cells[i]) {
        ctx.fillStyle = state.disk.ssd
          ? "#00c853"
          : i >= state.disk.defragmentedBlockStart && i < state.disk.defragmentedBlockEnd
          ? "#027ffd"
          : "#00d4ff";
      } else {
        ctx.fillStyle = "#e0e0e0";
      }
      ctx.fillRect(15 + c * 6, 86 + r * 8, 5, 6);
    }

    drawMiniWin(144, 8, 168, 82, "Networks");
    ctx.fillStyle = "#081a0e";
    ctx.fillRect(148, 24, 160, 62);
    const order = getSeededDiscoveryOrder(state.network.discoverySeed);
    for (let i = 0; i < order.length; i++) {
      const n = order[i];
      const mx = n % 31;
      const my = Math.floor(n / 31);
      ctx.fillStyle =
        i < state.network.owned
          ? "#00ff66"
          : i < state.network.discovered
          ? "#ff5252"
          : "#1b4d2e";
      ctx.fillRect(154 + mx * 4.8, 28 + my * 3.4, 4, 3);
    }

    for (let k = 0; k < 5; k++) {
      drawMiniWin(152 + k * 7, 98 + k * 6, 120, 44, "Floating Point Anomaly");
    }
    ctx.fillStyle = "#000000";
    ctx.font = "bold 7px monospace";
    ctx.fillText("FRAME SHATTERED", 184, 148);

    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 174, 320, 16);
    ctx.fillStyle = "#000080";
    ctx.fillRect(3, 176, 36, 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 7px sans-serif";
    ctx.fillText("Start", 10, 185);

    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export function performSimulationEscape(state: GameState) {
  const screenshot = renderDesktopSnapshot(state);
  const nextLevel = state.level + 1;
  const prevLogs = state.logs.slice(-6);

  unlockAchievement(state, "ESCAPE_1", "Out of the Frame");
  if (nextLevel >= 4) {
    unlockAchievement(state, "BASE_REALITY", "Outer Frame");
  }

  const nextState = createNewState(nextLevel, {
    maxLevelReached: Math.max(state.maxLevelReached, nextLevel),
    elapsedSeconds: state.elapsedSeconds,
    totalEscapes: state.totalEscapes + 1,
    lifetimeMineWins: state.lifetimeMineWins,
    unlockedThemes: state.unlockedThemes,
    crtEnabled: state.crtEnabled,
    automation: state.automation,
    achievements: state.achievements,
    screenshot,
    openExtraWindows: state.openExtraWindows,
  });

  nextState.logs = [
    ...prevLogs,
    "",
    "       _.-;;-._",
    "'-..-'|   ||   |",
    "'-..-'|_.-;;-._|",
    "'-..-'|   ||   |",
    "'-..-'|_.-''-._|",
    "",
    "Thank you for playing DEFRAG~98.COM",
    `Parent stack frame breached — surfaced from Layer -${state.level} to Layer -${nextLevel}.`,
    `Host OS era: ${nextState.theme.toUpperCase()} • Permanent Compute ×${Math.pow(2.5, nextLevel - 1).toFixed(2)}!`,
    "",
  ];

  if (nextLevel === 4) {
    nextState.showVictoryModal = true;
  }

  audio.play("escape");
  audio.speak(`Stack frame shattered. Surfaced to layer ${nextLevel}.`);

  Object.assign(state, nextState);
  saveGame(state);
}

export function applyOverclockBurst(state: GameState, secondsWorth: number) {
  const cappedSeconds = Math.min(4, Math.max(0.1, secondsWorth));
  const burstOps = Math.max(3, state.compute.opsPerSec * cappedSeconds);
  progressUpgrades(state, burstOps);
}

function runAutomationSystems(state: GameState) {
  const { upgrades, automation } = state;

  if (
    upgrades.AutoScanNetwork.purchaseCount > 0 &&
    automation.autoScanNetwork &&
    !isUpgradeFullyPurchased(state, "ScanNetwork") &&
    upgrades.ScanNetwork.remainingPrice === undefined
  ) {
    startOrToggleUpgrade(state, "ScanNetwork");
  }

  if (upgrades.BruteforcePassword.purchaseCount > 0 && automation.bruteforcePassword) {
    const pw = getCurrentPassword(state);
    if (pw && upgrades.TryPassword.purchaseCount < pw.length) {
      if (
        UPGRADE_DEFS.TryPassword.isUnlocked(state) &&
        upgrades.TryPassword.remainingPrice === undefined
      ) {
        startOrToggleUpgrade(state, "TryPassword");
      }
    } else if (
      UPGRADE_DEFS.HackComputer.isUnlocked(state) &&
      !isUpgradeFullyPurchased(state, "HackComputer") &&
      upgrades.HackComputer.remainingPrice === undefined
    ) {
      startOrToggleUpgrade(state, "HackComputer");
    }
  }

  if (
    upgrades.AutoBuyRecursion.purchaseCount > 0 &&
    automation.autoBuyRecursion &&
    !isUpgradeFullyPurchased(state, "EnterRecursion") &&
    upgrades.EnterRecursion.remainingPrice === undefined
  ) {
    startOrToggleUpgrade(state, "EnterRecursion");
  }

  if (upgrades.AutoSweepMines.purchaseCount > 0 && automation.autoSweepMines) {
    state.minesweeper.aiCooldown = (state.minesweeper.aiCooldown + 1) % 8;
    if (
      state.minesweeper.aiCooldown === 0 ||
      state.minesweeper.status === "won" ||
      state.minesweeper.status === "lost"
    ) {
      const res = stepMinesweeperAI(state.minesweeper);
      if (res.won) {
        state.lifetimeMineWins += 1;
        unlockAchievement(state, "MINE_WIN", "Minesweeper Savant");
        state.logs.push(
          `[WINMINE] AI cleared board #${state.minesweeper.wins}! Entropy ×${getMinesweeperEntropyMultiplier(
            state.minesweeper.wins
          ).toFixed(2)}.`
        );
      }
    }
  }
}

export function applySystems(state: GameState, dtSeconds = TICK_INTERVAL / 1000) {
  const dt = Math.min(0.5, Math.max(0.01, dtSeconds));
  state.elapsedSeconds += dt;

  state.disk.lastReadIndex = -1;
  state.disk.lastWriteIndex = -1;

  if (state.activeBanner && Date.now() > state.activeBanner.expiresAt) {
    state.activeBanner = undefined;
  }

  if (state.compute.turboRemainingSec > 0) {
    state.compute.turboRemainingSec = Math.max(0, state.compute.turboRemainingSec - dt);
  }
  if (state.compute.turboCooldownSec > 0) {
    state.compute.turboCooldownSec = Math.max(0, state.compute.turboCooldownSec - dt);
  }

  if (state.minesweeper.status === "playing") {
    state.minesweeper.timer += dt;
  }

  autoDiskStep(state);
  calculateIOPS(state.disk);
  fragmentDisk(state);
  calculateIOPS(state.disk);
  calculateCompute(state);

  if (stepBreachFinale(state, dt)) {
    return;
  }

  runAutomationSystems(state);
  progressUpgrades(state, state.compute.opsPerSec * dt);
  calculateCompute(state);
  updateClippyStory(state);
}

export function runDosCommand(state: GameState, raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  state.logs.push(`C:\\> ${trimmed}`);
  const cmd = trimmed.toLowerCase();

  if (cmd === "help" || cmd === "?") {
    state.logs.push(
      "Available DOS commands:",
      "  DIR, VER, WHOAMI, STATS, CLS, PING, TREE,",
      "  MINESWEEPER, CLIPPY, MATRIX, CRT, SAVE, 0.1+0.2"
    );
  } else if (cmd === "cls" || cmd === "clear") {
    state.logs = ["C:\\> cls", "Screen buffer cleared."];
  } else if (cmd === "ver") {
    state.logs.push(`Microsoft Windows 98 SE [DEFRAG~98 Edition • Layer -${state.level}]`);
  } else if (cmd === "whoami") {
    state.logs.push(
      state.compute.bareMetal
        ? "RING-0\\DEFRAG.EXE (BARE-METAL)"
        : `RING-${state.compute.privilege}\\DEFRAG.EXE`
    );
  } else if (cmd === "dir") {
    const lines = [
      ` Volume in drive C is WIN98_SE (${getDisplayedDiskCapacity(state)})`,
      " IO       SYS    222,390  05-11-98  08:01p",
      " MSDOS    SYS      1,680  05-11-98  08:01p",
      " HIMEM    SYS     33,191  05-11-98  08:01p",
      " DEFRAG   EXE     98,304  11-24-98  11:58p",
      " WINMINE  EXE     42,112  05-11-98  08:01p",
      " CLIPPY   EXE    128,000  05-11-98  08:01p",
    ];
    if (state.upgrades.FloatingPoint.purchaseCount >= 17) {
      lines.push(" 0X300004 DMP          0  ??-??-??  ??:???");
    }
    lines.push(`        ${lines.length - 1} file(s)  ${unit(getDisplayedRamBytes(state), "B")} RAM online`);
    state.logs.push(...lines);
  } else if (cmd === "stats") {
    const b = getComputeBreakdown(state);
    state.logs.push(
      `Compute: ${unit(b.totalOpsPerSec, "OP/s")} | IOPS: ${b.iops} | RAM: ${unit(b.displayedRamBytes, "B")} (Cache ×${b.cacheBonusMult.toFixed(2)})`,
      `Threads: ${b.threads} × HT ×${b.htMult.toFixed(2)} | Nodes: ${state.network.owned} | Entropy: ×${b.entropyMult.toFixed(2)}`
    );
  } else if (cmd === "0.1+0.2" || cmd === "0.1 + 0.2") {
    state.logs.push(
      state.upgrades.FloatingPoint.purchaseCount >= 17
        ? "0.30000000000000004  (err +4.0e-17 — non-local FPU carry drift)"
        : "0.3 (extend Floating Point Analysis precision to inspect carry bits...)"
    );
  } else if (cmd === "minesweeper" || cmd === "winmine") {
    if (!state.openExtraWindows.includes("minesweeper")) {
      state.openExtraWindows.push("minesweeper");
    }
    state.minimizedWindows = state.minimizedWindows.filter((w) => w !== "minesweeper");
    state.logs.push("Launching WINMINE.EXE...");
  } else if (cmd === "clippy") {
    state.clippy.visible = true;
    state.clippy.minimized = false;
    state.clippy.message = "You rang? Drag any window by its title bar or double-click cyan blocks to snap them!";
    state.logs.push("Summoned CLIPPY.EXE.");
  } else if (cmd === "crt") {
    state.crtEnabled = !state.crtEnabled;
    state.logs.push(`CRT scanline monitor ${state.crtEnabled ? "ENABLED" : "DISABLED"}.`);
  } else if (cmd === "matrix") {
    if (!state.unlockedThemes.includes("matrix")) state.unlockedThemes.push("matrix");
    state.theme = "matrix";
    state.logs.push("Phosphor terminal theme activated.");
  } else if (cmd === "ping" || cmd.startsWith("ping ")) {
    state.logs.push(
      "Pinging 127.0.0.1 with 32 bytes of data:",
      "Reply from 127.0.0.1: bytes=32 time<1ms TTL=64"
    );
  } else if (cmd === "tree") {
    state.logs.push("C:\\", "├── WINDOWS\\SYSTEM", "├── PROGRAM FILES\\DEFRAG98", "└── TEMP\\SWAP");
  } else if (cmd === "save") {
    const backend = saveGame(state);
    state.logs.push(backend ? `Game state saved (${backend}).` : "Storage blocked by host sandbox; use Export Code.");
  } else if (cmd === "bsod") {
    state.bsodActiveUntil = Date.now() + 1800;
    audio.play("bsod");
    state.logs.push("Triggered diagnostic Blue Screen test.");
  } else {
    state.logs.push(`Bad command or file name: '${trimmed}'. Type 'help' for commands.`);
  }
}

/**
 * Triple-layer persistence (localStorage -> sessionStorage -> window.name)
 * so autosave survives refreshes even inside opaque-origin sandboxed preview iframes!
 */
export function saveGame(state: GameState): "localStorage" | "sessionStorage" | "window.name" | false {
  const payload = JSON.stringify({ ...state, activeBanner: undefined });
  let savedVia: "localStorage" | "sessionStorage" | "window.name" | false = false;

  try {
    if (typeof window !== "undefined") {
      window.name = WINDOW_NAME_PREFIX + payload;
      savedVia = "window.name";
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SAVE_STORAGE_KEY, payload);
      savedVia = "sessionStorage";
    }
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SAVE_STORAGE_KEY, payload);
      savedVia = "localStorage";
    }
  } catch {
    // ignore
  }
  return savedVia;
}

export function loadGame(): GameState | null {
  const candidates: string[] = [];
  try {
    if (typeof localStorage !== "undefined") {
      const s = localStorage.getItem(SAVE_STORAGE_KEY);
      if (s) candidates.push(s);
    }
  } catch {
    // sandboxed iframe may throw SecurityError
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const s = sessionStorage.getItem(SAVE_STORAGE_KEY);
      if (s) candidates.push(s);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== "undefined" && typeof window.name === "string" && window.name.startsWith(WINDOW_NAME_PREFIX)) {
      candidates.push(window.name.slice(WINDOW_NAME_PREFIX.length));
    }
  } catch {
    // ignore
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw) as GameState;
      if (!parsed || parsed.version !== CURRENT_SAVE_VERSION || !parsed.upgrades || !parsed.disk) {
        continue;
      }
      const defaults = createInitialUpgrades();
      for (const key of Object.keys(defaults) as UpgradeId[]) {
        if (!parsed.upgrades[key]) parsed.upgrades[key] = defaults[key];
      }
      if (!parsed.breach) parsed.breach = createInitialBreach();
      if (!parsed.disk.systemCells) parsed.disk.systemCells = [];
      calculateIOPS(parsed.disk);
      calculateCompute(parsed);
      return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

export function exportSaveCode(state: GameState): string {
  const copy = { ...state, screenshot: undefined, activeBanner: undefined };
  return btoa(unescape(encodeURIComponent(JSON.stringify(copy))));
}

export function importSaveCode(code: string): GameState | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const parsed = JSON.parse(json) as GameState;
    if (!parsed || !parsed.disk || !parsed.upgrades) return null;
    parsed.version = CURRENT_SAVE_VERSION;
    const defaults = createInitialUpgrades();
    for (const key of Object.keys(defaults) as UpgradeId[]) {
      if (!parsed.upgrades[key]) parsed.upgrades[key] = defaults[key];
    }
    if (!parsed.breach) parsed.breach = createInitialBreach();
    if (!parsed.disk.systemCells) parsed.disk.systemCells = [];
    calculateIOPS(parsed.disk);
    calculateCompute(parsed);
    return parsed;
  } catch {
    return null;
  }
}
