import { random, fill, shuffle } from "lodash";
import { State } from ".";
import { Purchase } from "./purchase";

export interface Disk {
  cells: boolean[];
  size: number;
  iops: number;
  ssd: boolean;
}

export function createInitialDisk(): Disk {
  const initialFilledCells = 20;
  const initialTotalCells = 115;
  const cells = shuffle([
    ...fill(Array(initialFilledCells), true),
    ...fill(Array(initialTotalCells - initialFilledCells), false),
  ]);
  return { cells, iops: 0, size: initialTotalCells, ssd: false };
}

export function getIOPS(disk: Disk) {
  if (disk.ssd) {
    return disk.size * 10;
  }

  const start = disk.cells.indexOf(true);
  if (start === -1) {
    return 0;
  }

  const end = disk.cells.indexOf(false, start);
  return end - start;
}

export function calculateIOPS(disk: Disk) {
  disk.iops = getIOPS(disk);
}

export function fragment(disk: Disk) {
  if (random(0, 10) !== 0) {
    return;
  }
  const i = random(0, disk.cells.length - 1);
  disk.cells[i] = !disk.cells[i];
}

export function readWriteDiskCell({ disk, memory }: State, diskIndex: number) {
  if (disk.cells[diskIndex]) {
    // Disk full.
    for (
      let memoryIndex = 0;
      memoryIndex < memory.cells.length;
      memoryIndex++
    ) {
      if (!memory.cells[memoryIndex]) {
        memory.cells[memoryIndex] = disk.cells[diskIndex];
        disk.cells[diskIndex] = false;
        break;
      }
    }
  } else {
    // Disk empty. Try to write memory.
    for (
      let memoryIndex = 0;
      memoryIndex < memory.cells.length;
      memoryIndex++
    ) {
      if (memory.cells[memoryIndex]) {
        disk.cells[diskIndex] = memory.cells[memoryIndex];
        memory.cells[memoryIndex] = false;
        break;
      }
    }
  }
}

export class AutoWriteDiskPurchase extends Purchase {
  override initialPrice = 1e7;
  override label = "Autosave";

  override isUnlocked(state: State): boolean {
    return state.purchases.AutoReadDisk.isFullyPurchased;
  }
}

export class AutoReadDiskPurchase extends Purchase {
  override initialPrice = 1e6;
  override label = "Autoload";

  override isUnlocked(state: State): boolean {
    return state.memory.cells.length > 15;
  }
}

export function autoWriteDisk(state: State) {
  if (state.purchases.AutoWriteDisk.purchaseCount > 0) {
    const firstFreeCell = state.disk.cells.indexOf(false);
    if (firstFreeCell !== -1) {
      readWriteDiskCell(state, firstFreeCell);
    }
  }
}

function isInFirstContinuousBlock(state: State, i: number) {
  const firstFullCell = state.disk.cells.indexOf(true);

  for (; i >= firstFullCell && i >= 0; i--) {
    if (!state.disk.cells[i]) {
      return false;
    }
  }
  return true;
}

export function autoReadDisk(state: State) {
  if (state.purchases.AutoReadDisk.purchaseCount > 0) {
    const lastFullCell = state.disk.cells.lastIndexOf(true);
    if (lastFullCell !== -1 && !isInFirstContinuousBlock(state, lastFullCell)) {
      readWriteDiskCell(state, lastFullCell);
    }
  }
}

export class ResearchSSDPurchase extends Purchase {
  override initialPrice = 100 * 1e9;
  override multiplier = 1;
  override maxCount = 1;
  override label = "Research Solid State Disks";

  override isUnlocked(state: State) {
    return state.purchases.FloatingPoint.purchaseCount > 5;
  }

  override action(state: State): void {
    state.disk.ssd = true;
  }
}
