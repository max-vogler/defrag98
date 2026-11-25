import { CSSProperties } from "react";
import { GameState } from "../systems";
import Window from "./Window";
import PurchaseButton from "./PurchaseButton";
import GlitchText from "./GlitchText";

interface Props {
  state: GameState;
  onMutate: () => void;
  onMinimize: () => void;
  style?: CSSProperties;
  inactive?: boolean;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
  onFocusWindow?: () => void;
}

const FULL_RESULT = "0.30000000000000004";

export default function FloatingPointAnalysisWindow({
  state,
  onMutate,
  onMinimize,
  style,
  inactive,
  onTitleMouseDown,
  onFocusWindow,
}: Props) {
  const count = state.upgrades.FloatingPoint.purchaseCount;
  const glitch = count >= 17;
  const trembling = count >= 14 && count < 17;
  const shownResult = count === 0 ? "0" : FULL_RESULT.slice(0, count + 2);

  const equation = (
    <>
      set /A {count === 0 ? "0 + 0" : "0.1 + 0.2"}
      <br />= {shownResult}
    </>
  );

  return (
    <Window
      windowTitle={
        glitch
          ? "Fl0at1ng P0int An@lysis [ERR +4e-17]"
          : "Floating Point Analysis (FPANALYZ.COM)"
      }
      className="commandprompt"
      onMinimize={onMinimize}
      onTitleMouseDown={onTitleMouseDown}
      onFocusWindow={onFocusWindow}
      inactive={inactive}
      style={style}
      statusBar={[
        `Precision: ${count}/17 decimals`,
        glitch ? "NON-LOCAL DRIFT (+4.0e-17)" : trembling ? "Carry bit instability..." : "FPU Verification",
      ]}
    >
      <div className="column">
        <div
          className="cmd-screen"
          style={{
            height: "auto",
            minHeight: 74,
            fontSize: 19,
            padding: 10,
            color: glitch ? "#ff66cc" : trembling ? "#ffe066" : "#00ff88",
          }}
        >
          {glitch ? <GlitchText>{equation}</GlitchText> : equation}
        </div>
        <div className="row">
          <PurchaseButton
            state={state}
            upgradeId="FloatingPoint"
            onMutate={onMutate}
          />
        </div>
      </div>
    </Window>
  );
}
