import { auth } from "~/lib/auth";
import { logger } from '~/lib/logger';

type SignUpArgs = {
  email: string;
  password: string;
  name: string;
  origin?: string;
  reqUrl?: string;
};

interface SignUpSuccessResult {
  ok: true;
  status: number;
  user: { id: string; email: string; name: string } | null;
  body: SignUpResponseBody | null;
}

interface SignUpErrorResult {
  ok: false;
  status: number;
  error: string;
  body: SignUpResponseBody | null;
}

interface SignUpResponseBody {
  code?: string;
  message?: string;
  user?: { id: string; email: string; name: string };
}

export type SignUpResult = SignUpSuccessResult | SignUpErrorResult;

export async function signUpEmailServer({ email, password, name }: SignUpArgs): Promise<SignUpResult> {
  // Use Better Auth server API directly to avoid origin/CSRF issues
  try {
    logger.debug({ email, name }, 'signUpEmailServer');
    const response = await auth.api.signUpEmail({
      asResponse: true,
      body: { email, password, name },
    });

    let body: SignUpResponseBody | null = null;
    try {
      body = await response.json() as SignUpResponseBody;
      logger.debug({ body }, 'signUpEmailServer body');
    } catch { /* empty */ }

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: body?.message ?? "signup_failed",
        body,
      };
    }

    return {
      ok: true as const,
      status: response.status,
      user: body?.user ?? null,
      body,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "signup_failed";
    return {
      ok: false as const,
      status: 500,
      error: message,
      body: null,
    };
  }
}
