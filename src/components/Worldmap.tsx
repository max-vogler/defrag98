import { shuffle } from "lodash";
import { useEffect, useMemo, useRef } from "react";
import WorldmapImage from "../assets/worldmap.png";
import WorldmapJson from "../assets/worldmapland.json";
import { usePrevious } from "../hooks";

interface Props {
  discovered: number;
  owned: number;
}

export default function Worldmap(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousDiscovered = usePrevious(props.discovered) ?? 0;
  const previousOwned = usePrevious(props.owned) ?? 0;
  const discoveryOrder = useMemo(() => shuffle(WorldmapJson), []);
  const width = 31;

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const data = ctx.createImageData(1, 1);
    data.data[0] = 255;
    data.data[3] = 255;

    for (
      let i = previousDiscovered;
      i < props.discovered && i < discoveryOrder.length;
      i++
    ) {
      const n = discoveryOrder[i];
      ctx.putImageData(data, Math.trunc(n % width), Math.trunc(n / width));
    }

    data.data[0] = 0;
    data.data[1] = 255;

    for (
      let i = previousOwned;
      i < props.owned && i < discoveryOrder.length;
      i++
    ) {
      const n = discoveryOrder[i];
      ctx.putImageData(data, Math.trunc(n % width), Math.trunc(n / width));
    }
  }, [canvasRef, props.discovered, props.owned]);

  return (
    <div className="zstack">
      <img src={WorldmapImage} width={31 * 8} />
      <canvas
        ref={canvasRef}
        width={31}
        height={16}
        style={{
          transform: "scale(8)",
          transformOrigin: "0 0",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
