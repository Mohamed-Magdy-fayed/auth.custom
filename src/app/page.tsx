import { eq } from "drizzle-orm";
import Link from "next/link";

import { isFeatureEnabled } from "@/auth/config";
import { listPasskeys } from "@/auth/features/passkeys/server/actions";
import { getCurrentUser } from "@/auth/nextjs/currentUser";
import {
  getOrganizationAuthorization,
  getOrganizationTeams,
  getUserOrganizations,
} from "@/auth/nextjs/org/actions";
import { UserCredentialsTable } from "@/auth/tables";
import { UserMenu } from "@/components/generale/UserMenu";
import type { TeamDialogData } from "@/components/generale/user-menu/types";
import { Button } from "@/components/ui/button";
import { H1, Muted, Small } from "@/components/ui/typography";
import { db } from "@/drizzle/db";

export default async function HomePage() {
  const currentSessionUser = await getCurrentUser({ redirectIfNotFound: true });
  const fullUser = await getCurrentUser({
    redirectIfNotFound: true,
    withFullUser: true,
  });
  const passkeysEnabled = isFeatureEnabled("passkeys");

  const [passkeys, credentials, organizations] = await Promise.all([
    passkeysEnabled ? listPasskeys() : Promise.resolve([]),
    db.query.UserCredentialsTable.findFirst({
      columns: { userId: true },
      where: eq(UserCredentialsTable.userId, fullUser.id),
    }),
    getUserOrganizations(),
  ]);

  const activeOrganization =
    organizations.find((org) => org.isDefault) ?? organizations[0] ?? null;
  let teamsResult: Awaited<ReturnType<typeof getOrganizationTeams>> = {
    teams: [],
    canManage: false,
    isOwner: false,
  };
  let authorization: TeamDialogData["authorization"] = {
    canEdit: false,
    isOwner: false,
    roles: [],
    permissionCatalog: [],
  };

  if (activeOrganization) {
    const [teams, authz] = await Promise.all([
      getOrganizationTeams(activeOrganization.id),
      getOrganizationAuthorization(activeOrganization.id),
    ]);
    teamsResult = teams;
    authorization = authz;
  }

  const teamData: TeamDialogData = {
    activeOrganization,
    teams: teamsResult.teams,
    canManageAny: teamsResult.canManage,
    authorization,
  };

  const profileName = fullUser.name ?? "";
  const initials = getInitials(profileName);
  const isAdmin = currentSessionUser.role === "admin";
  const hasPassword = credentials != null;
  const emailVerified = fullUser.emailVerifiedAt != null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">
              auth.custom
            </Link>
            <Small className="hidden border-l pl-3 text-muted-foreground sm:inline-block">
              Private workspace
            </Small>
          </div>
          <UserMenu
            name={profileName}
            profileName={profileName}
            email={fullUser.email}
            avatarUrl={null}
            initials={initials}
            emailVerified={emailVerified}
            hasPassword={hasPassword}
            passkeys={passkeys}
            organizations={organizations}
            teamData={teamData}
          />
        </div>
      </header>
      <main className="container flex flex-1 flex-col justify-center gap-8 py-16">
        <div className="space-y-4">
          <H1 className="max-w-2xl">
            Welcome back, {profileName}. Manage everything from the user menu in the
            top bar.
          </H1>
          <Muted className="max-w-xl">
            Use the account dropdown to update your profile, rotate credentials, and
            review security preferences without leaving this page.
          </Muted>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/">Go to dashboard</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link href="/admin">Admin area</Link>
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-dashed bg-background/70 p-6 text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{currentSessionUser.id}</span>{" "}
          with role <span className="font-medium">{currentSessionUser.role}</span>.
        </div>
      </main>
    </div>
  );
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (
    words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)
  ).toUpperCase();
}
