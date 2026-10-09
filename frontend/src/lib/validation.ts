import { redirect } from "@tanstack/react-router"
import { z } from "zod"

import { isLoggedIn } from "@/lib/auth"

export const emailSchema = z.email({ message: "Invalid email address" })

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })

export const confirmPasswordSchema = z
  .string()
  .min(1, { message: "Password confirmation is required" })

export async function requireGuest() {
  if (isLoggedIn()) {
    throw redirect({ to: "/" })
  }
}

export async function requireAuth() {
  if (!isLoggedIn()) {
    throw redirect({ to: "/login" })
  }
}
