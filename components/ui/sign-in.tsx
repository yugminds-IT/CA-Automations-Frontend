"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

interface SignUpPageProps {
  onSignUp?: (event: React.FormEvent<HTMLFormElement>) => void;
  onSignIn?: () => void;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm transition-all duration-300 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 hover:border-slate-300">
    {children}
  </div>
);

export const SignInPage: React.FC<SignInPageProps> = ({
  title = (
    <span className="font-medium tracking-tight text-slate-800">
      Welcome <span className="text-orange-500 font-bold">back</span>
    </span>
  ),
  description = "Access your account and continue your journey with us.",
  onSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center w-full p-4 md:p-8">
      <section className="flex items-center justify-center w-full relative z-10">
        <div className="w-full max-w-[440px] bg-white border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),0_0_20px_rgba(0,0,0,0.02)] rounded-[32px] p-8 md:p-10 relative overflow-hidden">
          <div className="flex flex-col gap-7 relative z-10">
            <div className="text-center">
              <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl font-semibold leading-tight text-slate-900">
                {title}
              </h1>
              <p className="animate-element animate-delay-200 text-slate-500 mt-2 text-[15px]">
                {description}
              </p>
            </div>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Email Address
                </label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none"
                    required
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Password
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 pr-12 rounded-2xl focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-slate-400 hover:text-orange-500 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-slate-400 hover:text-orange-500 transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="rounded-md border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-600 font-medium">Keep me signed in</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onResetPassword?.();
                  }}
                  className="hover:underline text-orange-500 font-semibold transition-colors"
                >
                  Reset password
                </a>
              </div>

              <button
                type="submit"
                className="animate-element animate-delay-600 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 py-4 font-bold text-white shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_25px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign In
              </button>
            </form>

            <p className="animate-element animate-delay-900 text-center text-[15px] text-slate-500 pt-2">
              New to our platform?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onCreateAccount?.();
                }}
                className="text-primary hover:underline transition-colors font-medium"
              >
                Create Account
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp, onSignIn }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center w-full p-4 md:p-8">
      <section className="flex items-center justify-center w-full relative z-10">
        <div className="w-full max-w-[1000px] bg-white border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),0_0_20px_rgba(0,0,0,0.02)] rounded-[32px] p-6 md:p-10 relative overflow-hidden">
          <div className="flex flex-col gap-6 relative z-10">
            <div className="text-center">
              <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl font-semibold leading-tight text-slate-900">
                Get <span className="text-orange-500 font-bold">started</span>
              </h1>
              <p className="animate-element animate-delay-200 text-slate-500 mt-2 text-[15px]">
                Create your free Lekvya account today. No credit card required.
              </p>
            </div>

            <form className="space-y-6" onSubmit={onSignUp}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="animate-element animate-delay-200">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Full Name
                  </label>
                  <GlassInputWrapper>
                    <input name="admin_full_name" type="text" placeholder="Vinayak" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-300">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Email ID
                  </label>
                  <GlassInputWrapper>
                    <input name="admin_email" type="email" placeholder="vinayak@example.com" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-400">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Phone No
                  </label>
                  <GlassInputWrapper>
                    <input name="admin_phone" type="tel" placeholder="+91 00000 00000" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>

                <div className="animate-element animate-delay-300">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Organisation Name
                  </label>
                  <GlassInputWrapper>
                    <input name="organization_name" type="text" placeholder="NewAge and Co." className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-400">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Country
                  </label>
                  <GlassInputWrapper>
                    <input name="country" type="text" placeholder="India" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-500">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    State
                  </label>
                  <GlassInputWrapper>
                    <input name="state" type="text" placeholder="Telangana" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>

                <div className="animate-element animate-delay-500">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    City
                  </label>
                  <GlassInputWrapper>
                    <input name="city" type="text" placeholder="Hyderabad" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-600">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Pin Code
                  </label>
                  <GlassInputWrapper>
                    <input name="pincode" type="text" placeholder="500001" className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 rounded-2xl focus:outline-none" required />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-700">
                  <label className="text-[13px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Password
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        name="admin_password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder:text-slate-400 p-4 pr-12 rounded-2xl focus:outline-none"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-slate-400 hover:text-orange-500 transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-slate-400 hover:text-orange-500 transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              </div>

              <div className="animate-element animate-delay-700">
                <label className="flex items-start gap-3 cursor-pointer text-sm">
                  <input type="checkbox" name="terms" className="rounded mt-0.5" required />
                  <span className="text-slate-600 font-medium">
                    I agree to the Terms of Service and Privacy Policy
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="animate-element animate-delay-800 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 py-4 font-bold text-white shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_25px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Create Account
              </button>
            </form>

            <p className="animate-element animate-delay-900 text-center text-[15px] text-slate-500 pt-2">
              Already have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSignIn?.();
                }}
                className="text-orange-500 hover:underline transition-colors font-semibold"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
