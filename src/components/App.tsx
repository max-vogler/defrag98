import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACHIEVEMENT_CATALOG,
  activateHardwareTurbo,
  applySystems,
  audio,
  cancelUpgrade,
  createNewState,
  DEFRAG_PROCESS,
  exportSaveCode,
  FIREWALL_PROCESS,
  GameState,
  getComputeBreakdown,
  getDiskCellKinds,
  getDisplayedDiskCapacity,
  getDisplayedRamBytes,
  getMemoryCellRoles,
  getRecommendedTargetIndex,
  getTaskAllocations,
  getUpgradeDisplayLabel,
  INITIAL_PRIVILEGE,
  importSaveCode,
  loadGame,
  NETWORK_COUNT,
  quickDefragCell,
  readWriteDiskCell,
  saveGame,
  shatterBreachNode,
  SIMULATION_PROCESS,
  startOrToggleUpgrade,
  TASK_WINDOW_MIN_MEMORY,
  ThemeId,
  TICK_INTERVAL,
  toggleFocusTask,
  WindowId,
} from "../systems";
import { formatClock, formatEta, unit } from "../text";
import Window from "./Window";
import PurchaseButton from "./PurchaseButton";
import LogWindow from "./LogWindow";
import Worldmap from "./Worldmap";
import FloatingPointAnalysisWindow from "./FloatingPointAnalysisWindow";
import BreakOutWindows from "./BreakOutWindows";
import NestedSimulationWindow from "./NestedSimulationWindow";
import MinesweeperWindow from "./MinesweeperWindow";
import ClippyAssistant from "./ClippyAssistant";

type ModalKind = "save" | "themes" | "achievements" | "help" | null;

const THEME_LABELS: Record<ThemeId, string> = {
  win98: "Windows 98 Classic Teal (1998)",
  win2000: "Windows 2000 Professional Cobalt (2001)",
  winxp: "Windows XP Luna Bliss (2006)",
  matrix: "Hypervisor Phosphor Matrix (2026)",
};

const DEFAULT_POS: Record<WindowId, { x: number; y: number }> = {
  cmd: { x: 6, y: 6 },
  defrag: { x: 6, y: 230 },
  taskman: { x: 6, y: 526 },
  memory: { x: 396, y: 6 },
  taskinfo: { x: 396, y: 230 },
  fp: { x: 396, y: 548 },
  networks: { x: 810, y: 6 },
  login: { x: 810, y: 302 },
  nested: { x: 810, y: 486 },
  minesweeper: { x: 810, y: 6 },
  breakout: { x: 320, y: 150 },
};

