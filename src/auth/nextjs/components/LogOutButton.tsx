"use client";

import { type ButtonHTMLAttributes, type ReactNode, useState } from "react";
import { authMessage } from "@/auth/config";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { logOut } from "../actions";

type ButtonLikeProps = React.ComponentProps<typeof Button>;

type LogOutButtonProps = { children?: ReactNode } & Pick<
	ButtonLikeProps,
	"variant" | "size" | "className" | "disabled"
> &
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

export function LogOutButton({
	children,
	variant = "destructive",
	size,
	className,
	disabled,
	...buttonProps
}: LogOutButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleClick = async () => {
		if (disabled || isLoading) return;
		setIsLoading(true);
		try {
			await logOut();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to log out", error);
			setIsLoading(false);
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			className={className}
			disabled={disabled || isLoading}
			onClick={handleClick}
			{...buttonProps}
		>
			<LoadingSwap
				isLoading={isLoading}
				text={authMessage("auth.loggingOut", "Signing out…")}
				className="flex items-center justify-center gap-2"
			>
				{children ?? authMessage("auth.logOut", "Log Out")}
			</LoadingSwap>
		</Button>
	);
}
