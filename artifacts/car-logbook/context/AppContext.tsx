import React, { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  selectedCarId: number | null;
  setSelectedCarId: (id: number | null) => void;
};

const AppContext = createContext<AppContextType>({
  selectedCarId: null,
  setSelectedCarId: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  return (
    <AppContext.Provider value={{ selectedCarId, setSelectedCarId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