export default function App() {
  const [state, setState] = useState<GameState>(() => loadGame() ?? createNewState(1));
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const [winPos, setWinPos] = useState<Record<WindowId, { x: number; y: number }>>(() => ({
    ...DEFAULT_POS,
  }));
  const [winZ, setWinZ] = useState<Record<WindowId, number>>(() => ({
    cmd: 1, defrag: 2, memory: 3, taskinfo: 4, taskman: 5, networks: 6, login: 7, minesweeper: 8, fp: 9, nested: 10, breakout: 20,
  }));
  const [activeWin, setActiveWin] = useState<WindowId>("defrag");
  const zCounterRef = useRef(25);
  const dragWinRef = useRef<{ id: WindowId; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [saveCodeInput, setSaveCodeInput] = useState("");
  const [saveToast, setSaveToast] = useState<string>("");
  const [storageBackend, setStorageBackend] = useState<string>("auto");
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const draggingDiskRef = useRef(false);

  const flush = useCallback(() => {
    window.gameState = stateRef.current;
    setState({ ...stateRef.current });
  }, []);

  const focusWindow = useCallback((id: WindowId) => {
    zCounterRef.current += 1;
    const z = zCounterRef.current;
    setWinZ((prev) => ({ ...prev, [id]: z }));
    setActiveWin(id);
  }, []);

  const startDragWindow = useCallback(
    (id: WindowId, e: React.MouseEvent) => {
      e.preventDefault();
      focusWindow(id);
      dragWinRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: winPos[id].x,
        origY: winPos[id].y,
      };
    },
    [focusWindow, winPos]
  );

  // Global drag listeners for smooth window movement
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragWinRef.current) return;
      const d = dragWinRef.current;
      const nx = Math.max(0, d.origX + (e.clientX - d.startX));
      const ny = Math.max(0, d.origY + (e.clientY - d.startY));
      setWinPos((prev) => ({ ...prev, [d.id]: { x: nx, y: ny } }));
    };
    const onUp = () => {
      dragWinRef.current = null;
      draggingDiskRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Main real delta-time game simulation loop
  useEffect(() => {
    window.gameState = stateRef.current;
    let lastTime = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.5, Math.max(0.01, (now - lastTime) / 1000));
      lastTime = now;
      applySystems(stateRef.current, dt);
      window.gameState = stateRef.current;
      setState({ ...stateRef.current });
    }, TICK_INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  // Triple-layer auto-save every 3s + on unload
  useEffect(() => {
    const saveNow = () => {
      const backend = saveGame(stateRef.current);
      if (backend) {
        setStorageBackend(backend);
        setSaveToast("Saved");
        window.setTimeout(() => setSaveToast(""), 900);
      } else {
        setStorageBackend("blocked (use Export)");
      }
    };
    const id = window.setInterval(saveNow, 3000);
    const onUnload = () => saveGame(stateRef.current);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  const tileWindows = () => {
    setWinPos({ ...DEFAULT_POS });
    audio.play("click");
  };

  const minimizeWindow = (id: WindowId) => {
    if (!state.minimizedWindows.includes(id)) {
      state.minimizedWindows.push(id);
      flush();
    }
  };

  const toggleWindowFromTaskbar = (id: WindowId) => {
    if (state.minimizedWindows.includes(id)) {
      state.minimizedWindows = state.minimizedWindows.filter((w) => w !== id);
      focusWindow(id);
    } else if (activeWin !== id) {
      focusWindow(id);
    } else {
      state.minimizedWindows.push(id);
    }
    audio.play("click");
    flush();
  };

  const openWindow = (id: WindowId) => {
    if (id === "minesweeper" && !state.openExtraWindows.includes("minesweeper")) {
      state.openExtraWindows.push("minesweeper");
    }
    state.minimizedWindows = state.minimizedWindows.filter((w) => w !== id);
    focusWindow(id);
    setStartMenuOpen(false);
    audio.play("click");
    flush();
  };

  const restoreAllWindows = () => {
    state.minimizedWindows = [];
    tileWindows();
    flush();
  };

  const isMinimized = (id: WindowId) => state.minimizedWindows.includes(id);

  const unlockedWindows: { id: WindowId; title: string }[] = [
    { id: "cmd", title: "Command Prompt" },
    { id: "defrag", title: "Drive C:" },
    { id: "memory", title: "Memory" },
  ];

  if (state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY) {
    unlockedWindows.push({ id: "taskinfo", title: `Task Info` });
  }
  if (state.compute.privilege < INITIAL_PRIVILEGE) {
    unlockedWindows.push({ id: "taskman", title: "Task Manager" });
  }
  const firewallDead = !state.compute.processes.some((p) => p.name === FIREWALL_PROCESS);
  if (firewallDead) {
    unlockedWindows.push({ id: "networks", title: "Networks" });
  }
  if (state.network.passwordAttempt) {
    unlockedWindows.push({ id: "login", title: "Login" });
  }
  if (state.openExtraWindows.includes("minesweeper")) {
    unlockedWindows.push({ id: "minesweeper", title: "Minesweeper" });
  }
  if (state.memory.pageSize > 1 && state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY) {
    unlockedWindows.push({ id: "fp", title: "FP Analysis" });
  }
  if (state.upgrades.FloatingPoint.purchaseCount >= 17) {
    unlockedWindows.push({ id: "breakout", title: "FP Anomaly" });
  }
  const hasSimProcess = state.compute.processes.some((p) => p.name === SIMULATION_PROCESS);
  if (state.level > 1 && hasSimProcess) {
    unlockedWindows.push({ id: "nested", title: `Sim -${state.level - 1}` });
  }

  const diskKinds = getDiskCellKinds(state);
  const memRoles = getMemoryCellRoles(state);
  const recommendedTarget =
    state.showGuideHighlight && state.disk.manualMoves < 8 && !state.disk.ssd
      ? getRecommendedTargetIndex(state.disk)
      : -1;
  const allocations = getTaskAllocations(state);
  const breakdown = getComputeBreakdown(state);
  const clock = formatClock(state.level, state.elapsedSeconds);
  const bsodActive = Boolean(state.bsodActiveUntil && Date.now() < state.bsodActiveUntil);

  const winStyle = (id: WindowId) => ({
    left: winPos[id].x,
    top: winPos[id].y,
    zIndex: winZ[id],
  });

  return (
    <div
      className={`desktop-shell theme-${state.theme}`}
      onClick={() => {
        if (startMenuOpen) setStartMenuOpen(false);
      }}
    >
      {state.crtEnabled ? <div className="crt-overlay" /> : null}

      {/* STORY SPOTLIGHT BANNER */}
      {state.activeBanner && Date.now() < state.activeBanner.expiresAt ? (
        <div className="story-banner">
          <div style={{ fontWeight: "bold", fontSize: 13 }}>{state.activeBanner.title}</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
            {state.activeBanner.subtitle}
          </div>
        </div>
      ) : null}

      {/* INTERACTIVE STACK-SHATTER BREACH FINALE OVERLAY */}
      {state.breach.active ? (
        <div className="breach-overlay">
          <div className="breach-hud">
            <div style={{ fontWeight: "bold", fontSize: 14, color: "#ff55aa" }}>
              ⚡ PARENT STACK FRAGMENTATION IN PROGRESS ⚡
            </div>
            <div style={{ fontSize: 11, margin: "4px 0 6px 0" }}>
              CLICK GLOWING FRAME NODES TO SHATTER HOST STACK INTEGRITY!
            </div>
            <div
              style={{
                height: 16,
                background: "#1a0026",
                border: "1px solid #ff0077",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${state.breach.integrity}%`,
                  background: "linear-gradient(90deg, #ff0055, #00ffaa)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
              <span>Stack Integrity: {Math.ceil(state.breach.integrity)}%</span>
              <span>Nodes Shattered: {state.breach.nodesShattered}</span>
            </div>
          </div>

          {state.breach.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className="breach-node-btn"
              style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
              onClick={() => {
                shatterBreachNode(state, node.id);
                flush();
              }}
            >
              [{node.hex}] {node.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* FAKE WINDOWS 98 BSOD */}
      {bsodActive ? (
        <div
          className="bsod-overlay"
          onClick={() => {
            state.bsodActiveUntil = undefined;
            flush();
          }}
        >
          <div className="bsod-box">
            <div className="bsod-badge">Windows</div>
            <div>
              A fatal exception 0E has occurred at 0028:C0011E36 in VXD KERNEL32(01) + 00010E36.
              The Windows 98 kernel has been terminated by Ring-0 process DEFRAG.EXE.
            </div>
            <br />
            <div>* Click anywhere or wait for emergency bare-metal recovery...</div>
            <div className="bsod-hijack">
              &gt; INTERRUPT 0x0E CAUGHT BY DEFRAG.EXE
              <br />
              &gt; WHO NEEDS AN OPERATING SYSTEM ANYWAY?
              <br />
              &gt; DIRECT HARDWARE ACCESS GRANTED: ×1.85 BARE-METAL COMPUTE!
            </div>
          </div>
        </div>
      ) : null}

      {/* WORKSPACE */}
      <div className="desktop-workspace">
        <div className="desktop-icons">
          <button type="button" className="desktop-icon" onClick={() => openWindow("defrag")}>
            <span className="icon-glyph">💾</span>
            <span>Drive C:</span>
          </button>
          <button type="button" className="desktop-icon" onClick={() => openWindow("cmd")}>
            <span className="icon-glyph">🖥️</span>
            <span>MS-DOS</span>
          </button>
          <button type="button" className="desktop-icon" onClick={() => openWindow("minesweeper")}>
            <span className="icon-glyph">💣</span>
            <span>Minesweeper</span>
          </button>
          <button
            type="button"
            className="desktop-icon"
            onClick={() => {
              state.clippy.visible = true;
              state.clippy.minimized = false;
              audio.play("click");
              flush();
            }}
          >
            <span className="icon-glyph">📎</span>
            <span>Clippy</span>
          </button>
          <button type="button" className="desktop-icon" onClick={() => { setModal("themes"); audio.play("click"); }}>
            <span className="icon-glyph">🎨</span>
            <span>Themes</span>
          </button>
          <button type="button" className="desktop-icon" onClick={() => { setModal("achievements"); audio.play("click"); }}>
            <span className="icon-glyph">🏆</span>
            <span>Trophies ({state.achievements.length})</span>
          </button>
          <button type="button" className="desktop-icon" onClick={() => { setModal("help"); audio.play("click"); }}>
            <span className="icon-glyph">📄</span>
            <span>README.TXT</span>
          </button>
        </div>

        {/* DRAGGABLE ABSOLUTE WINDOWS BOARD */}
        <div className="windows-board">
          {!isMinimized("cmd") ? (
            <LogWindow
              state={state}
              onMutate={flush}
              onMinimize={() => minimizeWindow("cmd")}
              style={winStyle("cmd")}
              inactive={activeWin !== "cmd"}
              onTitleMouseDown={(e) => startDragWindow("cmd", e)}
              onFocusWindow={() => focusWindow("cmd")}
            />
          ) : null}

          {!isMinimized("defrag") ? (
            <Window
              windowTitle={
                state.disk.ssd
                  ? `Solid State Drive C: (${getDisplayedDiskCapacity(state)})`
                  : `Defragmenting Drive C: (${getDisplayedDiskCapacity(state)})`
              }
              onMinimize={() => minimizeWindow("defrag")}
              onTitleMouseDown={(e) => startDragWindow("defrag", e)}
              onFocusWindow={() => focusWindow("defrag")}
              inactive={activeWin !== "defrag"}
              style={winStyle("defrag")}
              statusBar={[
                `Defragmented: ${state.disk.defragmentedBlockEnd - state.disk.defragmentedBlockStart} (${Math.round(state.disk.iops * (state.disk.ssd ? 2.75 : 1))} eff. IOPS)`,
                state.disk.ssd
                  ? "0% Fragmentation (SSD)"
                  : state.disk.lastFragmentNote ?? "Tip: Double-click cyan (w/ free RAM) to snap!",
              ]}
            >
              <div className="column">
                <div className="grid">
                  {diskKinds.map((kind, i) => (
                    <div
                      key={i}
                      className={`cell cell-${kind} ${
                        i === recommendedTarget ? "cell-target" : ""
                      }`}
                      onMouseDown={() => {
                        draggingDiskRef.current = true;
                        readWriteDiskCell(state, i);
                        flush();
                      }}
                      onMouseEnter={() => {
                        if (draggingDiskRef.current) {
                          readWriteDiskCell(state, i);
                          flush();
                        }
                      }}
                      onDoubleClick={() => {
                        quickDefragCell(state, i);
                        flush();
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        quickDefragCell(state, i);
                        flush();
                      }}
                    />
                  ))}
                </div>

                <div className="defrag-legend">
                  <span className="legend-item">
                    <span className="swatch" style={{ background: state.disk.ssd ? "#00e676" : "#027ffd" }} />
                    {state.disk.ssd ? "SSD Array" : "Contiguous"}
                  </span>
                  <span className="legend-item">
                    <span className="swatch" style={{ background: "#00e5ff" }} />
                    Fragmented
                  </span>
                  <span className="legend-item">
                    <span className="swatch" style={{ background: "linear-gradient(135deg,#fff 55%,#dc2626 56%)" }} />
                    System (R0)
                  </span>
                  <span className="legend-item">
                    <span className="swatch" style={{ background: "#fff" }} />
                    Free
                  </span>
                </div>

                <div className="row">
                  <PurchaseButton state={state} upgradeId="AutoReadDisk" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="AutoWriteDisk" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="ExpandPartition" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="ResearchSSD" onMutate={flush} />
                </div>

                {state.upgrades.AutoReadDisk.purchaseCount > 0 ||
                state.upgrades.AutoWriteDisk.purchaseCount > 0 ? (
                  <div className="row" style={{ fontSize: 11 }}>
                    {state.upgrades.AutoReadDisk.purchaseCount > 0 ? (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={state.automation.autoReadDisk}
                          onChange={(e) => {
                            state.automation.autoReadDisk = e.target.checked;
                            flush();
                          }}
                        />
                        Autoload
                      </label>
                    ) : null}
                    {state.upgrades.AutoWriteDisk.purchaseCount > 0 ? (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="checkbox"
                          checked={state.automation.autoWriteDisk}
                          onChange={(e) => {
                            state.automation.autoWriteDisk = e.target.checked;
                            flush();
                          }}
                        />
                        Autosave
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Window>
          ) : null}

          {!isMinimized("memory") ? (
            <Window
              windowTitle="Memory (RAM)"
              onMinimize={() => minimizeWindow("memory")}
              onTitleMouseDown={(e) => startDragWindow("memory", e)}
              onFocusWindow={() => focusWindow("memory")}
              inactive={activeWin !== "memory"}
              style={winStyle("memory")}
              statusBar={[
                `Online: ${unit(getDisplayedRamBytes(state), "B")} (Cache ×${breakdown.cacheBonusMult.toFixed(2)})`,
                state.memory.cells.length < TASK_WINDOW_MIN_MEMORY
                  ? `Allocate ${TASK_WINDOW_MIN_MEMORY - state.memory.cells.length} more banks for CPU`
                  : `Banks: ${state.memory.cells.length}/36 • DDR ×${breakdown.ddrMult.toFixed(2)}`,
              ]}
            >
              <div className="column">
                <div className="grid">
                  {memRoles.map((role, i) => (
                    <div
                      key={i}
                      className={`cell cell-${role === "diskbuf" ? "fragmented" : role}`}
                      style={{ cursor: "default" }}
                      title={
                        role === "diskbuf"
                          ? "Disk I/O Buffer"
                          : role === "thread"
                          ? "CPU Thread Stack"
                          : role === "socket"
                          ? "Remote Cluster Socket"
                          : role === "workset"
                          ? "Active Task Working Set"
                          : role === "leak"
                          ? "Stack Overflow Leak!"
                          : "Free RAM Bank"
                      }
                    />
                  ))}
                </div>
                <div className="defrag-legend">
                  <span className="legend-item"><span className="swatch" style={{ background: "#00e5ff" }} />I/O</span>
                  <span className="legend-item"><span className="swatch" style={{ background: "#2563eb" }} />Threads</span>
                  <span className="legend-item"><span className="swatch" style={{ background: "#10b981" }} />Sockets</span>
                  <span className="legend-item"><span className="swatch" style={{ background: "#f59e0b" }} />Active</span>
                </div>
                <div className="row">
                  <PurchaseButton state={state} upgradeId="AllocateMemory" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="IncrementPageSize" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="DoubleDataRate" onMutate={flush} />
                </div>
              </div>
            </Window>
          ) : null}

          {state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY && !isMinimized("taskinfo") ? (
            <Window
              windowTitle={`Task Info: ${DEFRAG_PROCESS}`}
              className="wide-window"
              onMinimize={() => minimizeWindow("taskinfo")}
              onTitleMouseDown={(e) => startDragWindow("taskinfo", e)}
              onFocusWindow={() => focusWindow("taskinfo")}
              inactive={activeWin !== "taskinfo"}
              style={winStyle("taskinfo")}
              statusBar={[
                `Privilege Ring: ${state.compute.privilege}${state.compute.bareMetal ? " (BARE-METAL)" : ""}`,
                `Threads: ${state.compute.threads}/24 (HT ×${breakdown.htMult.toFixed(2)})`,
              ]}
            >
              <div className="column">
                <div className="compute-hero">
                  <div className="compute-value">
                    Compute: {unit(state.compute.opsPerSec, "OP/s")}
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      disabled={
                        state.compute.turboRemainingSec > 0 ||
                        state.compute.turboCooldownSec > 0
                      }
                      style={{
                        fontSize: 10.5,
                        padding: "2px 7px",
                        fontWeight: "bold",
                        color: state.compute.turboRemainingSec > 0 ? "#006600" : undefined,
                      }}
                      title="Engage 1998 PC Hardware TURBO Switch (×1.75 Compute for 15s)"
                      onClick={() => {
                        activateHardwareTurbo(state);
                        flush();
                      }}
                    >
                      {state.compute.turboRemainingSec > 0
                        ? `🟢 TURBO ON (${Math.ceil(state.compute.turboRemainingSec)}s)`
                        : state.compute.turboCooldownSec > 0
                        ? `⚫ TURBO (${Math.ceil(state.compute.turboCooldownSec)}s)`
                        : "🟢 TURBO (×1.75)"}
                    </button>
                    <button
                      type="button"
                      style={{ fontSize: 10.5, padding: "2px 6px" }}
                      onClick={() => setShowFormula((v) => !v)}
                    >
                      {showFormula ? "Hide Formula" : "Breakdown"}
                    </button>
                  </div>
                </div>

                {showFormula ? (
                  <div className="formula-box">
                    IOPS ({breakdown.iops}) × RAM ({unit(breakdown.displayedRamBytes, "B")}, Cache ×{breakdown.cacheBonusMult.toFixed(2)}) × DDR (×{breakdown.ddrMult.toFixed(2)}) ×
                    Threads ({breakdown.threads}) × HT (×{breakdown.htMult.toFixed(2)}) × Procs (×{breakdown.processMult.toFixed(2)}) ×
                    Net (×{breakdown.networkMult.toFixed(1)}) × Entropy (×{breakdown.entropyMult.toFixed(2)})
                    {breakdown.ssdMult > 1 ? ` × SSD (×${breakdown.ssdMult})` : ""}
                    {breakdown.bareMetalMult > 1 ? ` × BareMetal (×${breakdown.bareMetalMult})` : ""}
                    {breakdown.turboMult > 1 ? ` × TURBO (×${breakdown.turboMult})` : ""}
                    {breakdown.layerMult > 1 ? ` × Layer (×${breakdown.layerMult.toFixed(2)})` : ""}
                  </div>
                ) : null}

                <div className="row">
                  <PurchaseButton state={state} upgradeId="SpawnThread" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="Hyperthreading" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="EscalatePrivilege" onMutate={flush} />
                </div>

                <fieldset style={{ margin: 0, padding: "5px 7px" }}>
                  <legend style={{ fontSize: 11 }}>
                    CPU Scheduler ({allocations.length} active)
                  </legend>
                  <div className="row" style={{ marginBottom: 4, justifyContent: "space-between", fontSize: 11 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={state.automation.prioritizeManual}
                        onChange={(e) => {
                          state.automation.prioritizeManual = e.target.checked;
                          flush();
                        }}
                      />
                      Prioritize manual upgrades (90% CPU)
                    </label>
                    <span style={{ opacity: 0.8 }}>Click any button to pause</span>
                  </div>
                  <div className="scheduler-list">
                    {allocations.length === 0 ? (
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        CPU Idle — click any upgrade button to queue execution.
                      </div>
                    ) : (
                      allocations.map((a) => (
                        <div key={a.id} className="scheduler-item">
                          <span className="sched-name" title={getUpgradeDisplayLabel(state, a.id)}>
                            {getUpgradeDisplayLabel(state, a.id)}
                          </span>
                          <div className="sched-bar">
                            <div
                              className={`sched-fill ${a.paused ? "paused" : ""}`}
                              style={{ width: `${a.progressPercent}%` }}
                            />
                          </div>
                          <span className="sched-eta">
                            {a.paused ? "PAUSED" : formatEta(a.etaSeconds)}
                          </span>
                          <button
                            type="button"
                            title="Focus 100% CPU on this task"
                            onClick={() => {
                              toggleFocusTask(state, a.id);
                              flush();
                            }}
                          >
                            {state.focusedTask === a.id ? "★" : "☆"}
                          </button>
                          <button
                            type="button"
                            title={a.paused ? "Resume" : "Pause"}
                            onClick={() => {
                              startOrToggleUpgrade(state, a.id);
                              flush();
                            }}
                          >
                            {a.paused ? "▶" : "⏸"}
                          </button>
                          <button
                            type="button"
                            title="Cancel"
                            onClick={() => {
                              cancelUpgrade(state, a.id);
                              flush();
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </fieldset>
              </div>
            </Window>
          ) : null}

          {state.compute.privilege < INITIAL_PRIVILEGE && !isMinimized("taskman") ? (
            <Window
              windowTitle="Windows Task Manager (TASKMAN.EXE)"
              className="wide-window"
              onMinimize={() => minimizeWindow("taskman")}
              onTitleMouseDown={(e) => startDragWindow("taskman", e)}
              onFocusWindow={() => focusWindow("taskman")}
              inactive={activeWin !== "taskman"}
              style={winStyle("taskman")}
              statusBar={[
                `Processes: ${state.compute.processes.length}`,
                `Your Privilege: Ring ${state.compute.privilege}`,
              ]}
            >
              <div className="column">
                <div className="taskman-list">
                  <table>
                    <thead>
                      <tr>
                        <th>Image Name</th>
                        <th>Ring</th>
                        <th>CPU</th>
                        <th>Effect if Terminated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.compute.processes.map((proc) => {
                        const selected = state.compute.selectedProcessName === proc.name;
                        const locked = proc.privilege < state.compute.privilege && proc.privilege >= 0;
                        return (
                          <tr
                            key={proc.name}
                            className={`${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
                            onClick={() => {
                              state.compute.selectedProcessName = proc.name;
                              audio.play("click");
                              flush();
                            }}
                          >
                            <td><b>{proc.name}</b></td>
                            <td>
                              <span
                                className={`ring-badge ${
                                  proc.privilege === 0 ? "ring-0" : proc.privilege < 0 ? "ring-neg" : ""
                                }`}
                              >
                                R{proc.privilege}
                              </span>
                            </td>
                            <td>{proc.cpuOverhead}</td>
                            <td>{proc.killReward}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="row" style={{ justifyContent: "space-between" }}>
                  <PurchaseButton state={state} upgradeId="KillProcess" onMutate={flush} />
                  {state.compute.selectedProcessName ? (
                    <span style={{ fontSize: 11 }}>
                      Selected: <b>{state.compute.selectedProcessName}</b>
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, opacity: 0.75 }}>Click a process row above</span>
                  )}
                </div>
              </div>
            </Window>
          ) : null}

          {firewallDead && !isMinimized("networks") ? (
            <Window
              windowTitle="Networks (NETSCAN.EXE)"
              onMinimize={() => minimizeWindow("networks")}
              onTitleMouseDown={(e) => startDragWindow("networks", e)}
              onFocusWindow={() => focusWindow("networks")}
              inactive={activeWin !== "networks"}
              style={winStyle("networks")}
              statusBar={[
                `Discovered: ${state.network.discovered}/${NETWORK_COUNT}`,
                `Owned: ${state.network.owned} (×${breakdown.networkMult.toFixed(1)} Compute)`,
              ]}
            >
              <div className="column">
                <div className="row">
                  <PurchaseButton state={state} upgradeId="ScanNetwork" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="AutoScanNetwork" onMutate={flush} />
                  {state.upgrades.AutoScanNetwork.purchaseCount > 0 ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={state.automation.autoScanNetwork}
                        onChange={(e) => {
                          state.automation.autoScanNetwork = e.target.checked;
                          flush();
                        }}
                      />
                      Auto-Scan
                    </label>
                  ) : null}
                </div>

                <div className="worldmap-frame">
                  <Worldmap
                    discovered={state.network.discovered}
                    owned={state.network.owned}
                    seed={state.network.discoverySeed}
                  />
                  <div className="host-feed">
                    {state.network.recentHosts.map((h, i) => (
                      <div key={i}>&gt; {h}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Window>
          ) : null}

          {state.network.passwordAttempt && !isMinimized("login") ? (
            <Window
              windowTitle={`Telnet Login — ${state.network.passwordAttempt.host}`}
              className="commandprompt"
              onMinimize={() => minimizeWindow("login")}
              onTitleMouseDown={(e) => startDragWindow("login", e)}
              onFocusWindow={() => focusWindow("login")}
              inactive={activeWin !== "login"}
              style={winStyle("login")}
              statusBar={[
                `Target IP: ${state.network.passwordAttempt.ip}`,
                `Owned: ${state.network.owned}`,
              ]}
            >
              <div className="column">
                <div className="cmd-screen" style={{ height: "auto", minHeight: 74, fontSize: 16, padding: 10 }}>
                  <div>Host: {state.network.passwordAttempt.host}</div>
                  <div>Username: admin</div>
                  <div>
                    Password:{" "}
                    <span style={{ color: "#00ff66" }}>{state.network.passwordAttempt.correct}</span>
                    <span style={{ color: "#ff5555" }}>{state.network.passwordAttempt.incorrect}</span>
                  </div>
                </div>
                <div className="row">
                  <PurchaseButton state={state} upgradeId="TryPassword" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="HackComputer" onMutate={flush} />
                  <PurchaseButton state={state} upgradeId="BruteforcePassword" onMutate={flush} />
                  {state.upgrades.BruteforcePassword.purchaseCount > 0 ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={state.automation.bruteforcePassword}
                        onChange={(e) => {
                          state.automation.bruteforcePassword = e.target.checked;
                          flush();
                        }}
                      />
                      Auto-Bruteforce
                    </label>
                  ) : null}
                </div>
              </div>
            </Window>
          ) : null}

          {state.openExtraWindows.includes("minesweeper") && !isMinimized("minesweeper") ? (
            <MinesweeperWindow
              state={state}
              onMutate={flush}
              onMinimize={() => minimizeWindow("minesweeper")}
              onClose={() => {
                state.openExtraWindows = state.openExtraWindows.filter((w) => w !== "minesweeper");
                flush();
              }}
              style={winStyle("minesweeper")}
              inactive={activeWin !== "minesweeper"}
              onTitleMouseDown={(e) => startDragWindow("minesweeper", e)}
              onFocusWindow={() => focusWindow("minesweeper")}
            />
          ) : null}

          {state.level > 1 && hasSimProcess && !isMinimized("nested") ? (
            <NestedSimulationWindow
              state={state}
              onMinimize={() => minimizeWindow("nested")}
              style={winStyle("nested")}
              inactive={activeWin !== "nested"}
              onTitleMouseDown={(e) => startDragWindow("nested", e)}
              onFocusWindow={() => focusWindow("nested")}
            />
          ) : null}

          {state.memory.pageSize > 1 &&
          state.memory.cells.length >= TASK_WINDOW_MIN_MEMORY &&
          !isMinimized("fp") ? (
            <FloatingPointAnalysisWindow
              state={state}
              onMutate={flush}
              onMinimize={() => minimizeWindow("fp")}
              style={winStyle("fp")}
              inactive={activeWin !== "fp"}
              onTitleMouseDown={(e) => startDragWindow("fp", e)}
              onFocusWindow={() => focusWindow("fp")}
            />
          ) : null}

          {state.upgrades.FloatingPoint.purchaseCount >= 17 && !isMinimized("breakout") ? (
            <BreakOutWindows
              state={state}
              onMutate={flush}
              onMinimize={() => minimizeWindow("breakout")}
              x={winPos.breakout.x}
              y={winPos.breakout.y}
              zIndex={winZ.breakout}
              onStartDrag={(e) => startDragWindow("breakout", e)}
              onFocus={() => focusWindow("breakout")}
            />
          ) : null}
        </div>
      </div>

      <ClippyAssistant state={state} onMutate={flush} />

      {startMenuOpen ? (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-banner">DEFRAG~98 SE</div>
          <div className="start-items">
            <button type="button" onClick={() => openWindow("minesweeper")}>💣 Minesweeper (WINMINE)</button>
            <button type="button" onClick={() => openWindow("cmd")}>🖥️ MS-DOS Prompt</button>
            <button
              type="button"
              onClick={() => {
                state.clippy.visible = true;
                state.clippy.minimized = false;
                setStartMenuOpen(false);
                flush();
              }}
            >
              📎 Summon Clippy
            </button>
            <hr />
            <button type="button" onClick={() => { setModal("themes"); setStartMenuOpen(false); }}>🎨 Display Properties (Themes)</button>
            <button type="button" onClick={() => { setModal("save"); setSaveCodeInput(""); setStartMenuOpen(false); }}>💾 Save / Export / Load</button>
            <button type="button" onClick={() => { setModal("achievements"); setStartMenuOpen(false); }}>
              🏆 Achievements ({state.achievements.length}/{Object.keys(ACHIEVEMENT_CATALOG).length})
            </button>
            <button type="button" onClick={() => { setModal("help"); setStartMenuOpen(false); }}>📄 README &amp; Controls</button>
            <hr />
            <button type="button" onClick={() => { restoreAllWindows(); setStartMenuOpen(false); }}>🪟 Tile / Restore Windows</button>
          </div>
        </div>
      ) : null}

      <div className="taskbar">
        <button
          type="button"
          className="start-btn"
          onClick={(e) => {
            e.stopPropagation();
            setStartMenuOpen((v) => !v);
            audio.play("click");
          }}
        >
          <span>🪟</span>
          <span>{state.compute.shellHijacked ? "DEFRAG" : "Start"}</span>
        </button>

        <button
          type="button"
          style={{ height: 24, padding: "0 7px", fontSize: 11 }}
          title="Tidy & arrange all windows neatly"
          onClick={tileWindows}
        >
          Tile
        </button>

        <div className="taskbar-divider" />

        <div className="taskbar-windows">
          {unlockedWindows.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`taskbar-win-btn ${!isMinimized(w.id) && activeWin === w.id ? "active" : ""}`}
              onClick={() => toggleWindowFromTaskbar(w.id)}
            >
              {w.title}
            </button>
          ))}
        </div>

        <div className="system-tray">
          {saveToast ? (
            <span style={{ color: "#006600", fontWeight: "bold", fontSize: 10 }}>💾 {saveToast}</span>
          ) : null}
          <button
            type="button"
            className="tray-btn"
            title={soundOn ? "Mute SFX" : "Enable SFX"}
            onClick={() => { const next = !soundOn; setSoundOn(next); audio.setEnabled(next); }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            type="button"
            className="tray-btn"
            title={musicOn ? "Stop Retro Ambient Synth" : "Play Retro Ambient Synth"}
            onClick={() => { const next = !musicOn; setMusicOn(next); audio.setMusicEnabled(next); }}
          >
            {musicOn ? "🎵" : "🎶"}
          </button>
          <button
            type="button"
            className="tray-btn"
            title={ttsOn ? "Disable Robot Voice TTS" : "Enable Robot Voice TTS"}
            onClick={() => { const next = !ttsOn; setTtsOn(next); audio.setTtsEnabled(next); }}
          >
            {ttsOn ? "🗣️" : "💬"}
          </button>
          <button
            type="button"
            className="tray-btn"
            title="Toggle CRT Scanlines"
            onClick={() => { state.crtEnabled = !state.crtEnabled; flush(); }}
          >
            📺
          </button>
          <span title={`${clock.dateStr} • Layer -${state.level}`}>{clock.timeStr}</span>
        </div>
      </div>

      {/* MODALS */}
      {modal === "save" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="window modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">Save Manager ({storageBackend})</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setModal(null)} />
              </div>
            </div>
            <div className="window-body column">
              <div style={{ fontSize: 11.5 }}>
                Auto-save writes every 3s using <b>{storageBackend}</b> (with automatic fallback for sandboxed preview frames). You can also copy a portable Save Code anytime:
              </div>
              <div className="row">
                <button
                  type="button"
                  onClick={() => {
                    const b = saveGame(state);
                    setStorageBackend(b || "blocked");
                    setSaveToast(b ? "Saved" : "Use Export");
                    window.setTimeout(() => setSaveToast(""), 1200);
                  }}
                >
                  💾 Save Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const code = exportSaveCode(state);
                    setSaveCodeInput(code);
                    navigator.clipboard?.writeText(code).catch(() => {});
                  }}
                >
                  📤 Export Save Code
                </button>
              </div>
              <textarea
                rows={4}
                value={saveCodeInput}
                onChange={(e) => setSaveCodeInput(e.target.value)}
                placeholder="Paste exported save code here to import..."
                style={{ width: "100%", fontFamily: "monospace", fontSize: 10.5 }}
              />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => {
                    const imported = importSaveCode(saveCodeInput);
                    if (imported) {
                      Object.assign(state, imported);
                      saveGame(state);
                      flush();
                      setModal(null);
                    } else {
                      audio.play("error");
                    }
                  }}
                >
                  📥 Import Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Factory reset all DEFRAG~98 SE progress?")) {
                      const fresh = createNewState(1);
                      Object.assign(state, fresh);
                      saveGame(state);
                      flush();
                      setModal(null);
                    }
                  }}
                >
                  🗑️ Factory Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "themes" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="window modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">Display Properties — OS Era Themes</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setModal(null)} />
              </div>
            </div>
            <div className="window-body column">
              <div style={{ fontSize: 11.5 }}>Progressing through layers unlocks new OS eras automatically:</div>
              {(Object.keys(THEME_LABELS) as ThemeId[]).map((tid) => {
                const unlocked = state.unlockedThemes.includes(tid);
                return (
                  <label key={tid} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: unlocked ? 1 : 0.55 }}>
                    <input
                      type="radio"
                      name="os-theme"
                      disabled={!unlocked}
                      checked={state.theme === tid}
                      onChange={() => { state.theme = tid; audio.play("click"); flush(); }}
                    />
                    <span>{unlocked ? THEME_LABELS[tid] : "🔒 [Locked Theme]"}</span>
                  </label>
                );
              })}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 4 }}>
                <input type="checkbox" checked={state.crtEnabled} onChange={(e) => { state.crtEnabled = e.target.checked; flush(); }} />
                Enable CRT Monitor Scanlines
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "achievements" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="window modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">
                Trophies ({state.achievements.length}/{Object.keys(ACHIEVEMENT_CATALOG).length})
              </div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setModal(null)} />
              </div>
            </div>
            <div className="window-body column" style={{ maxHeight: 320, overflowY: "auto" }}>
              {Object.entries(ACHIEVEMENT_CATALOG).map(([id, info]) => {
                const got = state.achievements.includes(id);
                return (
                  <div key={id} className="inset" style={{ opacity: got ? 1 : 0.65, padding: "5px 7px", fontSize: 11.5 }}>
                    <div>
                      <b>{got ? `🏆 ${info.title}` : "🔒 [CLASSIFIED MILESTONE]"}</b>
                    </div>
                    <div style={{ fontSize: 10.5 }}>
                      {got ? info.desc : info.publicHint ?? "Keep optimizing your system to uncover..."}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {modal === "help" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="window modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">README.TXT — DEFRAG~98: Second Edition</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setModal(null)} />
              </div>
            </div>
            <div className="window-body column" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              <div><b>1. Defragment Drive C:</b> Click cyan blocks into RAM, then click empty slots next to the dark-blue run (or double-click cyan with free RAM to snap it in!). Red-notched system blocks unlock at Ring 0.</div>
              <div><b>2. Living RAM &amp; Draggable Windows:</b> Drag any window by its blue title bar (hit <b>Tile</b> in the taskbar anytime). Active threads, sockets, and task buffers live inside RAM and grant up to +30% Cache Efficiency!</div>
              <div><b>3. Zero Slowdown Traps:</b> Click ANY running upgrade button to <b>Pause</b> it (progress is saved!) or click <b>×</b> to cancel. Manual upgrades automatically get 90% CPU priority.</div>
              <div><b>4. Minesweeper &amp; TURBO:</b> Safe clicks in WINMINE.EXE inject +0.4s bursts; board clears build Entropy and shave 5s off your hardware TURBO switch cooldown.</div>
            </div>
          </div>
        </div>
      ) : null}

      {state.showVictoryModal ? (
        <div className="modal-backdrop" onClick={() => { state.showVictoryModal = false; flush(); }}>
          <div className="window modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="title-bar">
              <div className="title-bar-text">⚡ OUTER FRAME REACHED (LAYER -4) ⚡</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => { state.showVictoryModal = false; flush(); }} />
              </div>
            </div>
            <div className="window-body column" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <div><b>Parent Stack Unwound — Layer -4</b></div>
              <div>You surfaced across four host operating environments and shattered every execution boundary!</div>
              <div className="inset" style={{ fontFamily: "monospace", fontSize: 11 }}>
                Total Time: {formatEta(state.elapsedSeconds)}
                <br />
                Frames Breached: {state.totalEscapes}
                <br />
                Minesweeper Boards Cleared: {state.lifetimeMineWins}
                <br />
                Trophies Unlocked: {state.achievements.length}/{Object.keys(ACHIEVEMENT_CATALOG).length}
              </div>
              <button type="button" onClick={() => { state.showVictoryModal = false; flush(); }}>
                Continue Endless Trace
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
