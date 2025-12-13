"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { AppShellContext } from "@/app/app/load-app-context";

type AuthContextValue = AppShellContext;

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = { value: AuthContextValue; children: ReactNode };

export function AuthProvider({ value, children }: AuthProviderProps) {
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context == null) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
