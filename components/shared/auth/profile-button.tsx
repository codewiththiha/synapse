"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	User,
	LogOut,
	LogIn,
	ChevronDown,
	Loader2,
	UserCircle,
	Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/use-auth-store";
import { toast } from "@/stores/use-global-store";
import { SMOOTH_TWEEN } from "@/lib/constants/animations";

interface ProfileButtonProps {
	className?: string;
	onAuthClick?: () => void;
}

export function ProfileButton({ className, onAuthClick }: ProfileButtonProps) {
	const { user, isSignedIn, isLoading, signIn, signOut, initialize } =
		useAuthStore();
	const [isOpen, setIsOpen] = React.useState(false);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	// Initialize auth on mount
	React.useEffect(() => {
		initialize();
	}, [initialize]);

	// Close dropdown on outside click
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSignIn = async () => {
		setIsOpen(false);
		if (onAuthClick) {
			onAuthClick();
		} else {
			// Direct Puter sign-in with temp user creation
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
			}
		}
	};

	const handleSignOut = async () => {
		setIsOpen(false);
		await signOut();
		toast({ description: "Signed out successfully" });
	};

	if (isLoading) {
		return (
			<Button variant="outline" size="sm" disabled className={className}>
				<Loader2 size={14} className="animate-spin" />
			</Button>
		);
	}

	if (!isSignedIn) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={handleSignIn}
				className={cn("gap-1.5", className)}
			>
				<LogIn size={14} />
				<span className="hidden sm:inline">Sign In</span>
			</Button>
		);
	}

	return (
		<div ref={dropdownRef} className={cn("relative", className)}>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(!isOpen)}
				className="gap-1.5"
			>
				<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
					<User size={12} className="text-primary" />
				</div>
				<span className="hidden sm:inline max-w-[100px] truncate">
					{user?.username || "User"}
				</span>
				<ChevronDown
					size={12}
					className={cn("transition-transform", isOpen && "rotate-180")}
				/>
			</Button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.95 }}
						transition={SMOOTH_TWEEN}
						className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover shadow-lg z-50"
					>
						{/* User Info */}
						<div className="p-3 border-b">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
									<UserCircle size={24} className="text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">
										{user?.username || "User"}
									</p>
									{user?.email && (
										<p className="text-xs text-muted-foreground truncate">
											{user.email}
										</p>
									)}
									{user?.is_temp && (
										<div className="flex items-center gap-1 mt-1">
											<Clock size={10} className="text-orange-500" />
											<span className="text-[10px] text-orange-500">
												Temporary Account
											</span>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="p-1">
							<button
								onClick={handleSignOut}
								className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-destructive"
							>
								<LogOut size={14} />
								Sign Out
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
