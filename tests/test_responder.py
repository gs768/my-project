import random
import unittest

from review_responder.responder import build_reply, first_name, process_reviews, should_reply


def review(stars, name="Jane Doe", replied=False, rid="1"):
    r = {
        "name": f"accounts/a/locations/l/reviews/{rid}",
        "starRating": stars,
        "reviewer": {"displayName": name},
    }
    if replied:
        r["reviewReply"] = {"comment": "Thanks!"}
    return r


class FakeClient:
    def __init__(self, reviews):
        self.reviews = reviews
        self.replies = []

    def list_reviews(self, account_id, location_id):
        return iter(self.reviews)

    def reply_to_review(self, review_name, comment):
        self.replies.append((review_name, comment))


class ShouldReplyTests(unittest.TestCase):
    def test_only_five_stars(self):
        self.assertTrue(should_reply(review("FIVE")))
        for stars in ["ONE", "TWO", "THREE", "FOUR", "STAR_RATING_UNSPECIFIED", None]:
            self.assertFalse(should_reply(review(stars)), stars)

    def test_skips_already_replied(self):
        self.assertFalse(should_reply(review("FIVE", replied=True)))


class BuildReplyTests(unittest.TestCase):
    def test_uses_first_name(self):
        self.assertEqual(first_name(review("FIVE", name="Jane Doe")), "Jane")
        reply = build_reply(review("FIVE"), templates=["Thanks {name}!"], rng=random.Random(0))
        self.assertEqual(reply, "Thanks Jane!")

    def test_anonymous_or_missing_name(self):
        anon = review("FIVE")
        anon["reviewer"]["isAnonymous"] = True
        self.assertEqual(first_name(anon), "there")
        self.assertEqual(first_name({"starRating": "FIVE"}), "there")


class ProcessReviewsTests(unittest.TestCase):
    def setUp(self):
        self.client = FakeClient(
            [
                review("FIVE", rid="five"),
                review("FOUR", rid="four"),
                review("ONE", rid="one"),
                review("FIVE", replied=True, rid="five-replied"),
            ]
        )

    def test_send_replies_only_to_unreplied_five_stars(self):
        replied, skipped = process_reviews(self.client, "a", "l", templates=["Thanks {name}!"], dry_run=False, log=lambda _: None)
        self.assertEqual((replied, skipped), (1, 3))
        self.assertEqual(self.client.replies, [("accounts/a/locations/l/reviews/five", "Thanks Jane!")])

    def test_dry_run_posts_nothing(self):
        replied, _ = process_reviews(self.client, "a", "l", dry_run=True, log=lambda _: None)
        self.assertEqual(replied, 1)
        self.assertEqual(self.client.replies, [])


if __name__ == "__main__":
    unittest.main()
