"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authMessage } from "@/auth/config";
import {
  OAuthProvider,
  oAuthProviderValues,
  RolesTable,
  UserCredentialsTable,
  UserRoleAssignmentsTable,
  UsersTable,
} from "@/auth/tables";
import { db } from "@/drizzle/db";
import { DEFAULT_ROLE_KEY } from "../core/constants";
import { getOAuthClient } from "../core/oauth/base";
import {
  isOAuthProviderConfigured,
  providerDisplayNames,
} from "../core/oauth/providers";
import {
  comparePasswords,
  generateSalt,
  hashPassword,
} from "../core/passwordHasher";
import { createSession, removeSession } from "../core/session";
import { signInSchema, signUpSchema } from "./schemas";
import { getSessionContext } from "./sessionContext";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { success, data } = signInSchema.safeParse(unsafeData);

  if (!success)
    return authMessage("auth.signIn.error.generic", "Unable to log you in");

  const normalizedEmail = normalizeEmail(data.email);

  const user = await db.query.UsersTable.findFirst({
    columns: { id: true, email: true, status: true },
    where: eq(UsersTable.emailNormalized, normalizedEmail),
    with: {
      credentials: { columns: { passwordHash: true, passwordSalt: true } },
      roleAssignments: { columns: {}, with: { role: { columns: { key: true } } } },
    },
  });

  if (
    user == null ||
    user.credentials == null ||
    user.credentials.passwordHash == null ||
    user.credentials.passwordSalt == null
  ) {
    return authMessage("auth.signIn.error.generic", "Unable to log you in");
  }

  if (user.status !== "active") {
    return authMessage("auth.signIn.error.inactive", "Account is not active");
  }

  const isCorrectPassword = await comparePasswords({
    hashedPassword: user.credentials.passwordHash,
    password: data.password,
    salt: user.credentials.passwordSalt,
  });

  if (!isCorrectPassword)
    return authMessage("auth.signIn.error.generic", "Unable to log you in");

  const primaryRole =
    user.roleAssignments?.find((assignment) => assignment.role != null)?.role
      ?.key ?? DEFAULT_ROLE_KEY;

  await createSession(
    { id: user.id, role: primaryRole },
    await cookies(),
    await getSessionContext(),
  );

  redirect("/");
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
  const result = signUpSchema.safeParse(unsafeData);

  if (!result.success) {
    console.warn("signUp validation failed", result.error.flatten());
    return (
      result.error.issues[0]?.message ??
      authMessage("auth.signUp.error.generic", "Unable to create account")
    );
  }

  const data = result.data;
  const normalizedEmail = normalizeEmail(data.email);

  try {
    const user = await db.transaction(async (trx) => {
      const existingUser = await trx.query.UsersTable.findFirst({
        columns: { id: true },
        where: eq(UsersTable.emailNormalized, normalizedEmail),
      });

      if (existingUser != null) {
        throw new Error(
          authMessage(
            "auth.signUp.error.duplicate",
            "Account already exists for this email",
          ),
        );
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(data.password, salt);

      const [createdUser] = await trx
        .insert(UsersTable)
        .values({
          displayName: data.name,
          email: data.email,
          emailNormalized: normalizedEmail,
          status: "active",
        })
        .returning({ id: UsersTable.id });

      if (createdUser == null) {
        throw new Error("Failed to create user");
      }

      await trx
        .insert(UserCredentialsTable)
        .values({ userId: createdUser.id, passwordHash, passwordSalt: salt });

      let defaultRole = await trx.query.RolesTable.findFirst({
        columns: { id: true },
        where: and(
          eq(RolesTable.key, DEFAULT_ROLE_KEY),
          isNull(RolesTable.organizationId),
        ),
      });

      if (defaultRole == null) {
        [defaultRole] = await trx
          .insert(RolesTable)
          .values({
            key: DEFAULT_ROLE_KEY,
            name: "User",
            description: "Default system role",
          })
          .returning({ id: RolesTable.id });
      }

      if (defaultRole == null) {
        throw new Error("Failed to ensure default role");
      }

      await trx
        .insert(UserRoleAssignmentsTable)
        .values({
          userId: createdUser.id,
          roleId: defaultRole.id,
          assignedById: createdUser.id,
        });

      return { id: createdUser.id, role: DEFAULT_ROLE_KEY };
    });

    await createSession(user, await cookies(), await getSessionContext());
  } catch (error: any) {
    const duplicateMessage = authMessage(
      "auth.signUp.error.duplicate",
      "Account already exists for this email",
    );

    if (error?.message === duplicateMessage) {
      return duplicateMessage;
    }

    console.error(error);
    return authMessage("auth.signUp.error.generic", "Unable to create account");
  }

  redirect("/");
}

export async function logOut() {
  const cookie = await cookies();
  await removeSession({
    delete: (val) => cookie.delete(val),
    get: (val) => cookie.get(val),
  });
  redirect("/");
}

export async function oAuthSignIn(provider: OAuthProvider) {
  if (!oAuthProviderValues.includes(provider)) {
    throw new Error("Unsupported OAuth provider");
  }

  if (!isOAuthProviderConfigured(provider)) {
    return {
      error: authMessage(
        "auth.oauth.providerUnavailable",
        `${providerDisplayNames[provider]} sign-in is not currently available.`,
      ),
    };
  }

  const oAuthClient = getOAuthClient(provider);
  redirect(oAuthClient.createAuthUrl(await cookies()));
}
