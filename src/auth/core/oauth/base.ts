import crypto from "crypto";
import { z } from "zod";
import { OAuthProvider } from "@/auth/tables";
import { env } from "@/data/env/server";
import { Cookies } from "../session";
import { createAppleOAuthClient } from "./apple";
import { createGithubOAuthClient } from "./github";
import { createGoogleOAuthClient } from "./google";
import { createMicrosoftOAuthClient } from "./microsoft";

const STATE_COOKIE_KEY = "oAuthState";
const CODE_VERIFIER_COOKIE_KEY = "oAuthCodeVerifier";
// Ten minutes in seconds
const COOKIE_EXPIRATION_SECONDS = 60 * 10;

export class OAuthClient<T> {
  private readonly provider: OAuthProvider;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private readonly urls: { auth: string; token: string; user: string };
  private readonly userHeaders?: HeadersInit;
  private readonly userInfo: {
    schema: z.ZodSchema<T>;
    parser: (data: T) => {
      id: string;
      email?: string | null;
      name?: string | null;
    };
    resolveEmail?: (options: {
      accessToken: string;
      tokenType: string;
    }) => Promise<string | null>;
  };
  private readonly tokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
  });

  constructor({
    provider,
    clientId,
    clientSecret,
    scopes,
    urls,
    userHeaders,
    userInfo,
  }: {
    provider: OAuthProvider;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    urls: { auth: string; token: string; user: string };
    userHeaders?: HeadersInit;
    userInfo: {
      schema: z.ZodSchema<T>;
      parser: (data: T) => {
        id: string;
        email?: string | null;
        name?: string | null;
      };
      resolveEmail?: (options: {
        accessToken: string;
        tokenType: string;
      }) => Promise<string | null>;
    };
  }) {
    this.provider = provider;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scopes = scopes;
    this.urls = urls;
    this.userHeaders = userHeaders;
    this.userInfo = userInfo;
  }

  private get redirectUrl() {
    return new URL(this.provider, env.OAUTH_REDIRECT_URL_BASE);
  }

  createAuthUrl(cookies: Pick<Cookies, "set">) {
    const state = createState(cookies);
    const codeVerifier = createCodeVerifier(cookies);
    const url = new URL(this.urls.auth);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUrl.toString());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set(
      "code_challenge",
      crypto.hash("sha256", codeVerifier, "base64url"),
    );
    return url.toString();
  }

  async fetchUser(code: string, state: string, cookies: Pick<Cookies, "get">) {
    const isValidState = validateState(state, cookies);
    if (!isValidState) throw new InvalidStateError();

    const { accessToken, tokenType } = await this.fetchToken(
      code,
      getCodeVerifier(cookies),
    );

    const user = await fetch(this.urls.user, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
        ...(this.userHeaders ?? {}),
      },
    })
      .then((res) => res.json())
      .then((rawData) => {
        const { data, success, error } = this.userInfo.schema.safeParse(rawData);
        if (!success) throw new InvalidUserError(error);

        return data;
      });
    const parsed = this.userInfo.parser(user);

    let email = parsed.email ?? null;
    if ((!email || email.length === 0) && this.userInfo.resolveEmail) {
      email = await this.userInfo.resolveEmail({ accessToken, tokenType });
    }

    if (!email) {
      throw new MissingEmailError(this.provider);
    }

    return { id: parsed.id, email, name: parsed.name ?? email };
  }

  private async fetchToken(code: string, codeVerifier: string) {
    return fetch(this.urls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUrl.toString(),
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      }),
    })
      .then((res) => res.json())
      .then((rawData) => {
        const { data, success, error } = this.tokenSchema.safeParse(rawData);
        if (!success) throw new InvalidTokenError(error);

        return { accessToken: data.access_token, tokenType: data.token_type };
      });
  }
}

export function getOAuthClient(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return createGoogleOAuthClient();
    case "github":
      return createGithubOAuthClient();
    case "microsoft":
      return createMicrosoftOAuthClient();
    case "apple":
      return createAppleOAuthClient();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

class InvalidTokenError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid Token");
    this.cause = zodError;
  }
}

class InvalidUserError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid User, please sign up!");
    this.cause = zodError;
  }
}

class MissingEmailError extends Error {
  constructor(provider: OAuthProvider) {
    super(`Unable to determine email from ${provider} profile`);
  }
}

class InvalidStateError extends Error {
  constructor() {
    super("Invalid State");
  }
}

class InvalidCodeVerifierError extends Error {
  constructor() {
    super("Invalid Code Verifier");
  }
}

function createState(cookies: Pick<Cookies, "set">) {
  const state = crypto.randomBytes(64).toString("hex").normalize();
  cookies.set(STATE_COOKIE_KEY, state, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + COOKIE_EXPIRATION_SECONDS * 1000),
  });
  return state;
}

function createCodeVerifier(cookies: Pick<Cookies, "set">) {
  const codeVerifier = crypto.randomBytes(64).toString("hex").normalize();
  cookies.set(CODE_VERIFIER_COOKIE_KEY, codeVerifier, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + COOKIE_EXPIRATION_SECONDS * 1000),
  });
  return codeVerifier;
}

function validateState(state: string, cookies: Pick<Cookies, "get">) {
  const cookieState = cookies.get(STATE_COOKIE_KEY)?.value;
  return cookieState === state;
}

function getCodeVerifier(cookies: Pick<Cookies, "get">) {
  const codeVerifier = cookies.get(CODE_VERIFIER_COOKIE_KEY)?.value;
  if (codeVerifier == null) throw new InvalidCodeVerifierError();
  return codeVerifier;
}
