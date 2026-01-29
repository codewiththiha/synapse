/**
 * Assistant UI Components
 *
 * Reusable components for floating AI assistant interfaces.
 * Used by HomeAssistant, PlannerAssistant, and any future assistant UIs.
 *
 * Components:
 * - FloatingAssistantButton: Draggable FAB with loading state
 * - AssistantInputShell: Animated container for expanded input
 *
 * Hook:
 * - useFloatingAssistant (from hooks/): Manages drag, position, and expansion state
 */

export { FloatingAssistantButton } from "./floating-button";
export type { FloatingAssistantButtonProps } from "./floating-button";

export { AssistantInputShell } from "./input-shell";
export type { AssistantInputShellProps } from "./input-shell";
