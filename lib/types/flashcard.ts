// Flashcard Types

export type ExtractionMethod = "aiModel" | "OCR";

export interface Flashcard {
	id: string;
	question: string;
	answer: string;
	createdAt: number;
	coverId: string;
	isMastered?: boolean; // Marked as "enough" - excluded from study
}

export interface CardCover {
	id: string;
	name: string;
	description?: string;
	cardCount: number;
	collectionId?: string; // Optional - can be in a collection
	createdAt: number;
	updatedAt: number;
	isPinned?: boolean;
}

export interface CardCollection {
	id: string;
	name: string;
	description?: string;
	coverCount: number;
	createdAt: number;
	updatedAt: number;
	isPinned?: boolean;
}

export interface CardMemo {
	id: string;
	cardId: string;
	coverId: string; // Link to cover for cascade delete
	question: string; // Store question for display
	answer: string; // Store answer for display
	explanation: string;
	createdAt: number;
}

// AI Configuration for flashcards (developer-only)
export interface FlashcardAIConfig {
	extractionMethod: ExtractionMethod;
	// For aiModel extraction
	extractionModel?: string;
	extractionInstruction?: string;
	// For OCR
	ocrModel?: string;
	// Card generation
	cardGeneratorModel: string;
	cardGeneratorInstruction: string;
	// Name generator
	nameGeneratorModel: string;
	nameGeneratorInstruction: string;
	// Organizer
	organizerModel: string;
	organizerInstruction: string;
	// Explainer
	explainerModel: string;
	explainerInstruction: string;
}

// Generation request
export interface CardGenerationRequest {
	text: string;
	cardCount: number; // 1-30
}

// Generated card batch
export interface GeneratedCardBatch {
	cards: Array<{ q: string; a: string }>;
	batchIndex: number;
}

// Flashcard store state
export interface FlashcardState {
	cards: Flashcard[];
	covers: CardCover[];
	collections: CardCollection[];
	memos: CardMemo[];
	currentCoverId: string | null;
	currentCollectionId: string | null;
	isGenerating: boolean;
	generationProgress: number; // 0-100
}
