"""
UniFi Access API Service

This module provides access to the UniFi Access Developer API
for retrieving entry logs and door access events.
"""

import os
import time
import logging
import requests
from typing import Optional, Literal

# Disable SSL warnings for self-signed certificates
requests.packages.urllib3.disable_warnings()

logger = logging.getLogger(__name__)

# Configuration from environment variables
UNIFI_ACCESS_HOST = os.getenv('UNIFI_ACCESS_HOST', '')
UNIFI_ACCESS_PORT = os.getenv('UNIFI_ACCESS_PORT', '12445')
UNIFI_ACCESS_TOKEN = os.getenv('UNIFI_ACCESS_TOKEN', '')

# API Base URL for Developer API
DEVELOPER_API_URL = f"https://{UNIFI_ACCESS_HOST}:{UNIFI_ACCESS_PORT}"

# Valid log topics
LogTopic = Literal[
    "all",
    "door_openings",
    "critical",
    "updates",
    "device_events",
    "admin_activity",
    "visitor"
]


def get_entry_logs(
    hours_back: int = 24,
    topic: LogTopic = "door_openings",
    actor_id: Optional[str] = None,
    page_num: int = 1,
    page_size: int = 100
) -> dict:
    """
    Fetch entry logs from UniFi Access Developer API.
    
    Args:
        hours_back: How many hours of logs to retrieve (default 24, max ~720 for 30 days)
        topic: Log topic filter - one of:
            - "all": All log types
            - "door_openings": Door access events (entries/exits)
            - "critical": Critical system events
            - "updates": System updates
            - "device_events": Device-related events
            - "admin_activity": Admin actions
            - "visitor": Visitor access events
        actor_id: Optional filter by specific user/visitor/device ID
        page_num: Page number for pagination (1-indexed)
        page_size: Number of results per page (max 100)
    
    Returns:
        Dict containing:
            - success: bool
            - data: list of log entries
            - total: total number of entries
            - error: error message if failed
    """
    now = int(time.time())
    since = now - (hours_back * 60 * 60)
    
    # Ensure we don't exceed 30 days (API limitation)
    max_since = now - (30 * 24 * 60 * 60)
    since = max(since, max_since)
    
    headers = {
        'Authorization': f'Bearer {UNIFI_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'topic': topic,
        'since': since,
        'until': now,
    }
    
    if actor_id:
        payload['actor_id'] = actor_id
    
    # Build URL with pagination params
    url = f"{DEVELOPER_API_URL}/api/v1/developer/system/logs"
    params = {
        'page_num': page_num,
        'page_size': min(page_size, 100),  # API max is 100
    }
    
    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            params=params,
            verify=False,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('code') != 'SUCCESS':
            return {
                'success': False,
                'error': result.get('msg', 'Unknown error from UniFi Access API'),
                'data': [],
                'total': 0
            }
        
        hits = result.get('data', {}).get('hits', [])
        total = result.get('data', {}).get('total', len(hits))
        
        # Transform data into a more usable format
        formatted_entries = []
        for entry in hits:
            formatted = format_log_entry(entry)
            if formatted:
                formatted_entries.append(formatted)
        
        return {
            'success': True,
            'data': formatted_entries,
            'total': total,
            'error': None
        }
        
    except requests.exceptions.Timeout:
        logger.error('UniFi Access API timeout')
        return {
            'success': False,
            'error': 'Connection to UniFi Access timed out',
            'data': [],
            'total': 0
        }
    except requests.exceptions.RequestException as e:
        logger.error(f'UniFi Access API error: {e}')
        return {
            'success': False,
            'error': f'Failed to connect to UniFi Access: {str(e)}',
            'data': [],
            'total': 0
        }
    except Exception as e:
        logger.error(f'Unexpected error fetching entry logs: {e}')
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'data': [],
            'total': 0
        }


