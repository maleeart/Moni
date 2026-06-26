"use client"
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="80" height="80">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            <linearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="180" height="180" rx="48" ry="48" fill="url(#bg)" />
          <circle cx="100" cy="88" r="46" fill="url(#coin)" />
          <circle cx="100" cy="88" r="38" fill="none" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="4 3" />
          <text x="100" y="102" fontFamily="Georgia,serif" fontSize="42" fontWeight="700" fill="#92400E" textAnchor="middle" dominantBaseline="middle">M</text>
          <text x="100" y="158" fontFamily="Helvetica Neue,Arial,sans-serif" fontSize="22" fontWeight="600" letterSpacing="6" fill="white" textAnchor="middle" opacity="0.95">MONI</text>
          <g transform="translate(136,52)" opacity="0.9">
            <line x1="0" y1="-7" x2="0" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
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
