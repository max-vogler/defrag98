import Window, { WindowProps } from "./Window";

export default function CommandPromptWindow({
  children,
  className,
  ...props
}: WindowProps) {
  return (
    <Window className={"commandprompt " + (className ?? "")} {...props}>
      {children}
    </Window>
  );
}
