import { NextRequest, NextResponse } from "next/server"
import { verifyGoogleToken, signToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()
    const user = await verifyGoogleToken(credential)
    const token = await signToken({ email: user.email, name: user.name, picture: user.picture })

    const res = NextResponse.json({ ok: true, user })
    res.cookies.set("moni_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 })
  }
}
