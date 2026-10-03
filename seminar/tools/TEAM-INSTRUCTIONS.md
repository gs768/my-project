# Team instructions: collecting the data for the LSA city-opportunity demo

Three jobs. Do them in order. Total time: about 1 hour for Job 1, 1-2 hours for Job 2 (one time only), and 2-3 hours per firm for Job 3.
Rule for everything: **public information only**, from the sources named below. Do not copy data from another agency's reports or any private source. Screenshot your sources.
Firms for the demo: **Fox Injury Law (Georgia)** and **Vinas DeLuca (Florida)**. Use a shared Google Sheet with one tab per job.

---

## JOB 1: Ratings and review counts for each office
**Goal:** fill the `rating` and `reviews` columns in `DEMO_offices_TO_FILL.csv`. These decide which offices qualify (30 or more reviews).

1. Open Google Maps in a normal browser window (not logged in to a client's account).
2. Search `Fox Injury Law Tucker GA` (firm name + office city). Click the listing that has that office's **street address**.
3. Confirm the address matches the sheet. If the firm has moved or closed the office, mark the row `CLOSED/MOVED` and add the new address if there is one.
4. Read the star rating and the review count next to it. Write both down exactly (for example `4.8` and `212`). If the count shows as "1.2K", click the reviews tab to get the exact number, or write the rounded figure and mark it `approx`.
5. Take a screenshot showing the name, address, rating and count. Save it as `FIRM_CITY_YYYY-MM-DD.png` in the shared folder.
6. Repeat for every office in the sheet. If you find an office we don't have (check the firm's website "Locations" page), add a row for it.
7. **One listing per office.** If an office has two Google listings, record the one with the street address and note the other in a comments column.
8. Fill in the county for any new office row. Look it up from the address (a county lookup on the Georgia or Florida state site, or Google Maps).
9. Record the date and your initials on every row. Ratings change, so we need to know when we looked.

**Check yourself:** every office row has a rating, a count, a date, and a screenshot. No blanks.

Then run the office rule (we will do this): all offices with 30+ reviews qualify; if none, only the single highest-rated office.

---

## JOB 2: Counties next to each qualifying office, and the 5 largest cities (one-time setup)
**Goal:** two files: `adjacency.csv` and `cities.csv`. We will use the Census Bureau's official data. Do not fill these in from memory.

### 2A. Adjacent counties (`adjacency.csv`)
Columns: `county,state,adjacent_county,adjacent_state`
1. Go to census.gov and search for **"County Adjacency File"** (it is in the Geographic Reference Files section). Download the text file.
2. Open it in Google Sheets (File > Import, tab-separated). It has four columns: county name, county code, neighbor name, neighbor code. County names look like `DeKalb County, GA`.
3. In this file each county's name appears only on the **first** row of its block; the rows below are its other neighbors with the first two columns blank. Fill those blanks down so every row has its county.
4. Split `DeKalb County, GA` into county (`DeKalb`) and state (`GA`). Do the same for the neighbor. Remove the word "County" (also "Parish" in Louisiana, if it ever comes up).
5. Keep only rows for the **states we need** (Georgia and Florida, plus any state that borders the office counties, since a county can be next to a county in another state; keep any row whose county or neighbor is in the states of our offices).
6. Save as CSV with the four column names above.
7. **Spot check:** pick two counties and compare the neighbor list to Google Maps. They should match. A county should not be listed as its own neighbor in your final file (delete those rows if present).

### 2B. Cities and populations (`cities.csv`)
Columns: `city,state,county,population`
1. On census.gov, search **"City and Town Population Totals"** (latest year) for each state. Download the table of **incorporated places**. This gives city and population.
2. Each city needs a county. Use the Census **Geographic Relationship Files** (Place to County), or Wikipedia's county list for the state if the Census file is hard to use. Add a county column.
3. **If a city sits in more than one county**, put it in the county that holds most of its population, and add a note. Tell Gabriel which cities this applies to.
4. **Decision to confirm with Gabriel first:** include only incorporated cities, or also unincorporated towns (Census "CDPs")? The instructions above assume incorporated cities only.
5. You only need cities in the counties around our qualifying offices, but the full state list is fine and easier.
6. Save as CSV with the four column names above.

