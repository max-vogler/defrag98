import { useState } from "react";
import { Grid } from "./Grid";
import Window from "./Window";
import { useAction, useDynamicInterval, useInterval } from "../hooks";
import { applySystems, createNewState, State } from "../systems";
import PurchaseButton from "./PurchaseButton";
import { unit } from "../text";
import { getCellColors, readWriteDiskCell } from "../systems/disk";
import BreakOutWindows from "./BreakOutWindows";
import CommandPromptWindow from "./CommandPromptWindow";
import Worldmap from "./Worldmap";
import LogWindow from "./LogWindow";
import { getTotalMemory } from "../systems/memory";
import {
  DEFRAG,
  FIREWALL,
  INITIAL_PRIVILEGE,
  selectProcess,
} from "../systems/compute";
import NestedSimulationWindow from "./NestedSimulationWindow";
import FloatingPointAnalysisWindow from "./FloatingPointAnalysisWindow";

function App() {
  const [state, setState] = useState<State>(createNewState());

  useInterval(
    () => {
      applySystems(state);
      setState({ ...state });
      (window as any).gameState = state;
    },
    100,
    [state]
  );

  const triggerReadWriteCell = useAction(readWriteDiskCell, [state, setState]);
  const triggerSelectProcess = useAction(selectProcess, [state, setState]);

  return (
    <div className="windows">
      <LogWindow windowTitle="Command Prompt" state={state} />
      <Window
        windowTitle="Defragmenting Drive C"
        statusBar={[
          `Defragmented: ${
            state.disk.defragmentedBlockEnd - state.disk.defragmentedBlockStart
          }`,
        ]}
      >
        <div className="column">
          <Grid
            cells={getCellColors(state.disk)}
            onCellClick={triggerReadWriteCell}
          />
          <div className="row">
            <PurchaseButton
              purchase={state.purchases.AutoReadDisk}
              state={state}
              setState={setState}
            />
            <PurchaseButton
              purchase={state.purchases.AutoWriteDisk}
              state={state}
              setState={setState}
            />
            <PurchaseButton
              purchase={state.purchases.ResearchSSD}
              state={state}
              setState={setState}
            />
          </div>
        </div>
      </Window>
      <Window
        windowTitle="Memory"
        statusBar={[`Allocated ${unit(getTotalMemory(state), "B")}`]}
      >
        <div className="column">
          <Grid
            cells={state.memory.cells.map((c) => (c ? "cyan" : "transparent"))}
          />
          <div className="row">
            <PurchaseButton
              purchase={state.purchases.AllocateMemory}
              state={state}
              setState={setState}
            />
            <PurchaseButton
              purchase={state.purchases.IncrementPageSize}
              state={state}
              setState={setState}
            />
            <PurchaseButton
              purchase={state.purchases.DoubleDataRate}
              state={state}
              setState={setState}
            />
          </div>
        </div>
      </Window>
      {state.memory.cells.length > 15 ? (
        <Window
          windowTitle={`Task Info: ${DEFRAG}`}
          statusBar={[`Privilege ring: ${state.compute.privilege}`]}
        >
          <div className="column">
            <div style={{ fontSize: "2rem" }}>
              Compute: {unit(state.compute.flops, "OPS")}
            </div>
            <div className="row">
              <PurchaseButton
                purchase={state.purchases.SpawnThread}
                state={state}
                setState={setState}
              />
              <PurchaseButton
                purchase={state.purchases.Hyperthreading}
                state={state}
                setState={setState}
              />
              <PurchaseButton
                purchase={state.purchases.EscalatePrivilege}
                state={state}
                setState={setState}
              />
            </div>
          </div>
        </Window>
      ) : null}
      {state.compute.privilege < INITIAL_PRIVILEGE ? (
        <Window
          windowTitle="Task Manager"
          statusBar={[`Processes: ${state.compute.processes.length}`]}
        >
          <div className="column">
            <select multiple>
              {state.compute.processes.map((process) => (
                <option
                  key={process.name}
                  onClick={() => triggerSelectProcess(process.name)}
                >
                  {process.name}
                </option>
              ))}
            </select>
            <div className="row">
              <PurchaseButton
                purchase={state.purchases.KillProcese}
                state={state}
                setState={setState}
              />
            </div>
          </div>
        </Window>
      ) : null}

      {!state.compute.processes.includes(FIREWALL) ? (
        <Window
          windowTitle="Networks"
          statusBar={[
            `Discovered: ${state.network.discovered}`,
            `Owned: ${state.network.owned}`,
          ]}
        >
          <div className="column">
            <div className="row">
              <PurchaseButton
                purchase={state.purchases.ScanNetwork}
                state={state}
                setState={setState}
              />
              <PurchaseButton
                purchase={state.purchases.AutoScanNetwork}
                state={state}
                setState={setState}
              />
            </div>

            <div className="inset">
              <Worldmap
                discovered={state.network.discovered}
                owned={state.network.owned}
              />
            </div>
          </div>
        </Window>
      ) : null}

      {state.network.passwordAttempt ? (
        <CommandPromptWindow windowTitle="Login">
          <div className="column">
            <code style={{ fontSize: "2rem" }}>
              Username: admin
              <br />
              Password:{" "}
              <span style={{ color: "green" }}>
                {state.network.passwordAttempt.correct}
              </span>
              <span style={{ color: "red" }}>
                {state.network.passwordAttempt.incorrect}
              </span>
            </code>
            <div className="row">
              <PurchaseButton
                purchase={state.purchases.TryPassword}
                state={state}
                setState={setState}
              />
              <PurchaseButton
                purchase={state.purchases.HackComputer}
                state={state}
                setState={setState}
              />
              <PurchaseButton
                purchase={state.purchases.BruteforcePassword}
                state={state}
                setState={setState}
              />
            </div>
          </div>
        </CommandPromptWindow>
      ) : null}

      {state.level > 1 &&
      state.compute.processes.find((p) => p.name === "SIMULATION.EXE") ? (
        <NestedSimulationWindow state={state} />
      ) : null}

      {state.memory.pageSize > 1 ? (
        <FloatingPointAnalysisWindow state={state} setState={setState} />
      ) : null}

      {state.purchases.FloatingPoint.isFullyPurchased ? (
        <BreakOutWindows state={state} setState={setState} />
      ) : null}
    </div>
  );
}

export default App;
