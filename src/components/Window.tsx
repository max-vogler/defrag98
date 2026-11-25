import React from "react";

export type WindowProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  windowTitle: string;
  statusBar?: string[];
  onMinimize?: () => void;
  onClose?: () => void;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
  onFocusWindow?: () => void;
  inactive?: boolean;
};

export default function Window({
  windowTitle,
  statusBar,
  onMinimize,
  onClose,
  onTitleMouseDown,
  onFocusWindow,
  inactive,
  className,
  children,
  ...props
}: WindowProps) {
  return (
    <div
      {...props}
      className={`window game-window ${inactive ? "win-inactive" : ""} ${className ?? ""}`}
      onMouseDown={(e) => {
        onFocusWindow?.();
        props.onMouseDown?.(e);
      }}
    >
      <div
        className="title-bar"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onTitleMouseDown?.(e);
        }}
        style={{ cursor: onTitleMouseDown ? "move" : "default" }}
      >
        <div className="title-bar-text">{windowTitle}</div>
        <div className="title-bar-controls">
          <button
            type="button"
            aria-label="Minimize"
            title="Minimize to Taskbar"
            onClick={onMinimize}
          />
          <button type="button" aria-label="Maximize" disabled />
          <button
            type="button"
            aria-label="Close"
            title={onClose ? "Close" : "Minimize"}
            onClick={onClose ?? onMinimize}
          />
        </div>
      </div>
      <div className="window-body">{children}</div>
      {statusBar && statusBar.length > 0 ? (
        <div className="status-bar">
          {statusBar.map((text, i) => (
            <p key={i} className="status-bar-field">
              {text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
