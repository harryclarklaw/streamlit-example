"""
Gaming Regulatory Tracker - Streamlit Interface
"""

import streamlit as st
import os
from datetime import datetime
import pandas as pd

from config import (
    EMAIL_CONFIG, REGULATORY_SOURCES, NEWS_SOURCES,
    CATEGORIES, LOOKBACK_HOURS
)
from database import TrackerDatabase
from scraper import ContentFetcher
from email_sender import EmailSender
from scheduler import TrackerScheduler


# Page configuration
st.set_page_config(
    page_title="Gaming Regulatory Tracker",
    page_icon="🎮",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize components
@st.cache_resource
def get_database():
    return TrackerDatabase()

@st.cache_resource
def get_scheduler():
    return TrackerScheduler()


def main():
    st.title("🎮 Gaming Regulatory Tracker")
    st.markdown("*Monitoring legal and regulatory developments in the video game industry*")

    # Sidebar navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.radio(
        "Go to",
        ["Dashboard", "Run Scan", "Sources", "Email Settings", "Recent Articles", "Test Sources"]
    )

    if page == "Dashboard":
        show_dashboard()
    elif page == "Run Scan":
        show_run_scan()
    elif page == "Sources":
        show_sources()
    elif page == "Email Settings":
        show_email_settings()
    elif page == "Recent Articles":
        show_recent_articles()
    elif page == "Test Sources":
        show_test_sources()


def show_dashboard():
    """Display dashboard with statistics and overview"""
    st.header("Dashboard")

    db = get_database()
    stats = db.get_statistics()

    # Display key metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Articles", stats['total_articles'])

    with col2:
        st.metric("Pending Email", stats['unemailed_articles'])

    with col3:
        st.metric("Emails (7 days)", stats['emails_last_7_days'])

    with col4:
        total_sources = len(REGULATORY_SOURCES) + len(NEWS_SOURCES)
        st.metric("Active Sources", total_sources)

    st.markdown("---")

    # Articles by category
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Articles by Category")
        if stats['by_category']:
            df_cat = pd.DataFrame(
                list(stats['by_category'].items()),
                columns=['Category', 'Count']
            ).sort_values('Count', ascending=False)
            st.dataframe(df_cat, use_container_width=True)
        else:
            st.info("No articles yet")

    with col2:
        st.subheader("Articles by Priority")
        if stats['by_priority']:
            df_pri = pd.DataFrame(
                list(stats['by_priority'].items()),
                columns=['Priority', 'Count']
            ).sort_values('Count', ascending=False)
            st.dataframe(df_pri, use_container_width=True)
        else:
            st.info("No articles yet")

    st.markdown("---")

    # Scheduler status
    st.subheader("Automated Scanning")
    scheduler = get_scheduler()

    col1, col2 = st.columns([2, 1])

    with col1:
        st.info(f"""
        **Schedule Configuration:**
        - Daily scan at: {EMAIL_CONFIG['send_time']}
        - Lookback period: {LOOKBACK_HOURS} hours
        - Status: {'🟢 Running' if scheduler.is_running else '🔴 Stopped'}
        """)

    with col2:
        if st.button("Start Scheduler", disabled=scheduler.is_running):
            scheduler.start_background(EMAIL_CONFIG['send_time'])
            st.success("Scheduler started!")
            st.rerun()

        if st.button("Stop Scheduler", disabled=not scheduler.is_running):
            scheduler.stop()
            st.success("Scheduler stopped!")
            st.rerun()


