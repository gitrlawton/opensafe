export interface ScannedRepo {
  id: string
  name: string
  owner: string
  language: string
  safetyScore: number
  lastScanned: string
}

const STORAGE_KEY = "opensafe-scanned-repos"

export function getScannedRepos(): ScannedRepo[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addScannedRepo(repo: Omit<ScannedRepo, "id" | "lastScanned">): ScannedRepo {
  const scannedRepos = getScannedRepos()

  // Check if repo already exists
  const existingIndex = scannedRepos.findIndex((r) => r.owner === repo.owner && r.name === repo.name)

  const newRepo: ScannedRepo = {
    ...repo,
    id: `${repo.owner}-${repo.name}`,
    lastScanned: "Just now",
  }

  if (existingIndex >= 0) {
    // Update existing repo
    scannedRepos[existingIndex] = newRepo
  } else {
    // Add new repo to the beginning
    scannedRepos.unshift(newRepo)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedRepos))
  return newRepo
}

// Generate a realistic safety score based on repo characteristics
export function generateSafetyScore(owner: string, name: string): number {
  // Well-known safe repos get high scores
  const safeRepos = ["facebook", "vercel", "vuejs", "sveltejs", "tensorflow", "microsoft", "google"]
  if (safeRepos.includes(owner.toLowerCase())) {
    return Math.floor(Math.random() * 8) + 90 // 90-98
  }

  // Generate a random but realistic score
  return Math.floor(Math.random() * 60) + 35 // 35-95
}
