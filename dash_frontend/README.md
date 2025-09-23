# Olympia Dashboard Frontend

A modern, responsive dashboard built with Next.js, featuring customizable widgets and gridstack layout management.

## Features

- **Customizable Grid Layout**: Drag-and-drop dashboard with resizable widgets
- **Real-time Data**: Live updates from the backend API
- **Widget System**: Modular widget architecture for easy extensibility
- **Preset Layouts**: Pre-configured dashboard layouts for different use cases
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Widget Development

To add a new widget:

1. Create your widget component in `src/components/widgets/`
2. Add the widget to `src/components/widgets/widgetMap.ts`
3. Configure the widget in `src/constants/widgets.ts`

## Docker Support

The application can be containerized using the provided Dockerfile. Use docker-compose from the root directory to run the full stack.
