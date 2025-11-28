import {
  createAuthClient
} from "better-auth/react";
import {
  apiKeyClient,
  adminClient
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  plugins: [
    apiKeyClient(), 
    adminClient(),
  ]
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;