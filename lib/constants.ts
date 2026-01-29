import { ModelOption, VoiceOption, FlashcardLanguage } from "./types";

// Supported languages for flashcard generation and explanations
export const FLASHCARD_LANGUAGES: Array<{
	value: FlashcardLanguage;
	label: string;
	nativeName: string;
}> = [
	{ value: "en", label: "English", nativeName: "English" },
	{ value: "my", label: "Myanmar", nativeName: "မြန်မာ" },
	{ value: "es", label: "Spanish", nativeName: "Español" },
	{ value: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
	{ value: "th", label: "Thai", nativeName: "ไทย" },
];

export const AVAILABLE_MODELS: ModelOption[] = [
	{
		id: "openai/gpt-oss-20b",
		name: "GPT-OSS 20B",
		description:
			"21B-parameter MoE model (3.6B active) with 128K context and chain-of-thought reasoning. Optimized for local deployment on 16GB VRAM, comparable to o3-mini reasoning capability.",
		intelligenceScore: 75,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
			reasoning_effort: "medium",
		},
		initialGreeting:
			"Ready with GPT-OSS 20B. Ask me anything—code, reasoning, or research.",
	},
	{
		id: "openrouter:google/gemma-3-27b-it:free", // openrouter/google/gemma-3-12b-it:free
		name: "Gemma 3 27B IT (free)",
		description:
			"27B-parameter instruction-tuned model with 128K context and native multimodal (text+image) support. Strong multilingual performance and efficient inference.",
		intelligenceScore: 75,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
		},
		initialGreeting:
			"Ready with Gemma 3 27B IT (free) — multimodal, long-context.",
	},
	{
		id: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		name: "Nemotron 3 Nano 30B A3B (free)",
		description:
			"30B-parameter model (A3B variant) with 32K context window. Instruction-tuned for efficient text generation, summarization, and basic reasoning tasks.",
		intelligenceScore: 72,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32000,
		},
		defaultOptions: {
			max_tokens: 32000,
		},
		initialGreeting: "Ready with Nemotron 3 Nano 30B A3B (free).",
	},
	{
		id: "openrouter:mistralai/mistral-nemo",
		name: "Mistral Nemo",
		description:
			"12B-parameter model (Mistral-Nemo-2407) with 128K context and strong multilingual support (100+ languages). Optimized for general instruction following and conversation.",
		intelligenceScore: 72,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
		},
		initialGreeting: "Ready with Mistral Nemo — 12B parameters, 128K context.",
	},
	{
		id: "openai/gpt-oss-120b:exacto",
		name: "GPT-OSS 120B",
		description:
			"117B-parameter MoE model (5.1B active) with 128K context, chain-of-thought reasoning, and agentic capabilities. Comparable to o4-mini reasoning for complex tasks.",
		intelligenceScore: 88,
		capabilities: {
			supportsReasoning: true,
			supportsImages: true,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
			reasoning_effort: "medium",
		},
		initialGreeting:
			"Ready with GPT-OSS 120B. Ask me anything—code, reasoning, or research.",
	},
	{
		id: "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
		name: "Dolphin Mistral 24B Venice (free)",
		description:
			"24B-parameter uncensored variant by Cognitive Computations. Optimized for creative writing and roleplay with 32K context and instruction-following capability.",
		intelligenceScore: 68,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32768,
		},
		defaultOptions: {
			max_tokens: 32768,
		},
		initialGreeting:
			"Ready with Dolphin Mistral 24B Venice (free) — uncensored, creative.",
	},
	{
		id: "openrouter:microsoft/phi-4-reasoning-plus",
		name: "Phi-4 Reasoning Plus",
		description:
			"Microsoft's 14B-parameter Phi-4 with enhanced reasoning capabilities. Strong STEM performance and logical problem-solving with 32K context.",
		intelligenceScore: 78,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32768,
		},
		defaultOptions: {
			max_tokens: 32768,
			reasoning_effort: "high",
		},
		initialGreeting: "Ready with Phi-4 Reasoning Plus — strong STEM reasoning.",
	},
	{
		id: "openrouter:ai21/jamba-large-1.7",
		name: "Jamba Large 1.7",
		description:
			"AI21's hybrid SSM-Transformer architecture with 256K context window. Optimized for long-document analysis and efficient sequence processing.",
		intelligenceScore: 76,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 256000,
		},
		defaultOptions: {
			max_tokens: 256000,
		},
		initialGreeting:
			"Ready with Jamba Large 1.7 — 256K context, hybrid architecture.",
	},
	{
		id: "openrouter:qwen/qwen3-vl-235b-a22b-instruct",
		name: "Qwen3 VL 235B A22B Instruct",
		description:
			"Qwen's flagship 235B MoE multimodal model with 256K+ context, advanced vision-language understanding, OCR across 32 languages, and tool-use capabilities. Excels at visual coding and agentic UI tasks.",
		intelligenceScore: 70,
		capabilities: {
			supportsReasoning: true,
			supportsImages: true,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 256000,
		},
		defaultOptions: {
			max_tokens: 16384,
			reasoning_effort: "medium",
			temperature: 0.7,
		},
		instruction:
			"You are Qwen3-VL 235B Instruct. Provide accurate, step-by-step, text-grounded multimodal reasoning. When images are provided, describe observations precisely, cite regions if relevant, and avoid hallucinations.",
		initialGreeting:
			"Hi! I'm Qwen3-VL 235B. I can understand images and long documents, reason step-by-step, and help with visual coding or UI-oriented tasks.",
	},
	{
		id: "openrouter:xiaomi/mimo-v2-flash:free",
		name: "Mimo V2 Flash (free)",
		description:
			"Xiaomi's 309B-parameter lightweight model optimized for fast, cost-effective text generation with 8K context. Ideal for basic chat and summarization on modest hardware.",
		intelligenceScore: 82,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 8192,
		},
		defaultOptions: {
			max_tokens: 8192,
		},
		initialGreeting: "Ready with Mimo V2 Flash (free) — fast, lightweight.",
	},
	{
		id: "openrouter:meta-llama/llama-3.3-70b-instruct:free",
		name: "Llama-3.3-70B-Instruct (free)",
		description:
			"Meta's Llama 3.3 70B instruction-tuned model with 128K context, strong multilingual support, and excellent reasoning/tool-use capabilities. Best-in-class for general tasks at this scale.",
		intelligenceScore: 84,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
		},
		initialGreeting:
			"Ready with Llama-3.3-70B-Instruct (free) — high-performance, multilingual.",
	},
	{
		id: "openrouter:nvidia/nemotron-nano-9b-v2:free",
		name: "Nemotron Nano 9B v2 (free)",
		description:
			"NVIDIA's 9B-parameter Mamba2-Transformer hybrid model with 16K context. Optimized for efficient reasoning and multilingual text generation on edge devices.",
		intelligenceScore: 68,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 16384,
		},
		defaultOptions: {
			max_tokens: 16384,
		},
		initialGreeting:
			"Ready with Nemotron Nano 9B v2 (free) — efficient hybrid architecture.",
	},
	{
		id: "openrouter:qwen/qwen-2.5-vl-7b-instruct:free",
		name: "Qwen-2.5-VL-Instruct (free)",
		description:
			"7B-parameter vision-language model with 8K context. Supports text and image inputs for multimodal reasoning, OCR, and visual question answering.",
		intelligenceScore: 71,
		capabilities: {
			supportsReasoning: true,
			supportsImages: true,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 8192,
		},
		defaultOptions: {
			max_tokens: 8192,
		},
		initialGreeting:
			"Ready with Qwen-2.5-VL-Instruct (free) — multimodal vision-language.",
	},
	{
		id: "openrouter:z-ai/glm-4.5-air:free",
		name: "GLM 4.5 AiR (free)",
		description:
			"Z-AI's high-efficiency GLM 4.5 variant with 32K context and strong reasoning performance. Optimized for fast text generation and analytical tasks.",
		intelligenceScore: 82,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32000,
		},
		defaultOptions: {
			max_tokens: 32000,
		},
		initialGreeting:
			"Ready with GLM 4.5 AiR (free) — efficient reasoning, 32K context.",
	},
	{
		id: "openrouter:nvidia/nemotron-nano-12b-v2-vl:free",
		name: "Nemotron Nano 12B v2 VL (free)",
		description:
			"Vision-enabled 12B-parameter model supporting text and image inputs. Optimized for multimodal reasoning with 8K context and lightweight inference.",
		intelligenceScore: 69,
		capabilities: {
			supportsReasoning: true,
			supportsImages: true,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 8192,
		},
		defaultOptions: {
			max_tokens: 8192,
		},
		initialGreeting:
			"Ready with Nemotron Nano 12B v2 VL (free) — vision-language multimodal.",
	},
	{
		id: "openrouter:allenai/olmo-3-32b-think:free",
		name: "OLMo 3-32B Think (free)",
		description:
			"AllenAI's 32B-parameter reasoning-focused model with 32K context. Designed for chain-of-thought reasoning, complex problem-solving, and research analysis.",
		intelligenceScore: 76,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32768,
		},
		defaultOptions: {
			max_tokens: 32768,
		},
		initialGreeting:
			"Ready with OLMo 3-32B Think (free) — research-grade reasoning.",
	},
	{
		id: "openrouter:arcee-ai/trinity-mini:free",
		name: "Trinity Mini (free)",
		description:
			"Arcee AI's 3B-parameter efficient model optimized for instruction following and fast inference. Ideal for lightweight chat and basic tasks with 32K context.",
		intelligenceScore: 58,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 32768,
		},
		defaultOptions: {
			max_tokens: 32768,
		},
		initialGreeting:
			"Ready with Trinity Mini (free) — fast, efficient, lightweight.",
	},
	{
		id: "openrouter:kwaipilot/kat-coder-pro:free", // largest context size
		name: "KAT-Coder-Pro V1 (free)",
		description:
			"KwaiKAT's agentic coding model with 256K context. Achieves 73.4% solve rate on SWE-Bench Verified. Optimized for tool-use, multi-turn interaction, and real-world software engineering.",
		intelligenceScore: 78,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 262144,
		},
		defaultOptions: {
			max_tokens: 262144,
		},
		initialGreeting:
			"Ready with KAT-Coder-Pro V1 (free) — advanced agentic coding.",
	},
	{
		id: "openrouter:google/gemma-3n-e4b-it:free",
		name: "Gemma 3n 4B (free)",
		description:
			"Google's 4B-parameter on-device optimized model with 8K context. Supports text, vision, and audio inputs with dynamic parameter loading for mobile deployment.",
		intelligenceScore: 60,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: true,
			supportsTools: false,
			maxTokens: 8192,
		},
		defaultOptions: {
			max_tokens: 8192,
		},
		initialGreeting: "Ready with Gemma 3n 4B (free) — on-device multimodal.",
	},
	{
		id: "openrouter:deepseek/deepseek-r1-0528:free",
		name: "DeepSeek R1 0528 (free)",
		description:
			"DeepSeek's reasoning model with 8K context. Specialized for complex logic, mathematics, and problem-solving with explicit chain-of-thought capabilities.",
		intelligenceScore: 72,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 8192,
		},
		defaultOptions: {
			max_tokens: 8192,
		},
		initialGreeting:
			"Ready with DeepSeek R1 0528 (free) — reasoning specialist.",
		instruction: "Always Reply back in English Language Only",
	},
	{
		id: "openrouter:tngtech/deepseek-r1t2-chimera:free",
		name: "DeepSeek R1T2 Chimera (free)",
		description:
			"TNG Tech's 671B-parameter MoE Tri-parent merge (R1-0528 + R1 + V3-0324). Delivers 20% faster performance than R1 with 60K-130K effective context. Strong reasoning with consistent <think> token behavior.",
		intelligenceScore: 85,
		capabilities: {
			supportsReasoning: true,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 131072,
		},
		defaultOptions: {
			max_tokens: 65536,
		},
		initialGreeting:
			"Ready with DeepSeek R1T2 Chimera (free) — tri-parent reasoning merge.",
	},
	{
		id: "openrouter:meta-llama/llama-3.1-405b-instruct:free",
		name: "Llama 3.1 405B Instruct (free)",
		description:
			"Meta's 405B-parameter flagship model with 128K context. Delivers near-frontier performance for general reasoning, instruction following, and complex task solving.",
		intelligenceScore: 86,
		capabilities: {
			supportsReasoning: false,
			supportsImages: false,
			supportsAudio: false,
			supportsTools: false,
			maxTokens: 128000,
		},
		defaultOptions: {
			max_tokens: 128000,
		},
		initialGreeting:
			"Ready with Llama 3.1 405B Instruct (free) — flagship open-weight performance.",
	},
];

export const AVAILABLE_TTS_MODELS: ModelOption[] = [
	{
		id: "gpt-4o-mini-tts",
		name: "GPT-4o Mini TTS",
		description: "Latest TTS model with best quality",
	},
	{
		id: "tts-1",
		name: "TTS-1",
		description: "Standard text-to-speech",
	},
	{
		id: "tts-1-hd",
		name: "TTS-1 HD",
		description: "High definition text-to-speech",
	},
];

export const AVAILABLE_TTS_VOICES: VoiceOption[] = [
	{ id: "alloy", name: "Alloy", description: "Neutral and balanced" },
	{ id: "echo", name: "Echo", description: "Warm and clear" },
	{ id: "fable", name: "Fable", description: "British accent, expressive" },
	{ id: "onyx", name: "Onyx", description: "Deep and authoritative" },
	{ id: "nova", name: "Nova", description: "Friendly and upbeat" },
	{ id: "shimmer", name: "Shimmer", description: "Soft and gentle" },
];

export const LOCAL_STORAGE_KEYS = {
	SESSIONS: "puter_chat_sessions",
	FOLDERS: "puter_chat_folders",
	SETTINGS: "puter_chat_settings",
	THEME: "puter_chat_theme",
} as const;
