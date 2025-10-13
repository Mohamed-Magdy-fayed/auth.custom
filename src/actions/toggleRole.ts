"use server"

import { createSession } from "@/auth/core/session"
import { getCurrentUser } from "@/auth/nextjs/currentUser"
import { db } from "@/drizzle/db"
import { UsersTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

export async function toggleRole() {
  const user = await getCurrentUser({ redirectIfNotFound: true })

  const [updatedUser] = await db
    .update(UsersTable)
    .set({ role: user.role === "admin" ? "user" : "admin" })
    .where(eq(UsersTable.id, user.id))
    .returning({ id: UsersTable.id, role: UsersTable.role })

  await createSession(updatedUser, await cookies())
}
