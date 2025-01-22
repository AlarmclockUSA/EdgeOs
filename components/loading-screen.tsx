import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Loading...</h2>
        <p className="mt-2 text-muted-foreground">Please wait while we prepare your dashboard.</p>
      </div>
    </div>
  )
}

