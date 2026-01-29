import { createStore } from "@/lib/createStore";
import { AppSettings } from "@/lib/types";
import { AVAILABLE_MODELS, AVAILABLE_TTS_MODELS } from "@/lib/constants";

type State = {
	settings: AppSettings;
};

type Action = {
	updateSettings: (newSettings: Partial<AppSettings>) => void;
	resetSettings: () => void;
};

type Store = State & Action;

// Default model ID - use a popular free model that exists in AVAILABLE_MODELS
const DEFAULT_MODEL_ID = "openrouter:meta-llama/llama-3.3-70b-instruct:free";
const DEFAULT_TTS_MODEL_ID = "gpt-4o-mini-tts";

const defaultSettings: AppSettings = {
	modelId: DEFAULT_MODEL_ID,
	ttsModelId: DEFAULT_TTS_MODEL_ID,
	ttsVoice: "alloy",
	mode: "chat",
	reasoningEffort: "medium",
	tools: {
		webSearch: false,
		imageGeneration: false,
		codeExecution: false,
	},
	modelSortOrder: "fi", // Default to Free + Intelligence
	cardLanguage: "en", // Default flashcard generation language
	explainLanguage: "en", // Default explanation language
	storageMode: "local", // Default to local storage only
	eventReminderMinutes: 10, // Default to 10 minutes before event
};

/**
 * Validate and fix modelId if it doesn't exist in available models
 * This handles cases where persisted settings have an invalid/outdated modelId
 */
const validateModelId = (modelId: string | undefined): string => {
	if (!modelId) return DEFAULT_MODEL_ID;
	const exists = AVAILABLE_MODELS.some((m) => m.id === modelId);
	return exists ? modelId : DEFAULT_MODEL_ID;
};

const validateTtsModelId = (ttsModelId: string | undefined): string => {
	if (!ttsModelId) return DEFAULT_TTS_MODEL_ID;
	const exists = AVAILABLE_TTS_MODELS.some((m) => m.id === ttsModelId);
	return exists ? ttsModelId : DEFAULT_TTS_MODEL_ID;
};

const useSettingsStore = createStore<Store>(
	(set) => ({
		settings: defaultSettings,

		updateSettings: (newSettings) =>
			set((state) => {
				state.settings = { ...state.settings, ...newSettings };
			}),

		resetSettings: () =>
			set((state) => {
				state.settings = defaultSettings;
			}),
	}),
	{
		name: "puter-chat-settings",
		excludeFromPersist: [],
	},
);

// Subscribe to validate modelId after hydration
// This ensures invalid persisted modelIds are corrected
if (typeof window !== "undefined") {
	// Use setTimeout to run after hydration completes
	setTimeout(() => {
		const state = useSettingsStore.getState();
		const validatedModelId = validateModelId(state.settings.modelId);
		const validatedTtsModelId = validateTtsModelId(state.settings.ttsModelId);

		if (
			validatedModelId !== state.settings.modelId ||
			validatedTtsModelId !== state.settings.ttsModelId
		) {
			useSettingsStore.getState().updateSettings({
				modelId: validatedModelId,
				ttsModelId: validatedTtsModelId,
			});
		}
	}, 0);
}

export { useSettingsStore };
