/**
 * Formatting utilities
 * Consolidated from file-helpers.ts and storage.ts
 */

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "1.5 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return "0 B";
	if (bytes < 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const index = Math.min(i, sizes.length - 1);

	return (
		parseFloat((bytes / Math.pow(k, index)).toFixed(decimals)) +
		" " +
		sizes[index]
	);
}

/**
 * Alias for backward compatibility with file-helpers.ts
 */
export const formatFileSize = formatBytes;
