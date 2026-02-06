"""
Simple in-memory rate limiting for API endpoints
Tracks requests by IP address or session ID
"""
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter with sliding window"""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        """
        Initialize rate limiter

        Args:
            max_requests: Maximum requests allowed per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}  # Key -> list of request timestamps

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """
        Check if a request is allowed for the given key

        Args:
            key: Identifier (IP, session ID, etc.)

        Returns:
            Tuple of (allowed: bool, remaining_requests: int)
        """
        now = datetime.now()
        window_start = now - timedelta(seconds=self.window_seconds)

        if key not in self.requests:
            self.requests[key] = []

        # Remove old requests outside the window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if req_time > window_start
        ]

        # Check if under limit
        remaining = self.max_requests - len(self.requests[key])

        if remaining > 0:
            self.requests[key].append(now)
            return True, remaining
        else:
            return False, 0

    def cleanup(self):
        """Remove entries that are no longer being rate limited"""
        now = datetime.now()
        window_start = now - timedelta(seconds=self.window_seconds)

        keys_to_remove = []
        for key, timestamps in self.requests.items():
            # Remove old timestamps
            self.requests[key] = [
                ts for ts in timestamps if ts > window_start
            ]
            # Remove empty entries
            if not self.requests[key]:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self.requests[key]


# Global rate limiters for different endpoints
sms_limiter = RateLimiter(max_requests=5, window_seconds=60)  # 5 SMS per minute
chat_limiter = RateLimiter(max_requests=20, window_seconds=60)  # 20 chats per minute
eligibility_limiter = RateLimiter(max_requests=30, window_seconds=60)  # 30 checks per minute
