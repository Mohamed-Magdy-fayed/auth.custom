import { UserRole, userRoles } from "@/drizzle/schema";
import { z } from "zod";

// Seven days in seconds
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_SESSION_KEY = "session-token";

// --- IMPORTANT ---
// This secret key MUST be stored in your environment variables.
// It needs to be a string that is at least 32 bytes long for HS256.
const secretKey = process.env.JWT_SECRET_KEY;

if (!secretKey || secretKey.length < 32) {
  throw new Error("JWT_SECRET_KEY is not set or is too short. It must be at least 32 characters.");
}

const sessionSchema = z.object({
  id: z.string(),
  role: z.enum(userRoles),
  // Add expiration time to the payload itself
  exp: z.number(),
});

type UserSessionPayload = z.infer<typeof sessionSchema>;
export type Cookies = {
  set: (
    key: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax";
      expires?: Date;
    }
   ) => void;
  get: (key: string) => { name: string; value: string } | undefined;
  delete: (key: string) => void;
};

// Encodes a string to Base64Url format
function base64UrlEncode(data: string) {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Decodes a Base64Url string
function base64UrlDecode(encoded: string) {
  encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4) {
    encoded += '=';
  }
  return atob(encoded);
}

// Imports the secret key for use with the Web Crypto API
async function getCryptoKey() {
  const keyData = new TextEncoder().encode(secretKey);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// --- Refactored Session Functions ---

export async function createSession(
  user: { id: string; role: UserRole },
  cookies: Pick<Cookies, "set">
) {
  const expirationTime = Math.floor(Date.now() / 1000) + SESSION_EXPIRATION_SECONDS;
  const payload: UserSessionPayload = {
    id: user.id,
    role: user.role,
    exp: expirationTime,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(dataToSign));
  
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  
  const token = `${dataToSign}.${encodedSignature}`;

  cookies.set(COOKIE_SESSION_KEY, token, {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(expirationTime * 1000 ),
  });
}

export async function getSessionFromCookie(cookies: Pick<Cookies, "get">) {
  const token = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  
  const key = await getCryptoKey();
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;
  
  const signature = new Uint8Array(Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0)));
  
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(dataToVerify)
  );

  if (!isValid) return null;

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  // Verify expiration
  if (Date.now() > payload.exp * 1000) {
    return null;
  }

  const { success, data: user } = sessionSchema.safeParse(payload);
  return success ? user : null;
}

export function removeSession(cookies: Pick<Cookies, "delete">) {
  cookies.delete(COOKIE_SESSION_KEY);
}

// You can refresh a session by getting the user and creating a new one
export async function refreshSession(cookies: Pick<Cookies, "get" | "set">) {
    const user = await getSessionFromCookie(cookies);
    if (user) {
        await createSession(user, cookies);
    }
}
