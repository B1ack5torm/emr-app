import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("carechart-invalid-password", 12);

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(req: any) {
  const forwarded = req?.headers?.["x-forwarded-for"] || req?.headers?.get?.("x-forwarded-for");
  return String(forwarded || req?.headers?.["x-real-ip"] || "unknown").split(",")[0].trim();
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 30 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const identityHash = digest(email);
        const ipHash = digest(requestIp(req));
        const since = new Date(Date.now() - LOGIN_WINDOW_MS);
        const failedAttempts = await prisma.loginAttempt.count({ where: { identityHash, ipHash, succeeded: false, createdAt: { gte: since } } });
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) throw new Error("Too many sign-in attempts. Try again in 15 minutes.");

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        });
        const valid = await bcrypt.compare(credentials.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
        if (!user || !valid) {
          await prisma.loginAttempt.create({ data: { organizationId: user?.organizationId, userId: user?.id, identityHash, ipHash, reason: "INVALID_CREDENTIALS" } });
          if (user) await prisma.auditEvent.create({ data: { organizationId: user.organizationId, userId: user.id, action: "LOGIN_FAILED", resourceType: "User", resourceId: user.id, reason: "INVALID_CREDENTIALS" } });
          return null;
        }

        if (user.status !== "ACTIVE") {
          await prisma.loginAttempt.create({ data: { organizationId: user.organizationId, userId: user.id, identityHash, ipHash, reason: `ACCOUNT_${user.status}` } });
          await prisma.auditEvent.create({ data: { organizationId: user.organizationId, userId: user.id, action: "LOGIN_FAILED", resourceType: "User", resourceId: user.id, reason: `ACCOUNT_${user.status}` } });
          throw new Error("This account is not active. Contact your clinic administrator.");
        }

        await prisma.$transaction([
          prisma.loginAttempt.create({ data: { organizationId: user.organizationId, userId: user.id, identityHash, ipHash, succeeded: true } }),
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.auditEvent.create({ data: { organizationId: user.organizationId, userId: user.id, action: "LOGIN_SUCCEEDED", resourceType: "User", resourceId: user.id } }),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.organizationId || !token?.id) return;
      await prisma.auditEvent.create({ data: { organizationId: String(token.organizationId), userId: String(token.id), action: "LOGOUT", resourceType: "User", resourceId: String(token.id) } });
    },
  },
};
