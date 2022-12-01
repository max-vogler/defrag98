export type WindowProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  windowTitle: string;
  statusBar?: string[];
};

export default function Window({
  windowTitle,
  statusBar,
  ...props
}: WindowProps) {
  return (
    <div {...props} className={"window " + (props.className ?? "")}>
      <div className="title-bar">
        <div className="title-bar-text">{windowTitle}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" />
          <button aria-label="Maximize" />
          <button aria-label="Close" />
        </div>
      </div>
      <div className="window-body">{props.children}</div>
      {statusBar?.length ? (
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
