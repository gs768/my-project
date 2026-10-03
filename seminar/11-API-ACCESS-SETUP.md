# API access setup: Instantly, GoDaddy, Namecheap

Claude cannot take keys in chat. Gabriel adds them in the cloud environment settings (the environment menu in the session's title bar, then Edit). A new session picks them up.

## 1. Environment variables to add (names Claude will read)
| Service | Variables | Where to get it |
|---|---|---|
| Instantly | `INSTANTLY_API_KEY` | Instantly dashboard, Settings, Integrations, API keys. Create a **new key just for this**, with the narrowest scopes offered (campaigns, leads, accounts) |
| GoDaddy | `GODADDY_API_KEY`, `GODADDY_API_SECRET` | developer.godaddy.com, Keys. Use a **Production** key. GoDaddy may restrict the domains/DNS API for accounts with few domains; check this when creating the key |
| Namecheap | `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP` | Namecheap, Profile, Tools, API access. Enable API access, then **whitelist the IP** the calls come from |

## 2. Network: allowed domains (Network access, Custom, add under Allowed domains, keep the default package-manager list)
`api.instantly.ai`, `api.godaddy.com`, `api.namecheap.com`

## 3. Known problems
- **Namecheap whitelisting:** the cloud environment's outbound IP may change between sessions, which would break an IP whitelist. If that happens, the fallback is that Claude writes the exact DNS records and someone pastes them into Namecheap.
- **DNS is powerful.** A wrong record can take down email or a website. Rules we'll use: **read and list first**, show the planned change and wait for approval before any write, and never touch records on domains that aren't the cold-email domains unless asked.
- **Rotate the keys** if they're ever exposed, and delete them when the project is done.

## 4. What this unlocks
- **Instantly:** list and check campaigns, accounts, warmup status and deliverability; create or edit campaigns, sequences and schedules (still left paused until Gabriel approves); load verified lead lists.
- **GoDaddy / Namecheap:** list domains and DNS records; add SPF, DKIM, DMARC and forwarding records for the cold-email domains; check that domains forward to the separate website.

## 5. Email marketing infrastructure (from Gabriel, Oct 3)
- Dedicated inboxes on **Microsoft Outlook and Gmail** for email marketing.
- A **separate website** that the email inbox domains forward to. Cold-email links and any "visit our site" links should go there (or to the Eventbrite page), never to suttondigitalmarketing.com.
- To confirm: which domain(s) forward where, and whether the separate website is the right place for a cold-email webinar landing page (it could replace the direct-to-Eventbrite link).
