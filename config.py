"""
Configuration for Gaming Regulatory Tracker
Contains data sources, categories, and settings
"""

import os
from datetime import datetime, timedelta

# Email Configuration
EMAIL_CONFIG = {
    "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
    "sender_email": os.getenv("SENDER_EMAIL", ""),
    "sender_password": os.getenv("SENDER_PASSWORD", ""),
    "recipient_email": os.getenv("RECIPIENT_EMAIL", ""),
    "send_time": os.getenv("EMAIL_SEND_TIME", "08:00"),  # HH:MM format
}

# Tracking Configuration
LOOKBACK_HOURS = 24  # How far back to look for new content
DATABASE_PATH = "gaming_regulatory_tracker.db"

# Regulatory Sources for Gaming Industry
REGULATORY_SOURCES = {
    "US Federal Trade Commission": {
        "url": "https://www.ftc.gov/news-events/news/press-releases",
        "rss": "https://www.ftc.gov/news-events/news/press-releases/rss.xml",
        "keywords": ["gaming", "video game", "loot box", "in-game", "microtransaction", "esports", "online gaming"],
        "category": "Federal Regulator"
    },
    "ESRB News": {
        "url": "https://www.esrb.org/news/",
        "keywords": ["rating", "policy", "regulation", "enforcement"],
        "category": "Industry Self-Regulation"
    },
    "COPPA Updates": {
        "url": "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
        "keywords": ["children", "privacy", "online", "gaming"],
        "category": "Privacy Regulation"
    },
    "California Privacy Protection Agency": {
        "url": "https://cppa.ca.gov/regulations/",
        "keywords": ["gaming", "data", "privacy", "consumer"],
        "category": "State Privacy Regulator"
    },
    "UK Gambling Commission": {
        "url": "https://www.gamblingcommission.gov.uk/news",
        "keywords": ["loot box", "gaming", "video game", "virtual"],
        "category": "UK Regulator"
    },
    "European Commission Digital": {
        "url": "https://ec.europa.eu/commission/presscorner/home/en",
        "keywords": ["gaming", "video game", "digital services", "DSA", "DMA"],
        "category": "EU Regulator"
    },
    "SEC (Gaming Companies)": {
        "url": "https://www.sec.gov/news/pressreleases",
        "keywords": ["gaming", "video game", "activision", "electronic arts", "take-two"],
        "category": "Securities Regulator"
    }
}

# News Sources
NEWS_SOURCES = {
    "GamesIndustry.biz": {
        "rss": "https://www.gamesindustry.biz/feed",
        "keywords": ["regulation", "legal", "lawsuit", "settlement", "FTC", "court", "legislation", "law", "policy", "fine", "enforcement"],
        "category": "Industry News"
    },
    "Polygon": {
        "rss": "https://www.polygon.com/rss/index.xml",
        "keywords": ["regulation", "legal", "lawsuit", "legislation", "FTC", "law", "policy"],
        "category": "Gaming News"
    },
    "VGC (Video Games Chronicle)": {
        "rss": "https://www.videogameschronicle.com/feed/",
        "keywords": ["regulation", "legal", "lawsuit", "legislation", "law", "policy"],
        "category": "Gaming News"
    },
    "Law360 Gaming": {
        "url": "https://www.law360.com/gaming",
        "keywords": ["gaming", "video game", "esports"],
        "category": "Legal News"
    },
    "The Verge Gaming": {
        "rss": "https://www.theverge.com/rss/gaming/index.xml",
        "keywords": ["regulation", "legal", "lawsuit", "FTC", "antitrust", "legislation", "law"],
        "category": "Tech News"
    }
}

# Legal Development Keywords (for filtering relevance)
LEGAL_KEYWORDS = [
    # Regulatory Actions
    "regulation", "regulatory", "regulate", "regulator",
    "enforcement", "fine", "penalty", "sanction",
    "investigation", "inquiry", "probe",

    # Legal Proceedings
    "lawsuit", "litigation", "court", "judge", "ruling", "verdict",
    "settlement", "complaint", "class action",
    "injunction", "consent decree",

    # Legislation
    "legislation", "bill", "law", "statute", "act",
    "congress", "senate", "house", "legislative",
    "policy", "rule", "rulemaking",

    # Agencies
    "FTC", "SEC", "DOJ", "FCC", "COPPA", "ESRB",
    "gambling commission", "data protection",

    # Gaming-Specific Issues
    "loot box", "loot boxes", "microtransaction",
    "in-game purchase", "virtual currency",
    "esports", "e-sports", "competitive gaming",
    "age rating", "content rating",
    "data privacy", "children's privacy",
    "terms of service", "EULA", "end user license",
    "intellectual property", "copyright", "trademark",
    "antitrust", "monopoly", "merger", "acquisition",

    # Consumer Protection
    "consumer protection", "deceptive practice",
    "false advertising", "unfair practice",
    "refund", "consumer rights",

    # International
    "GDPR", "data protection", "DMA", "DSA",
    "digital markets", "digital services"
]

# Categories for organization
CATEGORIES = [
    "Federal Regulator",
    "State Regulator",
    "EU Regulator",
    "UK Regulator",
    "International Regulator",
    "Industry Self-Regulation",
    "Privacy Regulation",
    "Securities Regulator",
    "Industry News",
    "Gaming News",
    "Legal News",
    "Tech News"
]

# Priority levels based on source and content
PRIORITY_RULES = {
    "high": ["FTC", "DOJ", "SEC", "lawsuit", "enforcement", "fine", "ruling"],
    "medium": ["investigation", "bill", "legislation", "policy", "settlement"],
    "low": ["announcement", "statement", "comment"]
}
