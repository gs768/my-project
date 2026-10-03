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
