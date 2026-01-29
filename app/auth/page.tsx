"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
	Sparkles,
	ArrowLeft,
	Shield,
	Zap,
	Cloud,
	CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";
import { toast } from "@/stores/use-global-store";
import { TransitionLink } from "@/components/shared/transition-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ProfileButton } from "@/components/shared/auth";

const features = [
	{
		icon: Shield,
		title: "Secure Authentication",
		description: "Your data is protected with Puter's secure auth system",
	},
	{
		icon: Zap,
		title: "Instant Access",
		description: "Quick sign-in with temporary accounts for immediate use",
	},
	{
		icon: Cloud,
		title: "Cloud Sync",
		description: "Access your data from anywhere with cloud storage",
	},
];

export default function AuthPage() {
	const router = useRouter();
	const { user, isSignedIn, isLoading, signIn, initialize } = useAuthStore();

	React.useEffect(() => {
		initialize();
	}, [initialize]);

	const handleSignIn = async () => {
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
			// Redirect to home after successful sign-in
			router.push("/");
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="flex items-center justify-between p-4 border-b">
				<TransitionLink href="/">
					<Button variant="ghost" size="sm" className="gap-2">
						<ArrowLeft size={16} />
						Back
					</Button>
				</TransitionLink>
				<div className="flex items-center gap-2">
					<ProfileButton />
					<ThemeToggle />
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 flex items-center justify-center p-4">
				<div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
					{/* Left: Info */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						className="space-y-6"
					>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-primary/10">
									<Sparkles size={24} className="text-primary" />
								</div>
								<h1 className="text-2xl font-bold">Synapse</h1>
							</div>
							<p className="text-muted-foreground">
								Sign in to unlock the full potential of AI-powered tools
							</p>
						</div>

						<div className="space-y-4">
							{features.map((feature, index) => (
								<motion.div
									key={feature.title}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.1 }}
									className="flex items-start gap-3"
								>
									<div className="p-2 rounded-lg bg-muted">
										<feature.icon size={18} className="text-primary" />
									</div>
									<div>
										<h3 className="font-medium">{feature.title}</h3>
										<p className="text-sm text-muted-foreground">
											{feature.description}
										</p>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>

					{/* Right: Auth Card */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						className="bg-card border rounded-2xl p-6 shadow-lg"
					>
						{isSignedIn ? (
							<div className="space-y-4 text-center">
								<div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
									<CheckCircle size={32} className="text-green-500" />
								</div>
								<div>
									<h2 className="text-xl font-semibold">
										You&apos;re signed in!
									</h2>
									<p className="text-muted-foreground mt-1">
										Welcome back, {user?.username}
									</p>
									{user?.is_temp && (
										<p className="text-xs text-orange-500 mt-2">
											You&apos;re using a temporary account. Convert to a full
											account to save your data permanently.
										</p>
									)}
								</div>
								<div className="pt-4 space-y-2">
									<TransitionLink href="/" className="block">
										<Button className="w-full">Go to Dashboard</Button>
									</TransitionLink>
									<TransitionLink href="/chat" className="block">
										<Button variant="outline" className="w-full">
											Start Chatting
										</Button>
									</TransitionLink>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div className="text-center">
									<h2 className="text-xl font-semibold">Get Started</h2>
									<p className="text-sm text-muted-foreground mt-1">
										Sign in with your Puter account or create a new one
									</p>
								</div>

								<Button
									onClick={handleSignIn}
									disabled={isLoading}
									className="w-full gap-2"
									size="lg"
								>
									<Sparkles size={18} />
									{isLoading ? "Signing in..." : "Continue with Puter"}
								</Button>

								<p className="text-xs text-center text-muted-foreground">
									Don&apos;t have an account? A temporary account will be
									created automatically for instant access.
								</p>

								<div className="pt-4 border-t">
									<p className="text-xs text-center text-muted-foreground">
										By continuing, you agree to Puter&apos;s{" "}
										<a
											href="https://puter.com/terms"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Terms of Service
										</a>{" "}
										and{" "}
										<a
											href="https://puter.com/privacy"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Privacy Policy
										</a>
									</p>
								</div>
							</div>
						)}
					</motion.div>
				</div>
			</main>
		</div>
	);
}
