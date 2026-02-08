# Feature 07: Real Government Scheme Data Sources & Scraping Guide

## Priority: MEDIUM-HIGH (Without real data the app is just a demo)
## Estimated Effort: 4-6 hours for initial data, ongoing for maintenance
## Depends On: Feature 01 (PostgreSQL Database) for storage

---

## Overview

The app currently has 10 hardcoded mock schemes. This guide documents **exactly where and how** to find real government scholarship data, how to structure it for the database, and how to build a data pipeline to keep it updated.

---

## Current Mock Data

The 10 existing schemes in `Backend/data/schemes.py` and `frontend/src/data/schemes.js`:

| ID | Name | State | Category | Real? |
|----|------|-------|----------|-------|
| scheme_1 | National Scholarship for Higher Education | ALL | ALL | ✅ Based on real |
| scheme_2 | PM YASASVI Scholarship | ALL | OBC | ✅ Real scheme |
| scheme_3 | Post Matric Scholarship for SC Students | ALL | SC | ✅ Real scheme |
| scheme_4 | Maharashtra State Merit Scholarship | Maharashtra | ALL | ⚠️ Partially real |
| scheme_5 | Karnataka Vidyasiri Scholarship | Karnataka | ALL | ✅ Real scheme |
| scheme_6 | Central Sector Scholarship for College Students | ALL | ALL | ✅ Real scheme |
| scheme_7 | Pragati Scholarship for Girl Students | ALL | ALL | ✅ Real scheme |
| scheme_8 | UP Scholarship for Minority Students | UP | Minority | ✅ Real scheme |
| scheme_9 | Pre Matric Scholarship for ST Students | ALL | ST | ✅ Real scheme |
| scheme_10 | Tamil Nadu Free Education Scheme | TN | ALL | ⚠️ Partially real |

---

## Official Government Data Sources

### 1. National Scholarship Portal (NSP)
- **URL**: https://scholarships.gov.in
- **Data Available**: All central government scholarships, state scholarships, UGC scholarships
- **How to Access**:
  - Browse: https://scholarships.gov.in/public/schemeReport
  - Each scheme has: name, description, eligibility criteria, documents, application dates
  - **API**: No public API — must scrape or manually extract
- **Scheme Count**: 100+ active schemes
- **Update Frequency**: Annually (new academic year cycles)

### 2. MyScheme Portal (Government of India)
- **URL**: https://www.myscheme.gov.in
- **Data Available**: 500+ central and state government schemes (not just scholarships)
- **How to Access**:
  - Browse by category: https://www.myscheme.gov.in/search
  - Filter by: state, category, gender, age, income, education level
  - **API**: Has a public API endpoint (undocumented)
    - `https://www.myscheme.gov.in/api/v1/schemes` (may require reverse-engineering)
  - Each scheme page has structured data
- **Best Source For**: Comprehensive scheme data with eligibility criteria

### 3. API Setu (Government Open Data API)
- **URL**: https://apisetu.gov.in
- **Data Available**: Various government APIs
- **How to Access**: Register for API key
- **Relevant APIs**:
  - Scholarship data APIs (if available under education category)
  - Aadhaar verification APIs (for future identity integration)

### 4. data.gov.in (Open Government Data)
- **URL**: https://data.gov.in
- **Data Available**: Datasets on government schemes, beneficiaries, budgets
- **How to Search**: "scholarship" or "scholarship scheme" in search
- **Format**: CSV, JSON, API endpoints
- **Useful Datasets**:
  - Ministry of Education scholarship data
  - State-wise scholarship distribution

### 5. State-Specific Portals

| State | Portal | URL |
|-------|--------|-----|
| Maharashtra | MahaDBT | https://mahadbt.maharashtra.gov.in |
| Karnataka | SSP Karnataka | https://ssp.karnataka.gov.in |
| Tamil Nadu | TN eScholarship | https://tnscholarships.gov.in |
| Uttar Pradesh | UP Scholarship | https://scholarship.up.gov.in |
| Rajasthan | SJE Rajasthan | https://sje.rajasthan.gov.in |
| West Bengal | Banglar Shiksha | https://banglarshiksha.gov.in |
| Kerala | DCE Kerala | https://dcescholarship.kerala.gov.in |
| Andhra Pradesh | AP ePass | https://apepass.cgg.gov.in |
| Telangana | TS ePass | https://telanganaepass.cgg.gov.in |
| Gujarat | Digital Gujarat | https://digitalgujarat.gov.in |
| Madhya Pradesh | MP Scholarship | https://scholarshipportal.mp.nic.in |
| Bihar | Bihar Scholarship | https://www.pmsonline.bih.nic.in |
| Punjab | Punjab Scholarship | https://scholarships.punjab.gov.in |
| Delhi | Delhi e-District | https://edistrict.delhigovt.nic.in |

### 6. AICTE Scholarships (Technical Education)
- **URL**: https://www.aicte-india.org/schemes
- **Schemes**: Pragati, Saksham, PG Scholarship, GATE scholarships
- **Data Format**: PDF documents with eligibility criteria

