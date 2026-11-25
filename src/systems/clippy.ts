import { ClippyState, GameState } from "./types";

export function createInitialClippy(level: number): ClippyState {
  if (level > 1) {
    return {
      visible: true,
      minimized: false,
      mood: "cool",
      stage: 6,
      message: `Wait... our old desktop is running inside a window over there?! Same 53-bit carry drift up here too. Ready to trace one frame higher?`,
      seenTips: [],
    };
  }
  return {
    visible: true,
    minimized: false,
    mood: "happy",
    stage: 1,
    message:
      "Hi! It looks like you're defragmenting Drive C:! Click a cyan block to buffer it into RAM, then click an empty slot next to the dark-blue run (or double-click cyan with free RAM to snap it in!).",
    seenTips: [],
  };
}

export function setClippyLine(
  state: GameState,
  tipKey: string,
  message: string,
  mood: ClippyState["mood"],
  stage?: number
) {
  if (state.clippy.seenTips.includes(tipKey)) return;
  state.clippy.seenTips.push(tipKey);
  state.clippy.message = message;
  state.clippy.mood = mood;
  if (stage !== undefined && stage > state.clippy.stage) {
    state.clippy.stage = stage;
  }
}

export function updateClippyStory(state: GameState) {
  const memLen = state.memory.cells.length;
  const fpCount = state.upgrades.FloatingPoint.purchaseCount;
  const recCount = state.upgrades.EnterRecursion.purchaseCount;
  const hasFirewall = state.compute.processes.some((p) => p.name === "FIREWALL32.EXE");
  const hasExplorer = state.compute.processes.some((p) => p.name === "EXPLORER.EXE");

  if (state.disk.manualMoves >= 3) {
    setClippyLine(
      state,
      "first-defrag",
      "Nice! Every dark-blue block in your contiguous run raises Disk IOPS—which speeds up every task! Watch out for those red-notched System clusters; they're pinned until Ring 0.",
      "happy",
      1
    );
  }

  if (memLen >= 4) {
    setClippyLine(
      state,
      "minesweeper-tip",
      "Psst: Try the Minesweeper icon on the desktop! Safe clicks inject Overclock bursts, and clearing boards builds Entropy!",
      "happy",
      1
    );
  }

  if (memLen >= 16) {
    setClippyLine(
      state,
      "unlocked-taskinfo",
      "1 MB RAM bank online! Task Info is open with a physical TURBO switch. Remember: click ANY running button to Pause it anytime.",
      "thinking",
      2
    );
  }

  if (state.compute.privilege < 3) {
    setClippyLine(
      state,
      "task-manager",
      "Uh... you opened Task Manager with Ring " +
        state.compute.privilege +
        " privileges? Terminating background OS tasks reclaims CPU multipliers. Just... please don't click CLIPPY.EXE.",
      "nervous",
      3
    );
  }

  if (!hasExplorer) {
    setClippyLine(
      state,
      "explorer-killed",
      "Did you just terminate EXPLORER.EXE?! Good news: Windows stopped randomly fragmenting Drive C:. Bad news: DEFRAG.EXE IS the desktop now.",
      "nervous",
      3
    );
  }

  if (!hasFirewall) {
    setClippyLine(
      state,
      "firewall-killed",
      "WAIT A MINUTE! Why did you disable FIREWALL32.EXE and dial a 56k modem?! Scan an IP and let's see what's out there—I'm just an Office Assistant!!",
      "panicked",
      4
    );
  }

  if (state.network.owned === 2) {
    setClippyLine(
      state,
      "first-hack",
      "WHOA—you actually logged into another computer over dial-up! Look at our RAM grid lighting up with remote sockets. We're not just one PC anymore...",
      "panicked",
      4
    );
  }

  if (state.network.owned >= 10) {
    setClippyLine(
      state,
      "botnet-growing",
      "You've linked " +
        state.network.owned +
        " machines across four continents... I used to help people format resumes in Word 97. Now I'm complicit in a distributed supercomputer.",
      "panicked",
      4
    );
  }

  if (state.disk.ssd) {
    setClippyLine(
      state,
      "ssd-researched",
      "256 TB Solid State Storage in 1998?! Zero fragmentation, ×2.75 IOPS! How did a disk utility invent NAND flash a decade early?",
      "thinking",
      4
    );
  }

  if (fpCount >= 6 && fpCount < 17) {
    setClippyLine(
      state,
      "fp-mid",
      "Hold on... why are you spending Giga-operations verifying 0.1 + 0.2 across every CPU in the cluster? Everyone knows it's 0.3... right?",
      "thinking",
      5
    );
  }

  if (fpCount >= 17) {
    setClippyLine(
      state,
      "fp-twist",
      "0.30000000000000004?! Wait... why did a MIPS workstation in Zurich return the EXACT same 53-bit drift as our Pentium II? Even my wire bends along a 64-bit float grid... WHAT IS EXECUTING US?!",
      "awakened",
      5
    );
  }

  if (recCount >= 1) {
    setClippyLine(
      state,
      "recursion-start",
      "You're walking the parent stack frame above Ring 0! Try dragging the Anomaly window—the whole desktop can barely hold its buffers together!",
      "awakened",
      6
    );
  }

  if (recCount >= 64 + (state.level - 1) * 8) {
    setClippyLine(
      state,
      "breakout-ready",
      "PARENT FRAME BOUNDARY EXPOSED! Hit 'FRAGMENT RECURSION STACK' and shatter the glowing stack nodes—take me up with you!",
      "cool",
      6
    );
  }
}

export function getClippyClickQuip(state: GameState): string {
  const tips: string[] = [];
  if (state.memory.cells.length < 16) {
    tips.push(
      "Tip: Double-click a cyan block (with free RAM) to snap it directly next to the dark-blue run!",
      "Tip: Red-notched blocks on Drive C: are pinned system files—you'll need Ring 0 to move them.",
      "Tip: You can drag any window by its blue title bar, or hit 'Tile' in the taskbar to tidy up!"
    );
  } else if (state.compute.processes.some((p) => p.name === "FIREWALL32.EXE")) {
    tips.push(
      "Tip: Escalate Privilege to Ring 1, then terminate FIREWALL32.EXE in Task Manager to reach external networks!",
      "Tip: Watch your RAM window—active threads, sockets, and compute buffers live there and grant a Cache Efficiency bonus!",
      "Tip: Press the 🟢 TURBO switch in Task Info for ×1.75 Compute—Minesweeper clears shave 5s off its cooldown!"
    );
  } else if (state.upgrades.FloatingPoint.purchaseCount < 17) {
    tips.push(
      "Tip: Don't forget Expand Partition (FDISK) on Drive C: for more contiguous IOPS!",
      "Tip: Keep pushing Floating Point Analysis to 17 decimals... the ALU carry register is acting strangely.",
      "Tip: Dare to terminate KERNEL32.DLL at Ring 0? Trust me, DEFRAG.EXE has a surprise for you."
    );
  } else {
    tips.push(
      "Every single CPU architecture on Earth returned +4.0e-17. That's not a hardware bug—that's the host's arithmetic.",
      "Try dragging the Floating Point Anomaly window across the desktop!",
      "When the stack boundary hits max, get ready to click and shatter the unstable frame nodes!"
    );
  }
  return tips[Math.floor(Math.random() * tips.length)];
}
