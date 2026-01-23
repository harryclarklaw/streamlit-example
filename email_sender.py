"""
Email notification module
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict
from config import EMAIL_CONFIG


class EmailSender:
    def __init__(self, config: Dict = None):
        self.config = config or EMAIL_CONFIG

    def format_email_html(self, articles: List[Dict]) -> str:
        """Format articles into HTML email"""
        # Group articles by category and priority
        high_priority = [a for a in articles if a['priority'] == 'high']
        medium_priority = [a for a in articles if a['priority'] == 'medium']
        low_priority = [a for a in articles if a['priority'] == 'low']

        html = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                h1 {{
                    color: #2c3e50;
                    border-bottom: 3px solid #3498db;
                    padding-bottom: 10px;
                }}
                h2 {{
                    color: #34495e;
                    margin-top: 30px;
                    border-bottom: 2px solid #95a5a6;
                    padding-bottom: 5px;
                }}
                .article {{
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-left: 4px solid #3498db;
                    border-radius: 4px;
                }}
                .article.high {{
                    border-left-color: #e74c3c;
                    background-color: #ffebee;
                }}
                .article.medium {{
                    border-left-color: #f39c12;
                    background-color: #fff8e1;
                }}
                .article.low {{
                    border-left-color: #95a5a6;
                }}
                .article-title {{
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }}
                .article-title a {{
                    color: #2980b9;
                    text-decoration: none;
                }}
                .article-title a:hover {{
                    text-decoration: underline;
                }}
                .article-meta {{
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-bottom: 10px;
                }}
                .article-summary {{
                    font-size: 14px;
                    color: #555;
                }}
                .badge {{
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-right: 5px;
                }}
                .badge-high {{
                    background-color: #e74c3c;
                    color: white;
                }}
                .badge-medium {{
                    background-color: #f39c12;
                    color: white;
                }}
                .badge-low {{
                    background-color: #95a5a6;
                    color: white;
                }}
                .badge-category {{
                    background-color: #3498db;
                    color: white;
                }}
                .summary {{
                    background-color: #e8f4f8;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #7f8c8d;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <h1>🎮 Gaming Industry Regulatory & Legal Update</h1>
            <div class="summary">
                <strong>Daily Digest - {datetime.now().strftime('%B %d, %Y')}</strong><br>
                Total developments: {len(articles)}<br>
                High priority: {len(high_priority)} | Medium priority: {len(medium_priority)} | Low priority: {len(low_priority)}
            </div>
        """

        if high_priority:
            html += "<h2>⚠️ High Priority Developments</h2>"
            for article in high_priority:
                html += self._format_article_html(article)

        if medium_priority:
            html += "<h2>📋 Medium Priority Developments</h2>"
            for article in medium_priority:
                html += self._format_article_html(article)

        if low_priority:
            html += "<h2>📰 Other Developments</h2>"
            for article in low_priority:
                html += self._format_article_html(article)

        html += """
            <div class="footer">
                <p>This is an automated digest from the Gaming Regulatory Tracker.</p>
                <p>Updates are based on content from regulators, news outlets, and industry sources published in the last 24 hours.</p>
            </div>
        </body>
        </html>
        """

        return html

    def _format_article_html(self, article: Dict) -> str:
        """Format a single article as HTML"""
        priority = article['priority']
        category = article['category']
        source = article['source']
        title = article['title']
        url = article['url']
        summary = article.get('summary', '')
        published = article.get('published_date', '')

        if published:
            try:
                pub_date = datetime.fromisoformat(published.replace('Z', '+00:00'))
                published_str = pub_date.strftime('%B %d, %Y %I:%M %p')
            except:
                published_str = published
        else:
            published_str = 'Date unknown'

        html = f"""
        <div class="article {priority}">
            <div class="article-title">
                <a href="{url}" target="_blank">{title}</a>
            </div>
            <div class="article-meta">
                <span class="badge badge-{priority}">{priority.upper()}</span>
                <span class="badge badge-category">{category}</span>
                <span>Source: {source}</span> | <span>{published_str}</span>
            </div>
        """

        if summary:
            html += f'<div class="article-summary">{summary}</div>'

        html += "</div>"

        return html

    def send_email(self, articles: List[Dict], recipient: str = None) -> tuple[bool, str]:
        """Send email with article digest"""
        if not articles:
            return False, "No articles to send"

        recipient = recipient or self.config['recipient_email']
        if not recipient:
            return False, "No recipient email configured"

        sender = self.config['sender_email']
        password = self.config['sender_password']

        if not sender or not password:
            return False, "Email credentials not configured"

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Gaming Regulatory Update - {datetime.now().strftime('%B %d, %Y')} ({len(articles)} developments)"
        msg['From'] = sender
        msg['To'] = recipient

        # Create plain text version
        text_body = self._format_email_text(articles)
        html_body = self.format_email_html(articles)

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        # Send email
        try:
            server = smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port'])
            server.starttls()
            server.login(sender, password)
            server.send_message(msg)
            server.quit()
            return True, f"Email sent successfully to {recipient}"
        except Exception as e:
            return False, f"Failed to send email: {str(e)}"

    def _format_email_text(self, articles: List[Dict]) -> str:
        """Format articles as plain text"""
        text = f"Gaming Industry Regulatory & Legal Update\n"
        text += f"Daily Digest - {datetime.now().strftime('%B %d, %Y')}\n"
        text += f"{'=' * 60}\n\n"
        text += f"Total developments: {len(articles)}\n\n"

        for article in articles:
            text += f"[{article['priority'].upper()}] {article['title']}\n"
            text += f"Source: {article['source']} | Category: {article['category']}\n"
            text += f"Link: {article['url']}\n"
            if article.get('summary'):
                text += f"Summary: {article['summary']}\n"
            text += f"\n{'-' * 60}\n\n"

        return text

    def test_connection(self) -> tuple[bool, str]:
        """Test SMTP connection"""
        try:
            sender = self.config['sender_email']
            password = self.config['sender_password']

            if not sender or not password:
                return False, "Email credentials not configured"

            server = smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port'])
            server.starttls()
            server.login(sender, password)
            server.quit()
            return True, "SMTP connection successful"
        except Exception as e:
            return False, f"SMTP connection failed: {str(e)}"
