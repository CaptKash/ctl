import React, { createContext, useContext } from "react";

interface SubscriptionCtx {
  isFleet: boolean;
  FREE_CAR_LIMIT: number;
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  isFleet: false,
  FREE_CAR_LIMIT: 2,
});

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ isFleet: false, FREE_CAR_LIMIT: 2 }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
