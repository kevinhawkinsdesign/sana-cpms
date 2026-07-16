// types/next-auth.d.ts
import { DefaultSession } from "next-auth"
import { USER_ROLES } from "./enums"

interface UserProfile {
  id: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  phoneNumber?: string
  [key: string]: any // For any additional fields returned by your API
}

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string
    user: {
      id: string
      role?: USER_ROLES
      profile?: UserProfile
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    name?: string
    email?: string
    accessToken?: string
    role?: string
    profile?: UserProfile
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id?: string
    accessToken?: string 
    role?: string
    name?: string
    profile?: UserProfile
  }
}