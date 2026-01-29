/**
 * Async utility functions for consistent error handling
 */

export type AsyncResult<T, E = Error> = [T, null] | [null, E];

/**
 * Wraps an async operation and returns a tuple [data, error]
 * Eliminates scattered try-catch blocks throughout the codebase
 *
 * @example
 * const [data, error] = await tryCatch(fetchData());
 * if (error) {
 *   console.error('Failed:', error);
 *   return;
 * }
 * // Use data safely
 */
export async function tryCatch<T, E = Error>(
	promise: Promise<T>,
): Promise<AsyncResult<T, E>> {
	try {
		const data = await promise;
		return [data, null];
	} catch (error) {
		return [null, error as E];
	}
}

/**
 * Wraps a sync function that might throw
 *
 * @example
 * const [parsed, error] = tryCatchSync(() => JSON.parse(text));
 */
export function tryCatchSync<T, E = Error>(fn: () => T): AsyncResult<T, E> {
	try {
		const data = fn();
		return [data, null];
	} catch (error) {
		return [null, error as E];
	}
}

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * const [data, error] = await retryAsync(() => fetchData(), 3, 500);
 */
export async function retryAsync<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 500,
): Promise<AsyncResult<T, Error>> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		const [data, error] = await tryCatch(fn());

		if (!error) {
			return [data, null];
		}

		lastError = error;

		if (attempt < maxRetries - 1) {
			await new Promise((resolve) =>
				setTimeout(resolve, baseDelay * Math.pow(2, attempt)),
			);
		}
	}

	return [null, lastError || new Error("Max retries exceeded")];
}