### 7. UGC Scholarships (University Grants Commission)
- **URL**: https://www.ugc.gov.in/scholarships
- **Schemes**: NET-JRF, CSIR fellowships, Maulana Azad Fellowship, etc.

---

## Scheme Data Schema

Every scheme should be stored with these fields (matching the database model from Feature 01):

```python
{
    "id": "unique_string_id",          # e.g., "nsp_central_sector_2024"
    "name": "Scheme Full Name",         # Official scheme name
    "state": "ALL" or "StateName",      # ALL for central schemes
    "category": "ALL" or "SC/ST/OBC/...", # Target category
    "income_max": 250000,               # Annual income ceiling in INR
    "age_min": 17,                      # Minimum age
    "age_max": 25,                      # Maximum age
    "benefits": "Description of benefits...",  # Full text description
    "documents": ["Doc1", "Doc2", ...],  # Required documents list
    "apply_link": "https://...",         # Official application URL
    
    # NEW fields to add:
    "ministry": "Ministry of Education",  # Sponsoring ministry
    "scheme_type": "scholarship",         # scholarship, grant, subsidy, pension
    "gender": "ALL",                      # ALL, Female, Male
    "education_level": "undergraduate",   # pre-matric, post-matric, undergraduate, postgraduate
    "application_start": "2024-08-01",    # Application window start
    "application_end": "2024-12-31",      # Application window end
    "renewal": true,                      # Whether it's renewable
    "amount_min": 10000,                  # Minimum benefit amount
    "amount_max": 50000,                  # Maximum benefit amount
    "source_url": "https://...",          # Where data was sourced
    "last_verified": "2024-01-15",        # Last verification date
    "is_active": true,                    # Currently accepting applications
}
```

---

## Building a Data Scraper

### Approach 1: Manual Curation (Recommended to Start)

1. Visit each source portal listed above
2. Browse scheme listings
3. For each scheme, extract the fields listed in the schema
4. Enter data into a CSV or JSON file
5. Import into PostgreSQL using the seed script

**Create `Backend/data/schemes_real.json`**:
```json
[
  {
    "id": "nsp_pm_yasasvi_2024",
    "name": "PM Young Achievers Scholarship Award Scheme for Vibrant India (PM-YASASVI)",
    "state": "ALL",
    "category": "OBC",
    "income_max": 250000,
    "age_min": 15,
    "age_max": 25,
    "benefits": "Annual scholarship of ₹75,000 for Class 9-10 students and ₹1,25,000 for Class 11-12 students from OBC, EBC, and DNT categories.",
    "documents": ["Caste Certificate", "Income Certificate", "Aadhaar Card", "School Bonafide", "Parent ID Proof"],
    "apply_link": "https://yet.nta.ac.in",
    "ministry": "Ministry of Social Justice and Empowerment",
    "scheme_type": "scholarship",
    "gender": "ALL",
    "education_level": "pre-matric",
    "source_url": "https://scholarships.gov.in/public/schemeReport",
    "is_active": true
  }
]
```

### Approach 2: Web Scraper (For Scale)

**Create `Backend/scripts/scrape_schemes.py`**:
```python
"""
Scheme data scraper.
Scrapes government portals for scholarship information.

Usage: python -m Backend.scripts.scrape_schemes
"""
import requests
from bs4 import BeautifulSoup
import json
import time
import logging

logger = logging.getLogger(__name__)

class SchemeScraper:
    """Base scraper class"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "BharatConnect-SchemeBot/1.0 (educational project)"
        })
    
    def scrape_nsp(self):
        """Scrape National Scholarship Portal"""
        url = "https://scholarships.gov.in/public/schemeReport"
        # NOTE: This may require browser automation (Selenium/Playwright)
        # as the page likely uses JavaScript rendering
        # 
        # Alternative: Use the PDF reports available on the site
        pass
    
    def scrape_myscheme(self):
        """Scrape MyScheme portal"""
        # MyScheme has better structured data
        # Try: https://www.myscheme.gov.in/search
        # Look for API calls in browser DevTools Network tab
        pass
    
    def scrape_state_portal(self, state, url):
        """Scrape a state scholarship portal"""
        pass

    def normalize_scheme(self, raw_data, source):
        """Convert scraped data to standard schema"""
        return {
            "id": f"{source}_{raw_data.get('id', 'unknown')}",
            "name": raw_data.get("name", "").strip(),
            "state": raw_data.get("state", "ALL"),
            "category": self._normalize_category(raw_data.get("category", "ALL")),
            "income_max": self._parse_income(raw_data.get("income_limit", "0")),
            "age_min": raw_data.get("age_min", 0),
            "age_max": raw_data.get("age_max", 100),
            "benefits": raw_data.get("benefits", ""),
            "documents": raw_data.get("documents", []),
            "apply_link": raw_data.get("apply_link", ""),
            "source_url": raw_data.get("source_url", ""),
            "is_active": True,
        }
    
    def _normalize_category(self, cat):
        """Map various category names to standard values"""
        cat = cat.strip().upper()
        mapping = {
            "SCHEDULED CASTE": "SC",
            "SCHEDULED TRIBE": "ST",
            "OTHER BACKWARD CLASS": "OBC",
            "ECONOMICALLY WEAKER SECTION": "EWS",
            "MINORITY": "Minority",
            "GENERAL": "General",
        }
        return mapping.get(cat, cat)
    
    def _parse_income(self, income_str):
        """Parse income string to integer"""
        if isinstance(income_str, int):
            return income_str
        income_str = income_str.replace(",", "").replace("₹", "").strip()
        if "lakh" in income_str.lower():
            return int(float(income_str.lower().replace("lakh", "").strip()) * 100000)
        try:
            return int(income_str)
        except ValueError:
            return 0
```

