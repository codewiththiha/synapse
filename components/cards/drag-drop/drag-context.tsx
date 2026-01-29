/**
 * DragDropContext - Central state management for drag-and-drop operations
 *
 * PURPOSE:
 * Provides a centralized context for managing complex drag-and-drop interactions
 * across the flashcard system. Handles drag initiation, position tracking, drop
 * target detection, and stack creation logic.
 *
 * WHAT IT DOES:
 * - Manages drag state (isDragging, draggedCover, dragPosition)
 * - Tracks drop targets (collections or other covers for stacking)
 * - Handles stack target detection (500ms hover for folder creation)
 * - Provides callbacks for drag lifecycle (start, move, drop, cancel)
 * - Integrates with ESC key for drag cancellation
 *
 * WHAT IT SERVES:
 * Acts as the single source of truth for all drag-drop state, preventing
 * prop drilling and enabling complex interactions between draggable and
 * droppable components without direct coupling.
 *
 * BENEFITS:
 * - Centralized state management reduces component complexity
 * - Enables cross-component communication without prop drilling
 * - Supports complex interactions (stacking, edge scrolling, animations)
 * - Easy to test and debug drag behavior
 * - Reusable for any draggable content type (not just flashcards)
 */

"use client";

import {
	createContext,
	useContext,
	useReducer,
	useCallback,
	useEffect,
	ReactNode,
} from "react";
import { CardCover } from "@/lib/types/flashcard";
import { Position2D } from "@/lib/types/common";

/**
 * DragState - Complete state snapshot for drag operations
 *
 * FIELDS:
 * - isDragging: Whether a drag is currently active
 * - draggedCoverId: ID of the cover being dragged
 * - draggedCover: Full cover object being dragged
 * - dropTargetId: ID of current drop target (collection or cover)
 * - dropTargetType: Type of drop target ("collection" or "cover")
 * - stackTargetId: ID of cover for stacking (after 500ms hover)
 * - isStackReady: Whether stack indicator should show
 * - dragPosition: Current cursor position during drag
 */
export interface DragState {
	isDragging: boolean;
	draggedCoverId: string | null;
	draggedCover: CardCover | null;
	dropTargetId: string | null;
	dropTargetType: "collection" | "cover" | null;
	stackTargetId: string | null;
	isStackReady: boolean;
	dragPosition: Position2D;
}

/**
 * DragDropContextValue - Public API for drag-drop context
 *
 * METHODS:
 * - startDrag(cover, position): Initiate drag operation
 * - updateDragPosition(position): Update cursor position during drag
 * - setDropTarget(id, type): Set current drop target
 * - setStackTarget(id): Set stack target (after 500ms hover)
 * - completeDrop(): Finalize drop operation
 * - cancelDrag(): Cancel drag (ESC key or user action)
 */
export interface DragDropContextValue {
	state: DragState;
	startDrag: (cover: CardCover, position: Position2D) => void;
	updateDragPosition: (position: Position2D) => void;
	setDropTarget: (
		id: string | null,
		type: "collection" | "cover" | null,
	) => void;
	setStackTarget: (id: string | null) => void;
	completeDrop: () => void;
	cancelDrag: () => void;
}

// Initial state - all drag operations start from this clean slate
const initialState: DragState = {
	isDragging: false,
	draggedCoverId: null,
	draggedCover: null,
	dropTargetId: null,
	dropTargetType: null,
	stackTargetId: null,
	isStackReady: false,
	dragPosition: { x: 0, y: 0 },
};

/**
 * DragAction - Union of all possible state mutations
 * Uses discriminated unions for type-safe reducer pattern
 */
type DragAction =
	| {
			type: "START_DRAG";
			payload: { cover: CardCover; position: Position2D };
	  }
	| { type: "UPDATE_POSITION"; payload: Position2D }
	| {
			type: "SET_DROP_TARGET";
			payload: { id: string | null; targetType: "collection" | "cover" | null };
	  }
	| { type: "SET_STACK_TARGET"; payload: { id: string | null } }
	| { type: "COMPLETE_DROP" }
	| { type: "CANCEL_DRAG" };

/**
 * dragReducer - Pure function for state transitions
 * Handles all drag state mutations in a predictable, testable way
 */
function dragReducer(state: DragState, action: DragAction): DragState {
	switch (action.type) {
		case "START_DRAG":
			return {
				...state,
				isDragging: true,
				draggedCoverId: action.payload.cover.id,
				draggedCover: action.payload.cover,
				dragPosition: action.payload.position,
				dropTargetId: null,
				dropTargetType: null,
				stackTargetId: null,
				isStackReady: false,
			};

		case "UPDATE_POSITION":
			return {
				...state,
				dragPosition: action.payload,
			};

		case "SET_DROP_TARGET":
			return {
				...state,
				dropTargetId: action.payload.id,
				dropTargetType: action.payload.targetType,
				// Clear stack target if we're now over a collection
				stackTargetId:
					action.payload.targetType === "collection"
						? null
						: state.stackTargetId,
				isStackReady:
					action.payload.targetType === "collection"
						? false
						: state.isStackReady,
			};

		case "SET_STACK_TARGET":
			return {
				...state,
				stackTargetId: action.payload.id,
				isStackReady: action.payload.id !== null,
			};

		case "COMPLETE_DROP":
		case "CANCEL_DRAG":
			return initialState;

		default:
			return state;
	}
}

