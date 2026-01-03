'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { login, ApiError, isAuthenticated, getUserData, getRoleFromResponse } from '@/lib/api/index'
import { UserRole } from '@/lib/api/types'
import { Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      if (authenticated) {
        // User is already logged in, check role and redirect accordingly
        const userData = getUserData()
        const role = userData?.role ? String(userData.role).toLowerCase() : null
        
        if (role === 'master_admin' || role === UserRole.MASTER_ADMIN) {
          router.push('/master-admin')
        } else {
          router.push('/')
        }
      } else {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const onSubmit = async (data: LoginFormValues) => {
    // Additional client-side validation
    if (!data.email || !data.password) {
      toast({
        title: 'Validation Error',
        description: 'Email and password are required',
        variant: 'destructive',
      })
      return
    }

    if (data.email.trim() === '' || data.password.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Email and password cannot be empty',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await login({
        username: data.email.trim(),
        password: data.password,
      })

      // Verify that we have access token before allowing redirect
      if (!response.access_token || !response.refresh_token) {
        throw new Error('Login failed: No access token received')
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully!',
        variant: 'success',
      })

      // Get role from response (check both response.role and response.user.role)
      const role = getRoleFromResponse(response)
      
      // Route based on role
      if (role === 'master_admin' || role === UserRole.MASTER_ADMIN) {
        router.push('/master-admin')
      } else {
        router.push('/')
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to login. Please check your credentials and try again.'
      if (error instanceof ApiError) {
        errorMessage = error.detail || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(
                (data) => {
                  console.log('Form validation passed, submitting:', data)
                  onSubmit(data)
                },
                (errors) => {
                  console.error('Form validation errors:', errors)
                  toast({
                    title: 'Validation Error',
                    description: 'Please check your email and password',
                    variant: 'destructive',
                  })
                }
              )} 
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@abcca.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                      <Input
                          type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...field}
                        disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don't have an account?{' '}
            </span>
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
