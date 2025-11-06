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
BEEF_HEART_CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'cache', 'usda_beef_heart_prices.json')
CACHE_DURATION_HOURS = 24  # Refresh data once per day

# USDA API configuration
USDA_BASE_URL = "https://mpr.datamart.ams.usda.gov/ws/report/v1/xb/LM_XB401"
USDA_BYPRODUCT_BASE_URL = "https://mymarketnews.ams.usda.gov/public_data/ajax-search-data-by-report/2834"

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


class USDABeefHeartService:
    """Service for fetching and caching USDA beef heart price data from by-product reports."""

    @staticmethod
    def _ensure_cache_dir():
        """Ensure the cache directory exists."""
        cache_dir = os.path.dirname(BEEF_HEART_CACHE_FILE)
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)

    @staticmethod
    def _load_cache() -> Optional[Dict]:
        """Load cached data if it exists and is valid."""
        if not os.path.exists(BEEF_HEART_CACHE_FILE):
            return None

        try:
            with open(BEEF_HEART_CACHE_FILE, 'r') as f:
                cache = json.load(f)

            # Check if cache is still fresh
            cached_time = datetime.fromisoformat(cache.get('timestamp', ''))
            if datetime.now() - cached_time < timedelta(hours=CACHE_DURATION_HOURS):
                logger.info("Using cached USDA beef heart price data")
                return cache
            else:
                logger.info("Cache expired, will fetch fresh beef heart data")
                return None
        except (json.JSONDecodeError, ValueError, OSError) as e:
            logger.warning(f"Failed to load beef heart cache: {e}")
            return None

    @staticmethod
    def _save_cache(data: Dict):
        """Save data to cache file."""
        USDABeefHeartService._ensure_cache_dir()
        try:
            with open(BEEF_HEART_CACHE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Cached USDA beef heart price data to {BEEF_HEART_CACHE_FILE}")
        except OSError as e:
            logger.error(f"Failed to save beef heart cache: {e}")

    @staticmethod
    def _fetch_from_usda(days_back: int = 180) -> Dict:
        """
        Fetch JSON data from USDA by-product API (report 2834).
        
        Args:
            days_back: Number of days of historical data to fetch
            
        Returns:
            JSON response as dict
        """
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        # Format dates as MM/DD/YYYY for the USDA API
        start_str = start_date.strftime("%m/%d/%Y")
        end_str = end_date.strftime("%m/%d/%Y")

        # Build the full URL manually - don't use params dict as it re-encodes
        url = f"{USDA_BYPRODUCT_BASE_URL}?q=report_begin_date={start_str}:{end_str}&preference=Report%20Details"

        # Use exact headers that work in curl/browser
        headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'max-age=0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        }

        logger.info(f"Fetching USDA beef heart prices from {start_str} to {end_str}")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        return response.json()

    @staticmethod
    def _parse_json(json_data: Dict) -> List[Dict]:
        """
        Parse JSON response and extract beef heart prices.
        
        Args:
            json_data: JSON response from USDA API
            
        Returns:
            List of price records with date and price data
        """
        results_dict = {}  # Use dict to aggregate by date

        if 'results' not in json_data:
            logger.warning("No results found in beef heart data")
            return []

        # Filter for beef heart items
        for record in json_data['results']:
            # Filter for Beef category and Heart item
            if (record.get('category') == 'Beef' and 
                'Heart' in record.get('item', '')):
                
                report_date = record.get('report_begin_date')
                if not report_date:
                    continue

                # Get weighted average price (already in dollars per CWT)
                price = record.get('wtd_avg_price')
                if price is None or price <= 0:
                    continue

                # Convert from $/CWT (hundredweight) to $/lb
                # 1 CWT = 100 lbs, so divide by 100
                price_per_lb = price / 100

                # Aggregate by date - take the average if multiple entries per date
                if report_date not in results_dict:
                    results_dict[report_date] = {
                        'date': report_date,
                        'beef_heart': price_per_lb,
                        'count': 1
                    }
                else:
                    # Average with existing price
                    existing = results_dict[report_date]
                    total_price = existing['beef_heart'] * existing['count'] + price_per_lb
                    existing['count'] += 1
                    existing['beef_heart'] = total_price / existing['count']

        # Convert to list and remove count field
        results = []
        for date_data in results_dict.values():
            results.append({
                'date': date_data['date'],
                'beef_heart': date_data['beef_heart']
            })

        # Sort by date
        results.sort(key=lambda x: datetime.strptime(x['date'], '%m/%d/%Y'))

        return results

    @staticmethod
    def get_beef_heart_prices(force_refresh: bool = False) -> Dict:
        """
        Get beef heart price data, either from cache or by fetching fresh data.
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            Dict with timestamp and price data
        """
        # Try to use cache first
        if not force_refresh:
            cache = USDABeefHeartService._load_cache()
            if cache:
                return cache

        # Fetch fresh data
        try:
            json_data = USDABeefHeartService._fetch_from_usda()
            prices = USDABeefHeartService._parse_json(json_data)

            result = {
                'timestamp': datetime.now().isoformat(),
                'data': prices,
                'count': len(prices)
            }

            # Save to cache
            USDABeefHeartService._save_cache(result)

            logger.info(f"Successfully fetched {len(prices)} beef heart price records from USDA")
            return result

        except Exception as e:
            logger.error(f"Failed to fetch USDA beef heart prices: {e}")
            # Try to return stale cache as fallback
            if os.path.exists(BEEF_HEART_CACHE_FILE):
                try:
                    with open(BEEF_HEART_CACHE_FILE, 'r') as f:
                        cache = json.load(f)
                    logger.warning("Using stale cache due to fetch error")
                    return cache
                except Exception:
                    pass

            raise Exception(f"Failed to fetch beef heart prices: {e}")


# Convenience function for direct use
def get_beef_heart_prices(force_refresh: bool = False) -> Dict:
    """Get beef heart price data."""
    return USDABeefHeartService.get_beef_heart_prices(force_refresh)
