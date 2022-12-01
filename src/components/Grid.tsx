export type Color = string;

export interface GridProps {
  cells: Color[];
  onCellClick?: (i: number) => void;
}

export function Grid(props: GridProps) {
  return (
    <div className="grid">
      {props.cells.map((cellColor, i) => (
        <div
          className="cell"
          key={i}
          style={{
            backgroundColor: cellColor,
            borderColor: cellColor === "transparent" ? "#aaa" : "black",
          }}
          onClick={() => props.onCellClick?.(i)}
        ></div>
      ))}
    </div>
  );
}
