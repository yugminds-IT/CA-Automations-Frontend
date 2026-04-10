"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage, SignUpPage } from "@/components/ui/sign-in";
import { useToast } from "@/components/ui/use-toast";
import {
  ApiError,
  getRoleFromResponse,
  getRoleFromUser,
  getUserData,
  isAuthenticated,
  login,
  signup,
} from "@/lib/api/index";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const blocked = sessionStorage.getItem("auth_blocked_reason");
      if (blocked) {
        sessionStorage.removeItem("auth_blocked_reason");
        toast({
          title: "Access restricted",
          description: blocked,
          variant: "destructive",
        });
      }
    } catch {
      /* ignore */
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const role = getRoleFromUser(getUserData());
    if (role != null && role.toUpperCase() === "MASTER_ADMIN") {
      router.replace("/master-admin");
      return;
    }
    if (role != null && role.toUpperCase() === "CLIENT") {
      router.replace("/uploads");
      return;
    }
    router.replace("/dashboard");
  }, [router]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({ email, password });
      const role = getRoleFromResponse(response);
      toast({
        title: "Success",
        description: "Logged in successfully.",
        variant: "success",
      });

      if (role != null && role.toUpperCase() === "MASTER_ADMIN") {
        router.push("/master-admin");
      } else if (role != null && role.toUpperCase() === "CLIENT") {
        router.push("/uploads");
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.detail || "Failed to login."
          : error instanceof Error
            ? error.message
            : "Failed to login.";
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      organization_name: String(formData.get("organization_name") ?? "").trim(),
      admin_email: String(formData.get("admin_email") ?? "").trim(),
      admin_password: String(formData.get("admin_password") ?? ""),
      admin_full_name: String(formData.get("admin_full_name") ?? "").trim(),
      admin_phone: String(formData.get("admin_phone") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
      pincode: String(formData.get("pincode") ?? "").trim(),
    };

    if (
      !payload.organization_name ||
      !payload.admin_email ||
      !payload.admin_password ||
      !payload.admin_full_name
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required signup fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await signup(payload);
      const apiMessage = (response as { message?: string })?.message;
      toast({
        title: "Pending approval",
        description:
          apiMessage ||
          "Your registration is pending master admin approval. You will receive an email and can sign in only after approval.",
        variant: "success",
      });
      setMode("signin");
      router.replace("/login");
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.detail || "Failed to create account."
          : error instanceof Error
            ? error.message
            : "Failed to create account.";
      toast({
        title: "Signup Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            router.push("/");
          }}
        >
          <img src="/landing-assets/lekvya-logo-new.png" alt="Lekvya" className="h-10 w-auto object-contain" />
        </a>

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setMode("signin")}
            disabled={isLoading}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            disabled={isLoading}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        <button onClick={() => router.push("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to home
        </button>
      </header>

      <div className="pt-16">
        {mode === "signin" ? (
          <SignInPage
            title={
              <span>
                Welcome <span className="text-gradient">back</span>
              </span>
            }
            description="Sign in to your Lekvya account and automate smarter."
            onSignIn={handleSignIn}
            onResetPassword={() => router.push("/forgot-password")}
            onCreateAccount={() => setMode("signup")}
          />
        ) : (
          <SignUpPage onSignUp={handleSignUp} onSignIn={() => setMode("signin")} />
        )}
      </div>
    </div>
  );
}
