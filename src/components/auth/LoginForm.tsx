"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Mail, Lock, ArrowRight } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function LoginForm() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Debug: Log component lifecycle
  useEffect(() => {
    console.log("=== LOGIN COMPONENT MOUNTED ===")
    setDebugInfo("Component mounted")
    
    return () => {
      console.log("=== LOGIN COMPONENT UNMOUNTED ===")
    }
  }, [])
  
  // Monitor session changes
  useEffect(() => {
    console.log("Session status:", status)
    console.log("Session data:", session)
    
    setDebugInfo(prev => `${prev}\nSession status: ${status}`)
    if (session?.user) {
      setDebugInfo(prev => `${prev}\nUser ID: ${session.user.id || 'undefined'}`)
      setDebugInfo(prev => `${prev}\nUser role: ${session.user.role || 'undefined'}`)
    }
    
    // Only redirect if we have a valid session with a user ID
    if (status === "authenticated" && session?.user?.id) {
      console.log("User authenticated with ID, redirecting to dashboard...")
      setDebugInfo(prev => `${prev}\nAuthenticated with ID! Redirecting...`)
      
      router.push("/dashboard")
   
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }
    
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    setDebugInfo("Login attempt started...")
    console.log("Login attempt with:", { email, passwordLength: password.length })

    try {
      console.log("Calling signIn with credentials...")
      setDebugInfo(prev => `${prev}\nCalling signIn with email and password...`)
      
      const result = await signIn("credentials", {
        username: email.trim(),
        password: password.trim(),
        redirect: false,
      })

      console.log("SignIn result:", result)
      setDebugInfo(prev => `${prev}\nSignIn result: ${JSON.stringify(result)}`)

      if (result?.error) {
        console.error("Login error:", result.error)
        setDebugInfo(prev => `${prev}\nError: ${result.error}`)
        
        toast({
          title: "Authentication failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        })
      } else if (result?.ok) {
        console.log("Login successful! Waiting for session update...")
        setDebugInfo(prev => `${prev}\nLogin successful! Waiting for session...`)
        
        toast({
          title: "Success!",
          description: "You have been successfully logged in.",
        })
        
        // The useEffect watching session changes will handle the redirect
      }
    } catch (error) {
      console.error("Login exception:", error)
      setDebugInfo(prev => `${prev}\nException: ${String(error)}`)
      
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account to continue</p>
        </div>

        <Card className="w-full border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors duration-200">
                    <Mail size={18} />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors duration-200">
                    <Lock size={18} />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-primary focus:ring-primary transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Sign in <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-6 pt-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Create an account
              </Link>
            </p>
            
            {/* Debug section - always show in development */}
            {process.env.NODE_ENV === "development" && (
              <div className="w-full mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-40 overflow-auto">
                <div>Auth Status: {status}</div>
                <pre>{debugInfo}</pre>
              </div>
            )}
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}