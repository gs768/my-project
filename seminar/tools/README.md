# LSA competitor opportunity tool

Ranks the cities around a client by how few LSA advertisers beat them on reviews.
"Ahead of the client" = a higher star rating, OR the same rating (1 decimal, as LSA shows it) with more reviews.
Fewest ahead = best opportunity. Output also shows how many reviews the client needs to pass equal-rated competitors.

    python3 lsa_opportunity.py data.csv --csv ranked.csv

`SAMPLE_lsa_data.csv` is **made-up** test data. Never show it as a result.

## Getting real data (the hard part)
Google has no public API for other advertisers' LSA listings, and automated scraping of Google results breaks Google's terms. Options:
1. **Manual capture (recommended for the two webinar firms):** search the LSA results for the firm's practice area from each nearby city (about 8-12 cities, the top 5-8 advertisers each); record firm, rating and review count into the CSV. Screenshot each search as the source, so every row can be backed up.
2. **Client's own LSA account** for the client's rating and reviews.
3. Ratings/review counts for the same firms from Google Business Profile data (BrightLocal) as a cross-check only; LSA ratings and GBP ratings may differ, so verify before treating them as the same.
Keep it to public information a person could see. Do not pull data from private sources or other agencies' reports.

## Open questions
- Which cities count as "surrounding" (radius or the client's LSA service area)?
- Practice-area filter: LSA ranks per category, so capture the PI results.
- Do we also want a position-weighted score (competitors in the top 3 count more)? Easy to add.

## Step 1: choose the test cities (`select_test_cities.py`)
Rules: offices with 30+ reviews qualify (all of them); if none do, use the single highest-rated office. Each qualifying office's area is its county plus directly adjacent counties, and the test cities are the 5 most populated cities in that area.

    python3 select_test_cities.py offices.csv cities.csv adjacency.csv --firm "Fox Injury Law"

Inputs: `offices.csv` (firm,office_city,county,state,rating,reviews), `cities.csv` (city,state,county,population), `adjacency.csv` (county,state,adjacent_county,adjacent_state).
The script refuses to run if an office is missing its rating or review count. Tested on synthetic data only.

**Still needed from outside this environment** (Census sites are blocked here): the US Census county adjacency file and place populations. Convert them to the two CSVs above. Adjacent counties and populations must not be filled in from memory.

## Step 2: weighting
`lsa_opportunity.py` now takes an optional `position` column (the competitor's LSA rank). Competitors in positions 1-3 count 1.0, 4-6 count 0.5, 7+ count 0.25 (`weight()` in the script). Cities are ranked by the weighted count, then the raw count.

## Demo firms
`DEMO_offices_TO_FILL.csv` lists the offices I found for **Fox Injury Law (Georgia)**: Tucker, Atlanta, Columbus, and **Vinas DeLuca (Florida)**: Miami, Boca Raton, Tampa, Aventura, Jacksonville. The addresses come from third-party directories and may be stale. Counties are filled in, but **ratings and review counts are blank on purpose**; fill them from each firm's Google Business Profile (a connector or a manual look). Confirm each office still exists first.
