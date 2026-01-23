"""
Scheduler module for daily automated tracking
"""

import schedule
import time
from datetime import datetime
from typing import Optional
import threading

from scraper import ContentFetcher
from database import TrackerDatabase
from email_sender import EmailSender
from config import EMAIL_CONFIG


class TrackerScheduler:
    def __init__(self, db_path: str = "gaming_regulatory_tracker.db"):
        self.db = TrackerDatabase(db_path)
        self.fetcher = ContentFetcher()
        self.email_sender = EmailSender()
        self.is_running = False
        self.thread = None

    def run_daily_scan(self):
        """Run the daily scan and email process"""
        print(f"\n{'=' * 60}")
        print(f"Starting daily scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'=' * 60}\n")

        # Fetch all sources
        articles = self.fetcher.fetch_all_sources()

        if not articles:
            print("No new articles found")
            return

        # Add new articles to database
        new_count = 0
        for article in articles:
            if self.db.add_article(article):
                new_count += 1

        print(f"\nAdded {new_count} new articles to database")

        # Get unemailed articles
        unemailed = self.db.get_unemailed_articles()

        if unemailed:
            print(f"Sending email with {len(unemailed)} articles...")

            # Send email
            success, message = self.email_sender.send_email(
                unemailed,
                EMAIL_CONFIG['recipient_email']
            )

            if success:
                print(f"✓ {message}")
                # Mark articles as emailed
                article_ids = [a['id'] for a in unemailed]
                self.db.mark_articles_emailed(article_ids)
                self.db.log_email_sent(
                    EMAIL_CONFIG['recipient_email'],
                    len(unemailed),
                    'success'
                )
            else:
                print(f"✗ {message}")
                self.db.log_email_sent(
                    EMAIL_CONFIG['recipient_email'],
                    len(unemailed),
                    'failed',
                    message
                )
        else:
            print("No articles to email")

        print(f"\n{'=' * 60}")
        print(f"Scan completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'=' * 60}\n")

    def schedule_daily(self, time_str: str = "08:00"):
        """Schedule the daily scan at a specific time"""
        schedule.every().day.at(time_str).do(self.run_daily_scan)
        print(f"Scheduled daily scan at {time_str}")

    def run_scheduler(self):
        """Run the scheduler loop"""
        self.is_running = True
        print("Scheduler started. Press Ctrl+C to stop.")

        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    def start_background(self, time_str: str = "08:00"):
        """Start scheduler in background thread"""
        if self.is_running:
            print("Scheduler is already running")
            return

        self.schedule_daily(time_str)

        self.thread = threading.Thread(target=self.run_scheduler, daemon=True)
        self.thread.start()

        print(f"Background scheduler started (daily at {time_str})")

    def stop(self):
        """Stop the scheduler"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        schedule.clear()
        print("Scheduler stopped")


def main():
    """Main function for running scheduler standalone"""
    import argparse

    parser = argparse.ArgumentParser(description='Gaming Regulatory Tracker Scheduler')
    parser.add_argument('--time', default='08:00', help='Time to run daily (HH:MM format)')
    parser.add_argument('--run-now', action='store_true', help='Run scan immediately')

    args = parser.parse_args()

    scheduler = TrackerScheduler()

    if args.run_now:
        print("Running scan now...")
        scheduler.run_daily_scan()
    else:
        scheduler.schedule_daily(args.time)
        try:
            scheduler.run_scheduler()
        except KeyboardInterrupt:
            print("\nScheduler stopped by user")


if __name__ == '__main__':
    main()
