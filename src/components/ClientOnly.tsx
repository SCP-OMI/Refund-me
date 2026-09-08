"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A wrapper component that only renders its children on the client-side.
 * Use this for components that rely on browser APIs like `window` or `localStorage`.
 *
 * @example
 * <ClientOnly fallback={<Skeleton />}>
 *   <ComponentThatUsesLocalStorage />
 * </ClientOnly>
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return <>{children}</>;
}
