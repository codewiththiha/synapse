/**
 * Auth Validation Schemas
 * Zod schemas for authentication forms
 */

import { z } from "zod";

// ============================================
// Password Validation Patterns
// ============================================

export const patterns = {
	zeroTo9999: /^(|0|0\.\d{0,2}|[1-9]\d{0,3}(\.\d{0,2})?)$/,
	email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
	minimumOneUpperCaseLetter: /[A-Z]/,
	minimumOneLowerCaseLetter: /[a-z]/,
	minimumOneDigit: /[0-9]/,
	minimumOneSpecialCharacter: /[@$!%*#?&]/,
	minEightCharacters: /^.{8,}$/,
};

// ============================================
// Helper Schema
// ============================================

export const regexSchema = (pattern: RegExp, message?: string) =>
	z.string().regex(pattern, message);

// ============================================
// Auth Schemas
// ============================================

/** Email validation */
export const emailSchema = z
	.string()
	.min(1, "Email is required")
	.regex(patterns.email, "Please enter a valid email address");

/** Password validation with strength requirements */
export const passwordSchema = z
	.string()
	.min(1, "Password is required")
	.regex(patterns.minEightCharacters, "Password must be at least 8 characters")
	.regex(
		patterns.minimumOneUpperCaseLetter,
		"Password must contain at least one uppercase letter",
	)
	.regex(
		patterns.minimumOneLowerCaseLetter,
		"Password must contain at least one lowercase letter",
	)
	.regex(patterns.minimumOneDigit, "Password must contain at least one number")
	.regex(
		patterns.minimumOneSpecialCharacter,
		"Password must contain at least one special character (@$!%*#?&)",
	);

/** Simple password for sign-in (no strength validation) */
export const signInPasswordSchema = z.string().min(1, "Password is required");

/** Username validation */
export const usernameSchema = z
	.string()
	.min(3, "Username must be at least 3 characters")
	.max(30, "Username must be less than 30 characters")
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		"Username can only contain letters, numbers, underscores, and hyphens",
	);

// ============================================
// Form Schemas
// ============================================

/** Sign In Form Schema */
export const signInFormSchema = z.object({
	email: emailSchema.optional(),
	password: signInPasswordSchema.optional(),
});

/** Sign Up Form Schema */
export const signUpFormSchema = z
	.object({
		username: usernameSchema,
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

// ============================================
// Types
// ============================================

export type SignInFormData = z.infer<typeof signInFormSchema>;
export type SignUpFormData = z.infer<typeof signUpFormSchema>;

/** Password strength indicator */
export type PasswordStrength = {
	score: number; // 0-5
	label: "weak" | "fair" | "good" | "strong" | "excellent";
	checks: {
		length: boolean;
		uppercase: boolean;
		lowercase: boolean;
		digit: boolean;
		special: boolean;
	};
};

/** Calculate password strength */
export function calculatePasswordStrength(password: string): PasswordStrength {
	const checks = {
		length: patterns.minEightCharacters.test(password),
		uppercase: patterns.minimumOneUpperCaseLetter.test(password),
		lowercase: patterns.minimumOneLowerCaseLetter.test(password),
		digit: patterns.minimumOneDigit.test(password),
		special: patterns.minimumOneSpecialCharacter.test(password),
	};

	const score = Object.values(checks).filter(Boolean).length;

	const labels: PasswordStrength["label"][] = [
		"weak",
		"weak",
		"fair",
		"good",
		"strong",
		"excellent",
	];

	return {
		score,
		label: labels[score],
		checks,
	};
}
