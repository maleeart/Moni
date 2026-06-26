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
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#F7F6FF" }}>
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image src="/Moni.png" alt="Moni" width={88} height={88} />
        <p className="text-sm tracking-widest font-medium" style={{ color: "#9895B0" }}>รู้ทุกบาท · ทุกเดือน</p>
      </div>
      <div className="rounded-3xl p-8 flex flex-col items-center gap-5 shadow-sm" style={{ background: "#FFFFFF", width: 320, border: "1px solid #EAE8FF" }}>
        <h1 className="text-xl font-semibold" style={{ color: "#1A1828" }}>เข้าสู่ระบบ</h1>
        <p className="text-sm text-center" style={{ color: "#9895B0" }}>บันทึกรายรับรายจ่ายของคุณ<br />ทุกเดือน ดูง่าย จัดระเบียบ</p>
        <div id="google-btn" />
      </div>
    </div>
  )
}
