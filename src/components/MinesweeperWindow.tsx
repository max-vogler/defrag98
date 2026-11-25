import { CSSProperties } from "react";
import {
  applyOverclockBurst,
  audio,
  chordRevealCell,
  createMinesweeperBoard,
  GameState,
  getMinesweeperEntropyMultiplier,
  revealMineCell,
  toggleFlagCell,
  unlockAchievement,
} from "../systems";
import Window from "./Window";
import PurchaseButton from "./PurchaseButton";

interface Props {
  state: GameState;
  onMutate: () => void;
  onMinimize: () => void;
  onClose: () => void;
  style?: CSSProperties;
  inactive?: boolean;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
  onFocusWindow?: () => void;
}

export default function MinesweeperWindow({
  state,
  onMutate,
  onMinimize,
  onClose,
  style,
  inactive,
  onTitleMouseDown,
  onFocusWindow,
}: Props) {
  const board = state.minesweeper;
  const flaggedCount = board.cells.filter((c) => c.flagged).length;
  const minesLeft = Math.max(-99, board.mines - flaggedCount);
  const entropyBonus = getMinesweeperEntropyMultiplier(board.wins);

  const smiley =
    board.status === "won" ? "😎" : board.status === "lost" ? "😵" : "🙂";

  const resetBoard = () => {
    Object.assign(
      state.minesweeper,
      createMinesweeperBoard(board.wins, board.totalRevealed)
    );
    audio.play("click");
    onMutate();
  };

  const handleCellClick = (idx: number) => {
    const cell = board.cells[idx];
    const res = cell.revealed
      ? chordRevealCell(board, idx)
      : revealMineCell(board, idx);

    if (res.hitMine) {
      audio.play("mineBoom");
    } else if (res.won) {
      audio.play("mineWin");
      state.lifetimeMineWins += 1;
      state.compute.turboCooldownSec = Math.max(0, state.compute.turboCooldownSec - 5);
      applyOverclockBurst(state, 4.0);
      unlockAchievement(state, "MINE_WIN", "Minesweeper Savant");
      state.logs.push(
        `[WINMINE] Board cleared! Entropy ×${getMinesweeperEntropyMultiplier(
          board.wins
        ).toFixed(2)} (+4s burst & -5s TURBO cooldown!).`
      );
    } else if (res.newlyRevealed > 0) {
      audio.play("mineReveal");
      applyOverclockBurst(state, 0.4);
    }
    onMutate();
  };

  const handleRightClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    toggleFlagCell(board, idx);
    audio.play("click");
    onMutate();
  };

  return (
    <Window
      windowTitle="Minesweeper (WINMINE.EXE)"
      className="compact-window"
      onMinimize={onMinimize}
      onClose={onClose}
      onTitleMouseDown={onTitleMouseDown}
      onFocusWindow={onFocusWindow}
      inactive={inactive}
      style={style}
      statusBar={[
        `Wins: ${board.wins}`,
        `Entropy: ×${entropyBonus.toFixed(2)} / ×2.75`,
      ]}
    >
      <div className="column">
        <div className="minesweeper-header">
          <div className="led-counter">
            {String(minesLeft).padStart(3, "0")}
          </div>
          <button
            type="button"
            className="mine-smiley"
            onClick={resetBoard}
            title="New Game"
          >
            {smiley}
          </button>
          <div className="led-counter">
            {String(Math.min(999, Math.floor(board.timer))).padStart(3, "0")}
          </div>
        </div>

        <div className="mine-grid">
          {board.cells.map((cell, idx) => {
            const cls = [
              "mine-cell",
              cell.revealed ? "revealed" : "",
              cell.revealed && cell.mine && board.status === "lost"
                ? "exploded"
                : "",
              cell.revealed && !cell.mine && cell.adjacent > 0
                ? `num-${cell.adjacent}`
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            let content = "";
            if (cell.revealed) {
              if (cell.mine) content = "💣";
              else if (cell.adjacent > 0) content = String(cell.adjacent);
            } else if (cell.flagged) {
              content = "🚩";
            }

            return (
              <div
                key={idx}
                className={cls}
                onClick={() => handleCellClick(idx)}
                onContextMenu={(e) => handleRightClick(e, idx)}
              >
                {content}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: "10.5px", lineHeight: 1.3 }}>
          Safe clicks inject <b>+0.4s Overclock OP</b>. Clearing a board boosts{" "}
          <b>Entropy</b> (up to ×2.75) &amp; cools down <b>TURBO</b>!
        </div>

        <div className="row">
          <PurchaseButton
            state={state}
            upgradeId="AutoSweepMines"
            onMutate={onMutate}
          />
          {state.upgrades.AutoSweepMines.purchaseCount > 0 ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <input
                type="checkbox"
                checked={state.automation.autoSweepMines}
                onChange={(e) => {
                  state.automation.autoSweepMines = e.target.checked;
                  onMutate();
                }}
              />
              Auto-Sweep AI active
            </label>
          ) : null}
        </div>
      </div>
    </Window>
  );
}