def show_run_scan():
    """Manually run a scan"""
    st.header("Run Manual Scan")

    st.info(f"""
    This will scan all configured sources for articles from the last {LOOKBACK_HOURS} hours.
    New articles will be added to the database and can be emailed.
    """)

    col1, col2 = st.columns(2)

    with col1:
        if st.button("🔍 Run Scan Now", type="primary"):
            with st.spinner("Scanning sources..."):
                fetcher = ContentFetcher()
                db = get_database()

                # Fetch articles
                articles = fetcher.fetch_all_sources()

                if articles:
                    # Add to database
                    new_count = 0
                    for article in articles:
                        if db.add_article(article):
                            new_count += 1

                    st.success(f"✓ Scan complete! Found {len(articles)} articles, {new_count} new")

                    # Show preview
                    st.subheader("Preview of New Articles")
                    for article in articles[:10]:
                        with st.expander(f"[{article['priority'].upper()}] {article['title']}"):
                            st.write(f"**Source:** {article['source']}")
                            st.write(f"**Category:** {article['category']}")
                            st.write(f"**URL:** {article['url']}")
                            if article['summary']:
                                st.write(f"**Summary:** {article['summary']}")
                else:
                    st.warning("No relevant articles found")

    with col2:
        if st.button("📧 Send Email Now"):
            db = get_database()
            email_sender = EmailSender()

            unemailed = db.get_unemailed_articles()

            if unemailed:
                with st.spinner("Sending email..."):
                    success, message = email_sender.send_email(
                        unemailed,
                        EMAIL_CONFIG['recipient_email']
                    )

                    if success:
                        st.success(f"✓ {message}")
                        # Mark as emailed
                        article_ids = [a['id'] for a in unemailed]
                        db.mark_articles_emailed(article_ids)
                        db.log_email_sent(
                            EMAIL_CONFIG['recipient_email'],
                            len(unemailed),
                            'success'
                        )
                    else:
                        st.error(f"✗ {message}")
                        db.log_email_sent(
                            EMAIL_CONFIG['recipient_email'],
                            len(unemailed),
                            'failed',
                            message
                        )
            else:
                st.info("No articles to email")


def show_sources():
    """Display configured sources"""
    st.header("Configured Sources")

    tab1, tab2 = st.tabs(["Regulatory Sources", "News Sources"])

    with tab1:
        st.subheader(f"Regulatory Sources ({len(REGULATORY_SOURCES)})")
        for source_name, config in REGULATORY_SOURCES.items():
            with st.expander(f"📋 {source_name}"):
                st.write(f"**Category:** {config.get('category', 'N/A')}")
                st.write(f"**URL:** {config.get('url', config.get('rss', 'N/A'))}")
                st.write(f"**Type:** {'RSS Feed' if 'rss' in config else 'Web Page'}")
                st.write(f"**Keywords:** {', '.join(config.get('keywords', []))}")

    with tab2:
        st.subheader(f"News Sources ({len(NEWS_SOURCES)})")
        for source_name, config in NEWS_SOURCES.items():
            with st.expander(f"📰 {source_name}"):
                st.write(f"**Category:** {config.get('category', 'N/A')}")
                st.write(f"**URL:** {config.get('url', config.get('rss', 'N/A'))}")
                st.write(f"**Type:** {'RSS Feed' if 'rss' in config else 'Web Page'}")
                st.write(f"**Keywords:** {', '.join(config.get('keywords', []))}")


def show_email_settings():
    """Configure email settings"""
    st.header("Email Settings")

    st.info("""
    Configure email settings using environment variables for security.
    Set these in your environment or `.env` file.
    """)

    # Display current settings (masked)
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("SMTP Configuration")
        smtp_server = st.text_input("SMTP Server", value=EMAIL_CONFIG['smtp_server'])
        smtp_port = st.number_input("SMTP Port", value=EMAIL_CONFIG['smtp_port'])
        sender_email = st.text_input(
            "Sender Email",
            value=EMAIL_CONFIG['sender_email'],
            placeholder="your-email@gmail.com"
        )
        sender_password = st.text_input(
            "Sender Password/App Password",
            type="password",
            value=EMAIL_CONFIG['sender_password'],
            placeholder="Your app password"
        )

    with col2:
        st.subheader("Recipient Configuration")
        recipient_email = st.text_input(
            "Recipient Email",
            value=EMAIL_CONFIG['recipient_email'],
            placeholder="recipient@example.com"
        )
        send_time = st.text_input(
            "Daily Send Time (HH:MM)",
            value=EMAIL_CONFIG['send_time']
        )

        st.markdown("---")

        if st.button("Test SMTP Connection"):
            config = {
                'smtp_server': smtp_server,
                'smtp_port': smtp_port,
                'sender_email': sender_email,
                'sender_password': sender_password,
                'recipient_email': recipient_email
            }

            email_sender = EmailSender(config)
            success, message = email_sender.test_connection()

            if success:
                st.success(f"✓ {message}")
            else:
                st.error(f"✗ {message}")

    st.markdown("---")

    st.subheader("Environment Variables")
    st.code(f"""
# Add these to your .env file or environment:
SMTP_SERVER={smtp_server}
SMTP_PORT={smtp_port}
SENDER_EMAIL={sender_email}
SENDER_PASSWORD=your_password_here
RECIPIENT_EMAIL={recipient_email}
EMAIL_SEND_TIME={send_time}
    """, language="bash")


