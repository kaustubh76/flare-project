'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import config from "@/config/rainbowKit";
import { PriceProvider } from "@/context/PriceContext";

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

export default function Providers({ children }: { children: ReactNode }) {
  // Create a client for React Query inside the component
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  
  // Set mounted to true after client-side hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#3b82f6', // Blue accent to match your UI
            accentColorForeground: 'white',
            borderRadius: 'medium',
            overlayBlur: 'small'
          })}
          modalSize="compact"
        >
          <PriceProvider>
            {mounted ? children : (
              // Render a minimal version that matches the structure but doesn't use client-side features
              <div style={{ visibility: "hidden" }}>{children}</div>
            )}
          </PriceProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}