"use client"
import Image from "next/image"
import { useEffect } from "react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (el: HTMLElement, config: object) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (res: { credential: string }) => {
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: res.credential }),
          })
          if (r.ok) window.location.href = "/dashboard"
        },
      })
      const el = document.getElementById("google-btn")
      if (el) {
        window.google?.accounts.id.renderButton(el, {
          theme: "filled_black",
          size: "large",
          width: 280,
          text: "signin_with",
        })
      }
    }
    document.body.appendChild(script)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0F0E17" }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image src="/Moni.png" alt="Moni" width={80} height={80} />
        <p className="text-white/50 text-sm tracking-widest">รู้ทุกบาท · ทุกเดือน</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-8 flex flex-col items-center gap-6" style={{ background: "#1A1828", width: 320 }}>
        <h1 className="text-white text-xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-white/40 text-sm text-center">บันทึกรายรับรายจ่ายของคุณ<br />ทุกเดือน ดูง่าย จัดระเบียบ</p>
        <div id="google-btn" />
      </div>
    </div>
  )
}