// Create context
const DragDropContext = createContext<DragDropContextValue | null>(null);

/**
 * DragDropProvider - Context provider component
 *
 * PARAMETERS:
 * - children: React nodes to wrap with drag-drop context
 * - onDrop?: Callback when drop completes (coverId, targetId, targetType)
 * - onCancel?: Callback when drag is cancelled
 *
 * WHAT IT DOES:
 * Wraps child components with drag-drop state management. Initializes the
 * reducer, provides context value, and handles global keyboard events (ESC).
 *
 * USAGE:
 * <DragDropProvider onDrop={handleDrop} onCancel={handleCancel}>
 *   <YourDraggableComponents />
 * </DragDropProvider>
 *
 * BENEFITS:
 * - Single provider pattern for clean component tree
 * - Automatic ESC key handling for drag cancellation
 * - Callback hooks for drop and cancel events
 */
interface DragDropProviderProps {
	children: ReactNode;
	onDrop?: (
		coverId: string,
		targetId: string,
		targetType: "collection" | "cover",
	) => void;
	onCancel?: () => void;
}

// Provider component
export function DragDropProvider({
	children,
	onDrop,
	onCancel,
}: DragDropProviderProps) {
	const [state, dispatch] = useReducer(dragReducer, initialState);

	// Start drag operation
	const startDrag = useCallback((cover: CardCover, position: Position2D) => {
		dispatch({ type: "START_DRAG", payload: { cover, position } });
	}, []);

	// Update drag position
	const updateDragPosition = useCallback((position: Position2D) => {
		dispatch({ type: "UPDATE_POSITION", payload: position });
	}, []);

	// Set drop target
	const setDropTarget = useCallback(
		(id: string | null, type: "collection" | "cover" | null) => {
			dispatch({ type: "SET_DROP_TARGET", payload: { id, targetType: type } });
		},
		[],
	);

	// Set stack target (when hovering over another cover for 500ms)
	const setStackTarget = useCallback((id: string | null) => {
		dispatch({ type: "SET_STACK_TARGET", payload: { id } });
	}, []);

	// Complete drop operation
	const completeDrop = useCallback(() => {
		if (state.isDragging && state.draggedCoverId) {
			// If we have a stack target (hovering over another cover), use that
			if (state.isStackReady && state.stackTargetId) {
				onDrop?.(state.draggedCoverId, state.stackTargetId, "cover");
			}
			// Otherwise if we have a drop target (collection), use that
			else if (state.dropTargetId && state.dropTargetType === "collection") {
				onDrop?.(state.draggedCoverId, state.dropTargetId, "collection");
			}
		}
		dispatch({ type: "COMPLETE_DROP" });
	}, [
		state.isDragging,
		state.draggedCoverId,
		state.isStackReady,
		state.stackTargetId,
		state.dropTargetId,
		state.dropTargetType,
		onDrop,
	]);

	// Cancel drag operation
	const cancelDrag = useCallback(() => {
		dispatch({ type: "CANCEL_DRAG" });
		onCancel?.();
	}, [onCancel]);

	// Handle ESC key for drag cancellation (Requirement 6.1)
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && state.isDragging) {
				cancelDrag();
			}
		};

		if (state.isDragging) {
			window.addEventListener("keydown", handleKeyDown);
			return () => {
				window.removeEventListener("keydown", handleKeyDown);
			};
		}
	}, [state.isDragging, cancelDrag]);

	const contextValue: DragDropContextValue = {
		state,
		startDrag,
		updateDragPosition,
		setDropTarget,
		setStackTarget,
		completeDrop,
		cancelDrag,
	};

	return (
		<DragDropContext.Provider value={contextValue}>
			{children}
		</DragDropContext.Provider>
	);
}

/**
 * useDragDrop - Hook to access drag-drop context
 *
 * RETURNS:
 * DragDropContextValue with state and all drag operation methods
 *
 * THROWS:
 * Error if used outside DragDropProvider
 *
 * USAGE:
 * const { state, startDrag, completeDrop } = useDragDrop();
 *
 * BENEFITS:
 * - Type-safe access to drag state
 * - Prevents usage outside provider context
 * - Clean API for drag operations
 */
// Custom hook to use drag-drop context
export function useDragDrop(): DragDropContextValue {
	const context = useContext(DragDropContext);
	if (!context) {
		throw new Error("useDragDrop must be used within a DragDropProvider");
	}
	return context;
}

// Export context for testing purposes
export { DragDropContext };
