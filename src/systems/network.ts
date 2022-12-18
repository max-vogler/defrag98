import { shuffle } from "lodash";
import { State } from ".";
import { Purchase, UnlocksSystem } from "./purchase";
import WorldmapJson from "../assets/worldmapland.json";

export const NETWORK_COUNT = WorldmapJson.length;

const PASSWORDS = [
  "123",
  "bios",
  "admin",
  "a1b2c3",
  "hunter2",
  "lkwpeter",
  "password1",
  "qwertyuiop",
  "tr0ub4dor83",
  "ji32k7au4a83",
  "administrator",
  "insitegenieacq",
  "123456789101112",
  "1qaz2wsx3edc4rfv",
  "00000000000000000",
  "correcthorsebatter",
];

const PASSWORD_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789";

export interface Network {
  discovered: number;
  owned: number;
  passwordAttempt?: { correct: string; incorrect: string };
}

export function createInitialNetwork(): Network {
  return {
    discovered: 1,
    owned: 1,
  };
}

export class ScanNetworkPurchase extends Purchase {
  override initialPrice = 1e6;
  override multiplier = 1.1;
  override label = "Scan IPs";
  override maxCount = NETWORK_COUNT - 1;

  override action(state: State): void {
    state.network.discovered += 1;

    if (!state.network.passwordAttempt) {
      state.network.passwordAttempt = {
        correct: "",
        incorrect: "***",
      };
    }
  }

  override onPurchaseLog(state: State) {
    return undefined;
  }
}

export default class AutoScanNetworkPurchase
  extends Purchase
  implements UnlocksSystem
{
  override initialPrice = 1e6;
  override label = "Automatically scan IP range";
  override maxCount = 1;

  override isUnlocked(state: State): boolean {
    return state.network.discovered > 5;
  }

  unlocksSystem(state: State): void {
    state.purchases.ScanNetwork.startPurchase(state);
  }

  override onPurchaseLog(state: State) {
    return undefined;
  }
}

function getPassword(state: State): string | undefined {
  return PASSWORDS[state.network.owned - 1];
}

export class TryPasswordPurchase extends Purchase {
  override initialPrice = 10;
  override multiplier = 1;
  override label = "Try password";
  override maxCount = 3;

  override isUnlocked(state: State): boolean {
    return (
      state.network.owned < state.network.discovered &&
      getPassword(state) !== undefined
    );
  }

  override action(state: State): void {
    const currentPassword = getPassword(state);

    if (currentPassword) {
      const correct = currentPassword.slice(0, this.purchaseCount);
      const incorrectLength = currentPassword.length - this.purchaseCount;
      const incorrect = shuffle(
        PASSWORD_CHARACTERS.split("").filter(
          (c) => !currentPassword.includes(c)
        )
      )
        .slice(0, incorrectLength)
        .join("");
      state.network.passwordAttempt = { correct, incorrect };
    }
  }

  override onPurchaseLog(state: State) {
    return undefined;
  }
}

export class BruteforcePasswordPurchase
  extends Purchase
  implements UnlocksSystem
{
  override initialPrice = 100 * 1e6;
  override label = "Bruteforce passwords";
  override maxCount = 1;

  override isUnlocked(state: State): boolean {
    return (
      state.network.owned > PASSWORDS.length &&
      state.network.owned < state.network.discovered
    );
  }

  unlocksSystem(state: State) {
    if (
      state.purchases.HackComputer.isUnlocked(state) &&
      !state.purchases.HackComputer.inProgress
    ) {
      state.purchases.HackComputer.startPurchase(state);
      state.network.passwordAttempt = {
        correct: shuffle(PASSWORD_CHARACTERS).slice(0, 18).join(""),
        incorrect: "",
      };
    }
  }

  override onPurchaseLog(state: State) {
    return undefined;
  }
}

export class HackComputerPurchase extends Purchase {
  override initialPrice = 10 * 1e6;
  override multiplier = 1.1;
  override label = "Hack computer";
  override maxCount = NETWORK_COUNT - 1;

  override isUnlocked(state: State): boolean {
    return (
      state.purchases.TryPassword.isFullyPurchased &&
      state.network.discovered > state.network.owned
    );
  }

  override action(state: State): void {
    if (state.network.owned < state.network.discovered) {
      state.network.owned += 1;

      state.purchases.TryPassword.purchaseCount = 0;
      state.purchases.TryPassword.maxCount = getPassword(state)?.length ?? 0;
    }
  }
}
