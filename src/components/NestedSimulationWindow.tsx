import { CSSProperties, useEffect, useState } from "react";
import { GameState } from "../systems";
import Window from "./Window";

interface Props {
  state: GameState;
  onMinimize: () => void;
  style?: CSSProperties;
  inactive?: boolean;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
  onFocusWindow?: () => void;
}

export default function NestedSimulationWindow({
  state,
  onMinimize,
  style,
  inactive,
  onTitleMouseDown,
  onFocusWindow,
}: Props) {
  const [zoomedOut, setZoomedOut] = useState(false);

  useEffect(() => {
    setZoomedOut(false);
    const id = window.setTimeout(() => setZoomedOut(true), 80);
    return () => window.clearTimeout(id);
  }, [state.screenshot, state.level]);

  return (
    <Window
      windowTitle={`SIMULATION.EXE — Layer -${state.level - 1}`}
      onMinimize={onMinimize}
      onTitleMouseDown={onTitleMouseDown}
      onFocusWindow={onFocusWindow}
      inactive={inactive}
      style={style}
      statusBar={[
        `Current Depth: -${state.level}`,
        `Layer Multiplier: ×${Math.pow(2.5, state.level - 1).toFixed(2)}`,
      ]}
    >
      <div className="column">
        <div
          className="inset"
          style={{
            background: "#008080",
            overflow: "hidden",
            padding: 3,
            minHeight: 150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state.screenshot ? (
            <img
              src={state.screenshot}
              alt="Previous layer snapshot"
              style={{
                width: "100%",
                display: "block",
                imageRendering: "pixelated",
                transform: zoomedOut ? "scale(1)" : "scale(2.4)",
                transition: "transform 2.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          ) : (
            <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 12 }}>
              [SANDBOX LAYER -{state.level - 1} SUSPENDED]
            </div>
          )}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 13 }}>
          Host Depth: <b>-{state.level.toString(16).toUpperCase()}</b> • Kill{" "}
          <code>SIMULATION.EXE</code> in Task Manager to reclaim its cycles.
        </div>
      </div>
    </Window>
  );
}
