"""
Table Tracer - Instrumentation for datascience.Table operations
"""

from .tracer import enable, disable, get_trace, clear_trace, is_enabled

__version__ = "0.1.0"
__all__ = ["enable", "disable", "get_trace", "clear_trace", "is_enabled"]

