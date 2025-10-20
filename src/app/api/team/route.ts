import { NextResponse } from "next/server";
import { getTeamForUser } from "@/saas/db/queries";

export async function GET() {
	const team = await getTeamForUser();
	return NextResponse.json(team);
}
