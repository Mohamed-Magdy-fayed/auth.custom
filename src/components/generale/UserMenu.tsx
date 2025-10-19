"use client";

import {
    Building2,
    Fingerprint,
    KeyRound,
    Link2,
    LogOut,
    Mail,
    MonitorSmartphone,
    ShieldCheckIcon,
    User as UserIcon,
    Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { isFeatureEnabled } from "@/auth/config";
import { LogOutButton } from "@/auth/nextjs/components/LogOutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Muted, Small } from "@/components/ui/typography";
import { EmailDialog } from "./user-menu/EmailDialog";
import { OAuthDialog } from "./user-menu/OAuthDialog";
import { OrganizationsDialog } from "./user-menu/OrganizationsDialog";
import { PasskeysDialog } from "./user-menu/PasskeysDialog";
import { PasswordDialog } from "./user-menu/PasswordDialog";
import { ProfileNameDialog } from "./user-menu/ProfileNameDialog";
import { SessionsDialog } from "./user-menu/SessionsDialog";
import { TeamsDialog } from "./user-menu/TeamsDialog";
import type { UserMenuProps as Props } from "./user-menu/types";

type DialogName =
    | "profile"
    | "email"
    | "password"
    | "passkeys"
    | "oauth"
    | "sessions"
    | "organizations"
    | "teams"
    | null;

export function UserMenu({
    name,
    profileName,
    email,
    avatarUrl,
    initials,
    emailVerified,
    hasPassword,
    passkeys,
    organizations,
    teamData,
}: Props) {
    const [openDialog, setOpenDialog] = useState<DialogName>(null);
    const activeOrganization = useMemo(() => {
        if (teamData.activeOrganization) return teamData.activeOrganization;
        return organizations.find((org) => org.isDefault) ?? organizations[0] ?? null;
    }, [organizations, teamData.activeOrganization]);

    const handleSelect = (dialog: Exclude<DialogName, null>) => {
        setOpenDialog(dialog);
    };

    const renderDialog = () => {
        switch (openDialog) {
            case "profile":
                return <ProfileNameDialog initialName={profileName} />;
            case "email":
                return <EmailDialog email={email} emailVerified={emailVerified} />;
            case "password":
                return isFeatureEnabled("password")
                    ? hasPassword
                        ? <PasswordDialog />
                        : <PasswordDialog isCreate />
                    : null;
            case "passkeys":
                return isFeatureEnabled("passkeys") ? (
                    <PasskeysDialog passkeys={passkeys} />
                ) : null;
            case "oauth":
                return isFeatureEnabled("oauth") ? <OAuthDialog /> : null;
            case "sessions":
                return isFeatureEnabled("sessions") ? <SessionsDialog /> : null;
            case "organizations":
                return isFeatureEnabled("organizations") ? (
                    <OrganizationsDialog organizations={organizations} />
                ) : null;
            case "teams":
                return isFeatureEnabled("teams") ? <TeamsDialog data={teamData} /> : null;
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={openDialog !== null}
            onOpenChange={(isOpen) => !isOpen && setOpenDialog(null)}
        >
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="lg"
                        className="gap-3 rounded-full px-3 py-2 text-left font-medium"
                    >
                        <Avatar className="size-9">
                            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="hidden text-sm sm:inline-flex sm:flex-col sm:items-start">
                            <span className="font-semibold leading-tight">{name}</span>
                            <Small className="text-muted-foreground leading-tight">{email}</Small>
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="min-w-64 rounded-lg"
                    align="end"
                    sideOffset={12}
                >
                    <DropdownMenuLabel className="flex items-center gap-3">
                        <Avatar className="size-10">
                            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5 text-sm leading-tight">
                            <p className="font-semibold">{name}</p>
                            <Muted className="truncate text-xs">{email}</Muted>
                            {activeOrganization ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] uppercase tracking-wide"
                                    >
                                        {activeOrganization.name}
                                    </Badge>
                                    <span className="truncate">· {activeOrganization.slug}</span>
                                </div>
                            ) : null}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup className="space-y-1">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <UserIcon className="size-4" />
                                Account
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="min-w-64 rounded-lg">
                                <DropdownMenuItem onSelect={(e) => (e.preventDefault(), handleSelect("profile"))}>
                                    <UserIcon className="size-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant={!emailVerified ? "destructive" : "default"}
                                    onSelect={(event) => (event.preventDefault(), handleSelect("email"))}
                                >
                                    <Mail className="size-4" />
                                    {emailVerified ? "Change email" : "Verify email"}
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <ShieldCheckIcon />
                                Security
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent
                                className="min-w-64 rounded-lg"
                            >
                                {isFeatureEnabled("password") ? (
                                    <DropdownMenuItem
                                        onSelect={(event) => (event.preventDefault(), handleSelect("password"))}
                                    >
                                        <KeyRound className="size-4" />
                                        {hasPassword ? "Change password" : "Create password"}
                                    </DropdownMenuItem>
                                ) : null}
                                {isFeatureEnabled("passkeys") ? (
                                    <DropdownMenuItem
                                        onSelect={(event) => (event.preventDefault(), handleSelect("passkeys"))}
                                    >
                                        <Fingerprint className="size-4" />
                                        Manage passkeys
                                    </DropdownMenuItem>
                                ) : null}
                                {isFeatureEnabled("oauth") ? (
                                    <DropdownMenuItem
                                        onSelect={(event) => (event.preventDefault(), handleSelect("oauth"))}
                                    >
                                        <Link2 className="size-4" />
                                        Manage OAuth accounts
                                    </DropdownMenuItem>
                                ) : null}
                                {isFeatureEnabled("sessions") ? (
                                    <DropdownMenuItem
                                        onSelect={(event) => (event.preventDefault(), handleSelect("sessions"))}
                                    >
                                        <MonitorSmartphone className="size-4" />
                                        Manage sessions
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup className="space-y-1">
                        {isFeatureEnabled("organizations") ? (
                            <DropdownMenuItem
                                onSelect={(event) => (
                                    event.preventDefault(), handleSelect("organizations")
                                )}
                            >
                                <Building2 className="size-4" />
                                Organizations
                            </DropdownMenuItem>
                        ) : null}
                        {isFeatureEnabled("teams") ? (
                            <DropdownMenuItem
                                onSelect={(event) => (event.preventDefault(), handleSelect("teams"))}
                            >
                                <Users className="size-4" />
                                Teams & members
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <div className="px-1 py-1.5">
                        <LogOutButton
                            variant="ghost"
                            className="w-full justify-start gap-2 px-2 py-1.5 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut className="size-4" />
                            Log out
                        </LogOutButton>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
            {renderDialog()}
        </Dialog>
    );
}

export type { Props as UserMenuProps };
