import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/nextjs/currentUser";

export async function GET() {
	const user = await getCurrentUser({ withFullUser: true });
	return NextResponse.json(user);
}
