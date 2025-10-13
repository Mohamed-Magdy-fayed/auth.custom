"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { signInSchema, signUpSchema } from "./schemas"
import { db } from "@/drizzle/db"
import { OAuthProvider, UsersTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import {
  comparePasswords,
  generateSalt,
  hashPassword,
} from "../core/passwordHasher"
import { cookies } from "next/headers"
import { createSession, removeSession } from "../core/session"
import { getOAuthClient } from "../core/oauth/base"

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { success, data } = signInSchema.safeParse(unsafeData)

  if (!success) return "Unable to log you in"

  const user = await db.query.UsersTable.findFirst({
    columns: { password: true, salt: true, id: true, email: true, role: true },
    where: eq(UsersTable.email, data.email),
  })

  if (user == null || user.password == null || user.salt == null) {
    return "Unable to log you in"
  }

  const isCorrectPassword = await comparePasswords({
    hashedPassword: user.password,
    password: data.password,
    salt: user.salt,
  })

  if (!isCorrectPassword) return "Unable to log you in"

  await createSession(user, await cookies())

  redirect("/")
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
  const { success, data } = signUpSchema.safeParse(unsafeData)

  if (!success) return "Unable to create account"

  const existingUser = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.email, data.email),
  })

  if (existingUser != null) return "Account already exists for this email"

  try {
    const salt = generateSalt()
    const hashedPassword = await hashPassword(data.password, salt)

    const [user] = await db
      .insert(UsersTable)
      .values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        salt,
      })
      .returning({ id: UsersTable.id, role: UsersTable.role })

    if (user == null) return "Unable to create account"
    await createSession(user, await cookies())
  } catch {
    return "Unable to create account"
  }

  redirect("/")
}

export async function logOut() {
  removeSession(await cookies())
  redirect("/")
}

export async function oAuthSignIn(provider: OAuthProvider) {
  const oAuthClient = getOAuthClient(provider)
  redirect(oAuthClient.createAuthUrl(await cookies()))
}
