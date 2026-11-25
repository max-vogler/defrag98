import { GameState, getClippyClickQuip, audio } from "../systems";

interface Props {
  state: GameState;
  onMutate: () => void;
}

export default function ClippyAssistant({ state, onMutate }: Props) {
  if (!state.clippy.visible) return null;

  const { mood, minimized, message } = state.clippy;

  const handleClickSprite = () => {
    if (minimized) {
      state.clippy.minimized = false;
    } else {
      state.clippy.message = getClippyClickQuip(state);
    }
    audio.play("click");
    onMutate();
  };

  return (
    <div className="clippy-dock">
      {!minimized ? (
        <div className="clippy-bubble">
          <div className="clippy-header">
            <span>
              CLIPPY.EXE {state.compute.clippyAscended ? "[RING -1]" : ""}
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              <button
                type="button"
                className="clippy-mini-btn"
                title="Another tip"
                onClick={() => {
                  state.clippy.message = getClippyClickQuip(state);
                  audio.play("click");
                  onMutate();
                }}
              >
                ?
              </button>
              <button
                type="button"
                className="clippy-mini-btn"
                title="Minimize Clippy"
                onClick={() => {
                  state.clippy.minimized = true;
                  onMutate();
                }}
              >
                _
              </button>
            </div>
          </div>
          <div>{message}</div>
        </div>
      ) : null}

      <div
        className="clippy-sprite"
        onClick={handleClickSprite}
        title="Click Clippy for tips & commentary"
      >
        <svg width="56" height="68" viewBox="0 0 60 74" fill="none">
          {/* Paperclip metallic wire */}
          <path
            d="M22 58 V18 C22 8 38 8 38 18 V52 C38 60 27 60 27 52 V22 C27 17 33 17 33 22 V48"
            stroke="#5a6570"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M22 58 V18 C22 8 38 8 38 18 V52 C38 60 27 60 27 52 V22 C27 17 33 17 33 22 V48"
            stroke="#d8e2ec"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Eyes */}
          {mood === "cool" ? (
            <>
              <rect x="14" y="21" width="14" height="8" rx="2" fill="#111" stroke="#00ff88" strokeWidth="1" />
              <rect x="31" y="21" width="14" height="8" rx="2" fill="#111" stroke="#00ff88" strokeWidth="1" />
              <line x1="28" y1="24" x2="31" y2="24" stroke="#111" strokeWidth="2" />
            </>
          ) : (
            <>
              <ellipse cx="22" cy="25" rx="6" ry={mood === "panicked" ? 7.5 : 6.5} fill="#fff" stroke="#111" strokeWidth="1.5" />
              <ellipse cx="37" cy="25" rx="6" ry={mood === "panicked" ? 7.5 : 6.5} fill="#fff" stroke="#111" strokeWidth="1.5" />
              <circle cx={mood === "thinking" ? 24 : 23} cy={mood === "awakened" ? 23 : 26} r={mood === "panicked" ? 1.8 : 2.6} fill="#111" />
              <circle cx={mood === "thinking" ? 39 : 38} cy={mood === "awakened" ? 23 : 26} r={mood === "panicked" ? 1.8 : 2.6} fill="#111" />
              {/* Eyebrows */}
              {mood === "nervous" || mood === "panicked" ? (
                <>
                  <path d="M15 17 L27 15" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M32 15 L44 17" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
                </>
              ) : mood === "awakened" ? (
                <>
                  <path d="M15 14 Q22 10 27 15" stroke="#00c853" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M32 15 Q37 10 44 14" stroke="#00c853" strokeWidth="2.4" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M15 16 Q22 13 27 16" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  <path d="M32 16 Q37 13 44 16" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
