---

```markdown
# Synapse - Intelligent Productivity Suite

A comprehensive AI-powered productivity application built with Next.js 16, TypeScript, and Puter.js. Combines multi-model chat, intelligent flashcards, and advanced planning tools into one seamless experience.

## ✨ Features

### 🤖 Multi-Model Chat
- Support for multiple AI models including GPT-OSS, Gemma, Mistral, Phi-4, and more
- Native reasoning mode with adjustable effort levels (low, medium, high, xhigh)
- File attachments for text, images, and audio
- Real-time message streaming with error handling
- Session management with local storage persistence

### 🧠 AI Flashcard System
- AI-powered flashcard generation from any topic
- OCR text extraction from images
- Spaced repetition learning algorithm
- Drag-and-drop card organization
- Visual card stacking and animations

### 📅 Advanced Planner
- Interactive calendar view with react-big-calendar
- Pomodoro timer integration
- AI-powered time block generation
- Gamification system with achievements
- Task management and scheduling

### 🎨 Modern UI/UX
- Beautiful dark/light theme with smooth transitions
- Responsive design (desktop and mobile)
- shadcn/ui component library
- Streaming cursor indicators
- Toast notifications (Sonner)
- Loading states and error boundaries

### 🔧 Technical Highlights
- Next.js 16 App Router architecture
- Zustand + Immer for state management
- Tailwind CSS v4 configuration
- TypeScript with strict typing
- Puter.js cloud integration
- Background task management

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/codewiththiha/synapse.git
cd puter-gui

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
├── app/                      # Next.js app directory
│   ├── auth/                # Authentication pages
│   ├── cards/               # Flashcard management
│   ├── chat/                # Chat interface
│   ├── planner/             # Planning tools
│   ├── tts/                 # Text-to-speech
│   └── layout.tsx           # Root layout with Puter script
├── components/
│   ├── cards/               # Flashcard components
│   ├── chat-ui/             # Chat interface components
│   ├── planner/             # Planner components
│   ├── shared/              # Shared utilities
│   └── ui/                  # shadcn/ui components
├── hooks/                   # Custom React hooks
├── stores/                  # Zustand state stores
├── providers/               # React context providers
└── docs/                    # Documentation
```

## 🔑 Key Concepts

### State Management

The application uses **Zustand + Immer** for efficient state management. See the stores in [`stores/`](stores/) for examples:
- [`use-chat.ts`](stores/use-chat.ts) - Chat sessions and messages
- [`use-flashcard-store.ts`](stores/use-flashcard-store.ts) - Flashcard data
- [`use-planner-store.ts`](stores/use-planner-store.ts) - Planner state

### Puter.js Integration

Puter.js provides AI capabilities and cloud storage. The Puter script is loaded in [`app/layout.tsx`](app/layout.tsx) and accessed via the custom hook in [`hooks/use-puter-sync.ts`](hooks/use-puter-sync.ts).

### Tailwind CSS v4

This project uses the new **Tailwind CSS v4** with CSS-first configuration. Theme customization is done in [`app/globals.css`](app/globals.css) using the `@theme` directive.

## 🛠️ Customization

### Adding New AI Models

Edit the model configuration to add new models:

```typescript
// Add to your model config
{
  id: "your-model-id",
  name: "Your Model Name",
  capabilities: {
    supportsReasoning: true,
    supportsImages: false,
    supportsAudio: false,
    maxTokens: 100000,
  },
  defaultOptions: {
    max_tokens: 100000,
    reasoning_effort: "medium",
  }
}
```

### Theme Customization

Modify [`app/globals.css`](app/globals.css) to customize colors and styles:

```css
@theme {
  --color-primary: 220 90% 56%;
  --color-background: 0 0% 100%;
  --font-custom: "Your Font", sans-serif;
}
```

## 📚 Documentation

For detailed guides on specific features, see:

- [Project Structure Guide](3-project-structure-guide)
- [Next.js 16 App Router Architecture](4-next-js-16-app-router-architecture)
- [State Management with Zustand](5-state-management-with-zustand-immer)
- [AI Card Generation Pipeline](12-ai-card-generation-pipeline)
- [Calendar View Implementation](16-calendar-view-with-react-big-calendar)
- [Gamification System](19-gamification-system)

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📦 Key Dependencies

- **Next.js** 16.1.1 - React framework
- **React** 19.2.3 - UI library
- **Zustand** 5.0.9 - State management
- **Immer** 11.1.3 - Immutable state updates
- **Tailwind CSS** 4 - Styling
- **shadcn/ui** - Component library
- **Puter.js** - AI platform integration
- **react-big-calendar** - Calendar component
- **Framer Motion** - Animations
- **React Query** - Data fetching
- **Sonner** - Toast notifications

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

I just decided to opensource this do whatever you want with my codes

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Puter.js](https://puter.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ using Next.js and Puter.js**
```

---

