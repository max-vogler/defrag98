import { GameState } from "./systems";

declare global {
  interface Window {
    gameState?: GameState;
    opsBonus?: number;
    unlockAll?: boolean;
  }
}
