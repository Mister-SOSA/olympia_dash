FROM python:3.12.2

# Set working directory
WORKDIR /app

# Install system dependencies for pyodbc
RUN apt-get update && apt-get install -y \
    unixodbc \
    unixodbc-dev \
    libsqliteodbc \
    odbcinst \
    odbc-postgresql \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Flask's port
EXPOSE 5000

# Run Flask app
CMD ["python", "app.py"]