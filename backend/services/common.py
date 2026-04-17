import re
from datetime import datetime


def to_utc_iso(dt):
    if dt is None:
        return None
    return dt.isoformat() + "Z"


def is_valid_email(email):
    if not email:
        return False
    return re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", email) is not None


def is_valid_phone(phone):
    if not phone:
        return False
    return re.fullmatch(r"1[3-9]\d{9}", phone) is not None


BANNED_WORDS = [
    "傻逼",
    "煞笔",
    "垃圾",
    "妈的",
    "你妈",
    "他妈",
    "去死",
    "死全家",
    "操你",
    "fuck",
    "shit",
    "nmsl",
    "sb",
]


def filter_banned_words(text):
    if not text:
        return text
    filtered = text
    for w in BANNED_WORDS:
        if not w:
            continue
        filtered = re.sub(re.escape(w), "*" * len(w), filtered, flags=re.IGNORECASE)
    return filtered
