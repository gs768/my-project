#!/usr/bin/env python3
"""Rank cities by LSA review-competition opportunity for one client firm.

Input CSV columns: city,firm,rating,reviews,is_client,position   (position = LSA rank in that city, 1 = top; optional)
  - one row per LSA advertiser seen in that city's results (include the client, is_client=1)
Competitor "ahead" of the client = higher rating, OR equal rating with more reviews.
Best opportunity = lowest position-weighted count of competitors ahead. Ratings are compared at 1 decimal (as LSA shows them).
Usage: python3 lsa_opportunity.py data.csv [--csv out.csv]
"""
import argparse, csv, sys
from collections import defaultdict


def weight(position):
    """Competitors in the top 3 count fully, 4-6 half, lower a quarter. Adjust here."""
    if position is None:
        return 1.0
    return 1.0 if position <= 3 else 0.5 if position <= 6 else 0.25


def pos(r):
    v = (r.get("position") or "").strip()
    return int(v) if v else None


def analyze(rows):
    by_city = defaultdict(list)
    for r in rows:
        by_city[r["city"].strip()].append(r)
    out = []
    for city, items in by_city.items():
        clients = [r for r in items if r["is_client"] in ("1", "true", "True", "yes")]
        if len(clients) != 1:
            sys.exit(f"{city}: need exactly one client row, found {len(clients)}")
        c = clients[0]
        c_rating, c_reviews = round(float(c["rating"]), 1), int(c["reviews"])
        comps = [r for r in items if r is not c]
        higher = [r for r in comps if round(float(r["rating"]), 1) > c_rating]
        equal_more = [r for r in comps if round(float(r["rating"]), 1) == c_rating and int(r["reviews"]) > c_reviews]
        ahead = higher + equal_more
        weighted = round(sum(weight(pos(r)) for r in ahead), 2)
        gap = max((int(r["reviews"]) - c_reviews + 1 for r in equal_more), default=0)
        out.append({
            "city": city,
            "advertisers": len(comps),
            "weighted_ahead": weighted,
            "ahead_total": len(ahead),
            "higher_rating": len(higher),
            "equal_rating_more_reviews": len(equal_more),
            "reviews_to_pass_equal_rated": gap,
        })
    out.sort(key=lambda o: (o["weighted_ahead"], o["ahead_total"], o["higher_rating"], o["reviews_to_pass_equal_rated"], -o["advertisers"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--csv")
    a = ap.parse_args()
    with open(a.data, newline="") as f:
        res = analyze(list(csv.DictReader(f)))
    cols = list(res[0].keys())
    print("  ".join(f"{c:>26}" if i else f"{c:<20}" for i, c in enumerate(cols)))
    for r in res:
        print("  ".join(f"{str(r[c]):>26}" if i else f"{str(r[c]):<20}" for i, c in enumerate(cols)))
    if a.csv:
        with open(a.csv, "w", newline="") as f:
            w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(res)


if __name__ == "__main__":
    main()
