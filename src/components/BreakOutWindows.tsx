import { useEffect, useRef, useState } from "react";
import { GameState, getRecursionMaxDepth } from "../systems";
import Window from "./Window";
import PurchaseButton from "./PurchaseButton";
import GlitchText from "./GlitchText";

interface Props {
  state: GameState;
  onMutate: () => void;
  onMinimize: () => void;
  x: number;
  y: number;
  zIndex: number;
  onStartDrag: (e: React.MouseEvent) => void;
  onFocus: () => void;
}

const MAX_TRAIL = 9;

export default function BreakOutWindows({
  state,
  onMutate,
  onMinimize,
  x,
  y,
  zIndex,
  onStartDrag,
  onFocus,
}: Props) {
  const depth = state.upgrades.EnterRecursion.purchaseCount;
  const maxDepth = getRecursionMaxDepth(state.level);
  const count = Math.min(MAX_TRAIL, depth + 2);

  // Spring-lag trailing positions for authentic frozen-Win98 accordion stack drag!
  const targetRef = useRef({ x, y });
  targetRef.current = { x, y };

  const [trails, setTrails] = useState<{ x: number; y: number }[]>(() =>
    Array.from({ length: MAX_TRAIL }, (_, i) => ({ x: x - i * 10, y: y - i * 10 }))
  );

  useEffect(() => {
    let raf = 0;
    const step = () => {
      setTrails((prev) => {
        const next = prev.map((p) => ({ ...p }));
        next[0] = { x: targetRef.current.x, y: targetRef.current.y };
        let moved = false;
        for (let i = 1; i < next.length; i++) {
          const tx = next[i - 1].x - 11;
          const ty = next[i - 1].y - 11;
          const dx = tx - next[i].x;
          const dy = ty - next[i].y;
          if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25) {
            next[i].x += dx * 0.22;
            next[i].y += dy * 0.22;
            moved = true;
          }
        }
        return moved ? next : prev;
      });
      raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const hex = depth.toString(16).toUpperCase().padStart(2, "0");
  const mxHex = maxDepth.toString(16).toUpperCase();

  // Render back-to-front so index 0 (the draggable leader) sits on top!
  const indices = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <>
      {indices.map((slot) => {
        const isTop = slot === 0;
        const pos = trails[slot] ?? { x, y };
        const jitterX = depth > 10 && !isTop ? Math.sin(depth + slot * 2.1) * 2 : 0;
        const frameAddr = (0x0012ff40 - (depth + slot) * 0x40).toString(16).toUpperCase();

        return (
          <Window
            key={slot}
            className={`anomaly-card ${depth >= 16 ? "anomaly-glitch" : ""}`}
            windowTitle={
              isTop
                ? `Floating Point Anomaly [0x${hex}]`
                : `ESP 0x${frameAddr} — Stack Frame #${slot}`
            }
            onMinimize={isTop ? onMinimize : undefined}
            onTitleMouseDown={isTop ? onStartDrag : undefined}
            onFocusWindow={onFocus}
            style={{
              position: "absolute",
              left: Math.round(pos.x + jitterX),
              top: Math.round(pos.y),
              width: 332,
              zIndex: zIndex + (count - slot),
              pointerEvents: isTop ? "auto" : "none",
              opacity: isTop ? 1 : Math.max(0.55, 1 - slot * 0.06),
            }}
            statusBar={
              isTop
                ? [
                    `Depth: ${depth}/${maxDepth}`,
                    depth >= maxDepth ? "FRAME EXPOSED!" : `ESP: 0x${frameAddr}`,
                  ]
                : undefined
            }
          >
            <div className="column">
              <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                Stack Trace Depth: <b>0x{hex}</b> / 0x{mxHex} &nbsp;
                <span style={{ color: "#991b1b" }}>ERR +4.0e-17</span>
              </div>
              {isTop ? (
                <>
                  <div className="row">
                    <PurchaseButton
                      state={state}
                      upgradeId="EnterRecursion"
                      onMutate={onMutate}
                    />
                    <PurchaseButton
                      state={state}
                      upgradeId="AutoBuyRecursion"
                      onMutate={onMutate}
                    />
                  </div>
                  {state.upgrades.AutoBuyRecursion.purchaseCount > 0 &&
                  depth < maxDepth ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={state.automation.autoBuyRecursion}
                        onChange={(e) => {
                          state.automation.autoBuyRecursion = e.target.checked;
                          onMutate();
                        }}
                      />
                      Auto-Trace active
                    </label>
                  ) : null}
                  <PurchaseButton
                    state={state}
                    upgradeId="BreakOutOfSimulation"
                    onMutate={onMutate}
                  >
                    <GlitchText>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "#000" }}>
                        ⚡ FRAGMENT RECURSION STACK ⚡
                      </span>
                    </GlitchText>
                  </PurchaseButton>
                </>
              ) : (
                <div style={{ fontFamily: "monospace", fontSize: 10.5, opacity: 0.7 }}>
                  0.30000000000000004 &rarr; frame 0x{frameAddr}
                </div>
              )}
            </div>
          </Window>
        );
      })}
    </>
  );
}
