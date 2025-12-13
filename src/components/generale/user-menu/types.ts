import type { PasskeyListItem } from "@/auth/features/passkeys/server/actions";
export type UserMenuProps = {
	name: string;
	profileName: string;
	email: string;
	avatarUrl?: string | null;
	initials: string;
	emailVerified: boolean;
	hasPassword: boolean;
	passkeys: PasskeyListItem[];
};
