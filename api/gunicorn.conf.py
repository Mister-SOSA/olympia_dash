"""
Gunicorn Configuration for Olympia Dashboard API
https://docs.gunicorn.org/en/stable/settings.html

This configuration is optimized for Flask-SocketIO with WebSocket support.
IMPORTANT: Flask-SocketIO with eventlet requires exactly 1 worker per process.
For horizontal scaling, use multiple container replicas with sticky sessions.

Usage:
    gunicorn -c gunicorn.conf.py wsgi:app
    or with CLI overrides:
    gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5001 wsgi:app
"""

import os
import multiprocessing

# =============================================================================
# BINDING & WORKERS
# =============================================================================

# Address to bind to (use 0.0.0.0 for all interfaces in Docker)
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:5001")

# Worker class - MUST be eventlet for Flask-SocketIO WebSocket support
worker_class = "eventlet"

# Number of workers - MUST be 1 for Flask-SocketIO with eventlet
# WebSocket connections are stateful and can't be load-balanced across workers
# For scaling, use multiple container replicas with sticky sessions
workers = 1

# Threads per worker (not used with eventlet, but set for documentation)
threads = 1

# =============================================================================
# TIMEOUTS & KEEP-ALIVE
# =============================================================================

# Worker timeout (seconds) - time before worker is killed and restarted
# Set high for WebSocket connections that can be long-lived
timeout = 120

# Keep-alive timeout (seconds) - how long to keep idle HTTP connections open
keepalive = 120

# Graceful shutdown timeout (seconds)
graceful_timeout = 30

# =============================================================================
# CONNECTION HANDLING
# =============================================================================

# Max simultaneous clients per worker
# eventlet can handle thousands of concurrent connections
worker_connections = 1000

# Backlog size - max queued connections
backlog = 2048

# =============================================================================
# LOGGING
# =============================================================================

# Access log location (use "-" for stdout in Docker)
accesslog = "-"

# Error log location (use "-" for stderr in Docker)
errorlog = "-"

# Log level: debug, info, warning, error, critical
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# Access log format
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sμs'

# =============================================================================
# PROCESS NAMING
# =============================================================================

# Process name (shows in ps, top, etc.)
proc_name = "olympia-api"

# =============================================================================
# SERVER MECHANICS
# =============================================================================

# Daemonize the process (False for Docker - Docker handles process management)
daemon = False

# Preload app before forking workers (faster startup, but shared state)
# Set to False for Flask-SocketIO to avoid shared state issues
preload_app = False

# Restart workers after this many requests (prevents memory leaks)
# Set to 0 to disable (eventlet handles this differently)
max_requests = 0

# Add jitter to max_requests to prevent all workers restarting at once
max_requests_jitter = 0

# =============================================================================
# SSL/TLS (typically handled by reverse proxy like nginx/traefik)
# =============================================================================

# certfile = "/path/to/cert.pem"
# keyfile = "/path/to/key.pem"

# =============================================================================
# HOOKS
# =============================================================================

def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    pass

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass

def worker_abort(worker):
    """Called when a worker receives SIGABRT (usually timeout)."""
    pass
