"""
USDA MPR (Mandatory Price Reporting) Service

Fetches and caches beef price data from the USDA Market Price Reporting API.
Specifically tracks Chemical Lean Fresh 50% and 85% prices from National reports.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

import requests

logger = logging.getLogger(__name__)

# Cache configuration
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'cache', 'usda_beef_prices.json')
CACHE_DURATION_HOURS = 24  # Refresh data once per day

# USDA API configuration
USDA_BASE_URL = "https://mpr.datamart.ams.usda.gov/ws/report/v1/xb/LM_XB401"

# Items we're tracking (note: API returns double spaces)
TRACKED_ITEMS = {
    "Chemical Lean, Fresh  50%": "lean_50",
    "Chemical Lean, Fresh  85%": "lean_85"
}


class USDAMPRService:
    """Service for fetching and caching USDA beef price data."""

    @staticmethod
    def _ensure_cache_dir():
        """Ensure the cache directory exists."""
        cache_dir = os.path.dirname(CACHE_FILE)
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)

    @staticmethod
    def _load_cache() -> Optional[Dict]:
        """Load cached data if it exists and is valid."""
        if not os.path.exists(CACHE_FILE):
            return None

        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)

            # Check if cache is still fresh
            cached_time = datetime.fromisoformat(cache.get('timestamp', ''))
            if datetime.now() - cached_time < timedelta(hours=CACHE_DURATION_HOURS):
                logger.info("Using cached USDA beef price data")
                return cache
            else:
                logger.info("Cache expired, will fetch fresh data")
                return None
        except (json.JSONDecodeError, ValueError, OSError) as e:
            logger.warning(f"Failed to load cache: {e}")
            return None

    @staticmethod
    def _save_cache(data: Dict):
        """Save data to cache file."""
        USDAMPRService._ensure_cache_dir()
        try:
            with open(CACHE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Cached USDA beef price data to {CACHE_FILE}")
        except OSError as e:
            logger.error(f"Failed to save cache: {e}")

    @staticmethod
    def _fetch_from_usda(days_back: int = 180) -> str:
        """
        Fetch XML data from USDA API.
        
        Args:
            days_back: Number of days of historical data to fetch
            
        Returns:
            XML response as string
        """
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        # Format dates as MM/DD/YYYY for the USDA API
        start_str = start_date.strftime("%m/%d/%Y")
        end_str = end_date.strftime("%m/%d/%Y")

        # Build filter for API request
        filter_json = {
            "filters": [
                {
                    "fieldName": "Report date",
                    "operatorType": "BETWEEN",
                    "values": [start_str, end_str]
                }
            ]
        }

        params = {
            "filter": json.dumps(filter_json)
        }

        logger.info(f"Fetching USDA beef prices from {start_str} to {end_str}")
        response = requests.get(USDA_BASE_URL, params=params, timeout=30)
        response.raise_for_status()

        return response.text

    @staticmethod
    def _parse_xml(xml_data: str) -> List[Dict]:
        """
        Parse XML response and extract National Chemical Lean prices.
        
        Args:
            xml_data: XML response from USDA API
            
        Returns:
            List of price records with date and price data
        """
        root = ET.fromstring(xml_data)
        results = []

        # Iterate through each date's record
        for record in root.findall('.//record[@report_date]'):
            report_date = record.get('report_date')
            if not report_date:
                continue

            # Find the "National" report section
            national_report = None
            for report in record.findall('.//report[@label]'):
                if report.get('label') == 'National':
                    national_report = report
                    break

            if not national_report:
                continue

            # Extract prices for our tracked items
            price_data = {
                'date': report_date,
                'lean_50': None,
                'lean_85': None
            }

            for item_record in national_report.findall('.//record[@item_desc]'):
                item_desc = item_record.get('item_desc')
                if item_desc in TRACKED_ITEMS:
                    price_avg = item_record.get('price_range_avg')
                    if price_avg and price_avg != '.00':
                        try:
                            price_value = float(price_avg)
                            if price_value > 0:
                                key = TRACKED_ITEMS[item_desc]
                                price_data[key] = price_value
                        except ValueError:
                            logger.warning(f"Invalid price value: {price_avg}")

            # Only add records that have at least one price
            if price_data['lean_50'] is not None or price_data['lean_85'] is not None:
                results.append(price_data)

        # Sort by date
        results.sort(key=lambda x: datetime.strptime(x['date'], '%m/%d/%Y'))

        return results

    @staticmethod
    def get_beef_prices(force_refresh: bool = False) -> Dict:
        """
        Get beef price data, either from cache or by fetching fresh data.
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            Dict with timestamp and price data
        """
        # Try to use cache first
        if not force_refresh:
            cache = USDAMPRService._load_cache()
            if cache:
                return cache

        # Fetch fresh data
        try:
            xml_data = USDAMPRService._fetch_from_usda()
            prices = USDAMPRService._parse_xml(xml_data)

            result = {
                'timestamp': datetime.now().isoformat(),
                'data': prices,
                'count': len(prices)
            }

            # Save to cache
            USDAMPRService._save_cache(result)

            logger.info(f"Successfully fetched {len(prices)} price records from USDA")
            return result

        except Exception as e:
            logger.error(f"Failed to fetch USDA beef prices: {e}")
            # Try to return stale cache as fallback
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, 'r') as f:
                        cache = json.load(f)
                    logger.warning("Using stale cache due to fetch error")
                    return cache
                except Exception:
                    pass

            raise Exception(f"Failed to fetch beef prices: {e}")


# Convenience function for direct use
def get_beef_prices(force_refresh: bool = False) -> Dict:
    """Get beef price data."""
    return USDAMPRService.get_beef_prices(force_refresh)
