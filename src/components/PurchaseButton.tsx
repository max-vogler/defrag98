import {
  CSSProperties,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
} from "react";
import { useAction } from "../hooks";
import { State } from "../systems";
import { Purchase } from "../systems/purchase";
import { unit } from "../text";

export interface PurchaseButtonProps {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  purchase: Purchase;
}

interface PurchaseButtonStyle extends CSSProperties {
  "--progress": `${number}%`;
}

export default function PurchaseButton(
  props: PropsWithChildren<PurchaseButtonProps>
) {
  const triggerPurchase = useAction(
    (state) => props.purchase.startPurchase(state),
    [props.state, props.setState]
  );

  const progressPercent = props.purchase.remainingPrice
    ? 100 - (props.purchase.remainingPrice / props.purchase.price) * 100
    : 0;

  const style: PurchaseButtonStyle = { "--progress": `${progressPercent}%` };

  return props.purchase.showButton(props.state) ? (
    <button
      className="progress-button"
      onClick={() => (props.purchase.inProgress ? null : triggerPurchase())}
      style={style}
      disabled={props.purchase.inProgress}
    >
      {props.children ? (
        props.children
      ) : (
        <>
          {props.purchase.label} ({unit(props.purchase.price, "OP")})
        </>
      )}
    </button>
  ) : null;
}