def show_recent_articles():
    """Display recent articles"""
    st.header("Recent Articles")

    db = get_database()

    # Filters
    col1, col2, col3 = st.columns(3)

    with col1:
        days = st.selectbox("Time Period", [1, 3, 7, 14, 30], index=2)

    with col2:
        priority_filter = st.multiselect(
            "Priority",
            ["high", "medium", "low"],
            default=["high", "medium", "low"]
        )

    with col3:
        category_filter = st.multiselect(
            "Category",
            CATEGORIES,
            default=CATEGORIES
        )

    # Get articles
    articles = db.get_recent_articles(days)

    # Apply filters
    filtered = [
        a for a in articles
        if a['priority'] in priority_filter and a['category'] in category_filter
    ]

    st.write(f"Showing {len(filtered)} of {len(articles)} articles")

    # Display articles
    if filtered:
        for article in filtered:
            priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}
            emoji = priority_emoji.get(article['priority'], "⚪")

            with st.expander(f"{emoji} [{article['category']}] {article['title']}"):
                col1, col2 = st.columns([3, 1])

                with col1:
                    st.write(f"**Source:** {article['source']}")
                    st.write(f"**URL:** [{article['url']}]({article['url']})")
                    if article['summary']:
                        st.write(f"**Summary:** {article['summary']}")

                with col2:
                    st.write(f"**Priority:** {article['priority'].upper()}")
                    st.write(f"**Emailed:** {'Yes' if article['emailed'] else 'No'}")
                    st.write(f"**Relevance:** {article['relevance_score']:.2f}")
                    if article['published_date']:
                        try:
                            pub_date = datetime.fromisoformat(article['published_date'])
                            st.write(f"**Published:** {pub_date.strftime('%Y-%m-%d %H:%M')}")
                        except:
                            st.write(f"**Published:** {article['published_date']}")
    else:
        st.info("No articles found matching your filters")


def show_test_sources():
    """Test individual sources"""
    st.header("Test Sources")

    st.info("Test individual sources to verify they are working correctly.")

    # Combine all sources
    all_sources = {}
    for name, config in REGULATORY_SOURCES.items():
        all_sources[f"[REG] {name}"] = config
    for name, config in NEWS_SOURCES.items():
        all_sources[f"[NEWS] {name}"] = config

    source_name = st.selectbox("Select Source", list(all_sources.keys()))

    if st.button("Test Source"):
        config = all_sources[source_name]
        clean_name = source_name.replace("[REG] ", "").replace("[NEWS] ", "")

        with st.spinner(f"Testing {clean_name}..."):
            fetcher = ContentFetcher()
            result = fetcher.test_source(clean_name, config)

            if result['success']:
                st.success(f"✓ Successfully fetched from {clean_name}")
                st.write(f"**Found {len(result['articles'])} relevant articles**")

                if result['articles']:
                    st.subheader("Sample Articles")
                    for article in result['articles'][:5]:
                        with st.expander(article['title']):
                            st.write(f"**URL:** {article['url']}")
                            st.write(f"**Category:** {article['category']}")
                            st.write(f"**Priority:** {article['priority']}")
                            st.write(f"**Relevance:** {article['relevance_score']}")
                            if article['summary']:
                                st.write(f"**Summary:** {article['summary']}")
            else:
                st.error(f"✗ Failed to fetch from {clean_name}")
                st.error(f"Error: {result['error']}")


if __name__ == "__main__":
    main()
