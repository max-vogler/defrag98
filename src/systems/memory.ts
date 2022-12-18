import { State } from ".";
import { Purchase } from "./purchase";

export const TASK_WINDOW_MIN_MEMORY = 16;

export interface Memory {
  cells: boolean[];
  pageSize: number;
  dataRate: number;
}

export function createInitialMemory(): Memory {
  return { cells: [false], pageSize: 1, dataRate: 1 };
}

export function getTotalMemory({ memory }: { memory: Memory }) {
  return memory.cells.length * memory.pageSize * memory.pageSize;
}

export class AllocateMemoryPurchase extends Purchase {
  override initialPrice = 10;
  override multiplier = 2;
  override label = "Allocate memory";
  override maxCount = 128;

  override action(state: State): void {
    state.memory.cells.push(false);
  }
}

export class IncrementPageSizePurchase extends Purchase {
  override initialPrice = 1 * 1e3;
  override multiplier = 500;
  override label = "Double page size";
  override maxCount = 12;

  override isUnlocked(state: State): boolean {
    return (state.memory.cells.length + 4) / 8 >= this.purchaseCount + 1;
  }

  override action(state: State): void {
    state.memory.pageSize *= 2;
  }
}

export class DoubleDataRatePurchase extends Purchase {
  override initialPrice = 10 * 1e3;
  override multiplier = 1000;
  override label = "Double data rate";
  override maxCount = 4;

  override isUnlocked(state: State): boolean {
    return state.memory.cells.length / 8 >= this.purchaseCount + 1;
  }

  override action(state: State): void {
    state.memory.dataRate *= 2;
  }
}
