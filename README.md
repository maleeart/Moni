# 💰 Moni

> รู้ทุกบาท · ทุกเดือน — Personal finance tracker

แอพบันทึกรายรับรายจ่ายส่วนตัว สร้างด้วย Next.js + Google Sign-In + GitHub JSON storage

## Features
- 🔐 Google Sign-In (multi-user)
- 💾 เก็บข้อมูลใน GitHub JSON (per user, SHA256 hashed)
- 💼 หมวดหมู่: เงินเดือน / รายรับอื่น / ค่าประจำ / ค่าทั่วไป / ลงทุน / ออม
- 📊 Monthly summary — เงินเดือนเข้า → ใช้ไป → เหลือ
- 🎯 ตั้งเป้าหมายการออมและการลงทุนต่อเดือน

## Setup

### 1. Clone & install
\`\`\`bash
git clone https://github.com/maleeart/Moni
cd Moni
npm install
\`\`\`

### 2. Environment variables
Copy `.env.example` → `.env.local` แล้วใส่ค่า:

| Variable | วิธีได้ |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 |
| `GOOGLE_CLIENT_ID` | เดียวกับบนบน |
| `GITHUB_TOKEN` | GitHub PAT (scope: `repo`) |
| `GITHUB_REPO` | `maleeart/Moni` |
| `JWT_SECRET` | random string 32+ ตัวอักษร |

### 3. Run
\`\`\`bash
npm run dev
\`\`\`

## Deploy on Vercel
1. Push to GitHub
2. Import repo ใน Vercel
3. ใส่ environment variables ทั้งหมด
4. Deploy!

## Data structure
ข้อมูลแต่ละ user เก็บใน `data/{sha256_hash}.json`:
\`\`\`json
{
  "transactions": [...],
  "budgets": { "2026-06": { "salary": 35000, "savingGoal": 5000, "investGoal": 3000 } }
}
\`\`\`
