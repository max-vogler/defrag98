import { State } from "./systems";

declare global {
  declare interface Window {
    gameState?: State;
    opsBonus?: number;
    unlockAll?: boolean;
  }
}
