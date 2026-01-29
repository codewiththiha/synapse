"use client";

/**
 * App Shell (Copilot-inspired Layout)
 *
 * Main layout wrapper with:
 * - Collapsible sidebar with navigation (overlay on mobile)
 * - Sidebar toggle inside sidebar
 * - Action buttons (New Chat, Organize) in sidebar header
 * - Config button passed to children (shown in main content header)
 * - Content area
 * - Settings panel integration
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
	MessageSquare,
	Volume2,
	Layers,
	Calendar,
	Settings,
	PanelLeftClose,
	PanelLeft,
	User,
	LogOut,
	Moon,
	Sun,
	Cloud,
	HardDrive,
	Plus,
	FolderSync,
	Sparkles,
	Menu,
	X,
	Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/use-auth-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useMobile } from "@/hooks/use-mobile";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsPanel } from "@/components/shared/settings-panel";
import { toast as sonnerToast } from "sonner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { SMOOTH_TWEEN } from "@/lib/constants/animations";

interface NavItem {
	id: string;
	label: string;
	icon: React.ElementType;
	href: string;
	badge?: string;
}

const navItems: NavItem[] = [
	{ id: "home", label: "Home", icon: Home, href: "/" },
	{ id: "chat", label: "Chat", icon: MessageSquare, href: "/chat" },
	{ id: "tts", label: "TTS", icon: Volume2, href: "/tts" },
	{ id: "cards", label: "Cards", icon: Layers, href: "/cards" },
	{ id: "planner", label: "Planner", icon: Calendar, href: "/planner" },
];

interface AppShellProps {
	children: React.ReactNode;
	sidebarContent?: React.ReactNode;
	defaultExpanded?: boolean;
	// Action callbacks
	onNewChat?: () => void;
	onOrganize?: () => void;
	isOrganizing?: boolean;
	// For "nothing to organize" check
	hasItemsToOrganize?: boolean;
	// Mobile header controls - left side (next to menu button)
	mobileHeaderLeft?: React.ReactNode;
	// Mobile header controls - right side
	mobileHeaderRight?: React.ReactNode;
}

export function AppShell({
	children,
	sidebarContent,
	defaultExpanded = true,
	onNewChat,
	onOrganize,
	isOrganizing,
	hasItemsToOrganize = true,
	mobileHeaderLeft,
	mobileHeaderRight,
}: AppShellProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { user, isSignedIn, signOut } = useAuthStore();
	const { settings } = useSettingsStore();
	const isMobile = useMobile();

	const [expanded, setExpanded] = React.useState(defaultExpanded);
	const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
	const [showSettings, setShowSettings] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Close mobile menu on route change
	React.useEffect(() => {
		setMobileMenuOpen(false);
	}, [pathname]);

	// Handle organize with toast for "nothing to organize"
	const handleOrganize = React.useCallback(() => {
		if (!hasItemsToOrganize) {
			sonnerToast.info("Nothing to organize");
			return;
		}
		onOrganize?.();
	}, [hasItemsToOrganize, onOrganize]);

	const activeRoute = React.useMemo(() => {
		// Check exact match for home first
		if (pathname === "/") return "home";
		// Then check other routes
		const found = navItems.find(
			(item) => item.id !== "home" && pathname.startsWith(item.href),
		);
		return found?.id || "home";
	}, [pathname]);

	// Get route type for settings panel
	const routeType = pathname.startsWith("/chat")
		? "chat"
		: pathname.startsWith("/tts")
			? "tts"
			: pathname.startsWith("/cards")
				? "cards"
				: pathname.startsWith("/planner")
					? "planner"
					: "home";

	const handleNavClick = (href: string) => {
		router.push(href);
		if (isMobile) setMobileMenuOpen(false);
	};

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	// Check if we're on a chat-related page (chat or tts)
	const isChatPage =
		pathname.startsWith("/chat") || pathname.startsWith("/tts");

	// Mobile Layout
	if (isMobile) {
		return (
			<div className="flex flex-col h-dvh bg-background overflow-hidden">
				{/* Mobile Header */}
				<header className="h-12 flex items-center justify-between px-3 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-sm z-30">
					{/* Left side: menu + custom left content */}
					<div className="flex items-center gap-1">
						<button
							onClick={() => setMobileMenuOpen(true)}
							className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
						>
							<Menu size={20} />
						</button>
						{mobileHeaderLeft}
					</div>

					{/* Right side: custom right content or default */}
					<div className="flex items-center gap-1">
						{mobileHeaderRight
							? mobileHeaderRight
							: isChatPage &&
								onNewChat && (
									<button
										onClick={onNewChat}
										className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
									>
										<Plus size={20} />
									</button>
								)}
					</div>
				</header>

				{/* Mobile Sidebar Overlay */}
				<AnimatePresence>
					{mobileMenuOpen && (
						<>
							{/* Backdrop */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setMobileMenuOpen(false)}
								className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
							/>

							{/* Sidebar Drawer */}
							<motion.aside
								initial={{ x: "-100%" }}
								animate={{ x: 0 }}
								exit={{ x: "-100%" }}
								transition={SMOOTH_TWEEN}
								className="fixed inset-y-0 left-0 w-[280px] bg-background border-r border-border/50 z-50 flex flex-col"
							>
								{/* Drawer Header */}
								<div className="h-14 flex items-center justify-between px-4 border-b border-border/50">
									<span className="font-semibold">Puter Chat</span>
									<div className="flex items-center gap-1">
										{isChatPage && onOrganize && (
											<button
												onClick={handleOrganize}
												disabled={isOrganizing}
												className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50"
											>
												{isOrganizing ? (
													<motion.div
														animate={{ rotate: 360 }}
														transition={{
															duration: 1,
															repeat: Infinity,
															ease: "linear",
														}}
													>
														<Sparkles size={18} />
													</motion.div>
												) : (
													<FolderSync size={18} />
												)}
											</button>
										)}
										<button
											onClick={() => setMobileMenuOpen(false)}
											className="p-2 -mr-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
										>
											<X size={20} />
										</button>
									</div>
								</div>

								{/* Navigation */}
								<nav className="py-2 px-3">
									<div className="space-y-1">
										{navItems.map((item) => {
											const Icon = item.icon;
											const isActive = activeRoute === item.id;

											return (
												<button
													key={item.id}
													onClick={() => handleNavClick(item.href)}
													className={cn(
														"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
														isActive
															? "bg-primary/10 text-primary"
															: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
													)}
												>
													<Icon size={20} />
													<span className="font-medium">{item.label}</span>
												</button>
											);
										})}
									</div>
								</nav>

								{/* Sidebar Content */}
								{sidebarContent && (
									<div className="flex-1 overflow-y-auto px-3">
										{sidebarContent}
									</div>
								)}

								{/* Bottom Section */}
								<div className="border-t border-border/50 p-3 mt-auto">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
												<div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
													{isSignedIn && user?.username ? (
														<span className="text-sm font-medium text-primary">
															{user.username.charAt(0).toUpperCase()}
														</span>
													) : (
														<User size={16} className="text-primary" />
													)}
												</div>
												<div className="flex-1 text-left">
													<div className="text-sm font-medium">
														{isSignedIn ? user?.username || "User" : "Guest"}
													</div>
													<div className="text-xs text-muted-foreground">
														{settings.storageMode === "puter"
															? "Cloud"
															: "Local"}
													</div>
												</div>
											</button>
										</DropdownMenuTrigger>

										<DropdownMenuContent
											align="start"
											side="top"
											sideOffset={8}
											collisionPadding={16}
											className="w-64 rounded-2xl p-2 shadow-2xl border-border/50 animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
										>
											{isSignedIn && (
												<>
													<div className="px-3 py-3 mb-1">
														<div className="text-base font-semibold">
															{user?.username}
														</div>
														{user?.email && (
															<div className="text-sm text-muted-foreground mt-0.5">
																{user.email}
															</div>
														)}
													</div>
													<DropdownMenuSeparator className="my-2" />
												</>
											)}

											<DropdownMenuItem
												onClick={() => setShowSettings(true)}
												className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
											>
												<Settings size={18} className="mr-3" />
												Settings
											</DropdownMenuItem>

											{mounted && (
												<DropdownMenuItem
													onClick={() =>
														setTheme(theme === "dark" ? "light" : "dark")
													}
													className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
												>
													{theme === "dark" ? (
														<Sun size={18} className="mr-3" />
													) : (
														<Moon size={18} className="mr-3" />
													)}
													{theme === "dark" ? "Light Mode" : "Dark Mode"}
												</DropdownMenuItem>
											)}

											<DropdownMenuItem
												disabled
												className="px-3 py-2.5 rounded-xl text-sm"
											>
												{settings.storageMode === "puter" ? (
													<Cloud size={18} className="mr-3" />
												) : (
													<HardDrive size={18} className="mr-3" />
												)}
												{settings.storageMode === "puter"
													? "Cloud Storage"
													: "Local Storage"}
											</DropdownMenuItem>

											<DropdownMenuSeparator className="my-2" />

											{isSignedIn ? (
												<DropdownMenuItem
													onClick={handleSignOut}
													className="px-3 py-2.5 rounded-xl text-sm text-destructive cursor-pointer focus:text-destructive"
												>
													<LogOut size={18} className="mr-3" />
													Sign Out
												</DropdownMenuItem>
											) : (
												<DropdownMenuItem
													onClick={() => router.push("/auth")}
													className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
												>
													<User size={18} className="mr-3" />
													Sign In
												</DropdownMenuItem>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</motion.aside>
						</>
					)}
				</AnimatePresence>

				{/* Main Content */}
				<main className="flex-1 flex flex-col min-h-0 overflow-hidden">
					{children}
				</main>

				{/* Settings Panel */}
				<SettingsPanel
					isOpen={showSettings}
					onClose={() => setShowSettings(false)}
					routeType={routeType}
				/>
			</div>
		);
	}

	// Desktop Layout
	return (
		<div className="flex h-screen bg-background overflow-hidden">
			{/* Sidebar */}
			<LayoutGroup>
				<motion.aside
					initial={false}
					animate={{ width: expanded ? 260 : 64 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
					className={cn(
						"h-full flex flex-col shrink-0",
						"bg-muted/30 backdrop-blur-sm",
						"border-r border-border/50",
						"relative z-20",
					)}
				>
					{/* Header with Logo + Toggle + Actions */}
					<div
						className={cn(
							"h-14 flex items-center gap-2 border-b border-border/50 shrink-0",
							expanded ? "px-3" : "px-2 justify-center",
						)}
					>
						{expanded ? (
							<>
								{/* Sidebar Toggle */}
								<Tooltip>
									<TooltipTrigger asChild>
										<motion.button
											layoutId="sidebar-toggle"
											onClick={() => setExpanded(false)}
											className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
											transition={SMOOTH_TWEEN}
										>
											<motion.div layoutId="sidebar-toggle-icon">
												<PanelLeftClose size={18} />
											</motion.div>
										</motion.button>
									</TooltipTrigger>
									<TooltipContent side="bottom">Collapse</TooltipContent>
								</Tooltip>

								{/* Logo */}
								<motion.span
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.15 }}
									className="font-semibold text-base flex-1"
								>
									Puter Chat
								</motion.span>

								{/* Action Icons */}
								{isChatPage && (
									<div className="flex items-center">
										{onOrganize && (
											<Tooltip>
												<TooltipTrigger asChild>
													<motion.button
														layoutId="action-organize"
														onClick={handleOrganize}
														disabled={isOrganizing}
														className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50"
														transition={SMOOTH_TWEEN}
													>
														{isOrganizing ? (
															<motion.div
																animate={{ rotate: 360 }}
																transition={{
																	duration: 1,
																	repeat: Infinity,
																	ease: "linear",
																}}
															>
																<Sparkles size={18} />
															</motion.div>
														) : (
															<motion.div layoutId="icon-organize">
																<FolderSync size={18} />
															</motion.div>
														)}
													</motion.button>
												</TooltipTrigger>
												<TooltipContent side="bottom">
													{isOrganizing ? "Organizing..." : "Organize"}
												</TooltipContent>
											</Tooltip>
										)}
										{onNewChat && (
											<Tooltip>
												<TooltipTrigger asChild>
													<motion.button
														layoutId="action-new-chat"
														onClick={onNewChat}
														className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
														transition={SMOOTH_TWEEN}
													>
														<motion.div layoutId="icon-new-chat">
															<Plus size={18} />
														</motion.div>
													</motion.button>
												</TooltipTrigger>
												<TooltipContent side="bottom">New Chat</TooltipContent>
											</Tooltip>
										)}
									</div>
								)}
							</>
						) : (
							/* Collapsed: Toggle button + Logo icon */
							<div className="flex flex-col items-center gap-1">
								<Tooltip>
									<TooltipTrigger asChild>
										<motion.button
											layoutId="sidebar-toggle"
											onClick={() => setExpanded(true)}
											className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
											transition={SMOOTH_TWEEN}
										>
											<motion.div layoutId="sidebar-toggle-icon">
												<PanelLeft size={20} />
											</motion.div>
										</motion.button>
									</TooltipTrigger>
									<TooltipContent side="right">Expand</TooltipContent>
								</Tooltip>
							</div>
						)}
					</div>

					{/* Collapsed Action Icons */}
					{!expanded && isChatPage && (
						<div className="flex flex-col items-center py-2 -space-y-2">
							{onNewChat && (
								<Tooltip>
									<TooltipTrigger asChild>
										<motion.button
											layoutId="action-new-chat"
											onClick={onNewChat}
											className="p-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
											transition={SMOOTH_TWEEN}
										>
											<motion.div layoutId="icon-new-chat">
												<Plus size={20} />
											</motion.div>
										</motion.button>
									</TooltipTrigger>
									<TooltipContent side="right">New Chat</TooltipContent>
								</Tooltip>
							)}
							{onOrganize && (
								<Tooltip>
									<TooltipTrigger asChild>
										<motion.button
											layoutId="action-organize"
											onClick={handleOrganize}
											disabled={isOrganizing}
											className="p-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50"
											transition={SMOOTH_TWEEN}
										>
											{isOrganizing ? (
												<motion.div
													animate={{ rotate: 360 }}
													transition={{
														duration: 1,
														repeat: Infinity,
														ease: "linear",
													}}
												>
													<Sparkles size={20} />
												</motion.div>
											) : (
												<motion.div layoutId="icon-organize">
													<FolderSync size={20} />
												</motion.div>
											)}
										</motion.button>
									</TooltipTrigger>
									<TooltipContent side="right">
										{isOrganizing ? "Organizing..." : "Organize"}
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					)}

					{/* Navigation */}
					<nav className="py-2">
						<div className={cn("-space-y-2", expanded ? "px-3" : "px-2")}>
							{navItems.map((item) => {
								const Icon = item.icon;
								const isActive = activeRoute === item.id;

								return (
									<motion.button
										key={item.id}
										layoutId={`nav-${item.id}`}
										onClick={() => handleNavClick(item.href)}
										className={cn(
											"w-full flex items-center gap-3 rounded-xl transition-colors",
											expanded ? "px-3 py-2.5" : "p-3 justify-center",
											isActive
												? "bg-primary/10 text-primary"
												: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
										)}
										transition={SMOOTH_TWEEN}
									>
										<motion.div layoutId={`nav-icon-${item.id}`}>
											<Icon size={20} />
										</motion.div>
										{expanded && (
											<motion.span
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: -10 }}
												transition={{ duration: 0.15 }}
												className="font-medium"
											>
												{item.label}
											</motion.span>
										)}
										{expanded && item.badge && (
											<span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
												{item.badge}
											</span>
										)}
									</motion.button>
								);
							})}
						</div>
					</nav>

					{/* Sidebar Content (Conversations, etc.) */}
					{expanded && sidebarContent && (
						<div className="flex-1 overflow-y-auto px-3">{sidebarContent}</div>
					)}

					{/* Spacer when collapsed */}
					{!expanded && <div className="flex-1" />}

					{/* Bottom Section - Account & Settings */}
					<div
						className={cn(
							"border-t border-border/50 mt-auto",
							expanded ? "p-3" : "p-2",
						)}
					>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className={cn(
										"w-full flex items-center gap-3 rounded-xl transition-colors",
										"hover:bg-muted/50",
										expanded ? "px-3 py-2.5" : "p-3 justify-center",
									)}
								>
									{/* Avatar */}
									<div
										className={cn(
											"rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0",
											expanded ? "w-8 h-8" : "w-9 h-9",
										)}
									>
										{isSignedIn && user?.username ? (
											<span className="text-sm font-medium text-primary">
												{user.username.charAt(0).toUpperCase()}
											</span>
										) : (
											<User size={16} className="text-primary" />
										)}
									</div>

									{expanded && (
										<motion.div
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -10 }}
											transition={{ duration: 0.15 }}
											className="flex-1 text-left min-w-0"
										>
											<div className="text-sm font-medium truncate">
												{isSignedIn ? user?.username || "User" : "Guest"}
											</div>
											<div className="text-xs text-muted-foreground">
												{settings.storageMode === "puter" ? "Cloud" : "Local"}
											</div>
										</motion.div>
									)}
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent
								align={expanded ? "end" : "center"}
								side="top"
								sideOffset={8}
								collisionPadding={10}
								className="w-64 rounded-2xl p-2 shadow-2xl border-border/50 animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
							>
								{/* User Info */}
								{isSignedIn && (
									<>
										<div className="px-3 py-3 mb-1">
											<div className="text-base font-semibold">
												{user?.username}
											</div>
											{user?.email && (
												<div className="text-sm text-muted-foreground mt-0.5">
													{user.email}
												</div>
											)}
										</div>
										<DropdownMenuSeparator className="my-2" />
									</>
								)}

								{/* Settings */}
								<DropdownMenuItem
									onClick={() => setShowSettings(true)}
									className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
								>
									<Settings size={18} className="mr-3" />
									Settings
								</DropdownMenuItem>

								{/* Theme Toggle */}
								{mounted && (
									<DropdownMenuItem
										onClick={() =>
											setTheme(theme === "dark" ? "light" : "dark")
										}
										className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
									>
										{theme === "dark" ? (
											<Sun size={18} className="mr-3" />
										) : (
											<Moon size={18} className="mr-3" />
										)}
										{theme === "dark" ? "Light Mode" : "Dark Mode"}
									</DropdownMenuItem>
								)}

								{/* Storage Mode */}
								<DropdownMenuItem
									disabled
									className="px-3 py-2.5 rounded-xl text-sm"
								>
									{settings.storageMode === "puter" ? (
										<Cloud size={18} className="mr-3" />
									) : (
										<HardDrive size={18} className="mr-3" />
									)}
									{settings.storageMode === "puter"
										? "Cloud Storage"
										: "Local Storage"}
								</DropdownMenuItem>

								<DropdownMenuSeparator className="my-2" />

								{/* Sign Out */}
								{isSignedIn ? (
									<DropdownMenuItem
										onClick={handleSignOut}
										className="px-3 py-2.5 rounded-xl text-sm text-destructive cursor-pointer focus:text-destructive"
									>
										<LogOut size={18} className="mr-3" />
										Sign Out
									</DropdownMenuItem>
								) : (
									<DropdownMenuItem
										onClick={() => router.push("/auth")}
										className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
									>
										<User size={18} className="mr-3" />
										Sign In
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</motion.aside>
			</LayoutGroup>

			{/* Main Content */}
			<main className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{children}
			</main>

			{/* Settings Panel */}
			<SettingsPanel
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
				routeType={routeType}
			/>
		</div>
	);
}

// Export context for child components to control settings panel
export const AppShellContext = React.createContext<{
	openSettings: () => void;
	closeSettings: () => void;
	toggleSidebar: () => void;
	isSidebarExpanded: boolean;
} | null>(null);

export function useAppShell() {
	const context = React.useContext(AppShellContext);
	if (!context) {
		throw new Error("useAppShell must be used within AppShell");
	}
	return context;
}
