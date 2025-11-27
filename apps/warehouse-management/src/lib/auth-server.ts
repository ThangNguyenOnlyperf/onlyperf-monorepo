import { auth } from "~/lib/auth";
import { logger } from '~/lib/logger';

type SignUpArgs = {
  email: string;
  password: string;
  name: string;
  origin?: string;
  reqUrl?: string;
};

export async function signUpEmailServer({ email, password, name }: SignUpArgs) {
  // Use Better Auth server API directly to avoid origin/CSRF issues
  try {
    logger.debug({ email, name }, 'signUpEmailServer');
    const response = await auth.api.signUpEmail({
      asResponse: true,
      body: { email, password, name },
    });

    let body: any = null;
    try {
      body = await response.json();
      logger.debug({ body }, 'signUpEmailServer body');
    } catch {}

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: body?.message || "signup_failed",
        body,
      };
    }

    return {
      ok: true as const,
      status: response.status,
      user: body?.user ?? null,
      body,
    };
  } catch (err: any) {
    return {
      ok: false as const,
      status: 500,
      error: err?.message || "signup_failed",
      body: null,
    };
  }
}
