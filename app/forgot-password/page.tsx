'use client'

import { useState } from 'react'
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
    CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { forgotPassword, verifyPasswordResetOtp, resetPassword, ApiError } from '@/lib/api/index'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

const requestOtpSchema = z.object({
    email: z.string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
})

const verifyOtpSchema = z.object({
    otp: z.string()
        .min(6, 'OTP must be at least 6 characters'),
})

const resetPasswordSchema = z.object({
    newPassword: z.string()
        .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
        .min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

type RequestOtpFormValues = z.infer<typeof requestOtpSchema>
type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')

    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const router = useRouter()
    const { toast } = useToast()

    const otpForm = useForm<RequestOtpFormValues>({
        resolver: zodResolver(requestOtpSchema),
        defaultValues: { email: '' },
    })

    const verifyForm = useForm<VerifyOtpFormValues>({
        resolver: zodResolver(verifyOtpSchema),
        defaultValues: { otp: '' },
    })

    const resetForm = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { newPassword: '', confirmPassword: '' },
    })

    const onRequestOtp = async (data: RequestOtpFormValues) => {
        setIsLoading(true)
        try {
            await forgotPassword({ email: data.email.trim() })
            setEmail(data.email.trim())
            setStep(2)
            toast({
                title: 'OTP Request Processed',
                description: 'If your email is registered in our system, you will receive an OTP mail shortly.',
                variant: 'success',
            })
        } catch (error: unknown) {
            let errorMessage = 'Failed to request OTP. Please try again.'
            if (error instanceof ApiError) {
                errorMessage = error.detail || errorMessage
            } else if (error instanceof Error) {
                errorMessage = error.message
            }
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const onVerifyOtp = async (data: VerifyOtpFormValues) => {
        setIsLoading(true)
        try {
            await verifyPasswordResetOtp({ email, otp: data.otp.trim() })
            setOtp(data.otp.trim())
            setStep(3)
            toast({
                title: 'OTP Verified',
                description: 'Success! You can now choose a new secure password.',
                variant: 'success',
            })
        } catch (error: unknown) {
            let errorMessage = 'Failed to verify OTP. Please try again or request a new one.'
            if (error instanceof ApiError) {
                errorMessage = error.detail || errorMessage
            } else if (error instanceof Error) {
                errorMessage = error.message
            }
            toast({
                title: 'Verification Failed',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const onResetPassword = async (data: ResetPasswordFormValues) => {
        setIsLoading(true)
        try {
            await resetPassword({
                email,
                otp,
                newPassword: data.newPassword,
            })
            toast({
                title: 'Password Updated',
                description: 'Your password was updated successfully. You can now log in.',
                variant: 'success',
            })
            router.push('/login')
        } catch (error: unknown) {
            let errorMessage = 'Failed to reset password. Please try again.'
            if (error instanceof ApiError) {
                errorMessage = error.detail || errorMessage
            } else if (error instanceof Error) {
                errorMessage = error.message
            }
            toast({
                title: 'Reset Failed',
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
                        {step === 1 && 'Forgot Password'}
                        {step === 2 && 'Verify OTP'}
                        {step === 3 && 'Reset Password'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {step === 1 && 'Enter your email address and we will send you an OTP to reset your password.'}
                        {step === 2 && `Enter the 6-digit OTP sent to ${email}.`}
                        {step === 3 && 'Please enter and confirm your new password below.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <Form {...otpForm}>
                            <form onSubmit={otpForm.handleSubmit(onRequestOtp)} className="space-y-4">
                                <FormField
                                    control={otpForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    {...field}
                                                    disabled={isLoading}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Requesting OTP...' : 'Send OTP'}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {step === 2 && (
                        <Form {...verifyForm}>
                            <form onSubmit={verifyForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                                <FormField
                                    control={verifyForm.control}
                                    name="otp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>OTP Validation Code</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="Enter 6-digit OTP"
                                                    {...field}
                                                    disabled={isLoading}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {step === 3 && (
                        <Form {...resetForm}>
                            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                                <FormField
                                    control={resetForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        placeholder="Enter new password"
                                                        {...field}
                                                        disabled={isLoading}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        disabled={isLoading}
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={resetForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="Confirm new password"
                                                        {...field}
                                                        disabled={isLoading}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        disabled={isLoading}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Resetting Password...' : 'Reset Password'}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4">
                    <Link
                        href="/login"
                        className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
