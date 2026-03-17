import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vault-500 mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">SV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">StagerVault</h1>
          <p className="text-sm text-gray-500 mt-1">Warehouse management for stagers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-vault-600 font-medium hover:underline">
              Contact your warehouse admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
