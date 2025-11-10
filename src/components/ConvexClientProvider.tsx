import React, { useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

export default function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convex = useMemo(() => {
    const url = import.meta.env.PUBLIC_CONVEX_URL;
    if (!url) {
      console.error('PUBLIC_CONVEX_URL is not set');
      return new ConvexReactClient('https://dummy.convex.cloud'); // Fallback to prevent crash
    }
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
