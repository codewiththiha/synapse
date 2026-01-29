import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Re-export async utilities for convenience
export {
	tryCatch,
	tryCatchSync,
	retryAsync,
	type AsyncResult,
} from "./utils/async";

// Re-export puter helpers
export {
	isPuterAvailable,
	extractResponseText,
	parseAIJSON,
	parseAIJSONArray,
	generateId,
	delay,
} from "./utils/puter-helpers";

// Re-export format utilities
export { formatBytes } from "./utils/format";
