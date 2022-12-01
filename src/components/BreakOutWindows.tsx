import { Dispatch, SetStateAction } from "react";
import Window from "./Window";
import { State } from "../systems";
import PurchaseButton from "./PurchaseButton";
import { times } from "lodash";
import GlitchText from "./GlitchText";

interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}

export default function BreakOutWindows({ state, setState }: Props) {
  const maxWindows = 10;

  const count = Math.min(
    maxWindows,
    state.purchases.EnterRecursion.purchaseCount + 1
  );
  const focus = state.purchases.EnterRecursion.purchaseCount % maxWindows;

  return (
    <div className="window-stack">
      {times(count).map((i) => (
        <Window
          key={i}
          style={{
            top: i * 10,
            left: i * 10,
            zIndex: focus === i ? 1 : "initial",
          }}
          windowTitle="Floating Point Anomaly"
          statusBar={[]}
        >
          <div>
            Recursion Depth:{" "}
            {state.purchases.EnterRecursion.purchaseCount
              .toString(16)
              .toUpperCase()}
          </div>

          <PurchaseButton
            purchase={state.purchases.EnterRecursion}
            state={state}
            setState={setState}
          />

          <PurchaseButton
            purchase={state.purchases.AutoBuyRecursion}
            state={state}
            setState={setState}
          />

          <PurchaseButton
            purchase={state.purchases.BreakOutOfSimulation}
            state={state}
            setState={setState}
          >
            <GlitchText>
              <span style={{ fontSize: "2rem", color: "black" }}>
                Fragment recursion stack
              </span>
            </GlitchText>
          </PurchaseButton>
        </Window>
      ))}
    </div>
  );
}
