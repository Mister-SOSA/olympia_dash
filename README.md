# Olympia Dashboard

A full-stack dashboard application with a Flask backend and Next.js frontend, featuring customizable widgets and real-time data visualization.

## Architecture

- **Backend**: Flask API (`/api`) - Handles data processing and API endpoints
- **Frontend**: Next.js dashboard (`/dash_frontend`) - Modern React-based UI with drag-and-drop widgets
- **Database**: SQL Server integration for data storage
- **Deployment**: Docker Compose for containerized deployment

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd olympia_dash

# Set up your database configuration
cp env.example api/.env
# Edit api/.env with your actual database credentials

# Start all services
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

**Note:** The dashboard will work without database configuration, but data widgets will show connection errors until you configure your SQL Server connection.

### Manual Setup

#### Backend (API)
```bash
cd api
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd dash_frontend
npm install
npm run dev
```

## Project Structure

```
olympia_dash/
├── api/                    # Flask backend
│   ├── app.py             # Main Flask application
│   ├── config.py          # Configuration settings
│   ├── database/          # Database models and connections
│   └── requirements.txt   # Python dependencies
├── dash_frontend/         # Next.js frontend
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── widgets/       # Dashboard widgets
│   │   └── utils/         # Utility functions
│   └── package.json       # Node.js dependencies
└── docker-compose.yml     # Container orchestration
```

## Features

- **Real-time Dashboard**: Live data updates and customizable layouts
- **Widget System**: Modular widget architecture for easy extensibility
- **Grid Layout**: Drag-and-drop dashboard with resizable widgets
- **Data Visualization**: Charts and graphs using Recharts
- **Weather Integration**: OpenMeteo API integration
- **Database Integration**: SQL Server connectivity with pyodbc
- **Containerized Deployment**: Docker support for easy deployment

## Development

Each service has its own README with detailed development instructions:
- [Frontend Documentation](./dash_frontend/README.md)
- Backend: See `/api` directory for Flask-specific setup

## Environment Variables

Create `.env` files in both `/api` and `/dash_frontend` directories as needed for your environment configuration.
