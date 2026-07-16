"use client"

import { AuthProvider as NewAuthProvider } from "@/lib/auth/authContext"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <NewAuthProvider>{children}</NewAuthProvider>
}