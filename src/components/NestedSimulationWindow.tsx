import { CSSProperties, useEffect, useRef, useState } from "react";
import { State } from "../systems";
import Window from "./Window";

export default function NestedSimulationWindow({ state }: { state: State }) {
  const container = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    top: "8px",
    left: "8px",
    width: "100%",
    position: "absolute",
  });

  useEffect(() => {
    if (!container.current || !state.screenshot) {
      return;
    }

    setStyle({
      top: container.current.offsetTop + 4,
      left: container.current.offsetLeft + 4,
      width: container.current.offsetWidth - 8,
    });

    setTimeout(() => {
      setStyle({ position: "relative", width: "100%" });
    }, 4000);
  }, [state.screenshot, container]);

  return (
    <Window windowTitle="Simulation">
      <div
        className="inset desktopbg"
        style={{
          height: style.position === "relative" ? "auto" : "200px",
          overflow: "hidden",
        }}
        ref={container}
      >
        <img
          src={state.screenshot}
          style={{
            transition: "ease-in-out 4s",
            top: "8px",
            left: "8px",
            width: "100%",
            position: "absolute",
            ...style,
          }}
        />
      </div>
      <code style={{ fontSize: "2rem" }}>
        Depth: -{state.level.toString(16).toUpperCase()}
      </code>
    </Window>
  );
}
