import { DiskState, GameState } from "./types";
import { audio } from "./audio";

export const INITIAL_DISK_CELLS = 115;
export const INITIAL_FILLED_CELLS = 46;

export function createInitialDisk(): DiskState {
  const cells = Array<boolean>(INITIAL_DISK_CELLS).fill(false);
  // Seed a clean starter contiguous cluster of 4 at index 0
  for (let i = 0; i < 4; i++) cells[i] = true;

  // Authentic Win98 unmovable system blocks (unlocked once you reach Ring 0!)
  const systemCells = [22, 47, 73, 94];
  for (const s of systemCells) cells[s] = true;

  const remainingIndices: number[] = [];
  for (let i = 5; i < INITIAL_DISK_CELLS; i++) {
    if (!systemCells.includes(i)) remainingIndices.push(i);
  }
  for (let i = remainingIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingIndices[i], remainingIndices[j]] = [remainingIndices[j], remainingIndices[i]];
  }
  for (let k = 0; k < INITIAL_FILLED_CELLS - 4 - systemCells.length; k++) {
    cells[remainingIndices[k]] = true;
  }

  const disk: DiskState = {
    cells,
    systemCells,
    size: INITIAL_DISK_CELLS,
    iops: 4,
    ssd: false,
    partitionLevel: 0,
    defragmentedBlockStart: 0,
    defragmentedBlockEnd: 4,
    lastReadIndex: -1,
    lastWriteIndex: -1,
    manualMoves: 0,
  };
  calculateIOPS(disk);
  return disk;
}

/** Writes organic new data blocks to Drive C: as your footprint grows so the drive stays rich and busy. */
export function writeNewDiskFiles(disk: DiskState, count: number) {
  const freeIndices: number[] = [];
  for (let i = 0; i < disk.cells.length; i++) {
    if (!disk.cells[i]) freeIndices.push(i);
  }
  // Keep at least 12 free slots so defragging always has room to breathe
  const maxAdd = Math.max(0, Math.min(count, freeIndices.length - 12));
  for (let k = 0; k < maxAdd; k++) {
    const pick = Math.floor(Math.random() * freeIndices.length);
    const idx = freeIndices.splice(pick, 1)[0];
    disk.cells[idx] = true;
  }
  calculateIOPS(disk);
}

export function expandDiskPartition(disk: DiskState) {
  const addedClusters = 35;
  const addedFiles = 24;
  const startLen = disk.cells.length;
  for (let i = 0; i < addedClusters; i++) {
    disk.cells.push(false);
  }
  const newIndices = Array.from({ length: addedClusters }, (_, k) => startLen + k);
  for (let i = newIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newIndices[i], newIndices[j]] = [newIndices[j], newIndices[i]];
  }
  for (let k = 0; k < addedFiles; k++) {
    disk.cells[newIndices[k]] = true;
  }
  disk.size = disk.cells.length;
  disk.partitionLevel += 1;
  calculateIOPS(disk);
}

export function calculateIOPS(disk: DiskState) {
  let currentBlockStart = -1;
  let largestBlockStart = 0;
  let largestBlockSize = 0;

  for (let i = 0; i <= disk.cells.length; i++) {
    const cur = i < disk.cells.length ? disk.cells[i] : false;
    if (!cur) {
      if (currentBlockStart !== -1) {
        const size = i - currentBlockStart;
        if (size > largestBlockSize) {
          largestBlockSize = size;
          largestBlockStart = currentBlockStart;
        }
        currentBlockStart = -1;
      }
    } else if (currentBlockStart === -1) {
      currentBlockStart = i;
    }
  }

  disk.iops = Math.max(1, largestBlockSize);
  disk.defragmentedBlockStart = largestBlockStart;
  disk.defragmentedBlockEnd = largestBlockStart + largestBlockSize;
}

export function getRecommendedTargetIndex(disk: DiskState): number {
  if (disk.defragmentedBlockEnd < disk.cells.length && !disk.cells[disk.defragmentedBlockEnd]) {
    return disk.defragmentedBlockEnd;
  }
  if (disk.defragmentedBlockStart > 0 && !disk.cells[disk.defragmentedBlockStart - 1]) {
    return disk.defragmentedBlockStart - 1;
  }
  return disk.cells.indexOf(false);
}

export function isCellLockedSystem(state: GameState, idx: number): boolean {
  return state.compute.privilege > 0 && state.disk.systemCells.includes(idx);
}

