import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQL_SERVER_CONFIG = {
        'server': os.getenv('SQL_SERVER', ''),
        'database': os.getenv('SQL_DATABASE', ''),
        'username': os.getenv('SQL_USERNAME', ''),
        'password': os.getenv('SQL_PASSWORD', ''),
        'driver': os.getenv('SQL_DRIVER', ''),
        'trust_server_certificate': os.getenv('SQL_TRUST_CERT', '')
    }
    
    # Authentication configuration
    JWT_SECRET = os.getenv('JWT_SECRET', os.urandom(32).hex())
    MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
    MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
    MICROSOFT_TENANT_ID = os.getenv('MICROSOFT_TENANT_ID')
    MICROSOFT_REDIRECT_URI = os.getenv('MICROSOFT_REDIRECT_URI')
    ALLOWED_DOMAINS = os.getenv('ALLOWED_DOMAINS', '')
