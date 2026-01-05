"""
AC Infinity API Service

This module provides access to the AC Infinity cloud API
for monitoring and controlling AC Infinity fan controllers.

Supported controllers (WiFi-enabled):
- Controller 69 WiFi
- Controller 69 Pro
- Controller 69 Pro+
- Controller AI+

Based on the Home Assistant AC Infinity integration by dalinicus:
https://github.com/dalinicus/homeassistant-acinfinity
"""

import os
import time
import logging
import asyncio
import threading
import aiohttp
import nest_asyncio
from typing import Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

# Allow nested event loops (needed for Flask threading)
nest_asyncio.apply()

logger = logging.getLogger(__name__)

# Configuration from environment variables
AC_INFINITY_EMAIL = os.getenv('AC_INFINITY_EMAIL', '')
AC_INFINITY_PASSWORD = os.getenv('AC_INFINITY_PASSWORD', '')

# API Configuration
AC_INFINITY_HOST = "http://www.acinfinityserver.com"
API_URL_LOGIN = "/api/user/appUserLogin"
API_URL_GET_DEVICE_INFO_LIST_ALL = "/api/user/devInfoListAll"
API_URL_GET_DEV_MODE_SETTING = "/api/dev/getdevModeSettingList"
API_URL_ADD_DEV_MODE = "/api/dev/addDevMode"
API_URL_GET_DEV_SETTING = "/api/dev/getDevSetting"

# Controller types
CONTROLLER_TYPES = {
    11: "UIS 69 Pro",
    18: "UIS 69 Pro+", 
    20: "UIS 89 AI+",
    21: "UIS Outlet AI",
    22: "UIS Outlet AI+",
}

# Cache settings
CACHE_DURATION_SECONDS = 30  # How long to cache API responses


@dataclass
class ACInfinityController:
    """Represents an AC Infinity controller device"""
    device_id: str
    device_name: str
    device_code: str
    mac_address: str
    device_type: int
    device_type_name: str
    firmware_version: str
    hardware_version: str
    is_online: bool
    temperature: float  # Celsius
    temperature_f: float  # Fahrenheit
    humidity: float  # Percentage
    vpd: float  # VPD value
    ports: list
    raw_data: dict


@dataclass
class ACInfinityPort:
    """Represents a port on an AC Infinity controller (fan/device)"""
    port_index: int
    port_name: str
    device_type: int
    is_online: bool
    current_power: int  # 0-10
    speak: int  # Sound/notification setting
    load_state: int
    current_mode: int  # Current operating mode (1=Off, 2=On, 3=Auto, etc.)
    raw_data: dict


# Operating modes
class AtType:
    OFF = 1
    ON = 2
    AUTO = 3
    TIMER_TO_ON = 4
    TIMER_TO_OFF = 5
    CYCLE = 6
    SCHEDULE = 7
    VPD = 8

MODE_NAMES = {
    AtType.OFF: "Off",
    AtType.ON: "On", 
    AtType.AUTO: "Auto",
    AtType.TIMER_TO_ON: "Timer to On",
    AtType.TIMER_TO_OFF: "Timer to Off",
    AtType.CYCLE: "Cycle",
    AtType.SCHEDULE: "Schedule",
    AtType.VPD: "VPD",
}


