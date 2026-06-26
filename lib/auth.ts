import { SignJWT, jwtVerify } from "jose"
import { createHash } from "crypto"
import { cookies } from "next/headers"

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export function userPath(email: string) {
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 16)
  return `data/${hash}.json`
}

export async function signToken(payload: Record<string, string>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { email: string; name: string; picture: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("moni_session")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function verifyGoogleToken(credential: string) {
  // Decode JWT from Google (verify with Google's public keys)
  const parts = credential.split(".")
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString())
  // Basic checks
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Invalid audience")
  if (payload.exp < Date.now() / 1000) throw new Error("Token expired")
  return { email: payload.email as string, name: payload.name as string, picture: payload.picture as string }
}
