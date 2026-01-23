"""
Database module for tracking articles and developments
"""

import sqlite3
import hashlib
from datetime import datetime
from typing import List, Dict, Optional


class TrackerDatabase:
    def __init__(self, db_path: str = "gaming_regulatory_tracker.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Articles/developments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_hash TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                source TEXT NOT NULL,
                category TEXT,
                priority TEXT,
                summary TEXT,
                published_date TEXT,
                discovered_date TEXT NOT NULL,
                emailed INTEGER DEFAULT 0,
                relevance_score REAL
            )
        """)

        # Email log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sent_date TEXT NOT NULL,
                recipient TEXT NOT NULL,
                article_count INTEGER,
                status TEXT,
                error_message TEXT
            )
        """)

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovered_date
            ON articles(discovered_date)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_emailed
            ON articles(emailed)
        """)

        conn.commit()
        conn.close()

    @staticmethod
    def generate_content_hash(title: str, url: str) -> str:
        """Generate a unique hash for content deduplication"""
        content = f"{title}{url}".encode('utf-8')
        return hashlib.sha256(content).hexdigest()

    def article_exists(self, title: str, url: str) -> bool:
        """Check if an article already exists in the database"""
        content_hash = self.generate_content_hash(title, url)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*) FROM articles WHERE content_hash = ?
        """, (content_hash,))

        exists = cursor.fetchone()[0] > 0
        conn.close()
        return exists

    def add_article(self, article: Dict) -> bool:
        """Add a new article to the database"""
        content_hash = self.generate_content_hash(article['title'], article['url'])

        if self.article_exists(article['title'], article['url']):
            return False

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO articles (
                    content_hash, title, url, source, category, priority,
                    summary, published_date, discovered_date, relevance_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                content_hash,
                article['title'],
                article['url'],
                article['source'],
                article.get('category', ''),
                article.get('priority', 'medium'),
                article.get('summary', ''),
                article.get('published_date', ''),
                datetime.now().isoformat(),
                article.get('relevance_score', 0.5)
            ))

            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            conn.close()
            return False

    def get_unemailed_articles(self, limit: Optional[int] = None) -> List[Dict]:
        """Get articles that haven't been emailed yet"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        query = """
            SELECT id, title, url, source, category, priority, summary,
                   published_date, discovered_date, relevance_score
            FROM articles
            WHERE emailed = 0
            ORDER BY priority DESC, discovered_date DESC
        """

        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query)
        rows = cursor.fetchall()

        articles = []
        for row in rows:
            articles.append({
                'id': row[0],
                'title': row[1],
                'url': row[2],
                'source': row[3],
                'category': row[4],
                'priority': row[5],
                'summary': row[6],
                'published_date': row[7],
                'discovered_date': row[8],
                'relevance_score': row[9]
            })

        conn.close()
        return articles

    def mark_articles_emailed(self, article_ids: List[int]):
        """Mark articles as emailed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        placeholders = ','.join('?' * len(article_ids))
        cursor.execute(f"""
            UPDATE articles
            SET emailed = 1
            WHERE id IN ({placeholders})
        """, article_ids)

        conn.commit()
        conn.close()

    def log_email_sent(self, recipient: str, article_count: int, status: str, error_message: str = None):
        """Log email sending attempt"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO email_log (sent_date, recipient, article_count, status, error_message)
            VALUES (?, ?, ?, ?, ?)
        """, (datetime.now().isoformat(), recipient, article_count, status, error_message))

        conn.commit()
        conn.close()

    def get_recent_articles(self, days: int = 7) -> List[Dict]:
        """Get all articles from the last N days"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, title, url, source, category, priority, summary,
                   published_date, discovered_date, emailed, relevance_score
            FROM articles
            WHERE datetime(discovered_date) >= datetime('now', ?)
            ORDER BY discovered_date DESC
        """, (f'-{days} days',))

        rows = cursor.fetchall()

        articles = []
        for row in rows:
            articles.append({
                'id': row[0],
                'title': row[1],
                'url': row[2],
                'source': row[3],
                'category': row[4],
                'priority': row[5],
                'summary': row[6],
                'published_date': row[7],
                'discovered_date': row[8],
                'emailed': row[9] == 1,
                'relevance_score': row[10]
            })

        conn.close()
        return articles

    def get_statistics(self) -> Dict:
        """Get database statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        stats = {}

        # Total articles
        cursor.execute("SELECT COUNT(*) FROM articles")
        stats['total_articles'] = cursor.fetchone()[0]

        # Unemailed articles
        cursor.execute("SELECT COUNT(*) FROM articles WHERE emailed = 0")
        stats['unemailed_articles'] = cursor.fetchone()[0]

        # Articles by category
        cursor.execute("""
            SELECT category, COUNT(*)
            FROM articles
            GROUP BY category
        """)
        stats['by_category'] = dict(cursor.fetchall())

        # Articles by priority
        cursor.execute("""
            SELECT priority, COUNT(*)
            FROM articles
            GROUP BY priority
        """)
        stats['by_priority'] = dict(cursor.fetchall())

        # Recent emails
        cursor.execute("""
            SELECT COUNT(*)
            FROM email_log
            WHERE datetime(sent_date) >= datetime('now', '-7 days')
        """)
        stats['emails_last_7_days'] = cursor.fetchone()[0]

        conn.close()
        return stats