class ACInfinityClient:
    """Client for interacting with the AC Infinity cloud API"""
    
    def __init__(self, email: Optional[str] = None, password: Optional[str] = None):
        self._email = email or AC_INFINITY_EMAIL
        self._password = password or AC_INFINITY_PASSWORD
        self._user_id: Optional[str] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_fetch: Optional[datetime] = None
        self._cached_controllers: list[ACInfinityController] = []
        self._lock = asyncio.Lock()
        self._bound_loop: Optional[asyncio.AbstractEventLoop] = None  # Track which loop the session is bound to
    
    def is_configured(self) -> bool:
        """Check if credentials are configured"""
        return bool(self._email and self._password)
    
    def is_logged_in(self) -> bool:
        """Check if we have a valid session"""
        return self._user_id is not None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session bound to the current event loop"""
        current_loop = asyncio.get_event_loop()
        # If session exists but is bound to a different/closed loop, close it
        if self._session is not None:
            if self._session.closed or self._bound_loop != current_loop or (self._bound_loop and self._bound_loop.is_closed()):
                try:
                    if not self._session.closed:
                        await self._session.close()
                except:
                    pass
                self._session = None
        
        if self._session is None:
            self._session = aiohttp.ClientSession()
            self._bound_loop = current_loop
        return self._session
    
    async def close(self):
        """Close the HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()
        self._session = None
        self._bound_loop = None
    
    def _create_headers(self, use_auth: bool = False) -> dict:
        """Create headers for API requests"""
        headers = {
            "User-Agent": "okhttp/4.12.0",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        if use_auth and self._user_id:
            headers["token"] = self._user_id
        return headers
    
    async def _post(self, path: str, data: Optional[dict] = None, use_auth: bool = False) -> dict:
        """Make a POST request to the API"""
        session = await self._get_session()
        headers = self._create_headers(use_auth=use_auth)
        url = f"{AC_INFINITY_HOST}{path}"
        
        async with session.post(url, data=data, headers=headers) as response:
            if response.status != 200:
                raise ACInfinityConnectionError(f"HTTP {response.status}")
            
            body = await response.json()
            
            if body.get("code") != 200:
                if path == API_URL_LOGIN:
                    raise ACInfinityAuthError(body.get("msg", "Login failed"))
                raise ACInfinityRequestError(body.get("msg", "Request failed"))
            
            return body
    
    async def login(self) -> bool:
        """
        Login to AC Infinity API and obtain user token.
        
        Note: AC Infinity API truncates passwords to 25 characters.
        """
        if not self.is_configured():
            raise ACInfinityAuthError("AC Infinity credentials not configured")
        
        # API truncates passwords to 25 chars (matches mobile app behavior)
        normalized_password = self._password[:25]
        
        try:
            response = await self._post(
                API_URL_LOGIN,
                data={
                    "appEmail": self._email,
                    "appPasswordl": normalized_password,  # Note: typo is intentional (API quirk)
                }
            )
            self._user_id = response["data"]["appId"]
            logger.info(f"AC Infinity login successful for {self._email}")
            return True
        except Exception as e:
            logger.error(f"AC Infinity login failed: {e}")
            self._user_id = None
            raise
    
    async def get_controllers(self, force_refresh: bool = False) -> list[ACInfinityController]:
        """
        Get all controllers associated with the account.
        
        Uses caching to avoid hammering the API.
        
        Args:
            force_refresh: Skip cache and fetch fresh data
        
        Returns:
            List of ACInfinityController objects
        """
        async with self._lock:
            # Check cache
            if not force_refresh and self._cached_controllers and self._last_fetch:
                cache_age = datetime.now() - self._last_fetch
                if cache_age < timedelta(seconds=CACHE_DURATION_SECONDS):
                    return self._cached_controllers
            
            # Ensure we're logged in
            if not self.is_logged_in():
                await self.login()
            
            try:
                response = await self._post(
                    API_URL_GET_DEVICE_INFO_LIST_ALL,
                    data={"userId": self._user_id},
                    use_auth=True
                )
                
                controllers = []
                for device_data in response.get("data", []):
                    controller = self._parse_controller(device_data)
                    if controller:
                        controllers.append(controller)
                
                self._cached_controllers = controllers
                self._last_fetch = datetime.now()
                
                return controllers
                
            except ACInfinityAuthError:
                # Token might have expired, try re-login
                self._user_id = None
                await self.login()
                return await self.get_controllers(force_refresh=True)
    
    def _parse_controller(self, data: dict) -> Optional[ACInfinityController]:
        """Parse raw API data into an ACInfinityController object"""
        try:
            device_info = data.get("deviceInfo", {})
            device_type = data.get("devType", 0)
            
            # Parse temperature (API returns temp * 100)
            raw_temp = device_info.get("temperature", 0)
            raw_temp_f = device_info.get("temperatureF", 0)
            temperature_c = raw_temp / 100 if raw_temp else 0
            temperature_f = raw_temp_f / 100 if raw_temp_f else 0
            
            # Parse humidity (API returns humidity * 100)
            raw_humidity = device_info.get("humidity", 0)
            humidity = raw_humidity / 100 if raw_humidity else 0
            
            # Parse VPD
            raw_vpd = device_info.get("vpdnums", 0)
            vpd = raw_vpd / 100 if raw_vpd else 0
            
            # Parse ports (connected fans/devices)
            ports = []
            for port_data in device_info.get("ports", []):
                port = self._parse_port(port_data)
                if port:
                    ports.append(port)
            
            return ACInfinityController(
                device_id=str(data.get("devId", "")),
                device_name=data.get("devName", "Unknown"),
                device_code=data.get("devCode", ""),
                mac_address=data.get("devMacAddr", ""),
                device_type=device_type,
                device_type_name=CONTROLLER_TYPES.get(device_type, f"Unknown ({device_type})"),
                firmware_version=data.get("firmwareVersion", ""),
                hardware_version=data.get("hardwareVersion", ""),
                is_online=data.get("online", 0) == 1,
                temperature=temperature_c,
                temperature_f=temperature_f,
                humidity=humidity,
                vpd=vpd,
                ports=ports,
                raw_data=data
            )
        except Exception as e:
            logger.error(f"Error parsing controller data: {e}")
            return None
    
    def _parse_port(self, data: dict) -> Optional[ACInfinityPort]:
        """Parse raw API data into an ACInfinityPort object"""
        try:
            return ACInfinityPort(
                port_index=data.get("port", 0),
                port_name=data.get("portName", f"Port {data.get('port', 0)}"),
                device_type=data.get("loadType", 0),
                is_online=data.get("online", 0) == 1,
                current_power=data.get("speak", 0),  # Current fan speed 0-10
                speak=data.get("speak", 0),
                load_state=data.get("loadState", 0),
                current_mode=data.get("curMode", 2),  # Default to On mode
                raw_data=data
            )
        except Exception as e:
            logger.error(f"Error parsing port data: {e}")
            return None

    def _build_update_payload(self, current: dict, device_id: str, port: int) -> dict:
        """
        Build a complete payload for updating port settings.
        The AC Infinity API requires ALL fields to be sent, so we copy
        all existing values and then override what we want to change.
        
        Args:
            current: Current settings from get_port_settings
            device_id: Controller device ID
            port: Port number
        
        Returns:
            Dict with all required fields
        """
        # These are all the fields required by the AC Infinity API
        # Values default to 0 if not present in current settings
        return {
            # Required identifiers
            "devId": device_id,
            "port": port,
            "modeSetid": current.get("modeSetid", ""),
            "externalPort": current.get("externalPort", port),
            
            # Speed settings
            "onSpead": current.get("onSpead", 5),
            "offSpead": current.get("offSpead", 0),
            "onSelfSpead": current.get("onSelfSpead", 0),
            
            # Mode settings
            "atType": current.get("atType", 2),  # Default to On mode
            "modeType": current.get("modeType", 0),
            "masterPort": current.get("masterPort", 0),
            "surplus": current.get("surplus", 0),
            
            # Temperature triggers (Auto mode)
            "activeHt": current.get("activeHt", 0),
            "devHt": current.get("devHt", 90),
            "devHtf": current.get("devHtf", 194),
            "activeLt": current.get("activeLt", 0),
            "devLt": current.get("devLt", 32),
            "devLtf": current.get("devLtf", 90),
            
            # Humidity triggers (Auto mode)
            "activeHh": current.get("activeHh", 0),
            "devHh": current.get("devHh", 90),
            "activeLh": current.get("activeLh", 0),
            "devLh": current.get("devLh", 30),
            
            # Timer settings
            "acitveTimerOn": current.get("acitveTimerOn", 0),
            "acitveTimerOff": current.get("acitveTimerOff", 0),
            
            # Cycle settings
            "activeCycleOn": current.get("activeCycleOn", 0),
            "activeCycleOff": current.get("activeCycleOff", 0),
            
            # Schedule settings
            "schedStartTime": current.get("schedStartTime", 0),
            "schedEndtTime": current.get("schedEndtTime", 0),
            
            # VPD settings
            "activeHtVpd": current.get("activeHtVpd", 0),
            "activeLtVpd": current.get("activeLtVpd", 0),
            "activeHtVpdNums": current.get("activeHtVpdNums", 0),
            "activeLtVpdNums": current.get("activeLtVpdNums", 0),
            "targetVpd": current.get("targetVpd", 0),
            "targetVpdSwitch": current.get("targetVpdSwitch", 0),
            "settingMode": current.get("settingMode", 0),
            "vpdSettingMode": current.get("vpdSettingMode", 0),
            
            # Other settings
            "targetTSwitch": current.get("targetTSwitch", 0),
            "targetHumiSwitch": current.get("targetHumiSwitch", 0),
            "targetTemp": current.get("targetTemp", 0),
            "targetTempF": current.get("targetTempF", 32),
            "targetHumi": current.get("targetHumi", 0),
            "isUpdateVpdNums": current.get("isUpdateVpdNums", False),
        }
    
    async def get_port_settings(self, device_id: str, port: int) -> dict:
        """
        Get detailed settings for a specific port.
        
        Args:
            device_id: The controller device ID
            port: Port index (0 = controller itself, 1-4 = ports)
        
        Returns:
            Dict of port settings including mode, triggers, timers, etc.
        """
        if not self.is_logged_in():
            await self.login()
        
        response = await self._post(
            API_URL_GET_DEV_MODE_SETTING,
            data={"devId": device_id, "port": port},
            use_auth=True
        )
        return response.get("data", {})
    
    async def set_port_power(self, device_id: str, port: int, power: int) -> bool:
        """
        Set the power/speed for a port.
        
        Args:
            device_id: The controller device ID
            port: Port index (1-4)
            power: Power level 0-10
        
        Returns:
            True if successful
        """
        if not self.is_logged_in():
            await self.login()
        
        # First get existing settings - API requires ALL fields to be sent
        current = await self.get_port_settings(device_id, port)
        
        # Build update payload with ALL existing values, then override what we want to change
        # The AC Infinity API requires all these fields to be present
        payload = self._build_update_payload(current, device_id, port)
        payload["onSpead"] = power  # Override speed
        
        # URL-encode and send
        from urllib.parse import urlencode
        logger.info(f"Setting port {port} speed to {power} for device {device_id}")
        logger.debug(f"Full payload: {payload}")
        
        response = await self._post(
            f"{API_URL_ADD_DEV_MODE}?{urlencode(payload)}",
            use_auth=True
        )
        
        logger.info(f"Speed set response: {response}")
        
        # Invalidate cache
        self._last_fetch = None
        
        return True

    async def set_port_mode(self, device_id: str, port: int, mode: int) -> bool:
        """
        Set the operating mode for a port.
        
        Args:
            device_id: The controller device ID
            port: Port index (1-4)
            mode: Mode (1=Off, 2=On, 3=Auto, 4=Timer to On, 5=Timer to Off, 6=Cycle, 7=Schedule, 8=VPD)
        
        Returns:
            True if successful
        """
        if not self.is_logged_in():
            await self.login()
        
        # Get existing settings - API requires ALL fields to be sent
        current = await self.get_port_settings(device_id, port)
        
        # Build update payload with ALL existing values
        payload = self._build_update_payload(current, device_id, port)
        payload["atType"] = mode  # Override mode
        
        # URL-encode and send
        from urllib.parse import urlencode
        logger.info(f"Setting port {port} mode to {mode} for device {device_id}")
        logger.debug(f"Full payload: {payload}")
        
        response = await self._post(
            f"{API_URL_ADD_DEV_MODE}?{urlencode(payload)}",
            use_auth=True
        )
        
        logger.info(f"Mode set response: {response}")
        
        # Invalidate cache
        self._last_fetch = None
        
        return True

    async def update_port_settings(self, device_id: str, port: int, settings: dict) -> bool:
        """
        Update multiple settings for a port.
        
        Args:
            device_id: The controller device ID
            port: Port index (1-4)
            settings: Dict of settings to update. Supports:
                - atType: Mode (1-8)
                - onSpead: On speed (0-10)
                - offSpead: Off speed (0-10)
                - devHt: Temperature high trigger (Auto mode)
                - devLt: Temperature low trigger (Auto mode)
                - devHh: Humidity high trigger (Auto mode)
                - devLh: Humidity low trigger (Auto mode)
                - targetVpd: Target VPD (VPD mode, *100)
                - activeHtVpdNums: VPD high trigger (*100)
                - activeLtVpdNums: VPD low trigger (*100)
        
        Returns:
            True if successful
        """
        if not self.is_logged_in():
            await self.login()
        
        # Get existing settings - API requires ALL fields
        current = await self.get_port_settings(device_id, port)
        
        # Build complete payload with all existing values
        payload = self._build_update_payload(current, device_id, port)
        
        # Override with the new settings
        for key, value in settings.items():
            payload[key] = value
            
            # Handle temperature settings - accept both C and F
            # If only C provided, calculate F. If both provided, use both directly.
            if key == "devHt" and "devHtf" not in settings:
                payload["devHtf"] = int(round((value * 1.8) + 32, 0))
            elif key == "devLt" and "devLtf" not in settings:
                payload["devLtf"] = int(round((value * 1.8) + 32, 0))
            elif key == "targetTemp" and "targetTempF" not in settings:
                payload["targetTempF"] = int(round((value * 1.8) + 32, 0))
            # Also handle when F is provided and C needs to be calculated
            elif key == "devHtf" and "devHt" not in settings:
                payload["devHt"] = int(round((value - 32) * 5 / 9, 0))
            elif key == "devLtf" and "devLt" not in settings:
                payload["devLt"] = int(round((value - 32) * 5 / 9, 0))
            elif key == "targetTempF" and "targetTemp" not in settings:
                payload["targetTemp"] = int(round((value - 32) * 5 / 9, 0))
        
        # URL-encode and send
        from urllib.parse import urlencode
        logger.info(f"Updating port {port} settings for device {device_id}: {settings}")
        logger.debug(f"Full payload: {payload}")
        
        response = await self._post(
            f"{API_URL_ADD_DEV_MODE}?{urlencode(payload)}",
            use_auth=True
        )
        
        logger.info(f"Update settings response: {response}")
        
        # Invalidate cache
        self._last_fetch = None
        
        return True


# Custom exceptions
class ACInfinityError(Exception):
    """Base exception for AC Infinity errors"""
    pass


class ACInfinityConnectionError(ACInfinityError):
    """Connection error"""
    pass


class ACInfinityAuthError(ACInfinityError):
    """Authentication error"""
    pass


class ACInfinityRequestError(ACInfinityError):
    """Request failed error"""
    pass


# Singleton client instance
_client: Optional[ACInfinityClient] = None
_lock = threading.Lock()  # Thread lock for client access
_thread_loops: dict = {}  # Store event loop per thread


def _run_async(coro):
    """
    Run an async coroutine in a thread-safe manner.
    
    Each thread gets its own persistent event loop to avoid session binding issues.
    """
    thread_id = threading.current_thread().ident
    
    # Get or create event loop for this thread
    if thread_id not in _thread_loops or _thread_loops[thread_id].is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        _thread_loops[thread_id] = loop
    else:
        loop = _thread_loops[thread_id]
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)


