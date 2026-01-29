"use client";

/**
 * Error Boundary Components
 * Wraps components to catch and handle errors gracefully
 */

import { Component, ReactNode } from "react";
import {
	ErrorBoundary as ReactErrorBoundary,
	FallbackProps,
} from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================
// Error Fallback UI
// ============================================

interface ErrorFallbackProps extends FallbackProps {
	title?: string;
	description?: string;
	showDetails?: boolean;
}

export function ErrorFallback({
	error,
	resetErrorBoundary,
	title = "Something went wrong",
	description = "An error occurred while loading this component.",
	showDetails = false,
}: ErrorFallbackProps) {
	return (
		<div className="flex flex-col items-center justify-center p-6 text-center gap-4 min-h-[200px]">
			<div className="p-3 rounded-full bg-destructive/10">
				<AlertTriangle className="h-6 w-6 text-destructive" />
			</div>
			<div className="space-y-1">
				<h3 className="font-semibold text-lg">{title}</h3>
				<p className="text-sm text-muted-foreground max-w-md">{description}</p>
			</div>
			{showDetails && error?.message && (
				<pre className="text-xs bg-muted p-2 rounded max-w-md overflow-auto">
					{error.message}
				</pre>
			)}
			<Button onClick={resetErrorBoundary} variant="outline" size="sm">
				<RefreshCw className="h-4 w-4 mr-2" />
				Try Again
			</Button>
		</div>
	);
}

// ============================================
// AI Error Fallback (for AI-heavy components)
// ============================================

export function AIErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	return (
		<ErrorFallback
			error={error}
			resetErrorBoundary={resetErrorBoundary}
			title="AI Service Error"
			description="The AI service encountered an issue. This might be temporary - please try again."
			showDetails={process.env.NODE_ENV === "development"}
		/>
	);
}

// ============================================
// Compact Error Fallback (for smaller components)
// ============================================

export function CompactErrorFallback({ resetErrorBoundary }: FallbackProps) {
	return (
		<div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
			<AlertTriangle className="h-4 w-4 shrink-0" />
			<span className="flex-1">Failed to load</span>
			<Button
				onClick={resetErrorBoundary}
				variant="ghost"
				size="sm"
				className="h-7 px-2"
			>
				Retry
			</Button>
		</div>
	);
}

// ============================================
// Error Boundary Wrapper Components
// ============================================

interface ErrorBoundaryWrapperProps {
	children: ReactNode;
	onReset?: () => void;
	onError?: (error: Error, info: React.ErrorInfo) => void;
}

/** Standard error boundary for general components */
export function AppErrorBoundary({
	children,
	onReset,
	onError,
}: ErrorBoundaryWrapperProps) {
	return (
		<ReactErrorBoundary
			FallbackComponent={ErrorFallback}
			onReset={onReset}
			onError={onError}
		>
			{children}
		</ReactErrorBoundary>
	);
}

/** Error boundary specifically for AI-powered components */
export function AIErrorBoundary({
	children,
	onReset,
	onError,
}: ErrorBoundaryWrapperProps) {
	return (
		<ReactErrorBoundary
			FallbackComponent={AIErrorFallback}
			onReset={onReset}
			onError={(error, info) => {
				console.error("AI Component Error:", error);
				onError?.(error, info);
			}}
		>
			{children}
		</ReactErrorBoundary>
	);
}

/** Compact error boundary for smaller UI elements */
export function CompactErrorBoundary({
	children,
	onReset,
}: ErrorBoundaryWrapperProps) {
	return (
		<ReactErrorBoundary
			FallbackComponent={CompactErrorFallback}
			onReset={onReset}
		>
			{children}
		</ReactErrorBoundary>
	);
}

// ============================================
// Class-based Error Boundary (for edge cases)
// ============================================

interface ClassErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ClassErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ClassErrorBoundary extends Component<
	ClassErrorBoundaryProps,
	ClassErrorBoundaryState
> {
	constructor(props: ClassErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ClassErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<ErrorFallback
						error={this.state.error!}
						resetErrorBoundary={() =>
							this.setState({ hasError: false, error: null })
						}
					/>
				)
			);
		}

		return this.props.children;
	}
}
