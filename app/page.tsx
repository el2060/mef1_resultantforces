import VectorSimulator from "@/components/vector-simulator"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-mono-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NP_Logotype_Black_and_White-removebg-preview-63ej3P6wlYWQbUGl7wlRZROXScHXOQ.png"
                alt="Ngee Ann Polytechnic Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-9gJ5QWkBgpXZBqpInBfiq6NUFCTXzq.jpeg"
                alt="School of Engineering Logo"
                width={40}
                height={40}
                className="h-10 w-auto ml-2"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-mono-800">School of Engineering</span>
              <span className="text-xs text-mono-600">Mechanical Engineering Fundamentals</span>
              <span className="text-xs text-mono-500">Resultant Force</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-mono-100 text-mono-700 border-mono-200">
              Beta v0.7
            </Badge>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-1 text-mono-800 font-mono">Interactive Resultant Force</h1>
        <p className="text-mono-600 mb-4 text-center max-w-2xl">
          Explore how individual vectors affect the resultant. Drag points and observe the effect.
        </p>
        <VectorSimulator />
      </main>
    </div>
  )
}
