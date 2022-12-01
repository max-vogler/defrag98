import html2canvas from "html2canvas";
import { createNewState, State } from ".";
import { Purchase, UnlocksSystem } from "./purchase";

export class BreakOutOfSimulationPurchase
  extends Purchase
  implements UnlocksSystem
{
  override initialPrice = 10;
  override multiplier = 1;
  override maxCount = 1;
  override label = "Fragment recursion stack";

  private resetWithScreenshot?: string;

  override action(state: State): void {
    html2canvas(document.querySelector("#root")!, {
      backgroundColor: "#008080",
    }).then((c) => {
      this.resetWithScreenshot = c.toDataURL();
    });
  }

  unlocksSystem(state: State): void {
    if (this.resetWithScreenshot) {
      const nextState = createNewState(state.level + 1);
      Object.assign(state, {
        ...nextState,
        screenshot: this.resetWithScreenshot,
        logs: [
          ...state.logs,
          "",
          "       _.-;;-._",
          "'-..-'|   ||   |",
          "'-..-'|_.-;;-._|",
          "'-..-'|   ||   |",
          "'-..-'|_.-''-._|",
          "",
          "Thank you for playing DEFRAG~98.COM",
          "You escaped the simulation and can now return to work.",
          "",
          "",
          "Game by github.com/max-vogler/defrag98",
          "",
        ],
      });
      this.resetWithScreenshot = undefined;
    }
  }

  override isUnlocked(state: State): boolean {
    return (
      state.purchases.EnterRecursion.purchaseCount >=
      state.purchases.EnterRecursion.maxCount
    );
  }
}

export class EnterRecursionPurchase extends Purchase {
  override initialPrice = 100 * 1e6;
  override multiplier = 1.05;
  override maxCount = 128;
  override label = "Recursive search";

  override action(state: State): void {}

  override isUnlocked(state: State): boolean {
    return (
      state.purchases.FloatingPoint.purchaseCount >=
      state.purchases.FloatingPoint.maxCount
    );
  }
}

export class AutoBuyRecursionPurchase extends Purchase {
  override initialPrice = 1 * 1e12;
  override multiplier = 1;
  override maxCount = 1;
  override label = "Automatically enter recursion";

  override action(state: State): void {}

  override isUnlocked(state: State): boolean {
    return state.purchases.EnterRecursion.purchaseCount >= 10;
  }
}

export function autoBuyRecursionSystem(state: State) {
  if (
    state.purchases.AutoBuyRecursion.purchaseCount > 0 &&
    !state.purchases.EnterRecursion.inProgress
  ) {
    state.purchases.EnterRecursion.startPurchase(state);
  }
}

export class FloatingPointPurchase extends Purchase {
  override initialPrice = 1000;
  override multiplier = 5;
  override maxCount = 17;
  override label = "Extend floating point precision";

  // --v Start (decimal 1)
  // 0.30000000000000004
  // End (decimal 17) -^

  equation: [string, string, string, string] = ["0", "+", "0", "0"];

  override action(state: State): void {
    this.equation = [
      "0.1",
      "+",
      "0.2",
      "0.30000000000000004".slice(0, this.purchaseCount + 2),
    ];
  }
}
