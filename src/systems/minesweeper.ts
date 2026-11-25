import { MinesweeperCell, MinesweeperState } from "./types";

export const MINE_ROWS = 9;
export const MINE_COLS = 9;
export const MINE_COUNT = 10;

export function createMinesweeperBoard(prevWins = 0, prevRevealed = 0): MinesweeperState {
  const cells: MinesweeperCell[] = Array.from({ length: MINE_ROWS * MINE_COLS }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
  return {
    rows: MINE_ROWS,
    cols: MINE_COLS,
    mines: MINE_COUNT,
    cells,
    initialized: false,
    status: "ready",
    wins: prevWins,
    totalRevealed: prevRevealed,
    timer: 0,
    aiCooldown: 0,
  };
}

function getNeighbors(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        out.push(nr * cols + nc);
      }
    }
  }
  return out;
}

function placeMines(board: MinesweeperState, safeIndex: number) {
  const forbidden = new Set([safeIndex, ...getNeighbors(safeIndex, board.rows, board.cols)]);
  const candidates: number[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    if (!forbidden.has(i)) candidates.push(i);
  }
  // Fisher-Yates shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const count = Math.min(board.mines, candidates.length);
  for (let i = 0; i < count; i++) {
    board.cells[candidates[i]].mine = true;
  }
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i].mine) continue;
    board.cells[i].adjacent = getNeighbors(i, board.rows, board.cols).filter(
      (n) => board.cells[n].mine
    ).length;
  }
  board.initialized = true;
  board.status = "playing";
}

export interface RevealResult {
  newlyRevealed: number;
  hitMine: boolean;
  won: boolean;
}

export function revealMineCell(board: MinesweeperState, index: number): RevealResult {
  if (board.status === "won" || board.status === "lost") {
    return { newlyRevealed: 0, hitMine: false, won: false };
  }
  const cell = board.cells[index];
  if (!cell || cell.revealed || cell.flagged) {
    return { newlyRevealed: 0, hitMine: false, won: false };
  }
  if (!board.initialized) {
    placeMines(board, index);
  }
  if (cell.mine) {
    cell.revealed = true;
    board.status = "lost";
    // Reveal all mines
    for (const c of board.cells) {
      if (c.mine) c.revealed = true;
    }
    return { newlyRevealed: 0, hitMine: true, won: false };
  }

  let newlyRevealed = 0;
  const queue = [index];
  while (queue.length > 0) {
    const curIdx = queue.shift()!;
    const cur = board.cells[curIdx];
    if (cur.revealed || cur.flagged || cur.mine) continue;
    cur.revealed = true;
    newlyRevealed++;
    board.totalRevealed++;
    if (cur.adjacent === 0) {
      for (const n of getNeighbors(curIdx, board.rows, board.cols)) {
        if (!board.cells[n].revealed && !board.cells[n].flagged) {
          queue.push(n);
        }
      }
    }
  }

  const remainingSafe = board.cells.filter((c) => !c.mine && !c.revealed).length;
  let won = false;
  if (remainingSafe === 0) {
    board.status = "won";
    board.wins += 1;
    won = true;
    for (const c of board.cells) {
      if (c.mine) c.flagged = true;
    }
  }

  return { newlyRevealed, hitMine: false, won };
}

export function toggleFlagCell(board: MinesweeperState, index: number) {
  if (board.status === "won" || board.status === "lost") return;
  const cell = board.cells[index];
  if (!cell || cell.revealed) return;
  cell.flagged = !cell.flagged;
}

export function chordRevealCell(board: MinesweeperState, index: number): RevealResult {
  if (board.status !== "playing") return { newlyRevealed: 0, hitMine: false, won: false };
  const cell = board.cells[index];
  if (!cell || !cell.revealed || cell.adjacent === 0) {
    return { newlyRevealed: 0, hitMine: false, won: false };
  }
  const neighbors = getNeighbors(index, board.rows, board.cols);
  const flaggedCount = neighbors.filter((n) => board.cells[n].flagged).length;
  if (flaggedCount !== cell.adjacent) {
    return { newlyRevealed: 0, hitMine: false, won: false };
  }
  let totalRevealed = 0;
  for (const n of neighbors) {
    if (!board.cells[n].flagged && !board.cells[n].revealed) {
      const res = revealMineCell(board, n);
      totalRevealed += res.newlyRevealed;
      if (res.hitMine || res.won) return { newlyRevealed: totalRevealed, hitMine: res.hitMine, won: res.won };
    }
  }
  return { newlyRevealed: totalRevealed, hitMine: false, won: false };
}

/**
 * Logical Minesweeper AI step:
 * 1) If board ended, auto-resets after short pause.
 * 2) Flags 100% certain mines.
 * 3) Reveals 100% certain safe cells.
 * 4) If forced to guess, picks a safe cell with smart heuristic (AI overclocked!).
 */
export function stepMinesweeperAI(board: MinesweeperState): RevealResult {
  if (board.status === "won" || board.status === "lost") {
    board.aiCooldown += 1;
    if (board.aiCooldown >= 8) {
      const next = createMinesweeperBoard(board.wins, board.totalRevealed);
      Object.assign(board, next);
    }
    return { newlyRevealed: 0, hitMine: false, won: false };
  }

  if (!board.initialized) {
    return revealMineCell(board, Math.floor((board.rows * board.cols) / 2));
  }

  // Deduction pass
  for (let i = 0; i < board.cells.length; i++) {
    const c = board.cells[i];
    if (!c.revealed || c.adjacent === 0) continue;
    const neighbors = getNeighbors(i, board.rows, board.cols);
    const unrevealed = neighbors.filter((n) => !board.cells[n].revealed);
    const flagged = unrevealed.filter((n) => board.cells[n].flagged);
    const hidden = unrevealed.filter((n) => !board.cells[n].flagged);

    if (hidden.length > 0 && unrevealed.length === c.adjacent) {
      board.cells[hidden[0]].flagged = true;
      return { newlyRevealed: 0, hitMine: false, won: false };
    }
    if (hidden.length > 0 && flagged.length === c.adjacent) {
      return revealMineCell(board, hidden[0]);
    }
  }

  // Fallback: pick a safe unrevealed cell (our rogue AI peeks at RAM!)
  const safeHidden = board.cells
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => !c.revealed && !c.flagged && !c.mine);
  if (safeHidden.length > 0) {
    const pick = safeHidden[Math.floor(Math.random() * safeHidden.length)];
    return revealMineCell(board, pick.idx);
  }

  return { newlyRevealed: 0, hitMine: false, won: false };
}
