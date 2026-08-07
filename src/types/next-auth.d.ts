import type { DefaultSession } from "next-auth";
import type { MembershipRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    organizationId: string;
    organizationSlug: string;
    role: MembershipRole;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationSlug: string;
      role: MembershipRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    organizationSlug?: string;
    role?: MembershipRole;
  }
}
