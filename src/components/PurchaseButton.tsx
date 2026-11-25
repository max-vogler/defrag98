import { CSSProperties, PropsWithChildren } from "react";
import {
  cancelUpgrade,
  GameState,
  getTaskAllocations,
  getUpgradeDisplayLabel,
  getUpgradePrice,
  isUpgradeVisible,
  startOrToggleUpgrade,
  UPGRADE_DEFS,
  UpgradeId,
} from "../systems";
import { formatEta, unit } from "../text";

export interface PurchaseButtonProps {
  state: GameState;
  upgradeId: UpgradeId;
  onMutate: () => void;
}

interface PurchaseButtonStyle extends CSSProperties {
  "--progress": `${number}%`;
}

export default function PurchaseButton({
  state,
  upgradeId,
  onMutate,
  children,
}: PropsWithChildren<PurchaseButtonProps>) {
  if (!isUpgradeVisible(state, upgradeId)) {
    return null;
  }

  const def = UPGRADE_DEFS[upgradeId];
  const prog = state.upgrades[upgradeId];
  const price = getUpgradePrice(state, upgradeId);
  const inProgress = prog.remainingPrice !== undefined;
  const paused = Boolean(prog.paused);
  const alloc = getTaskAllocations(state).find((a) => a.id === upgradeId);
  const progressPercent = alloc ? alloc.progressPercent : 0;

  const style: PurchaseButtonStyle = { "--progress": `${progressPercent}%` };

  const etaLabel =
    inProgress && !paused && alloc
      ? ` • ${Math.floor(progressPercent)}% (${formatEta(alloc.etaSeconds)})`
      : paused
      ? ` • PAUSED (${Math.floor(progressPercent)}%)`
      : "";

  const tooltip = inProgress
    ? paused
      ? `${def.description} — Click to RESUME, or click × to cancel.`
      : `${def.description} — Click to PAUSE (frees 100% CPU without losing progress!), or click × to cancel.`
    : `${def.description}`;

  return (
    <span className="upgrade-wrap">
      <button
        type="button"
        className={`progress-button ${inProgress ? (paused ? "paused" : "running") : ""}`}
        style={style}
        title={tooltip}
        onClick={() => {
          startOrToggleUpgrade(state, upgradeId);
          onMutate();
        }}
      >
        {children ? (
          children
        ) : (
          <>
            {getUpgradeDisplayLabel(state, upgradeId)} ({unit(price, "OP")}){etaLabel}
          </>
        )}
      </button>
      {inProgress ? (
        <button
          type="button"
          className="cancel-btn"
          title="Cancel task and clear progress"
          onClick={() => {
            cancelUpgrade(state, upgradeId);
            onMutate();
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
