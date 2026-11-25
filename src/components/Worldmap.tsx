import { useEffect, useMemo, useRef } from "react";
import { getSeededDiscoveryOrder, WORLDMAP_LAND } from "../systems";

interface Props {
  discovered: number;
  owned: number;
  seed: number;
}

export default function Worldmap({ discovered, owned, seed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const order = useMemo(() => getSeededDiscoveryOrder(seed), [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = 31;
    const rows = 16;
    const cellW = 10;
    const cellH = 9;

    // CRT ocean background with subtle grid
    ctx.fillStyle = "#04120a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0, 255, 110, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, rows * cellH);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(cols * cellW, y * cellH);
      ctx.stroke();
    }

    // Draw base land mass silhouettes
    ctx.fillStyle = "#123c24";
    for (const idx of WORLDMAP_LAND) {
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
    }

    // Discovered hosts (amber/red)
    ctx.fillStyle = "#ff4d4d";
    for (let i = 0; i < Math.min(discovered, order.length); i++) {
      const idx = order[i];
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
    }

    // Owned botnet nodes (bright phosphor green)
    ctx.fillStyle = "#00ff66";
    for (let i = 0; i < Math.min(owned, order.length); i++) {
      const idx = order[i];
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
    }
  }, [discovered, owned, order]);

  return (
    <canvas
      ref={canvasRef}
      width={310}
      height={144}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
