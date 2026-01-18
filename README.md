# Zenote - Minimalist Note-Taking App

Zenote is a minimalist note-taking application designed for focus and productivity. It features markdown support, AI-powered summaries, and beautiful export options.

## Features

- **Markdown Support** - Write notes in markdown format with live preview
- **AI-Powered Summaries** - Generate summaries using Gemini AI integration
- **Beautiful Export Options** - Export notes as images or ZIP files
- **Dark Mode** - Easy on the eyes in low-light conditions
- **Responsive Design** - Works on desktop and mobile devices
- **Capacitor Integration** - Ready for native mobile app deployment

## Technologies Used

- React 19
- TypeScript
- Capacitor (for native mobile apps)
- Gemini AI API
- Vite (build tool)
- html2canvas (for image export)

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables for Gemini API
4. Start development server: `npm run dev`

## Building for Production

```bash
npm run build
```

## Building Mobile App

This project is configured for Capacitor to build native mobile applications:

```bash
npm run build
npx cap sync
npx cap open android  # or ios
```

## Environment Variables

Create a `.env` file with your Gemini API key:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.