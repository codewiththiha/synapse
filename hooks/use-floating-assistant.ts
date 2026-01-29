/**
 * useFloatingAssistant - Reusable hook for draggable floating UI components
 *
 * Handles:
 * - Dragging logic with pointer events
 * - Viewport clamping for safe positioning
 * - Dynamic width calculation based on text content
 * - Expansion state management
 * - Focus management when expanded
 *
 * Used by: HomeAssistant, PlannerAssistant, and any future floating UI components
 */

import {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
	RefObject,
} from "react";

export interface FloatingPosition {
	x: number;
	y: number;
}

export interface UseFloatingAssistantOptions {
	/** Initial button position */
	initialPosition?: FloatingPosition;
	/** Minimum width of expanded input */
	minWidth?: number;
	/** Maximum width of expanded input */
	maxWidth?: number;
	/** Button size in pixels */
	buttonSize?: number;
	/** Padding from viewport edges */
	padding?: number;
	/** Placeholder text for width measurement */
	placeholder?: string;
}

export interface UseFloatingAssistantReturn {
	// State
	isExpanded: boolean;
	isDragging: boolean;
	buttonPos: FloatingPosition;
	inputPos: FloatingPosition;
	inputWidth: number;

	// Refs
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	measureRef: RefObject<HTMLSpanElement | null>;
	buttonRef: RefObject<HTMLDivElement | null>;

	// Actions
	setIsExpanded: (expanded: boolean) => void;
	handleDragStart: (e: React.PointerEvent) => void;
	handleButtonClick: (onLoadingClick?: () => void, isLoading?: boolean) => void;
	updateInputWidth: (text: string) => void;

	// Utilities
	hasDragged: () => boolean;
	resetDragFlag: () => void;
}

const DEFAULT_POSITION: FloatingPosition = { x: 24, y: 24 };

const DEFAULT_OPTIONS = {
	minWidth: 280,
	maxWidth: 400,
	buttonSize: 48,
	padding: 16,
	placeholder: "Type something...",
};

export function useFloatingAssistant(
	options: UseFloatingAssistantOptions = {},
): UseFloatingAssistantReturn {
	const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
	const initialPos = options.initialPosition ?? DEFAULT_POSITION;

	const [isExpanded, setIsExpanded] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [inputWidth, setInputWidth] = useState(config.minWidth);
	const [buttonPos, setButtonPos] = useState(initialPos);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const buttonRef = useRef<HTMLDivElement>(null);
	const dragStartRef = useRef({ x: 0, y: 0, buttonX: 0, buttonY: 0 });
	const hasDraggedRef = useRef(false);

	// Calculate input width based on text content
	const calculateInputWidth = useCallback(
		(text: string) => {
			if (!measureRef.current) return config.minWidth;

			measureRef.current.textContent = text || config.placeholder;
			const textWidth = measureRef.current.offsetWidth;
			const buttonsWidth = 90; // Close + Send buttons
			const paddingWidth = 32; // pl-4 + gap

			const totalWidth = textWidth + buttonsWidth + paddingWidth;
			return Math.max(config.minWidth, Math.min(totalWidth, config.maxWidth));
		},
		[config.minWidth, config.maxWidth, config.placeholder],
	);

	// Calculate safe input position - derived from buttonPos and inputWidth
	const inputPos = useMemo((): FloatingPosition => {
		if (typeof window === "undefined" || !isExpanded) {
			return { x: config.padding, y: config.padding };
		}

		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Button center position
		const buttonCenterX = buttonPos.x + config.buttonSize / 2;

		// Try to position input centered on button horizontally
		let inputX = buttonCenterX - inputWidth / 2;
		let inputY = buttonPos.y; // Same bottom offset as button

		// Clamp to viewport bounds
		inputX = Math.max(
			config.padding,
			Math.min(inputX, vw - inputWidth - config.padding),
		);
		inputY = Math.max(
			config.padding,
			Math.min(inputY, vh - 48 - config.padding),
		);

		return { x: inputX, y: inputY };
	}, [buttonPos, inputWidth, isExpanded, config.buttonSize, config.padding]);

	// Update input width
	const updateInputWidth = useCallback(
		(text: string) => {
			const newWidth = calculateInputWidth(text);
			setInputWidth(newWidth);
		},
		[calculateInputWidth],
	);

	// Focus input when expanded
	useEffect(() => {
		if (isExpanded && textareaRef.current) {
			const timer = setTimeout(() => textareaRef.current?.focus(), 150);
			return () => clearTimeout(timer);
		}
	}, [isExpanded]);

	// Handle drag start
	const handleDragStart = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			setIsDragging(true);
			hasDraggedRef.current = false;
			dragStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				buttonX: buttonPos.x,
				buttonY: buttonPos.y,
			};

			const handleMove = (moveEvent: PointerEvent) => {
				const deltaX = moveEvent.clientX - dragStartRef.current.x;
				const deltaY = moveEvent.clientY - dragStartRef.current.y;

				// Only count as drag if moved more than 5px
				if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
					hasDraggedRef.current = true;
				}

				const newX = dragStartRef.current.buttonX + deltaX;
				const newY = dragStartRef.current.buttonY - deltaY;

				setButtonPos({ x: newX, y: newY });
			};

			const handleEnd = () => {
				setIsDragging(false);
				window.removeEventListener("pointermove", handleMove);
				window.removeEventListener("pointerup", handleEnd);
				window.removeEventListener("pointercancel", handleEnd);
			};

			window.addEventListener("pointermove", handleMove);
			window.addEventListener("pointerup", handleEnd);
			window.addEventListener("pointercancel", handleEnd);
		},
		[buttonPos],
	);

	// Handle button click (ignores if just dragged)
	const handleButtonClick = useCallback(
		(onLoadingClick?: () => void, isLoading?: boolean) => {
			if (hasDraggedRef.current) {
				hasDraggedRef.current = false;
				return;
			}

			if (isLoading && onLoadingClick) {
				onLoadingClick();
			} else {
				setIsExpanded(true);
			}
		},
		[],
	);

	// Utility to check if dragged
	const hasDragged = useCallback(() => hasDraggedRef.current, []);

	// Utility to reset drag flag
	const resetDragFlag = useCallback(() => {
		hasDraggedRef.current = false;
	}, []);

	return {
		// State
		isExpanded,
		isDragging,
		buttonPos,
		inputPos,
		inputWidth,

		// Refs
		textareaRef,
		measureRef,
		buttonRef,

		// Actions
		setIsExpanded,
		handleDragStart,
		handleButtonClick,
		updateInputWidth,

		// Utilities
		hasDragged,
		resetDragFlag,
	};
}
