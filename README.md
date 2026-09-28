# my-project

## Five-star Google review auto-responder

Replies automatically to **five-star** Google reviews for **Rainstone only**.
Reviews rated 1–4 stars are **never** replied to, and neither is any review that already has an owner reply.

The Business Profile account manages many clients' profiles, and most of them reply to their own reviews
or use their own tools. So before posting anything, the tool looks up the location's business name on Google
and **stops without replying** unless it contains "Rainstone" (case-insensitive). A wrong or mistyped
location ID can't cause replies on another client's profile.

No third-party dependencies; Python 3.9+.

### Setup

1. In Google Cloud, enable the **Google My Business API** and **My Business Business Information API** for your project (Business Profile API access must be approved by Google).
2. Create an OAuth client and get a refresh token with the scope `https://www.googleapis.com/auth/business.manage`
   (for example, using the [OAuth Playground](https://developers.google.com/oauthplayground) with your own client credentials).
3. Set these environment variables:

| Variable | Description |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token for the account that manages the profile |
| `GBP_ACCOUNT_ID` | Numeric Business Profile account ID (from `accounts/{id}`) |
| `GBP_LOCATION_ID` | Rainstone's numeric location ID (from `locations/{id}`) |
| `GBP_BUSINESS_NAME` | Optional. Name the location must match before replying. Defaults to `Rainstone` |

### Usage

```bash
# Dry run (default): shows which reviews would get a reply, posts nothing
python -m review_responder

# Actually post the replies
python -m review_responder --send

# Use your own reply wording (one template per line, {name} = reviewer's first name)
python -m review_responder --send --templates templates.example.txt
```

Run it on a schedule (cron, GitHub Actions, etc.) to keep up with new reviews. Reviews already replied to are skipped, so it's safe to run it repeatedly.

### Tests

```bash
python -m unittest discover -s tests -t .
```
