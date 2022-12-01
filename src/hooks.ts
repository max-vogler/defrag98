import {
  DependencyList,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function useInterval(
  cb: () => void,
  interval: number,
  deps?: DependencyList
) {
  return useEffect(() => {
    const id = setInterval(cb, interval);
    return () => {
      clearInterval(id);
    };
  }, deps);
}

export function useDynamicInterval(cb: () => number, deps?: DependencyList) {
  let [id, setId] = useState(0);

  const executeAndReschedule = () => {
    clearTimeout(id);
    const delay = cb();
    setId(setTimeout(executeAndReschedule, delay));
  };

  return useEffect(() => {
    if (!id) {
      executeAndReschedule();
    }
    return () => {
      clearTimeout(id);
      setId(0);
    };
  }, deps);
}

export function useAction<S, Args = void>(
  action: (state: S, args: Args) => void,
  [state, setState]: [S, Dispatch<SetStateAction<S>>]
) {
  return useMemo(
    () => (args: Args) => {
      action(state, args);
      setState({ ...state });
    },
    [state]
  );
}

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
