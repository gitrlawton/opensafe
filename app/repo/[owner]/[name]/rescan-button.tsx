"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface RescanButtonProps {
  owner: string
  name: string
}

export function RescanButton({ owner, name }: RescanButtonProps): JSX.Element {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)

  const handleRescan = async (): Promise<void> => {
    setIsScanning(true)

    try {
      const repoUrl = `https://github.com/${owner}/${name}`

      const response = await fetch("/api/scan-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      })

      if (!response.ok) {
        throw new Error("Scan failed")
      }

      // Refresh the page to show new data
      router.refresh()
    } catch (error) {
      console.error("Rescan failed:", error)
      alert("Failed to rescan repository. Please try again.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRescan}
      disabled={isScanning}
      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
      {isScanning ? "Scanning..." : "Re-scan Repo"}
    </Button>
  )
}
