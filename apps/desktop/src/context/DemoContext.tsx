import { createContext, useContext, useState, type ReactNode } from "react";

type DemoContextType = {
  isDemoRunning: boolean;
  demoAiOverlay: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  setDemoAiOverlay: (v: boolean) => void;
};

const DemoContext = createContext<DemoContextType>({
  isDemoRunning: false,
  demoAiOverlay: false,
  startDemo: () => {},
  stopDemo: () => {},
  setDemoAiOverlay: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoAiOverlay, setDemoAiOverlay] = useState(false);

  function stopDemo() {
    setIsDemoRunning(false);
    setDemoAiOverlay(false);
  }

  return (
    <DemoContext.Provider
      value={{
        isDemoRunning,
        demoAiOverlay,
        startDemo: () => setIsDemoRunning(true),
        stopDemo,
        setDemoAiOverlay,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
