import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { enableMapSet } from "immer";

// Enable Map and Set support in Immer
enableMapSet();

type ConfigType<T extends object> = {
	name?: string;
	storage?: Storage;
	skipPersist?: boolean;
	excludeFromPersist?: Array<keyof T>;
};

// Check if we're on the client side
const isClient = typeof window !== "undefined";

// Create a no-op storage for SSR
const noopStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};

const createStore = <T extends object>(
	storeCreator: StateCreator<T, [["zustand/immer", never]], []>,
	config: ConfigType<T>,
) => {
	const {
		name,
		storage,
		skipPersist = false,
		excludeFromPersist,
	} = config || {};

	const immerStore = immer(storeCreator);

	if (skipPersist) {
		return create<T>()(immerStore);
	}

	return create<T>()(
		persist(immerStore, {
			name: name || "global-store",
			storage: createJSONStorage(() => {
				// Use no-op storage during SSR to prevent hydration mismatches
				if (!isClient) return noopStorage;
				return storage || localStorage;
			}),
			partialize: (state) =>
				Object.fromEntries(
					Object.entries(state).filter(
						([key]) => !excludeFromPersist?.includes(key as keyof T),
					),
				),
			// Skip hydration on server to prevent mismatches
			skipHydration: !isClient,
		}),
	);
};

export { createStore };
