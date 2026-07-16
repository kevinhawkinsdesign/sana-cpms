"use client";

import { useRouter } from "next/navigation";
import { useCountry } from "@/lib/providers/country-provider";

export function useLocalizedRouter() {
  const router = useRouter();
  const { countryCode } = useCountry();

  const localizePath = (path: string) => {
    if (path.startsWith("/")) {
      // If path already has a country code, don't add another one
      if (path.startsWith(`/${countryCode}/`) || path.startsWith(`/${countryCode}`)) {
        return path;
      }
      
      // For absolute paths that don't need country code (like external URLs)
      if (path.startsWith("/api") || path.startsWith("/_next")) {
        return path;
      }
      
      // Handle dashboard paths and other paths
      return `/${countryCode}${path}`;
    }
    return path;
  };

  return {
    push: (path: string) => router.push(localizePath(path)),
    replace: (path: string) => router.replace(localizePath(path)),
    back: router.back,
    refresh: router.refresh,
    prefetch: router.prefetch,
  };
}
