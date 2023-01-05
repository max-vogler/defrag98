import { Fragment, useEffect, useRef, useState } from "react";
import { State } from "../systems";
import CommandPromptWindow from "./CommandPromptWindow";
import { WindowProps } from "./Window";

interface Props extends WindowProps {
  state: State;
}

export default function LogWindow({ state, ...props }: Props) {
  props.className = (props.className ?? "") + " scrollable";
  const [logLines, setLogLines] = useState<string[]>([""]);
  const codeEl = useRef<HTMLElement>(null);

  useEffect(() => {
    const i = logLines.length - 1;

    if (state.logs[i].length > logLines[i].length) {
      logLines[i] = state.logs[i].slice(0, logLines[i].length + 5);
      setLogLines(logLines);

      // TODO: Mock Element.scrollTo() in JSDOM to remove the unnecessary ?.
      codeEl.current!.parentElement!.scrollTo?.({
        top: logLines.length * 999,
        behavior: "smooth",
      });
    } else if (i < state.logs.length - 1) {
      logLines.push("");
      setLogLines(logLines);
    }
  }, [state, logLines, codeEl]);

  return (
    <CommandPromptWindow {...props}>
      <code ref={codeEl}>
        {logLines.map((line, i) => (
          <Fragment key={i}>
            {line}
            <br />
          </Fragment>
        ))}
      </code>
    </CommandPromptWindow>
  );
}
