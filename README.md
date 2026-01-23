# 🎮 Gaming Regulatory Tracker

An automated system that monitors legal and regulatory developments in the video game industry. The tracker scans regulators' websites, news outlets, and primary sources daily to capture relevant developments, then emails a formatted summary with concise explanations and links.

## Features

- **Automated Daily Scanning**: Monitors 12+ regulatory and news sources for gaming industry developments
- **Intelligent Filtering**: Uses keyword matching and relevance scoring to identify material legal developments
- **Priority Classification**: Automatically categorizes content as high, medium, or low priority
- **Email Notifications**: Sends formatted HTML email digests with summaries and direct links
- **Interactive Dashboard**: Streamlit web interface for manual scans, testing, and configuration
- **Persistent Storage**: SQLite database tracks all articles and prevents duplicates

## Monitored Sources

### Regulatory Bodies
- US Federal Trade Commission (FTC)
- ESRB (Entertainment Software Rating Board)
- COPPA Updates (Children's Online Privacy Protection)
- California Privacy Protection Agency
- UK Gambling Commission
- European Commission (Digital Services)
- SEC (Securities and Exchange Commission)

### News Outlets
- GamesIndustry.biz
- Polygon
- Video Games Chronicle
- Law360 Gaming
- The Verge Gaming

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd streamlit-example
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your email credentials
   ```

## Configuration

### Email Setup

For Gmail users:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add the App Password to your `.env` file

Example `.env` configuration:
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
RECIPIENT_EMAIL=lawyer@lawfirm.com
EMAIL_SEND_TIME=08:00
```

### Customizing Sources

Edit `config.py` to add or modify sources:

```python
REGULATORY_SOURCES = {
    "Source Name": {
        "url": "https://example.com/news",
        "rss": "https://example.com/rss.xml",  # Optional RSS feed
        "keywords": ["gaming", "regulation"],
        "category": "Federal Regulator"
    }
}
```

### Adjusting Keywords

Modify `LEGAL_KEYWORDS` in `config.py` to change what content is considered relevant:

```python
LEGAL_KEYWORDS = [
    "regulation", "lawsuit", "enforcement",
    "loot box", "microtransaction", "COPPA",
    # Add your custom keywords here
]
```

## Usage

### Web Interface (Recommended)

1. **Start the Streamlit app**
   ```bash
   streamlit run streamlit_app.py
   ```

2. **Access the dashboard** at `http://localhost:8501`

3. **Features available:**
   - **Dashboard**: View statistics and control the automated scheduler
   - **Run Scan**: Manually trigger a scan and send emails
   - **Sources**: Review all configured sources
   - **Email Settings**: Configure and test SMTP connection
   - **Recent Articles**: Browse and filter collected articles
   - **Test Sources**: Verify individual sources are working

### Command Line

Run a one-time scan:
```bash
python scheduler.py --run-now
```

Start the automated daily scheduler:
```bash
python scheduler.py --time 08:00
```

### Automated Deployment

For production use with automatic daily scans:

**Option 1: Using systemd (Linux)**

Create `/etc/systemd/system/gaming-tracker.service`:
```ini
[Unit]
Description=Gaming Regulatory Tracker
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/streamlit-example
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/python scheduler.py --time 08:00
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable gaming-tracker
sudo systemctl start gaming-tracker
```

**Option 2: Using cron**

Add to crontab (`crontab -e`):
```bash
0 8 * * * cd /path/to/streamlit-example && /path/to/venv/bin/python scheduler.py --run-now
```

**Option 3: Using the Streamlit app**

Start the Streamlit app and use the "Start Scheduler" button on the Dashboard page. This keeps the scheduler running as long as the app is running.

## How It Works

1. **Scanning**: The tracker fetches content from configured sources using:
   - RSS feeds (for feeds available)
   - Web scraping (for sites without feeds)

2. **Filtering**: Content is filtered based on:
   - Source-specific keywords (e.g., "loot box" for UK Gambling Commission)
   - General legal keywords (e.g., "regulation", "lawsuit", "enforcement")
   - Minimum keyword threshold for relevance

3. **Scoring**: Each article receives:
   - **Priority** (high/medium/low) based on action words
   - **Relevance score** (0-1) based on keyword matches
   - **Category** based on source type

4. **Storage**: Articles are stored in SQLite database with:
   - Deduplication by content hash
   - Tracking of email status
   - Historical logging

5. **Email**: Daily digest includes:
   - Grouped by priority level
   - HTML formatting with color coding
   - Direct links to source material
   - Concise summaries when available

## File Structure

```
streamlit-example/
├── config.py              # Configuration for sources and keywords
├── database.py            # SQLite database management
├── scraper.py             # Web scraping and RSS parsing
├── email_sender.py        # Email formatting and sending
├── scheduler.py           # Daily automation scheduler
├── streamlit_app.py       # Web interface
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (you create this)
├── .env.example          # Environment variable template
└── gaming_regulatory_tracker.db  # SQLite database (auto-created)
```

## Customization Guide

### Adding New Sources

1. **For RSS Feeds**:
   ```python
   "Source Name": {
       "rss": "https://example.com/feed.xml",
       "keywords": ["gaming", "regulation"],
       "category": "Industry News"
   }
   ```

2. **For Web Pages**:
   ```python
   "Source Name": {
       "url": "https://example.com/news",
       "keywords": ["gaming", "legal"],
       "category": "Legal News"
   }
   ```

### Adjusting Lookback Period

In `config.py`, change:
```python
LOOKBACK_HOURS = 24  # Scan articles from last 24 hours
```

### Modifying Priority Rules

In `config.py`, adjust:
```python
PRIORITY_RULES = {
    "high": ["FTC", "DOJ", "enforcement", "fine"],
    "medium": ["investigation", "legislation"],
    "low": ["announcement", "statement"]
}
```

## Troubleshooting

### No Articles Found

- Check that sources are accessible (test in "Test Sources" page)
- Verify keywords are not too restrictive
- Increase `LOOKBACK_HOURS` for testing
- Check for network/firewall issues

### Email Not Sending

- Verify SMTP credentials in `.env` file
- For Gmail, ensure App Password is used (not regular password)
- Test connection in "Email Settings" page
- Check spam folder for test emails

### Database Issues

- Delete `gaming_regulatory_tracker.db` to reset
- Database will be recreated automatically on next run

### RSS Feed Errors

- Some feeds may be temporarily unavailable
- Check feed URL is still valid
- Verify feed format is RSS/Atom compatible

## Privacy & Security

- Store `.env` file securely (never commit to version control)
- Use app-specific passwords, not account passwords
- Consider encrypting the database for sensitive deployments
- Monitor logs for unauthorized access attempts

## Legal Considerations

This tool is designed for:
- Legal research and monitoring
- Professional legal practice support
- Compliance tracking
- Industry awareness

Ensure proper licensing and terms of service compliance when scraping websites.

## Contributing

To add new sources or improve filtering:

1. Test the source manually first
2. Add configuration to `config.py`
3. Test using "Test Sources" in the web interface
4. Submit pull request with description

## Support

For issues or questions:
- Check the troubleshooting section above
- Review source configurations in `config.py`
- Test individual sources in the web interface
- Check application logs for error messages

## License

[Your License Here]

## Acknowledgments

Built for legal practitioners advising the gaming and interactive entertainment industry.
