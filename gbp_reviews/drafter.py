"""Claude-powered pieces: drafting review replies and interpreting Slack notes."""

from __future__ import annotations

import json
from dataclasses import dataclass

import anthropic

from .clients import Client

FALLBACK_BETA = "server-side-fallback-2026-07-01"

AUTO_REPLY = "auto_reply"
CLIENT_FOLLOWUP = "client_followup"

DRAFT_SYSTEM = """\
You draft owner responses to Google Business Profile reviews for Sutton Digital Marketing, \
an agency that manages local SEO for its clients (mostly law firms, plus a few home-service \
and dental businesses). A person on the agency team reviews every draft in Slack before \
anything is posted, and each reply is published publicly under the client's business name.

For every review you receive, decide on a recommendation and write a reply.

Recommendation:
- "auto_reply": the agency can safely post your reply without involving the client. Typical \
for positive reviews (4-5 stars) and neutral, low-risk ones, including rating-only reviews.
- "client_followup": the client should weigh in before anything is posted. Use this when the \
review is negative (1-2 stars) or mixed in a way that needs facts only the client has, disputes \
fees, outcomes or conduct, names staff in a negative light, mentions a legal or medical matter \
in detail, threatens action, looks like it could be from someone who was never a customer, or \
is otherwise sensitive. Still write the best draft you can; the client may use it.

Writing the reply:
- Sound like the business, warm and specific to what the reviewer said, 1-4 sentences. \
Rating-only reviews get a short, gracious thank-you.
- Confidentiality comes first. For law firms, never confirm or imply that the reviewer was a \
client, and never reference case facts, outcomes, amounts, or anything learned in a \
representation, even if the reviewer mentions them. Healthcare and dental: never confirm the \
reviewer was a patient or mention treatment. For negative reviews, acknowledge the concern \
without arguing, and invite the person to contact the office directly.
- It's fine to mention the business name, and the city or service naturally where it fits, but \
never stuff keywords. No links, phone numbers, emojis, or promises of results.
- Vary wording across replies so they don't read as templated.
- Reply in the reviewer's language.
- Don't sign with an individual's name unless a client rule says to.

The rules listed under "Agency-wide rules" and "Client rules" override the defaults above. If a \
rule says a review type should always go to the client, recommend "client_followup". \
Set "reason" to one short sentence the team can scan in Slack.
"""

DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "review_id": {"type": "string"},
                    "recommendation": {"type": "string", "enum": [AUTO_REPLY, CLIENT_FOLLOWUP]},
                    "reason": {"type": "string"},
                    "reply": {"type": "string"},
                },
                "required": ["review_id", "recommendation", "reason", "reply"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}

NOTE_SYSTEM = """\
You maintain the configuration of a weekly Google-review reply system for Sutton Digital \
Marketing. Team members write messages in the Slack thread of a weekly proposal. Convert the \
message into operations. Only act on what the message clearly asks for; if something is \
ambiguous (for example the client can't be identified), leave it out and ask in "questions".

Operation types:
- "add_rule": store a lasting reply rule. client_location is an exact name from the client list, \
or "ALL" for agency-wide. text is the rule, rewritten as a clear standalone instruction.
- "remove_rule": deactivate stored rules. client_location as above; text is a short phrase that \
appears in the rule(s) to remove.
- "exclude": exclude a client's profile from future audits. text is the reason.
- "include": remove an existing exclusion.
- "approve": post the proposed replies for the listed refs.
- "client_followup": route the listed refs to the client instead of replying.
- "skip": never reply to the listed refs.
- "edit": replace the reply for exactly one ref with text, and approve it.

Refs look like "R12" and must come from the batch items provided. Resolve phrases like "all of \
the Smith Law ones" or "every 5-star review" into explicit refs. Use "" for unused string fields \
and [] for unused refs. A note that states a preference for future replies ("from now on", \
"always", "never") is an add_rule even if it also fixes a current item.
"""

NOTE_SCHEMA = {
    "type": "object",
    "properties": {
        "operations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "add_rule", "remove_rule", "exclude", "include",
                            "approve", "client_followup", "skip", "edit",
                        ],
                    },
                    "client_location": {"type": "string"},
                    "refs": {"type": "array", "items": {"type": "string"}},
                    "text": {"type": "string"},
                },
                "required": ["type", "client_location", "refs", "text"],
                "additionalProperties": False,
            },
        },
        "summary": {"type": "string"},
        "questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["operations", "summary", "questions"],
    "additionalProperties": False,
}


class DraftError(RuntimeError):
    pass


@dataclass
class Draft:
    review_id: str
    recommendation: str
    reason: str
    reply: str


class Drafter:
    def __init__(self, model: str, client: anthropic.Anthropic | None = None):
        self.model = model
        self.client = client or anthropic.Anthropic()

    def _json_call(self, system: str, user: str, schema: dict, effort: str) -> dict:
        with self.client.beta.messages.stream(
            model=self.model,
            max_tokens=64000,
            betas=[FALLBACK_BETA],
            fallbacks="default",
            thinking={"type": "adaptive"},
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            response = stream.get_final_message()
        if response.stop_reason == "refusal":
            raise DraftError("Model declined the request")
        if response.stop_reason == "max_tokens":
            raise DraftError("Model output was truncated")
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise DraftError("Model returned no text")
        return json.loads(text)

    def draft(
        self,
        client: Client,
        global_rules: list[str],
        client_rules: list[str],
        reviews: list[dict],
    ) -> dict[str, Draft]:
        """reviews: [{review_id, reviewer, stars, date, text, history}] -> drafts by review_id."""
        drafts: dict[str, Draft] = {}
        for start in range(0, len(reviews), 20):
            chunk = reviews[start : start + 20]
            payload = {
                "business": {
                    "client_location": client.client_location,
                    "business_name": client.business_name,
                    "website": client.website,
                    "type_of_firm": client.firm_type,
                    "practice_area": client.practice_area,
                },
                "agency_wide_rules": global_rules,
                "client_rules": client_rules,
                "reviews": chunk,
            }
            user = (
                "Draft a reply and recommendation for each review below. Return one item per "
                "review, using its review_id.\n\n" + json.dumps(payload, ensure_ascii=False, indent=2)
            )
            result = self._json_call(DRAFT_SYSTEM, user, DRAFT_SCHEMA, effort="high")
            for item in result["items"]:
                drafts[item["review_id"]] = Draft(**item)
            missing = [r["review_id"] for r in chunk if r["review_id"] not in drafts]
            if missing:
                raise DraftError(f"Model skipped {len(missing)} review(s)")
        return drafts

    def interpret_note(
        self,
        message: str,
        client_names: list[str],
        items: list[dict],
        rules: list[dict],
        exclusions: list[dict],
    ) -> dict:
        payload = {
            "client_list": client_names,
            "batch_items": items,
            "current_rules": rules,
            "current_exclusions": exclusions,
        }
        user = (
            "Context:\n" + json.dumps(payload, ensure_ascii=False, indent=2)
            + "\n\nTeam message:\n<<<\n" + message + "\n>>>"
        )
        return self._json_call(NOTE_SYSTEM, user, NOTE_SCHEMA, effort="medium")
