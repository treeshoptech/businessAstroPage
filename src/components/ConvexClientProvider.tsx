import React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export default function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