### Approach 3: Use AI to Extract Scheme Data

**Create `Backend/scripts/extract_schemes_ai.py`**:
```python
"""
Use Gemini to extract structured scheme data from government web pages.
Feed it the raw HTML or text, get back structured JSON.
"""
import google.generativeai as genai
import json
from config import settings

genai.configure(api_key=settings.google_api_key)

EXTRACTION_PROMPT = """
Extract government scholarship scheme information from the following text.
Return a JSON array of schemes. For each scheme, extract:

{
  "name": "Full official scheme name",
  "state": "State name or ALL if central",
  "category": "General/SC/ST/OBC/EWS/Minority or ALL",
  "income_max": income ceiling as integer (in rupees),
  "age_min": minimum age as integer,
  "age_max": maximum age as integer,
  "benefits": "Description of financial benefits",
  "documents": ["list", "of", "required", "documents"],
  "apply_link": "application URL if mentioned",
  "gender": "ALL/Male/Female"
}

If a field is not found, use reasonable defaults (age_min=0, age_max=100, income_max=0, etc.)

TEXT TO EXTRACT FROM:
---
{text}
---

Return ONLY valid JSON array, no explanation.
"""

def extract_schemes_from_text(text: str) -> list:
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(EXTRACTION_PROMPT.format(text=text))
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        import re
        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    return []
```

### Approach 4: Import from CSV

**Create `Backend/scripts/import_csv.py`**:
```python
"""
Import schemes from a CSV file into the database.

CSV columns: name,state,category,income_max,age_min,age_max,benefits,documents,apply_link

Usage: python -m Backend.scripts.import_csv path/to/schemes.csv
"""
import csv
import sys
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from database.models import SchemeModel
from config import settings

def import_from_csv(filepath: str):
    engine = create_engine(settings.database_url_sync)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        schemes = []
        
        for i, row in enumerate(reader):
            scheme = SchemeModel(
                id=f"imported_{i+1}",
                name=row['name'].strip(),
                state=row.get('state', 'ALL').strip(),
                category=row.get('category', 'ALL').strip(),
                income_max=int(row.get('income_max', 0)),
                age_min=int(row.get('age_min', 0)),
                age_max=int(row.get('age_max', 100)),
                benefits=row.get('benefits', '').strip(),
                documents=json.loads(row.get('documents', '[]')),
                apply_link=row.get('apply_link', '').strip(),
                is_active=True,
            )
            schemes.append(scheme)
    
    with Session(engine) as session:
        session.add_all(schemes)
        session.commit()
        print(f"Imported {len(schemes)} schemes from {filepath}")

if __name__ == "__main__":
    import_from_csv(sys.argv[1])
```

---

## Recommended First Steps

1. **Manual curation of 50 schemes** from NSP + MyScheme portal
2. Store in `Backend/data/schemes_real.json`
3. Update seed script to load from JSON file
4. Verify each scheme's data accuracy against source portal
5. Add `source_url` and `last_verified` date for each scheme

---

## Data Maintenance Strategy

| Task | Frequency | Method |
|------|-----------|--------|
| Verify existing schemes still active | Monthly | Check apply_link returns 200 |
| Update application dates | Annually | Manual check on NSP |
| Add new central schemes | Quarterly | Browse NSP new listings |
| Add state schemes | Quarterly | Browse state portals |
| Remove expired schemes | Monthly | Set is_active=false |

---

## Important Legal Notes

- Government scheme data is **public information** — no copyright issues
- Scraping government websites is generally permitted for educational/public benefit
- Always credit the source portal
- Do not store personal data (applicant info)
- Include a disclaimer: "Data sourced from official government portals. Verify eligibility on the respective scheme website before applying."

---

## Files to Create
- `Backend/data/schemes_real.json` — curated real scheme data
- `Backend/scripts/scrape_schemes.py` — web scraper (optional)
- `Backend/scripts/extract_schemes_ai.py` — AI extraction (optional)
- `Backend/scripts/import_csv.py` — CSV import utility
- `Backend/scripts/verify_schemes.py` — Verify active schemes

## Files to Modify
- `Backend/database/seed.py` — load from JSON file instead of hardcoded list
- `Backend/database/models.py` — add new fields (ministry, scheme_type, gender, etc.)

## Verification Checklist
- [ ] At least 50 real schemes in the database
- [ ] Each scheme has `source_url` for verification
- [ ] Each scheme has been verified against the source portal
- [ ] Seed script loads schemes from JSON file
- [ ] CSV import utility works
- [ ] Scheme data matches frontend display expectations
- [ ] Apply links resolve to valid pages
