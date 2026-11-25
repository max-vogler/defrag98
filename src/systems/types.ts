export type UpgradeId =
  | "AllocateMemory"
  | "IncrementPageSize"
  | "DoubleDataRate"
  | "AutoReadDisk"
  | "AutoWriteDisk"
  | "ExpandPartition"
  | "ResearchSSD"
  | "SpawnThread"
  | "Hyperthreading"
  | "EscalatePrivilege"
  | "KillProcess"
  | "ScanNetwork"
  | "AutoScanNetwork"
  | "TryPassword"
  | "HackComputer"
  | "BruteforcePassword"
  | "AutoSweepMines"
  | "FloatingPoint"
  | "EnterRecursion"
  | "AutoBuyRecursion"
  | "BreakOutOfSimulation";

export type ThemeId = "win98" | "win2000" | "winxp" | "matrix";

export type WindowId =
  | "cmd"
  | "defrag"
  | "memory"
  | "taskinfo"
  | "taskman"
  | "networks"
  | "login"
  | "minesweeper"
  | "fp"
  | "breakout"
  | "nested";

export interface UpgradeProgress {
  purchaseCount: number;
  remainingPrice?: number;
  paused?: boolean;
  startedPrice?: number;
}

export interface ProcessInfo {
  name: string;
  pid: number;
  privilege: number;
  cpuOverhead: string;
  description: string;
  killReward: string;
}

export interface DiskState {
  cells: boolean[];
  /** Indices of authentic Win98 unmovable system blocks (unlocked at Ring 0) */
  systemCells: number[];
  defragmentedBlockStart: number;
  defragmentedBlockEnd: number;
  size: number;
  iops: number;
  ssd: boolean;
  partitionLevel: number;
  lastReadIndex: number;
  lastWriteIndex: number;
  lastFragmentNote?: string;
  manualMoves: number;
}

export interface MemoryState {
  cells: boolean[];
  pageSize: number;
  dataRate: number;
}

export interface ComputeState {
  threads: number;
  hyperthreading: number;
  opsPerTick: number;
  opsPerSec: number;
  processes: ProcessInfo[];
  privilege: number;
  selectedProcessName?: string;
  processToKillName?: string;
  bareMetal: boolean;
  shellHijacked: boolean;
  clippyKillAttempts: number;
  clippyAscended: boolean;
  turboRemainingSec: number;
  turboCooldownSec: number;
}

export interface NetworkState {
  discovered: number;
  owned: number;
  passwordAttempt?: {
    correct: string;
    incorrect: string;
    host: string;
    ip: string;
  };
  recentHosts: string[];
  discoverySeed: number;
}

export interface MinesweeperCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export interface MinesweeperState {
  rows: number;
  cols: number;
  mines: number;
  cells: MinesweeperCell[];
  initialized: boolean;
  status: "ready" | "playing" | "won" | "lost";
  wins: number;
  totalRevealed: number;
  timer: number;
  aiCooldown: number;
}

export interface AutomationFlags {
  autoReadDisk: boolean;
  autoWriteDisk: boolean;
  autoScanNetwork: boolean;
  bruteforcePassword: boolean;
  autoBuyRecursion: boolean;
  autoSweepMines: boolean;
  prioritizeManual: boolean;
}

export interface ClippyState {
  visible: boolean;
  minimized: boolean;
  message: string;
  mood: "happy" | "thinking" | "nervous" | "panicked" | "awakened" | "cool";
  stage: number;
  seenTips: string[];
}

export interface StoryBanner {
  id: string;
  title: string;
  subtitle: string;
  expiresAt: number;
}

export interface BreachNode {
  id: number;
  xPct: number;
  yPct: number;
  hex: string;
  label: string;
}

export interface BreachFinaleState {
  active: boolean;
  integrity: number; // 100 -> 0
  nodesShattered: number;
  nodes: BreachNode[];
  nextNodeId: number;
  spawnTimer: number;
}

export interface ComputeBreakdown {
  iops: number;
  ramScore: number;
  displayedRamBytes: number;
  cacheBonusMult: number;
  ddrMult: number;
  threads: number;
  htMult: number;
  processMult: number;
  networkMult: number;
  entropyMult: number;
  ssdMult: number;
  bareMetalMult: number;
  turboMult: number;
  layerMult: number;
  totalOpsPerSec: number;
}

export interface GameState {
  version: number;
  level: number;
  maxLevelReached: number;
  elapsedSeconds: number;
  totalEscapes: number;
  lifetimeMineWins: number;
  theme: ThemeId;
  unlockedThemes: ThemeId[];
  crtEnabled: boolean;
  showGuideHighlight: boolean;
  focusedTask?: UpgradeId;
  disk: DiskState;
  memory: MemoryState;
  compute: ComputeState;
  network: NetworkState;
  minesweeper: MinesweeperState;
  automation: AutomationFlags;
  upgrades: Record<UpgradeId, UpgradeProgress>;
  clippy: ClippyState;
  breach: BreachFinaleState;
  activeBanner?: StoryBanner;
  logs: string[];
  achievements: string[];
  screenshot?: string;
  bsodActiveUntil?: number;
  showVictoryModal?: boolean;
  minimizedWindows: WindowId[];
  openExtraWindows: WindowId[];
}
