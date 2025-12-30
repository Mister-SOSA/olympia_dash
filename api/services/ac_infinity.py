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
import aiohttp
from typing import Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

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
    raw_data: dict


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
    
    def is_configured(self) -> bool:
        """Check if credentials are configured"""
        return bool(self._email and self._password)
    
    def is_logged_in(self) -> bool:
        """Check if we have a valid session"""
        return self._user_id is not None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """Close the HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()
        self._session = None
    
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
                raw_data=data
            )
        except Exception as e:
            logger.error(f"Error parsing port data: {e}")
            return None
    
    async def get_port_settings(self, device_id: str, port: int) -> dict:
        """
        Get detailed settings for a specific port.
        
        Args:
            device_id: The controller device ID
            port: Port index (0 = controller itself, 1-4 = ports)
        
        Returns:
            Dict of port settings
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
        
        # First get existing settings
        current = await self.get_port_settings(device_id, port)
        
        # Build update payload with existing values
        payload = {
            "devId": device_id,
            "port": port,
            "onSpead": power,  # Note: typo is intentional (API quirk)
            # Copy other required fields from current settings
            "offSpead": current.get("offSpead", 0),
            "atType": current.get("atType", 2),  # 2 = manual mode
        }
        
        # URL-encode and send
        from urllib.parse import urlencode
        response = await self._post(
            f"{API_URL_ADD_DEV_MODE}?{urlencode(payload)}",
            use_auth=True
        )
        
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
_loop: Optional[asyncio.AbstractEventLoop] = None


def get_event_loop() -> asyncio.AbstractEventLoop:
    """Get or create a dedicated event loop for AC Infinity operations"""
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_loop)
    return _loop


def get_client() -> ACInfinityClient:
    """Get the singleton AC Infinity client"""
    global _client
    if _client is None:
        _client = ACInfinityClient()
    return _client


def reset_client():
    """Reset the client (useful if credentials change)"""
    global _client, _loop
    if _client is not None:
        try:
            loop = get_event_loop()
            loop.run_until_complete(_client.close())
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
        loop = get_event_loop()
        controllers = loop.run_until_complete(client.get_controllers())
        
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
        loop = get_event_loop()
        loop.run_until_complete(client.set_port_power(device_id, port, speed))
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
