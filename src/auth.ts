import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/enums";

// Credentials-only auth: each law firm tenant is identified by a path
// segment ({ROOT}/{slug}/...), not a subdomain, so the tenant slug can't
// be inferred from the login POST's own URL (it always goes to
// /api/auth/callback/credentials). The login form sends it explicitly
// as a hidden credential field instead. A user must hold a Membership
// in that Organization to sign in there. Sessions are JWT-based
// (required by NextAuth when using Credentials); since all tenants
// share one origin now, only one tenant can be signed into per browser
// at a time — every page still re-checks session.organizationSlug
// against the route's tenant, so this is a UX limit, not a security gap.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        tenant: { label: "Tenant", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        const tenantSlug = credentials?.tenant;
        if (
          typeof email !== "string" ||
          typeof password !== "string" ||
          typeof tenantSlug !== "string" ||
          !tenantSlug
        ) {
          return null;
        }

        const organization = await prisma.organization.findUnique({
          where: { slug: tenantSlug },
        });
        if (!organization) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        const membership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: organization.id,
            },
          },
        });
        if (!membership) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          organizationId: organization.id,
          organizationSlug: organization.slug,
          role: membership.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId;
        token.organizationSlug = user.organizationSlug;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationSlug = token.organizationSlug as string;
        session.user.role = token.role as MembershipRole;
      }
      return session;
    },
  },
});
