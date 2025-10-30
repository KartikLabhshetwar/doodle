import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  appName: "doodle",
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  plugins: [nextCookies()],
});

// Resolve current user id from a Next.js Request using better-auth session
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    // The nextCookies() plugin lets better-auth read cookies in Next.js contexts.
    // Passing headers is helpful for Route Handlers where cookies are on the Request object.
    // @ts-expect-error headers shape is compatible for better-auth
    const session = await (auth as any).api?.getSession?.({ headers: Object.fromEntries(req.headers as any) });
    const userId: string | undefined = session?.user?.id;
    return userId ?? null;
  } catch {
    return null;
  }
}

// Throw a 401-style error when no user is present
export function requireUser(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    const err = new Error("Unauthorized");
    // @ts-expect-error used by callers to set status
    (err as any).status = 401;
    throw err;
  }
}

