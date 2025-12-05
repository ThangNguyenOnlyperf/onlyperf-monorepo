import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { db } from "~/server/db";
import {
  user, account, session, verification,
  organization as organizationTable, member, invitation
} from "~/server/db/schema";
import { eq } from "drizzle-orm";

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
      allowUserToCreateOrganization: false, // Only via setup script
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
          const membership = await db.query.member.findFirst({
            where: eq(member.userId, sessionData.userId),
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
