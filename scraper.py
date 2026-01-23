"""
Web scraping and content fetching module
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re
from urllib.parse import urljoin
import time

from config import (
    REGULATORY_SOURCES, NEWS_SOURCES, LEGAL_KEYWORDS,
    PRIORITY_RULES, LOOKBACK_HOURS
)


class ContentFetcher:
    def __init__(self, lookback_hours: int = LOOKBACK_HOURS):
        self.lookback_hours = lookback_hours
        self.cutoff_date = datetime.now() - timedelta(hours=lookback_hours)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def calculate_relevance_score(self, title: str, summary: str, keywords: List[str]) -> float:
        """Calculate how relevant content is based on keywords"""
        text = f"{title} {summary}".lower()
        matches = sum(1 for keyword in keywords if keyword.lower() in text)
        score = min(matches / len(keywords), 1.0) if keywords else 0.5
        return round(score, 2)

    def determine_priority(self, title: str, summary: str) -> str:
        """Determine priority level based on content"""
        text = f"{title} {summary}".lower()

        for priority, keywords in PRIORITY_RULES.items():
            if any(keyword.lower() in text for keyword in keywords):
                return priority

        return "medium"

    def is_relevant(self, title: str, summary: str, source_keywords: List[str]) -> bool:
        """Check if content is relevant based on keywords"""
        text = f"{title} {summary}".lower()

        # Check source-specific keywords
        if source_keywords:
            if any(keyword.lower() in text for keyword in source_keywords):
                return True

        # Check general legal keywords
        legal_matches = sum(1 for keyword in LEGAL_KEYWORDS if keyword.lower() in text)

        # Require at least 2 legal keyword matches for general relevance
        return legal_matches >= 2

    def fetch_rss_feed(self, rss_url: str, source_name: str, keywords: List[str], category: str) -> List[Dict]:
        """Fetch and parse RSS feed"""
        articles = []

        try:
            feed = feedparser.parse(rss_url)

            for entry in feed.entries:
                # Parse publication date
                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    pub_date = datetime(*entry.published_parsed[:6])
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    pub_date = datetime(*entry.updated_parsed[:6])

                # Check if within lookback period
                if pub_date and pub_date < self.cutoff_date:
                    continue

                title = entry.get('title', '')
                summary = entry.get('summary', '') or entry.get('description', '')
                link = entry.get('link', '')

                # Clean HTML from summary
                if summary:
                    summary = BeautifulSoup(summary, 'html.parser').get_text()
                    summary = ' '.join(summary.split())[:500]

                # Check relevance
                if not self.is_relevant(title, summary, keywords):
                    continue

                articles.append({
                    'title': title,
                    'url': link,
                    'source': source_name,
                    'category': category,
                    'summary': summary,
                    'published_date': pub_date.isoformat() if pub_date else '',
                    'priority': self.determine_priority(title, summary),
                    'relevance_score': self.calculate_relevance_score(title, summary, keywords)
                })

        except Exception as e:
            print(f"Error fetching RSS feed {rss_url}: {e}")

        return articles

    def fetch_web_page(self, url: str, source_name: str, keywords: List[str], category: str) -> List[Dict]:
        """Fetch and parse web page for articles"""
        articles = []

        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Look for article/news elements
            # This is a generic approach; may need customization per site
            article_elements = []

            # Try common article selectors
            for selector in ['article', '.article', '.news-item', '.press-release', '.post']:
                article_elements.extend(soup.select(selector))

            # If no articles found, try headline links
            if not article_elements:
                article_elements = soup.find_all(['h2', 'h3'], class_=re.compile('title|headline'))

            for element in article_elements[:50]:  # Limit to first 50 elements
                title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'a'])
                if not title_elem:
                    title_elem = element

                title = title_elem.get_text(strip=True)
                if not title or len(title) < 10:
                    continue

                # Get link
                link_elem = element.find('a')
                if link_elem and link_elem.get('href'):
                    link = urljoin(url, link_elem['href'])
                else:
                    continue

                # Get summary/description
                summary = ''
                summary_elem = element.find(['p', 'div'], class_=re.compile('summary|description|excerpt'))
                if summary_elem:
                    summary = summary_elem.get_text(strip=True)[:500]

                # Check relevance
                if not self.is_relevant(title, summary, keywords):
                    continue

                articles.append({
                    'title': title,
                    'url': link,
                    'source': source_name,
                    'category': category,
                    'summary': summary,
                    'published_date': '',
                    'priority': self.determine_priority(title, summary),
                    'relevance_score': self.calculate_relevance_score(title, summary, keywords)
                })

            # Deduplicate by URL
            seen_urls = set()
            unique_articles = []
            for article in articles:
                if article['url'] not in seen_urls:
                    seen_urls.add(article['url'])
                    unique_articles.append(article)

            return unique_articles

        except Exception as e:
            print(f"Error fetching web page {url}: {e}")

        return articles

    def fetch_all_sources(self) -> List[Dict]:
        """Fetch content from all configured sources"""
        all_articles = []

        print("Fetching regulatory sources...")
        for source_name, config in REGULATORY_SOURCES.items():
            print(f"  - {source_name}")
            keywords = config.get('keywords', [])
            category = config.get('category', 'Regulatory')

            if 'rss' in config:
                articles = self.fetch_rss_feed(
                    config['rss'], source_name, keywords, category
                )
                all_articles.extend(articles)
            elif 'url' in config:
                articles = self.fetch_web_page(
                    config['url'], source_name, keywords, category
                )
                all_articles.extend(articles)

            # Be respectful with rate limiting
            time.sleep(1)

        print("\nFetching news sources...")
        for source_name, config in NEWS_SOURCES.items():
            print(f"  - {source_name}")
            keywords = config.get('keywords', [])
            category = config.get('category', 'News')

            if 'rss' in config:
                articles = self.fetch_rss_feed(
                    config['rss'], source_name, keywords, category
                )
                all_articles.extend(articles)
            elif 'url' in config:
                articles = self.fetch_web_page(
                    config['url'], source_name, keywords, category
                )
                all_articles.extend(articles)

            time.sleep(1)

        # Sort by priority and relevance
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        all_articles.sort(
            key=lambda x: (priority_order.get(x['priority'], 1), -x['relevance_score'])
        )

        print(f"\nFound {len(all_articles)} relevant articles")
        return all_articles

    def test_source(self, source_name: str, config: Dict) -> Dict:
        """Test a single source and return results"""
        keywords = config.get('keywords', [])
        category = config.get('category', 'Test')

        result = {
            'source_name': source_name,
            'success': False,
            'articles': [],
            'error': None
        }

        try:
            if 'rss' in config:
                articles = self.fetch_rss_feed(
                    config['rss'], source_name, keywords, category
                )
            elif 'url' in config:
                articles = self.fetch_web_page(
                    config['url'], source_name, keywords, category
                )
            else:
                result['error'] = "No RSS or URL configured"
                return result

            result['articles'] = articles
            result['success'] = True

        except Exception as e:
            result['error'] = str(e)

        return result