export function fragmentDisk(state: GameState) {
  const { disk, compute, network } = state;
  if (disk.ssd) return;

  const hasExplorer = compute.processes.some((p) => p.name === "EXPLORER.EXE");
  const hasIndexer = compute.processes.some((p) => p.name === "RUNSERVICE.EXE");
  const hasNetSwap = network.owned > 5;
  if (!hasExplorer && !hasIndexer && !hasNetSwap) return;

  const contigLen = disk.defragmentedBlockEnd - disk.defragmentedBlockStart;
  if (contigLen < 8) return;

  let chance = 0;
  if (hasExplorer) chance += 0.009;
  if (hasIndexer) chance += 0.006;
  if (hasNetSwap) chance += 0.011;
  if (Math.random() > chance) return;

  const filledIndices: number[] = [];
  const emptyIndices: number[] = [];
  for (let i = 0; i < disk.cells.length; i++) {
    if (disk.cells[i] && !isCellLockedSystem(state, i)) filledIndices.push(i);
    else if (!disk.cells[i]) emptyIndices.push(i);
  }
  if (filledIndices.length === 0 || emptyIndices.length === 0) return;

  const edgeIndex = disk.defragmentedBlockEnd - 1;
  const from =
    Math.random() < 0.6 && edgeIndex >= 0 && disk.cells[edgeIndex] && !isCellLockedSystem(state, edgeIndex)
      ? edgeIndex
      : filledIndices[Math.floor(Math.random() * filledIndices.length)];
  const to = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

  disk.cells[from] = false;
  disk.cells[to] = true;
  disk.lastFragmentNote = hasExplorer
    ? "EXPLORER.EXE wrote swap chunk"
    : hasIndexer
    ? "RUNSERVICE.EXE reindexed file"
    : "Botnet cache fragment (research SSD!)";
}

export function readWriteDiskCell(state: GameState, diskIndex: number, silent = false): boolean {
  const { disk, memory } = state;
  if (diskIndex < 0 || diskIndex >= disk.cells.length) return false;
  if (isCellLockedSystem(state, diskIndex)) {
    if (!silent) {
      audio.play("error");
      disk.lastFragmentNote = "Unmovable system cluster (requires Ring 0)";
    }
    return false;
  }

  if (disk.cells[diskIndex]) {
    const freeMem = memory.cells.indexOf(false);
    if (freeMem === -1) {
      if (!silent) audio.play("error");
      return false;
    }
    memory.cells[freeMem] = true;
    disk.cells[diskIndex] = false;
    disk.lastReadIndex = diskIndex;
    disk.manualMoves += silent ? 0 : 1;
    if (!silent) audio.play("hddClick");
    return true;
  } else {
    const usedMem = memory.cells.indexOf(true);
    if (usedMem === -1) return false;
    disk.cells[diskIndex] = true;
    memory.cells[usedMem] = false;
    disk.lastWriteIndex = diskIndex;
    disk.manualMoves += silent ? 0 : 1;
    if (!silent) audio.play("hddWrite");
    return true;
  }
}

export function quickDefragCell(state: GameState, diskIndex: number): boolean {
  const { disk, memory } = state;
  if (!disk.cells[diskIndex] || isCellLockedSystem(state, diskIndex)) return false;
  if (diskIndex >= disk.defragmentedBlockStart && diskIndex < disk.defragmentedBlockEnd) {
    return false;
  }
  if (memory.cells.indexOf(false) === -1) {
    audio.play("error");
    return false;
  }
  const target = getRecommendedTargetIndex(disk);
  if (target === -1 || target === diskIndex) return false;

  disk.cells[diskIndex] = false;
  disk.cells[target] = true;
  disk.lastReadIndex = diskIndex;
  disk.lastWriteIndex = target;
  disk.manualMoves += 1;
  audio.play("hddWrite");
  calculateIOPS(disk);
  return true;
}

function isInFirstContinuousBlock(disk: DiskState, idx: number): boolean {
  const firstFull = disk.cells.indexOf(true);
  if (firstFull === -1) return true;
  for (let i = idx; i >= firstFull; i--) {
    if (!disk.cells[i]) return false;
  }
  return true;
}

export function autoDiskStep(state: GameState) {
  const { disk, upgrades, automation } = state;
  const speed = disk.ssd ? 4 : 1;

  for (let s = 0; s < speed; s++) {
    if (upgrades.AutoReadDisk.purchaseCount > 0 && automation.autoReadDisk) {
      let pick = -1;
      for (let i = disk.cells.length - 1; i >= 0; i--) {
        if (disk.cells[i] && !isCellLockedSystem(state, i) && !isInFirstContinuousBlock(disk, i)) {
          pick = i;
          break;
        }
      }
      if (pick !== -1) readWriteDiskCell(state, pick, true);
    }
    if (upgrades.AutoWriteDisk.purchaseCount > 0 && automation.autoWriteDisk) {
      const firstFree = disk.cells.indexOf(false);
      if (firstFree !== -1) readWriteDiskCell(state, firstFree, true);
    }
  }
}

export type CellVisualKind =
  | "free"
  | "defragmented"
  | "fragmented"
  | "reading"
  | "writing"
  | "system"
  | "ssd";

export function getDiskCellKinds(state: GameState): CellVisualKind[] {
  const { disk } = state;
  return disk.cells.map((filled, i) => {
    if (isCellLockedSystem(state, i)) return "system";
    if (i === disk.lastWriteIndex && filled) return "writing";
    if (i === disk.lastReadIndex && !filled) return "reading";
    if (!filled) return "free";
    if (disk.ssd) return "ssd";
    if (i >= disk.defragmentedBlockStart && i < disk.defragmentedBlockEnd) {
      return "defragmented";
    }
    return "fragmented";
  });
}

export function getDisplayedDiskCapacity(state: GameState): string {
  if (state.disk.ssd) return "256 TB NVMe";
  const gb = 2.1 * Math.pow(2, state.disk.partitionLevel);
  return `${gb.toFixed(1)} GB`;
}
