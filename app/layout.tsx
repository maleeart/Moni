import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Moni — รู้ทุกบาท ทุกเดือน",
  description: "Personal finance tracker สำหรับบันทึกรายรับรายจ่ายรายเดือน",
  appleWebApp: { capable: true, title: "Moni", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
