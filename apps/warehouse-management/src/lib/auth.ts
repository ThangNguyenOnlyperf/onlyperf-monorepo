import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "~/server/db";
import { user, account, session, verification } from "~/server/db/schema";

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
    },
  }),
  plugins: [
    admin({
      roleField: "role",
      defaultRole: "user",
      adminRole: "admin",
    })
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

  }
});

export type Session = typeof auth.$Infer.Session;
