"""
WSGI Entry Point for Gunicorn Production Server with eventlet.

This module provides the production entry point for the Olympia Dashboard API.
Gunicorn with eventlet worker class serves the Flask-SocketIO application with
full WebSocket support.

Usage:
    Development:  python app.py
    Production:   gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5001 wsgi:app

IMPORTANT: Flask-SocketIO with eventlet requires a SINGLE worker (-w 1).
For horizontal scaling, use multiple containers/pods behind a load balancer
with sticky sessions enabled.

For advanced configuration, see gunicorn.conf.py.
"""

import os
import time

# Eventlet monkey-patching MUST happen before importing app
# This patches standard library for async I/O compatibility
import eventlet
eventlet.monkey_patch()

# Import the Flask app and SocketIO instance
from app import app, socketio

# Store startup time as version if BUILD_VERSION not set
app.config['START_TIME'] = str(int(time.time()))
app.config['BUILD_VERSION'] = os.getenv('BUILD_VERSION', app.config['START_TIME'])
