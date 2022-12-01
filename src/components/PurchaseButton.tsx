import { Dispatch, PropsWithChildren, SetStateAction } from "react";
import { useAction } from "../hooks";
import { State } from "../systems";
import { Purchase } from "../systems/purchase";
import { unit } from "../text";

export interface PurchaseButtonProps {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  purchase: Purchase;
}

export default function PurchaseButton(
  props: PropsWithChildren<PurchaseButtonProps>
) {
  const triggerPurchase = useAction(
    (state) => props.purchase.startPurchase(state),
    [props.state, props.setState]
  );

  const progress = props.purchase.remainingPrice
    ? `${Math.trunc(
        100 - (props.purchase.remainingPrice / props.purchase.price) * 100
      )} %`
    : unit(props.purchase.price, "OP");

  return props.purchase.showButton(props.state) ? (
    <button
      onClick={() => (props.purchase.inProgress ? null : triggerPurchase())}
    >
      {props.children ? (
        props.children
      ) : (
        <>
          {props.purchase.label} ({progress})
        </>
      )}
    </button>
  ) : null;
}
