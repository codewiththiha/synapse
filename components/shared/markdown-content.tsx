"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownComponentProps } from "@/lib/types";
import { CodeBlock } from "@/components/chat-ui/chat/messages/code-block";

interface MarkdownContentProps {
	content: string;
	/** Use compact styling for smaller contexts like cards */
	compact?: boolean;
	/** Custom class name for the container */
	className?: string;
}

/**
 * Shared markdown renderer component.
 * Uses react-markdown with GFM support for full markdown rendering.
 *
 * For simple inline markdown (bold, italic, code only), use SimpleMarkdown instead.
 */
export function MarkdownContent({
	content,
	compact = false,
	className = "",
}: MarkdownContentProps) {
	const baseComponents = compact
		? compactMarkdownComponents
		: fullMarkdownComponents;

	return (
		<div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={baseComponents}>
				{content}
			</ReactMarkdown>
		</div>
	);
}

/**
 * Simple markdown renderer for basic inline formatting only.
 * Supports: **bold**, *italic*, `code`
 *
 * Use this for lightweight contexts where full markdown is overkill.
 */
export function SimpleMarkdown({ content }: { content: string }) {
	const parseInline = (text: string): React.ReactNode => {
		let processed = text;
		processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
		processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");
		processed = processed.replace(
			/`(.+?)`/g,
			'<code class="px-1 py-0.5 rounded bg-muted text-sm">$1</code>',
		);
		return <span dangerouslySetInnerHTML={{ __html: processed }} />;
	};

	const lines = content.split("\n");
	const elements: React.ReactNode[] = [];

	lines.forEach((line, i) => {
		if (line.startsWith("### ")) {
			elements.push(
				<h3 key={i} className="text-base font-semibold mt-3 mb-1">
					{line.slice(4)}
				</h3>,
			);
		} else if (line.startsWith("## ")) {
			elements.push(
				<h2 key={i} className="text-lg font-semibold mt-4 mb-2">
					{line.slice(3)}
				</h2>,
			);
		} else if (line.startsWith("# ")) {
			elements.push(
				<h1 key={i} className="text-xl font-bold mt-4 mb-2">
					{line.slice(2)}
				</h1>,
			);
		} else if (line.startsWith("- ") || line.startsWith("* ")) {
			elements.push(
				<li key={i} className="ml-4 list-disc">
					{parseInline(line.slice(2))}
				</li>,
			);
		} else if (/^\d+\.\s/.test(line)) {
			elements.push(
				<li key={i} className="ml-4 list-decimal">
					{parseInline(line.replace(/^\d+\.\s/, ""))}
				</li>,
			);
		} else if (line.startsWith("```")) {
			// Skip code fence markers
		} else if (line.trim() === "") {
			elements.push(<br key={i} />);
		} else {
			elements.push(
				<p key={i} className="mb-2">
					{parseInline(line)}
				</p>,
			);
		}
	});

	return <div className="space-y-1">{elements}</div>;
}

// Full markdown components for chat/detailed content
const fullMarkdownComponents = {
	code({
		inline,
		className,
		children,
		...props
	}: MarkdownComponentProps & { inline?: boolean }) {
		const match = /language-(\w+)/.exec(className || "");
		const codeString = String(children).replace(/\n$/, "");

		if (!inline && match) {
			return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
		}

		return (
			<code
				className="px-1.5 py-0.5 bg-muted text-foreground rounded text-sm font-mono border"
				{...props}
			>
				{children}
			</code>
		);
	},
	p({ children }: MarkdownComponentProps) {
		return <p className="mb-4 last:mb-0 leading-7 text-base">{children}</p>;
	},
	ul({ children }: MarkdownComponentProps) {
		return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
	},
	ol({ children }: MarkdownComponentProps) {
		return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
	},
	li({ children }: MarkdownComponentProps) {
		return <li className="leading-7">{children}</li>;
	},
	h1({ children }: MarkdownComponentProps) {
		return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
	},
	h2({ children }: MarkdownComponentProps) {
		return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
	},
	h3({ children }: MarkdownComponentProps) {
		return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
	},
	blockquote({ children }: MarkdownComponentProps) {
		return (
			<blockquote className="border-l-4 border-border pl-4 italic my-4 text-muted-foreground">
				{children}
			</blockquote>
		);
	},
	a({ children, href }: MarkdownComponentProps) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary underline hover:no-underline"
			>
				{children}
			</a>
		);
	},
};

// Compact markdown components for cards/small contexts
const compactMarkdownComponents = {
	...fullMarkdownComponents,
	p({ children }: MarkdownComponentProps) {
		return <p className="mb-2 last:mb-0 leading-6 text-sm">{children}</p>;
	},
	h1({ children }: MarkdownComponentProps) {
		return <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>;
	},
	h2({ children }: MarkdownComponentProps) {
		return <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>;
	},
	h3({ children }: MarkdownComponentProps) {
		return <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>;
	},
};
