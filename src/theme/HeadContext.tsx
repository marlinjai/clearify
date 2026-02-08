import React, { createContext, useContext } from 'react';

export interface HeadData {
  title: string;
  description: string;
  url: string;
  siteName: string;
}

interface HeadContextValue {
  collect: (data: HeadData) => void;
}

const HeadContext = createContext<HeadContextValue | null>(null);

export function useHeadContext() {
  return useContext(HeadContext);
}

export function HeadProvider({
  children,
  onCollect,
}: {
  children: React.ReactNode;
  onCollect: (data: HeadData) => void;
}) {
  return (
    <HeadContext.Provider value={{ collect: onCollect }}>
      {children}
    </HeadContext.Provider>
  );
}
