# BrightLocal LSG twice-monthly run

Runs on the 1st and 15th. Triggers existing Local Search Grid reports only.

## Source of truth

Google Sheet **Sutton Digital Clients – Master**
(`1eIhE8_PzK1KsctTlrmjSDzZZvob0xBRXi9QuXMo4zFY`).

- Row 1 is category headers, row 2 is column titles; client rows start at row 3.
- Column A: Client Location
- Column I: SEO (include only rows where this is TRUE)
- Column BX: BrightLocal Campaign/Grid ID (the BrightLocal **location ID**)

The old "All Clients Core info" sheet (`1gDXN45…`) is not used: its BrightLocal
column is misaligned on the Brandywine, Kawecki and Weston & Pape rows.

## Steps

1. Read the master sheet. Keep rows where column I is TRUE.
2. Exclude Todd A Kawecki – Jupiter.
3. Take the location ID from column BX (tab "Clients Master"). If BX is blank,
   skip the row and list it in the summary.
   Deduplicate location IDs.
4. For each location ID, `find_lsg_reports(location_id)` and `run_lsg_report`
   each report. If a location has more than one report, use the one listed in
   the fallback table.
5. Never change grid, keyword, schedule or report settings. Never create or
   delete reports. Only trigger runs.
6. If a run fails (e.g. insufficient credits), keep going and record the error.
7. DM Gabriel on Slack (U0AKXLKABB4): date, number of reports run, the list of
   client / location ID / report ID, skipped rows and why, failures, and the
   remaining LSG credits (`get_lsg_credits`).

## Reference IDs

Verified against BrightLocal on 2026-09-26 and written to column BX of the
Clients Master tab the same day (row 54, WPB, left blank until confirmed).
Use this table to pick the report when a location has more than one.

| Row | Client Location | Location ID | Report ID |
|---|---|---|---|
| 7 | DW SSD – Stuart | 3753570 | 293446 |
| 8 | Emerson Straw – St Petersburg | 2068390 | 31273 |
| 12 | Estate Planning Law (Philip King) – Columbus | 3800843 | 310296 |
| 13 | Kingbird Legal – West Chester | 3663384 | 264698 |
| 15 | Langley Law – Spartanburg | 2068397 | 107856 |
| 17 | LSF Dog Bite Lawyers – Charleston | 4145894 | none yet |
| 18 | MBJ – Anderson | 3742001 | 289974 |
| 19 | MBJ – Columbia | 2695584 | 157633 |
| 20 | MGA – Las Vegas | 2224222 | 77614 |
| 21 | MGA – Reno | 3900933 | 344724 |
| 22 | MGA Truck Accident Lawyers | 4135280 | none yet |
| 26 | Michael D. Waks – Long Beach | 3918445 | 350977 |
| 27 | OSP – Cleveland | 2268444 | 90955 |
| 28 | OSP – Akron | 2628487 | 140441 |
| 29 | OSP – Columbus (Dog Bite) | 4092989 | none yet |
| 31 | PCW – Pittsburgh | 3776372 | 301747 |
| 32 | Rainstone – Dalworthington Gardens | 3910637 | 357261 |
| 36 | Saavedra – Fairfax | 3702110 | 277562 |
| 37 | Saavedra – Clearwater | 4085831 | 458797 |
| 38 | SK Quality Roofing – Delray Beach | 3776317 | 301699 |
| 40 | Todd A Kawecki – Fort Pierce | 2261756 | 97014 |
| 43 | Todd A Kawecki – Port St. Lucie | 2107382 | 31271 |
| 44 | Todd A. Kawecki – Stuart | 2107377 | 31272 |
| 45 | VIP Smiles – Jackson | 3777933 | 302233 |
| 46 | Ward and Smith – New Bern | 2983965 | 231905 |
| 47 | Weston & Pape – Deltona | 2660562 | 150778 |
| 48 | Weston & Pape – Fort Myers | 3130859 | 243936 |
| 49 | Weston & Pape – Lakeland | 2901945 | 208376 |
| 50 | Weston & Pape – Largo | 2914530 | 211490 |
| 51 | Weston & Pape – Orlando | 2809494 | 189388 |
| 52 | Weston & Pape – Stuart | 2068386 | 31267 |
| 53 | Weston & Pape – Sunrise | 2418219 | 114743 |
| 54 | Weston & Pape – WPB | 2068389 (unconfirmed) | 31266 |

Row 54: the sheet lists "WP Bicycle & Motorcycle Accident Lawyers, 120 S Dixie
Hwy", but BrightLocal location 2068389 is the Donaldson & Weston office at 1401
Elizabeth Ave. Confirm the right profile before relying on it.