def get_client() -> ACInfinityClient:
    """Get the singleton AC Infinity client (thread-safe)"""
    global _client
    with _lock:
        if _client is None:
            _client = ACInfinityClient()
        return _client


def reset_client():
    """Reset the client (useful if credentials change)"""
    global _client
    with _lock:
        if _client is not None:
            try:
                _run_async(_client.close())
            except:
                pass
            _client = None


# Synchronous wrapper functions for Flask routes
def get_all_controllers() -> dict:
    """
    Get all AC Infinity controllers (synchronous wrapper).
    
    Returns:
        Dict with success status and controller data
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured",
            "data": []
        }
    
    try:
        controllers = _run_async(client.get_controllers())
        
        return {
            "success": True,
            "data": [
                {
                    "deviceId": c.device_id,
                    "deviceName": c.device_name,
                    "deviceCode": c.device_code,
                    "macAddress": c.mac_address,
                    "deviceType": c.device_type,
                    "deviceTypeName": c.device_type_name,
                    "firmwareVersion": c.firmware_version,
                    "isOnline": c.is_online,
                    "temperature": c.temperature,
                    "temperatureF": c.temperature_f,
                    "humidity": c.humidity,
                    "vpd": c.vpd,
                    "ports": [
                        {
                            "portIndex": p.port_index,
                            "portName": p.port_name,
                            "deviceType": p.device_type,
                            "isOnline": p.is_online,
                            "currentPower": p.current_power,
                            "currentMode": p.current_mode,
                            "currentModeName": MODE_NAMES.get(p.current_mode, "Unknown"),
                        }
                        for p in c.ports
                    ]
                }
                for c in controllers
            ],
            "timestamp": datetime.now().isoformat()
        }
            
    except ACInfinityAuthError as e:
        logger.error(f"AC Infinity auth error: {e}")
        return {
            "success": False,
            "error": f"Authentication failed: {str(e)}",
            "data": []
        }
    except ACInfinityConnectionError as e:
        logger.error(f"AC Infinity connection error: {e}")
        return {
            "success": False,
            "error": f"Connection failed: {str(e)}",
            "data": []
        }
    except Exception as e:
        logger.error(f"AC Infinity error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": []
        }


def get_controller_by_id(device_id: str) -> dict:
    """
    Get a specific controller by ID.
    
    Args:
        device_id: The device ID to look up
    
    Returns:
        Dict with success status and controller data
    """
    result = get_all_controllers()
    
    if not result["success"]:
        return result
    
    for controller in result["data"]:
        if controller["deviceId"] == device_id:
            return {
                "success": True,
                "data": controller
            }
    
    return {
        "success": False,
        "error": f"Controller {device_id} not found",
        "data": None
    }


def get_all_port_settings() -> dict:
    """
    Get port settings for all controllers and all ports in a single call.
    This is more efficient than making individual calls per port.
    
    Returns:
        Dict with success status and settings data organized by deviceId -> portIndex
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured"
        }
    
    try:
        # First get all controllers
        controllers = _run_async(client.get_controllers())
        
        all_settings: dict = {}
        
        for controller in controllers:
            device_id = controller.device_id
            all_settings[device_id] = {}
            
            for port in controller.ports:
                try:
                    settings = _run_async(client.get_port_settings(device_id, port.port_index))
                    
                    all_settings[device_id][port.port_index] = {
                        "mode": settings.get("atType", 2),
                        "modeName": MODE_NAMES.get(settings.get("atType", 2), "Unknown"),
                        "onSpeed": settings.get("onSpead", 0),
                        "offSpeed": settings.get("offSpead", 0),
                        # Auto mode settings
                        "tempHigh": settings.get("devHt", 0),
                        "tempLow": settings.get("devLt", 0),
                        "tempHighF": settings.get("devHtf", 32),
                        "tempLowF": settings.get("devLtf", 32),
                        "humidityHigh": settings.get("devHh", 0),
                        "humidityLow": settings.get("devLh", 0),
                        "tempHighEnabled": settings.get("activeHt", 0) == 1,
                        "tempLowEnabled": settings.get("activeLt", 0) == 1,
                        "humidityHighEnabled": settings.get("activeHh", 0) == 1,
                        "humidityLowEnabled": settings.get("activeLh", 0) == 1,
                        # VPD mode settings
                        "targetVpd": settings.get("targetVpd", 0) / 10 if settings.get("targetVpd") else 0,
                        "vpdHigh": settings.get("activeHtVpdNums", 0) / 10 if settings.get("activeHtVpdNums") else 0,
                        "vpdLow": settings.get("activeLtVpdNums", 0) / 10 if settings.get("activeLtVpdNums") else 0,
                        "vpdHighEnabled": settings.get("activeHtVpd", 0) == 1,
                        "vpdLowEnabled": settings.get("activeLtVpd", 0) == 1,
                    }
                except Exception as e:
                    logger.error(f"Error getting settings for {device_id}:{port.port_index}: {e}")
                    continue
        
        return {
            "success": True,
            "data": all_settings,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"AC Infinity error getting all port settings: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def set_fan_speed(device_id: str, port: int, speed: int) -> dict:
    """
    Set fan speed for a port (synchronous wrapper).
    
    Args:
        device_id: Controller device ID
        port: Port index (1-4)
        speed: Speed level 0-10
    
    Returns:
        Dict with success status
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured"
        }
    
    # Validate speed
    if not 0 <= speed <= 10:
        return {
            "success": False,
            "error": "Speed must be between 0 and 10"
        }
    
    try:
        _run_async(client.set_port_power(device_id, port, speed))
        return {
            "success": True,
            "message": f"Set port {port} speed to {speed}"
        }
            
    except Exception as e:
        logger.error(f"AC Infinity error setting speed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def get_port_settings(device_id: str, port: int) -> dict:
    """
    Get detailed settings for a specific port (synchronous wrapper).
    
    Args:
        device_id: Controller device ID
        port: Port index (1-4)
    
    Returns:
        Dict with success status and settings data
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured"
        }
    
    try:
        settings = _run_async(client.get_port_settings(device_id, port))
        
        # Parse settings into a cleaner structure
        return {
            "success": True,
            "data": {
                "mode": settings.get("atType", 2),
                "modeName": MODE_NAMES.get(settings.get("atType", 2), "Unknown"),
                "onSpeed": settings.get("onSpead", 0),
                "offSpeed": settings.get("offSpead", 0),
                # Auto mode settings
                "tempHigh": settings.get("devHt", 0),
                "tempLow": settings.get("devLt", 0),
                "tempHighF": settings.get("devHtf", 32),
                "tempLowF": settings.get("devLtf", 32),
                "humidityHigh": settings.get("devHh", 0),
                "humidityLow": settings.get("devLh", 0),
                "tempHighEnabled": settings.get("activeHt", 0) == 1,
                "tempLowEnabled": settings.get("activeLt", 0) == 1,
                "humidityHighEnabled": settings.get("activeHh", 0) == 1,
                "humidityLowEnabled": settings.get("activeLh", 0) == 1,
                # VPD mode settings
                "targetVpd": settings.get("targetVpd", 0) / 10 if settings.get("targetVpd") else 0,
                "vpdHigh": settings.get("activeHtVpdNums", 0) / 10 if settings.get("activeHtVpdNums") else 0,
                "vpdLow": settings.get("activeLtVpdNums", 0) / 10 if settings.get("activeLtVpdNums") else 0,
                "vpdHighEnabled": settings.get("activeHtVpd", 0) == 1,
                "vpdLowEnabled": settings.get("activeLtVpd", 0) == 1,
                # Timer/Cycle settings
                "timerOn": settings.get("acitveTimerOn", 0),
                "timerOff": settings.get("acitveTimerOff", 0),
                "cycleOn": settings.get("activeCycleOn", 0),
                "cycleOff": settings.get("activeCycleOff", 0),
                # Raw settings for advanced use
                "raw": settings,
            }
        }
            
    except Exception as e:
        logger.error(f"AC Infinity error getting port settings: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def set_port_mode(device_id: str, port: int, mode: int) -> dict:
    """
    Set operating mode for a port (synchronous wrapper).
    
    Args:
        device_id: Controller device ID
        port: Port index (1-4)
        mode: Mode (1=Off, 2=On, 3=Auto, 4=Timer to On, 5=Timer to Off, 6=Cycle, 7=Schedule, 8=VPD)
    
    Returns:
        Dict with success status
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured"
        }
    
    # Validate mode
    if mode not in MODE_NAMES:
        return {
            "success": False,
            "error": f"Invalid mode: {mode}. Must be 1-8."
        }
    
    try:
        _run_async(client.set_port_mode(device_id, port, mode))
        return {
            "success": True,
            "message": f"Set port {port} mode to {MODE_NAMES[mode]}"
        }
            
    except Exception as e:
        logger.error(f"AC Infinity error setting mode: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def update_port_settings(device_id: str, port: int, settings: dict) -> dict:
    """
    Update multiple settings for a port (synchronous wrapper).
    
    Args:
        device_id: Controller device ID
        port: Port index (1-4)
        settings: Dict of settings to update
    
    Returns:
        Dict with success status
    """
    client = get_client()
    
    if not client.is_configured():
        return {
            "success": False,
            "error": "AC Infinity credentials not configured"
        }
    
    try:
        _run_async(client.update_port_settings(device_id, port, settings))
        return {
            "success": True,
            "message": f"Updated port {port} settings"
        }
            
    except Exception as e:
        logger.error(f"AC Infinity error updating settings: {e}")
        return {
            "success": False,
            "error": str(e)
        }
