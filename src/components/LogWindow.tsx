import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { GameState, runDosCommand } from "../systems";
import Window from "./Window";

interface Props {
  state: GameState;
  onMutate: () => void;
  onMinimize: () => void;
  style?: CSSProperties;
  inactive?: boolean;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
  onFocusWindow?: () => void;
}

export default function LogWindow({
  state,
  onMutate,
  onMinimize,
  style,
  inactive,
  onTitleMouseDown,
  onFocusWindow,
}: Props) {
  const [input, setInput] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [state.logs.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    runDosCommand(state, input);
    setInput("");
    onMutate();
  };

  return (
    <Window
      windowTitle="MS-DOS Command Prompt"
      className="commandprompt wide-window"
      onMinimize={onMinimize}
      onTitleMouseDown={onTitleMouseDown}
      onFocusWindow={onFocusWindow}
      inactive={inactive}
      style={style}
      statusBar={[
        `Layer: -${state.level}`,
        "Interactive DOS shell (try 'help')",
      ]}
    >
      <div className="cmd-screen" ref={screenRef}>
        {state.logs.slice(-60).map((line, i) => (
          <div key={i}>{line || "\u00A0"}</div>
        ))}
      </div>
      <form className="cmd-input-row" onSubmit={handleSubmit}>
        <span>C:\&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="type 'help', 'dir', 'stats', '0.1+0.2'..."
          aria-label="DOS Command Input"
        />
      </form>
    </Window>
  );
}
