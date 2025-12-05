import {
  createAuthClient
} from "better-auth/react";
import {
  apiKeyClient,
  adminClient,
  organizationClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  plugins: [
    apiKeyClient(),
    adminClient(),
    organizationClient(),
  ]
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;

// Organization exports
export const { organization } = authClient;
export const useActiveOrganization = authClient.useActiveOrganization;