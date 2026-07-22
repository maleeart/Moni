import { userPath } from "./auth"
import { UserData } from "./types"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const REPO = process.env.GITHUB_REPO! // "maleeart/Moni"
const BRANCH = "main"

export async function getFile(path: string) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  })
  if (res.status === 404) return null
  const data = await res.json()
  const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"))
  return { content, sha: data.sha }
}

export async function putFile(path: string, content: unknown, sha?: string) {
  const body: Record<string, unknown> = {
    message: `update ${path}`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`)
  return res.json()
}

export async function getUserData(email: string): Promise<{ data: UserData; sha?: string }> {
  const path = userPath(email)
  const file = await getFile(path)
  if (!file) return { data: { transactions: [], budgets: {} } }
  return { data: file.content as UserData, sha: file.sha }
}