**Check yourself:** run `python3 select_test_cities.py offices.csv cities.csv adjacency.csv --firm "Fox Injury Law"`. You should get 5 cities per qualifying office. Sanity check: the largest cities in that area should be places you recognise as large.

---

## JOB 3: The LSA competitor results in each test city
**Goal:** a CSV of every lawyer advertising in Local Services Ads for each test city, with rating, review count, and position.
Columns: `city,firm,rating,reviews,is_client,position` (the demo firm has `is_client=1`; one per city).

### Setup (every session)
1. Use **Chrome on a desktop computer**, in an **Incognito window**, not signed in to Google. This avoids personalised results.
2. Set Chrome to the target city:
   - Open DevTools (F12) > three-dot menu > More tools > **Sensors**. Under **Location**, pick "Other..." and enter the latitude and longitude of the **city center** (look it up on Google Maps: right-click the city on the map, the coordinates appear). Keep DevTools open while you search.
   - Also, on the Google results page, scroll to the bottom and click the location link ("Update location", or the area shown) and confirm it says the target city. If Google shows a different city, stop and fix it before recording anything.
3. Search for exactly: `personal injury lawyer` (same wording every time, all cities).
4. The Local Services Ads box appears at the top, above the regular ads, with a heading like "Lawyers" and a "Google Guaranteed" or "Google Screened" badge. Click the link at the bottom of that box ("More lawyers" or similar) to open the **full list**.

### Do NOT do these (they cost the advertiser real money or break the test)
- **Do not call, message, book, or request a quote** from any listing.
- Don't submit any form. Opening a listing to read it is fine.
- Don't use scripts, scrapers or browser extensions that read the page. By hand only.

### Recording each city
1. Take a full screenshot of the list, scrolling to capture every advertiser. Name it `CITY_ST_YYYY-MM-DD_HHMM.png`. Make sure the location (city) is visible if the page shows it.
2. For **each lawyer listed**, in the order shown from the top, write:
   - `position` (1 for the first listing, 2 for the second, and so on),
   - `firm` (the name as shown),
   - `rating` (e.g. 4.9),
   - `reviews` (the number in brackets or beside the stars. If it only shows e.g. "100+", open the listing's profile to see the exact count; if it still shows "100+", write `100` and mark the row `approx`),
   - the badge type (Google Guaranteed / Google Screened) in a notes column.
3. Add one row for the demo firm if it **appears** in the list, with `is_client=1`. **If it does not appear in that city,** still add its row, using its rating and review count from its own listing, with `position` blank, and mark `not shown`. (We need its rating and reviews for the comparison.)
4. Record the **date, time and the lat/long you used** in a notes column.
5. **Do it twice,** at two different times of day (for example 10 am and 3 pm, or on two different days). Ordering in LSA changes with time and availability. Use the position order seen **most often**, and mark any row that changed.
6. Move to the next city. Clear cookies or open a new Incognito window between cities.

### Final steps
1. Save as `FIRM_lsa_YYYY-MM-DD.csv` using the columns above.
2. Run `python3 lsa_opportunity.py FIRM_lsa_YYYY-MM-DD.csv --csv ranked.csv`.
3. Send Gabriel the ranked table plus the folder of screenshots.

**Check yourself:**
- Each city has screenshots, the date and time, and the coordinates used.
- Each city has exactly one client row.
- Each lawyer in the list is in the CSV, no skipped rows.
- Ratings and review counts match the screenshots.
- Nothing came from outside the Google results page, and nobody called or messaged a listing.

**Ask Gabriel before continuing if:**
- Google won't show Local Services Ads for a city. Some areas have none, so write `no LSA advertisers` and move on.
- The same lawyer appears under different names, or a firm has several listings.
- The results look personalised or the location keeps switching.
