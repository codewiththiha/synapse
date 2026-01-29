import { createStore } from "@/lib/createStore";
import { toast as sonnerToast } from "sonner";
import * as React from "react";

// Alert Dialog Config
type AlertConfig = {
	title?: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	onConfirm?: () => void;
	onCancel?: () => void;
};

// Toast Config
type ToastAction = {
	label: string;
	onClick: () => void;
};

type ToastConfig = {
	title?: string;
	description?: string;
	variant?: "default" | "destructive";
	action?: ToastAction;
	duration?: number;
};

// Transport text storage key
const TRANSPORT_TEXT_KEY = "puter_transport_text";

type State = {
	alertOpen: boolean;
	alertConfig: AlertConfig | null;
	// Transport state for assistant -> chat/tts
	hasTransportText: boolean;
	// Study mode state for FAB visibility
	studyModeOpen: boolean;
};

type Actions = {
	updateAlertOpen: (is: boolean) => void;
	showAlert: (config: AlertConfig) => void;
	closeAlert: () => void;
	// Transport actions
	setTransportText: (text: string) => void;
	getTransportText: () => string | null;
	clearTransportText: () => void;
	// Study mode actions
	setStudyModeOpen: (open: boolean) => void;
};

type Store = State & Actions;

const useGlobalStore = createStore<Store>(
	(set) => ({
		alertOpen: false,
		alertConfig: null,
		hasTransportText: false,
		studyModeOpen: false,

		updateAlertOpen: (is) => {
			set((state) => {
				state.alertOpen = is;
				if (!is) state.alertConfig = null;
			});
		},

		showAlert: (config) =>
			set((state) => {
				state.alertOpen = true;
				state.alertConfig = config;
			}),

		closeAlert: () =>
			set((state) => {
				state.alertOpen = false;
				state.alertConfig = null;
			}),

		// Transport text methods
		setTransportText: (text: string) => {
			if (typeof window !== "undefined") {
				sessionStorage.setItem(TRANSPORT_TEXT_KEY, text);
			}
			set((state) => {
				state.hasTransportText = true;
			});
		},

		getTransportText: () => {
			if (typeof window !== "undefined") {
				return sessionStorage.getItem(TRANSPORT_TEXT_KEY);
			}
			return null;
		},

		clearTransportText: () => {
			if (typeof window !== "undefined") {
				sessionStorage.removeItem(TRANSPORT_TEXT_KEY);
			}
			set((state) => {
				state.hasTransportText = false;
			});
		},

		setStudyModeOpen: (open: boolean) =>
			set((state) => {
				state.studyModeOpen = open;
			}),
	}),
	{
		name: "global-store",
		skipPersist: true,
	},
);

// Helper function to show alert from anywhere
const alert = (config: AlertConfig) => {
	useGlobalStore.getState().showAlert(config);
};

// Helper function to show toast from anywhere
const toast = ({
	title,
	description,
	variant = "default",
	action,
	duration,
}: ToastConfig) => {
	const options: {
		description?: string;
		action?: React.ReactNode;
		duration?: number;
	} = {};

	if (title && description) {
		options.description = description;
	}
	if (action) {
		// Sonner expects action to be a React element
		options.action = React.createElement(
			"button",
			{
				onClick: action.onClick,
				className:
					"ml-auto shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
			},
			action.label,
		);
	}
	if (duration) {
		options.duration = duration;
	}

	if (variant === "destructive") {
		sonnerToast.error(title || description || "Error", options);
	} else {
		sonnerToast.success(title || description || "Success", options);
	}
};

export { useGlobalStore, alert, toast };
