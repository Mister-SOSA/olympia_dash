FROM public.ecr.aws/docker/library/python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for pyodbc and Microsoft SQL Server
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unixodbc \
    unixodbc-dev \
    && curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Flask's port
EXPOSE 5001

# Health check for container orchestration
# Checks /health endpoint every 30s, timeout 10s, retries 3 times before unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Run with Gunicorn + eventlet for production (WebSocket support)
# --worker-class eventlet: Required for Flask-SocketIO WebSocket support
# -w 1: MUST be 1 worker for Flask-SocketIO (WebSockets are stateful)
# -c gunicorn.conf.py: Load configuration from file
# For scaling, use multiple container replicas with sticky sessions
CMD ["gunicorn", "-c", "gunicorn.conf.py", "wsgi:app"]