import { PropsWithChildren } from "react";

export default function GlitchText({ children }: PropsWithChildren<{}>) {
  return (
    <>
      <div className="glitch-container">
        <div className="glitch">{children}</div>
        <div className="glitch">{children}</div>
        <div className="glitch">{children}</div>
      </div>
    </>
  );
}
