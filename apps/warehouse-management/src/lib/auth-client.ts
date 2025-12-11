import {
  createAuthClient
} from "better-auth/react";
import {
  apiKeyClient,
  adminClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

/**
 * Access control using Better Auth's default statements
 * Extended with custom supervisor role (must match server-side)
 */
const ac = createAccessControl(defaultStatements);

const supervisorRole = ac.newRole({
  organization: ["update"],
  member: ["create", "update"],
  invitation: ["create"],
});

const organizationRoles = {
  owner: ownerAc,
  admin: adminAc,
  supervisor: supervisorRole,
  member: memberAc,
};

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  plugins: [
    apiKeyClient(),
    adminClient(),
    organizationClient({
      ac,
      roles: organizationRoles,
    }),
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