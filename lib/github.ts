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

export async function updateUserData(email: string, modifier: (data: UserData) => void): Promise<UserData> {
  const path = userPath(email)
  for (let attempt = 1; attempt <= 5; attempt++) {
    const file = await getFile(path)
    const data = file ? (file.content as UserData) : { transactions: [], budgets: {} }
    // Initialize properties if they don't exist
    if (!data.transactions) data.transactions = []
    if (!data.budgets) data.budgets = {}
    if (!data.goals) data.goals = []
    if (!data.recurring) data.recurring = []
    if (!data.recurringApplied) data.recurringApplied = []
    
    const sha = file?.sha

    // Apply the modification
    modifier(data)

    try {
      await putFile(path, data, sha)
      return data
    } catch (err) {
      if (attempt === 5) throw err
      // Wait a short time before retrying (exponential backoff / random jitter)
      await new Promise(r => setTimeout(r, 100 * attempt + Math.random() * 100))
    }
  }
  throw new Error("Update user data failed after 5 attempts")
}
