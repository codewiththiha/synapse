/**
 * Drag-Drop System - Complete module for drag-and-drop interactions
 *
 * ARCHITECTURE:
 * This folder contains a complete, production-ready drag-drop system for
 * flashcard collections. It's built with React Context for state management,
 * Framer Motion for animations, and custom hooks for reusable logic.
 *
 * CORE COMPONENTS:
 *
 * 1. DragDropProvider (drag-context.tsx)
 *    - Central state management using useReducer
 *    - Tracks drag state, drop targets, and stack targets
 *    - Handles ESC key for drag cancellation
 *    - Provides callbacks for drop and cancel events
 *
 * 2. DraggableCardCover (draggable-cover.tsx)
 *    - Main interactive component for draggable cards
 *    - Handles complex touch/pointer interactions
 *    - Implements edge scrolling during drag
 *    - Provides haptic feedback on mobile
 *    - Prevents accidental clicks after dragging
 *
 * 3. DroppableCollection (droppable-collection.tsx)
 *    - Drop zone wrapper for collections
 *    - Automatic position-based drop target detection
 *    - Visual feedback (ring highlight, scale animation)
 *    - Prevents self-drops
 *
 * 4. StackIndicator (stack-indicator.tsx)
 *    - Visual feedback for cover stacking
 *    - Shows when hovering over another cover for 500ms
 *    - Pulsing animation indicates ready state
 *    - Customizable action label
 *
 * 5. CollectionNameEditor (collection-name-editor.tsx)
 *    - Inline editor for collection names
 *    - Double-tap to edit, single tap to navigate
 *    - Validates non-empty names
 *    - Keyboard shortcuts (Enter to save, Escape to cancel)
 *
 * 6. FolderIcon (folder-icon.tsx)
 *    - Beautiful 3D animated folder visual
 *    - Stacked papers that fan out when open
 *    - Customizable colors for different folder types
 *    - Responsive sizing (sm/md/lg/xl)
 *
 * 7. FolderCard (folder-card.tsx)
 *    - Complete folder display with title and count
 *    - Responds to hover and drag-over states
 *    - Integrates FolderIcon with application logic
 *
 * REUSABLE HOOKS:
 * - useDoubleTap (hooks/use-double-tap.ts): Double-tap detection
 * - useEdgeScroll (hooks/use-edge-scroll.ts): Edge scrolling during drag
 *
 * USAGE PATTERN:
 * 1. Wrap your app with DragDropProvider
 * 2. Use DraggableCardCover for draggable items
 * 3. Use DroppableCollection for drop zones
 * 4. Stack indicator and folder visuals appear automatically
 *
 * BENEFITS:
 * - Modular, reusable components
 * - Type-safe with TypeScript
 * - Smooth animations with Framer Motion
 * - Mobile-optimized with haptic feedback
 * - Accessible with keyboard shortcuts
 * - Themeable components
 * - No external drag-drop library needed
 */

export {
	DragDropProvider,
	useDragDrop,
	DragDropContext,
	type DragState,
	type DragDropContextValue,
} from "./drag-context";

export { DraggableCardCover } from "./draggable-cover";

export { DroppableCollection } from "./droppable-collection";

export { StackIndicator } from "./stack-indicator";

export { CollectionNameEditor } from "./collection-name-editor";

export { FolderIcon } from "./folder-icon";

export { FolderCard } from "./folder-card";