def format_log_entry(entry: dict) -> Optional[dict]:
    """
    Transform a raw log entry into a standardized format.
    
    Args:
        entry: Raw entry from the UniFi Access API
        
    Returns:
        Formatted entry dict or None if invalid
    """
    try:
        # Handle potential None entry
        if not entry or not isinstance(entry, dict):
            return None
            
        source = entry.get('_source')
        if not source or not isinstance(source, dict):
            return None
            
        actor = source.get('actor') or {}
        event = source.get('event') or {}
        auth = source.get('authentication') or {}
        targets = source.get('target') or []
        
        # Ensure targets is a list
        if not isinstance(targets, list):
            targets = []
        
        # Find door name from targets
        door_name = None
        floor_name = None
        building_name = None
        device_name = None
        
        for target in targets:
            if not target or not isinstance(target, dict):
                continue
            target_type = target.get('type', '')
            if target_type == 'door':
                door_name = target.get('display_name')
            elif target_type == 'floor':
                floor_name = target.get('display_name')
            elif target_type == 'building':
                building_name = target.get('display_name')
            elif target_type in ('UA-G3-Pro', 'UAH-DOOR'):
                device_name = target.get('display_name')
        
        # Extract credential/method from authentication or event
        credential_provider = auth.get('credential_provider', '') or ''
        
        # Map credential providers to friendly names
        method_map = {
            'NFC': 'NFC',
            'FACE': 'Face',
            'PIN': 'PIN',
            'REMOTE': 'Remote',
            'REMOTE_THROUGH_UAH': 'Remote',
            'WALLET_NFC_APPLE': 'Apple Wallet',
            'WALLET_NFC_GOOGLE': 'Google Wallet',
            'FINGERPRINT': 'Fingerprint',
            'QR': 'QR Code',
        }
        
        access_method = 'Unknown'
        for key, name in method_map.items():
            if key in credential_provider.upper():
                access_method = name
                break
        
        # Parse event result
        result = event.get('result', 'UNKNOWN') or 'UNKNOWN'
        event_type = event.get('type', '') or ''
        log_key = event.get('log_key', '')
        display_message = event.get('display_message', '')
        
        # Determine if this is an entry, exit, or other event
        direction = 'entry'
        if 'exit' in log_key.lower() or 'exit' in display_message.lower():
            direction = 'exit'
        elif 'call' in log_key.lower():
            direction = 'call'
        
        return {
            'id': entry.get('_id'),
            'timestamp': entry.get('@timestamp'),
            'published': event.get('published'),
            
            # Actor (person)
            'actor_id': actor.get('id'),
            'actor_name': actor.get('display_name') or 'Unknown',
            'actor_type': actor.get('type', 'user'),
            
            # Event details
            'result': result,
            'event_type': event_type,
            'message': display_message,
            'direction': direction,
            
            # Access method
            'access_method': access_method,
            'credential_provider': credential_provider,
            
            # Location
            'door_name': door_name or device_name or 'Unknown Door',
            'floor': floor_name,
            'building': building_name,
            
            # Raw data for debugging
            'log_key': log_key,
            'tag': entry.get('tag'),
        }
        
    except Exception as e:
        logger.warning(f'Failed to format log entry: {e}')
        return None


def get_access_users() -> dict:
    """
    Fetch all users from UniFi Access.
    
    Returns:
        Dict containing success status and user list
    """
    headers = {
        'Authorization': f'Bearer {UNIFI_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }
    
    url = f"{DEVELOPER_API_URL}/api/v1/developer/users"
    
    try:
        response = requests.get(
            url,
            headers=headers,
            verify=False,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('code') != 'SUCCESS':
            return {
                'success': False,
                'error': result.get('msg', 'Unknown error'),
                'data': []
            }
        
        return {
            'success': True,
            'data': result.get('data', []),
            'error': None
        }
        
    except Exception as e:
        logger.error(f'Error fetching access users: {e}')
        return {
            'success': False,
            'error': str(e),
            'data': []
        }


def get_access_doors() -> dict:
    """
    Fetch all doors/devices from UniFi Access.
    
    Returns:
        Dict containing success status and door list
    """
    headers = {
        'Authorization': f'Bearer {UNIFI_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }
    
    url = f"{DEVELOPER_API_URL}/api/v1/developer/doors"
    
    try:
        response = requests.get(
            url,
            headers=headers,
            verify=False,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('code') != 'SUCCESS':
            return {
                'success': False,
                'error': result.get('msg', 'Unknown error'),
                'data': []
            }
        
        return {
            'success': True,
            'data': result.get('data', []),
            'error': None
        }
        
    except Exception as e:
        logger.error(f'Error fetching access doors: {e}')
        return {
            'success': False,
            'error': str(e),
            'data': []
        }
