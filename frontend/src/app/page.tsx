"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Welcome to the Chatbot Framework
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          Choose an experience to get started.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/simple-chatbot">Simple Chatbot</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/multi-agent-chatbot">Multi-Agent Chatbot (Coming Soon)</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
