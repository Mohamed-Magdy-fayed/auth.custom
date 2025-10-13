import { getOAuthClient } from "@/auth/core/oauth/base"
import { createSession } from "@/auth/core/session"
import { db } from "@/drizzle/db"
import {
  OAuthProvider,
  oAuthProviders,
  UserOAuthAccountsTable,
  UsersTable,
} from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { NextRequest } from "next/server"
import { z } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const provider = z.enum(oAuthProviders).parse(rawProvider)

  if (typeof code !== "string" || typeof state !== "string") {
    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        "Failed to connect. Please try again."
      )}`
    )
  }

  const oAuthClient = getOAuthClient(provider)
  try {
    const oAuthUser = await oAuthClient.fetchUser(code, state, await cookies())
    const user = await connectUserToAccount(oAuthUser, provider)
    await createSession(user, await cookies())
  } catch (error: any) {
    console.error(error)
    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        error.message || "Failed to connect. Please try again."
      )}`
    )
  }

  redirect("/")
}

function connectUserToAccount(
  { id, email, name }: { id: string; email: string; name: string },
  provider: OAuthProvider
) {
  return db.transaction(async trx => {
    let user = await trx.query.UsersTable.findFirst({
      where: eq(UsersTable.email, email),
      columns: { id: true, role: true },
    })

    if (user == null) {
      const [newUser] = await trx
        .insert(UsersTable)
        .values({
          email: email,
          name: name,
        })
        .returning({ id: UsersTable.id, role: UsersTable.role })
      user = newUser
    }

    await trx
      .insert(UserOAuthAccountsTable)
      .values({
        provider,
        providerAccountId: id,
        userId: user.id,
      })
      .onConflictDoNothing()

    return user
  })
}
