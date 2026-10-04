#!/usr/bin/env python3
"""Pick the cities where we run the LSA test for one firm.

Rules (Gabriel, 2026-10-03):
  1. Qualifying offices = offices with >= 30 reviews. If none qualify, use the single office
     with the highest star rating (ties: more reviews). If several qualify, all qualify.
  2. For each qualifying office, the area = its county plus every directly adjacent county.
  3. Test cities = the 5 most populated cities in that area.

Inputs (CSV):
  offices.csv    firm,office_city,county,state,rating,reviews
  cities.csv     city,state,county,population          (every city/place in the region)
  adjacency.csv  county,state,adjacent_county,adjacent_state
Usage: python3 select_test_cities.py offices.csv cities.csv adjacency.csv [--firm NAME] [--min-reviews 30] [--top 5]
"""
import argparse, csv, sys


def read(p):
    with open(p, newline="") as f:
        return list(csv.DictReader(f))


def qualifying_offices(offices, min_reviews):
    for o in offices:
        if o["rating"] in ("", None) or o["reviews"] in ("", None):
            sys.exit(f"Missing rating/reviews for {o['firm']} - {o['office_city']}. Fill from Google Business Profile first.")
    q = [o for o in offices if int(o["reviews"]) >= min_reviews]
    if q:
        return q
    return [max(offices, key=lambda o: (float(o["rating"]), int(o["reviews"])))]


def area_counties(office, adjacency):
    base = (office["county"].strip().lower(), office["state"].strip().upper())
    area = {base}
    for a in adjacency:
        if (a["county"].strip().lower(), a["state"].strip().upper()) == base:
            area.add((a["adjacent_county"].strip().lower(), a["adjacent_state"].strip().upper()))
    return area


def test_cities(office, cities, adjacency, top):
    area = area_counties(office, adjacency)
    pool = [c for c in cities if (c["county"].strip().lower(), c["state"].strip().upper()) in area]
    pool.sort(key=lambda c: -int(c["population"]))
    return pool[:top]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("offices"); ap.add_argument("cities"); ap.add_argument("adjacency")
    ap.add_argument("--firm"); ap.add_argument("--min-reviews", type=int, default=30); ap.add_argument("--top", type=int, default=5)
    a = ap.parse_args()
    offices = read(a.offices)
    if a.firm:
        offices = [o for o in offices if o["firm"].lower() == a.firm.lower()]
    cities, adj = read(a.cities), read(a.adjacency)
    for o in qualifying_offices(offices, a.min_reviews):
        print(f"\n{o['firm']} - {o['office_city']} ({o['county']} County, {o['state']}): {o['rating']} stars, {o['reviews']} reviews")
        for c in test_cities(o, cities, adj, a.top):
            print(f"   {c['city']}, {c['state']} ({c['county']} County) pop {int(c['population']):,}")


if __name__ == "__main__":
    main()
