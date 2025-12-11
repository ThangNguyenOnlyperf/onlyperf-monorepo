import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";
import { db } from "~/server/db";
import {
  user, account, session, verification,
  organization as organizationTable, member, invitation
} from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Access control using Better Auth's default statements
 * Extended with custom supervisor role
 */
export const ac = createAccessControl(defaultStatements);

/**
 * Custom organization roles
 * - owner: Full control (using Better Auth defaults)
 * - admin: Can manage members and update org (using Better Auth defaults)
 * - supervisor: Custom role - can create/update members, invite
 * - member: Basic access only (using Better Auth defaults)
 */
const supervisorRole = ac.newRole({
  organization: ["update"],
  member: ["create", "update"],
  invitation: ["create"],
});

export const organizationRoles = {
  owner: ownerAc,
  admin: adminAc,
  supervisor: supervisorRole,
  member: memberAc,
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
      organization: organizationTable,
      member,
      invitation,
    },
  }),
  plugins: [
    admin({
      roleField: "role",
      defaultRole: "user",
      adminRole: "admin",
    }),
    organization({
      allowUserToCreateOrganization: false,
      ac,
      roles: organizationRoles,
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  session:{
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
      updateAge:60 * 30
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (sessionData) => {
          // Auto-set first org on login if not set
          // Use orderBy to ensure deterministic selection (oldest membership first)
          const membership = await db.query.member.findFirst({
            where: eq(member.userId, sessionData.userId),
            orderBy: asc(member.createdAt),
          });
          if (membership) {
            return {
              data: { ...sessionData, activeOrganizationId: membership.organizationId },
            };
          }
          return { data: sessionData };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
