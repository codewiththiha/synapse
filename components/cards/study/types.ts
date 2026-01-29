import { PanInfo } from "framer-motion";
import { Flashcard } from "@/lib/types/flashcard";

export type ViewState = "closed" | "spread" | "study" | "mastered";

export interface StudyCardProps {
	card: Flashcard;
	index: number;
	total: number;
	isFlipped: boolean;
	explanation: string | null;
	isExplaining: boolean;
	isLoadingExplanation: boolean;
	masteredCount: number;
	hasMemo: boolean;
	isShuffling?: boolean;
	hasReturnIndex?: boolean;
	onFlip: () => void;
	onExplain: () => void;
	onCancelExplain?: () => void;
	onSaveMemo: () => void;
	onEnough: (e?: React.MouseEvent) => void;
	onShuffle?: () => void;
	onPrev?: () => void;
	onNext?: () => void;
	onShowMastered: () => void;
}

export interface MobileStudyCardProps extends StudyCardProps {
	onSwipe: (info: PanInfo) => void;
	onClose: (e?: React.MouseEvent) => void;
}

export interface DesktopStudyCardProps extends StudyCardProps {
	onBack: (e?: React.MouseEvent) => void;
}

export interface SpreadCardProps {
	card: Flashcard;
	index: number;
	total: number;
}

export const STACK_ROTATIONS = [0, -3, 3, -5, 5];
export const STACK_OFFSETS = [
	{ x: 0, y: 0 },
	{ x: 2, y: 2 },
	{ x: -2, y: 4 },
	{ x: 3, y: 6 },
	{ x: -3, y: 8 },
];
export const CARDS_PER_PAGE = 5;
