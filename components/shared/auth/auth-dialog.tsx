"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	X,
	Mail,
	Lock,
	User,
	Eye,
	EyeOff,
	Loader2,
	Sparkles,
	ArrowRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/use-auth-store";
import { toast } from "@/stores/use-global-store";
import { SMOOTH_TWEEN } from "@/lib/constants/animations";
import { PasswordStrengthIndicator } from "./password-strength";
import {
	signInFormSchema,
	signUpFormSchema,
	SignInFormData,
	SignUpFormData,
} from "@/lib/schemas/auth";

interface AuthDialogProps {
	isOpen: boolean;
	onClose: () => void;
	defaultMode?: "signin" | "signup";
}

export function AuthDialog({
	isOpen,
	onClose,
	defaultMode = "signin",
}: AuthDialogProps) {
	const [mode, setMode] = React.useState<"signin" | "signup">(defaultMode);
	const { signIn, isLoading } = useAuthStore();
	const [showPassword, setShowPassword] = React.useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

	// Reset mode when dialog opens
	React.useEffect(() => {
		if (isOpen) {
			setMode(defaultMode);
			setShowPassword(false);
			setShowConfirmPassword(false);
		}
	}, [isOpen, defaultMode]);

	const handlePuterSignIn = async () => {
		const result = await signIn({ attempt_temp_user_creation: true });
		if (result?.user) {
			if (result.user.is_temp) {
				toast({
					title: "Temporary Account Created",
					description: `Welcome, ${result.user.username}! Your data will be saved temporarily. Sign up for a full account to keep it permanently.`,
					duration: 6000,
				});
			} else {
				toast({
					description: `Welcome back, ${result.user.username}!`,
				});
			}
			onClose();
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
						onClick={onClose}
					/>

					{/* Dialog */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={SMOOTH_TWEEN}
						className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border rounded-2xl shadow-xl z-50 overflow-hidden"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b">
							<div className="flex items-center gap-2">
								<div className="p-1.5 rounded-lg bg-primary/10">
									<Sparkles size={18} className="text-primary" />
								</div>
								<h2 className="font-semibold">
									{mode === "signin" ? "Welcome Back" : "Create Account"}
								</h2>
							</div>
							<Button variant="ghost" size="icon" onClick={onClose}>
								<X size={18} />
							</Button>
						</div>

						{/* Content */}
						<div className="p-4 space-y-4">
							{/* Puter Quick Sign In */}
							<Button
								onClick={handlePuterSignIn}
								disabled={isLoading}
								className="w-full gap-2"
								size="lg"
							>
								{isLoading ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<Sparkles size={18} />
								)}
								Continue with Puter
							</Button>

							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">
										Or
									</span>
								</div>
							</div>

							{/* Mode Toggle */}
							<div className="flex rounded-lg border p-1 bg-muted/30">
								<button
									onClick={() => setMode("signin")}
									className={cn(
										"flex-1 py-2 text-sm font-medium rounded-md transition-all",
										mode === "signin"
											? "bg-background shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									Sign In
								</button>
								<button
									onClick={() => setMode("signup")}
									className={cn(
										"flex-1 py-2 text-sm font-medium rounded-md transition-all",
										mode === "signup"
											? "bg-background shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									Sign Up
								</button>
							</div>

							{/* Forms */}
							<AnimatePresence mode="wait">
								{mode === "signin" ? (
									<SignInForm
										key="signin"
										onSuccess={onClose}
										showPassword={showPassword}
										setShowPassword={setShowPassword}
									/>
								) : (
									<SignUpForm
										key="signup"
										onSuccess={onClose}
										showPassword={showPassword}
										setShowPassword={setShowPassword}
										showConfirmPassword={showConfirmPassword}
										setShowConfirmPassword={setShowConfirmPassword}
									/>
								)}
							</AnimatePresence>
						</div>

						{/* Footer */}
						<div className="p-4 border-t bg-muted/30">
							<p className="text-xs text-center text-muted-foreground">
								By continuing, you agree to Puter&apos;s Terms of Service and
								Privacy Policy
							</p>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

// Sign In Form Component
function SignInForm({
	onSuccess,
	showPassword,
	setShowPassword,
}: {
	onSuccess: () => void;
	showPassword: boolean;
	setShowPassword: (show: boolean) => void;
}) {
	const { signIn, isLoading } = useAuthStore();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignInFormData>({
		resolver: zodResolver(signInFormSchema),
	});

	const onSubmit = async () => {
		// Puter handles auth via popup, so we just trigger signIn
		const result = await signIn({ attempt_temp_user_creation: false });
		if (result?.user) {
			toast({ description: `Welcome back, ${result.user.username}!` });
			onSuccess();
		}
	};

	return (
		<motion.form
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 20 }}
			transition={{ duration: 0.2 }}
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-3"
		>
			{/* Email */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Email (optional)</label>
				<div className="relative">
					<Mail
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("email")}
						type="email"
						placeholder="you@example.com"
						className="pl-9"
					/>
				</div>
				{errors.email && (
					<p className="text-xs text-destructive">{errors.email.message}</p>
				)}
			</div>

			{/* Password */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Password (optional)</label>
				<div className="relative">
					<Lock
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("password")}
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						className="pl-9 pr-9"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				</div>
				{errors.password && (
					<p className="text-xs text-destructive">{errors.password.message}</p>
				)}
			</div>

			<Button type="submit" disabled={isLoading} className="w-full gap-2">
				{isLoading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					<>
						Sign In
						<ArrowRight size={16} />
					</>
				)}
			</Button>
		</motion.form>
	);
}

// Sign Up Form Component
function SignUpForm({
	onSuccess,
	showPassword,
	setShowPassword,
	showConfirmPassword,
	setShowConfirmPassword,
}: {
	onSuccess: () => void;
	showPassword: boolean;
	setShowPassword: (show: boolean) => void;
	showConfirmPassword: boolean;
	setShowConfirmPassword: (show: boolean) => void;
}) {
	const { signIn, isLoading } = useAuthStore();

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<SignUpFormData>({
		resolver: zodResolver(signUpFormSchema),
	});

	const password = watch("password", "");

	const onSubmit = async () => {
		// Puter handles registration via popup
		const result = await signIn({ attempt_temp_user_creation: true });
		if (result?.user) {
			if (result.user.is_temp) {
				toast({
					title: "Temporary Account Created",
					description: `Welcome, ${result.user.username}! Your data will be saved temporarily. Sign up for a full account to keep it permanently.`,
					duration: 6000,
				});
			} else {
				toast({
					description: `Account created! Welcome, ${result.user.username}!`,
				});
			}
			onSuccess();
		}
	};

	return (
		<motion.form
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.2 }}
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-3"
		>
			{/* Username */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Username</label>
				<div className="relative">
					<User
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("username")}
						placeholder="johndoe"
						className="pl-9"
					/>
				</div>
				{errors.username && (
					<p className="text-xs text-destructive">{errors.username.message}</p>
				)}
			</div>

			{/* Email */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Email</label>
				<div className="relative">
					<Mail
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("email")}
						type="email"
						placeholder="you@example.com"
						className="pl-9"
					/>
				</div>
				{errors.email && (
					<p className="text-xs text-destructive">{errors.email.message}</p>
				)}
			</div>

			{/* Password */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Password</label>
				<div className="relative">
					<Lock
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("password")}
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						className="pl-9 pr-9"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				</div>
				{errors.password && (
					<p className="text-xs text-destructive">{errors.password.message}</p>
				)}
				<PasswordStrengthIndicator password={password} />
			</div>

			{/* Confirm Password */}
			<div className="space-y-1.5">
				<label className="text-sm font-medium">Confirm Password</label>
				<div className="relative">
					<Lock
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						{...register("confirmPassword")}
						type={showConfirmPassword ? "text" : "password"}
						placeholder="••••••••"
						className="pl-9 pr-9"
					/>
					<button
						type="button"
						onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				</div>
				{errors.confirmPassword && (
					<p className="text-xs text-destructive">
						{errors.confirmPassword.message}
					</p>
				)}
			</div>

			<Button type="submit" disabled={isLoading} className="w-full gap-2">
				{isLoading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					<>
						Create Account
						<ArrowRight size={16} />
					</>
				)}
			</Button>
		</motion.form>
	);
}
