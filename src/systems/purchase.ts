import { State } from ".";
import { values } from "lodash";
import { calculateCompute } from "./compute";
import { unit } from "../text";

export abstract class Purchase {
  abstract initialPrice: number;
  multiplier = 1;
  purchaseCount = 0;
  maxCount = 1;

  label?: string;
  remainingPrice?: number;

  get price() {
    return Math.trunc(
      this.initialPrice * Math.pow(this.multiplier, this.purchaseCount)
    );
  }

  get inProgress() {
    return this.remainingPrice !== undefined;
  }

  get isFullyPurchased() {
    return this.maxCount !== undefined && this.purchaseCount >= this.maxCount;
  }

  showButton(state: State) {
    return (
      ((window as any).unlockAll || this.isUnlocked(state)) &&
      !this.isFullyPurchased
    );
  }

  isUnlocked(state: State) {
    return true;
  }

  action(state: State) {}

  startPurchase(state: State) {
    if (this.inProgress || this.isFullyPurchased) {
      return;
    }

    this.remainingPrice = this.price;
  }

  onPurchase(state: State) {
    this.purchaseCount += 1;
    this.remainingPrice = undefined;
    this.action(state);
    calculateCompute(state);

    const log = this.onPurchaseLog(state);
    if (log) {
      state.logs.push(log);
    }
  }

  onPurchaseLog(state: State): string | undefined {
    return `${this.label} finished. Now: ${unit(state.compute.flops, "OPS")}.`;
  }
}

export interface UnlocksSystem {
  unlocksSystem(state: State): void;
}

export function runSystemIfPurchased(
  state: State,
  purchase: Purchase & UnlocksSystem
) {
  if (purchase.purchaseCount > 0) {
    purchase.unlocksSystem(state);
  }
}

export function progressPurchases(state: State) {
  let flopsToSpend = state.compute.flops;
  const currentPurchases = new Set(
    values(state.purchases).filter((p) => p.remainingPrice)
  );

  while (flopsToSpend > 0 && currentPurchases.size > 0) {
    const flopsPerPurchase = Math.max(
      Math.trunc(flopsToSpend / currentPurchases.size),
      1
    );

    for (const purchase of currentPurchases) {
      if (!purchase.remainingPrice) {
        currentPurchases.delete(purchase);
      } else if (purchase.remainingPrice > flopsPerPurchase) {
        purchase.remainingPrice -= flopsPerPurchase;
        flopsToSpend -= flopsPerPurchase;
      } else {
        currentPurchases.delete(purchase);
        flopsToSpend -= purchase.remainingPrice;
        purchase.remainingPrice = 0;
        purchase.onPurchase(state);
      }

      // If 0 < flopsPerPurchase < 1, flopsPerPurchase is set to 1. We subtract 1
      // off of each active purchase until flopsToSpend is 0, at which point we stop.
      if (flopsToSpend < 0) {
        return;
      }
    }
  }
}
