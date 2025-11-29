/**
 * Example Usage Patterns for API Integration
 * 
 * This file shows how to use the API functions in your Next.js components
 * Delete this file or use it as reference
 */

// ============================================
// Example 1: Basic Signup
// ============================================
/*
import { signup } from '@/api';

async function handleSignup() {
  try {
    const response = await signup({
      organization_name: 'ABC Chartered Accountants',
      admin_email: 'admin@abcca.com',
      admin_password: 'SecurePass123',
      admin_full_name: 'John Doe',
      admin_phone: '+1234567890',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
    });
    
    console.log('Organization created:', response.organization);
    console.log('Admin user:', response.admin);
  } catch (error) {
    console.error('Signup failed:', error);
  }
}
*/

// ============================================
// Example 2: Login with React Hook
// ============================================
/*
'use client';

import { useLogin } from '@/api';
import { useState } from 'react';

export function LoginForm() {
  const { execute: login, loading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await login({
        username: email,
        password: password,
      });
      
      // Tokens are automatically stored
      console.log('Logged in:', response.user);
      console.log('Organization:', response.organization);
      
      // Redirect or update UI
      router.push('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
*/

// ============================================
// Example 3: Using in Server Component
// ============================================
/*
import { healthCheck } from '@/api';

export default async function HealthPage() {
  try {
    const health = await healthCheck();
    return <div>API Status: {health.status}</div>;
  } catch (error) {
    return <div>API is down</div>;
  }
}
*/

// ============================================
// Example 4: Protected Route Check
// ============================================
/*
'use client';

import { useAuth, isAuthenticated } from '@/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
    }
  }, [authenticated, router]);

  if (!authenticated) {
    return <div>Redirecting to login...</div>;
  }

  return <>{children}</>;
}
*/

// ============================================
// Example 5: Create Employee (Admin only)
// ============================================
/*
'use client';

import { useCreateUser } from '@/api';
import { useState } from 'react';

export function CreateEmployeeForm({ orgId }: { orgId: number }) {
  const { execute: createUser, loading, error } = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const newUser = await createUser({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        full_name: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
        org_id: orgId,
      });
      
      console.log('Employee created:', newUser);
      alert('Employee created successfully!');
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="full_name" type="text" />
      <input name="phone" type="tel" />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Employee'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
*/

// ============================================
// Example 6: Error Handling
// ============================================
/*
import { login, ApiError } from '@/api';

async function handleLogin(email: string, password: string) {
  try {
    const response = await login({ username: email, password });
    return { success: true, data: response };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { success: false, error: 'Invalid credentials' };
      }
      return { success: false, error: error.detail };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
*/

