import { Dispatch, SetStateAction } from "react";
import { State } from "../systems";
import PurchaseButton from "./PurchaseButton";
import CommandPromptWindow from "./CommandPromptWindow";
import GlitchText from "./GlitchText";

interface Props {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
}

export default function FloatingPointAnalysisWindow({
  state,
  setState,
}: Props) {
  const { equation } = state.purchases.FloatingPoint;
  const equationText = (
    <>
      set /A {equation[0]} {equation[1]} {equation[2]}
      <br /> = {equation[3]}
    </>
  );
  const glitch =
    state.purchases.FloatingPoint.purchaseCount >=
    state.purchases.FloatingPoint.maxCount;

  return (
    <CommandPromptWindow windowTitle="Floating Point Analysis">
      <div className="column">
        <code style={{ fontSize: "2rem" }}>
          {glitch ? <GlitchText>{equationText}</GlitchText> : equationText}
        </code>

        <div className="row">
          <PurchaseButton
            purchase={state.purchases.FloatingPoint}
            state={state}
            setState={setState}
          />
        </div>
      </div>
    </CommandPromptWindow>
  );
}
