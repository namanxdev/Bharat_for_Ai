"""
Tests for scheme data and eligibility logic
"""
import pytest
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from data.schemes import SCHEMES, is_eligible, get_eligible_schemes


def test_schemes_data_structure():
    """Test that all schemes have required fields"""
    required_fields = [
        "id", "name", "state", "category", "income_max",
        "age_min", "age_max", "benefits", "documents", "apply_link"
    ]

    assert len(SCHEMES) == 10, "Should have exactly 10 schemes"

    for scheme in SCHEMES:
        for field in required_fields:
            assert field in scheme, f"Scheme {scheme.get('id', 'unknown')} missing field: {field}"


def test_scheme_ids_unique():
    """Test that all scheme IDs are unique"""
    scheme_ids = [s["id"] for s in SCHEMES]
    assert len(scheme_ids) == len(set(scheme_ids)), "Scheme IDs must be unique"


def test_scheme_ids_format():
    """Test that scheme IDs follow expected format"""
    for scheme in SCHEMES:
        assert scheme["id"].startswith("scheme_"), "Scheme ID should start with 'scheme_'"


def test_eligibility_basic():
    """Test basic eligibility check"""
    profile = {
        "age": 20,
        "income": 200000,
        "state": "Maharashtra",
        "category": "General"
    }

    scheme = SCHEMES[0]  # National Scholarship
    eligible, reason = is_eligible(profile, scheme)

    assert isinstance(eligible, bool)
    assert isinstance(reason, str)
    assert len(reason) > 0


def test_eligibility_age_boundary():
    """Test age boundary conditions"""
    scheme = {
        "age_min": 17,
        "age_max": 25,
        "income_max": 250000,
        "state": "ALL",
        "category": "ALL"
    }

    # Below minimum age
    profile_too_young = {"age": 16, "income": 200000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_too_young, scheme)
    assert eligible is False
    assert "Age must be between" in reason

    # At minimum age
    profile_min_age = {"age": 17, "income": 200000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_min_age, scheme)
    assert eligible is True

    # At maximum age
    profile_max_age = {"age": 25, "income": 200000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_max_age, scheme)
    assert eligible is True

    # Above maximum age
    profile_too_old = {"age": 26, "income": 200000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_too_old, scheme)
    assert eligible is False


def test_eligibility_income_boundary():
    """Test income boundary conditions"""
    scheme = {
        "age_min": 17,
        "age_max": 25,
        "income_max": 250000,
        "state": "ALL",
        "category": "ALL"
    }

    # Below income limit
    profile_below = {"age": 20, "income": 200000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_below, scheme)
    assert eligible is True

    # At income limit
    profile_at_limit = {"age": 20, "income": 250000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_at_limit, scheme)
    assert eligible is True

    # Above income limit
    profile_above = {"age": 20, "income": 250001, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(profile_above, scheme)
    assert eligible is False
    assert "Income must be below" in reason


def test_eligibility_category_matching():
    """Test category-specific scheme matching"""
    # OBC-specific scheme
    obc_scheme = next(s for s in SCHEMES if s["category"] == "OBC")

    # OBC user should be eligible (assuming age/income match)
    obc_profile = {"age": 18, "income": 150000, "state": "Karnataka", "category": "OBC"}
    eligible, reason = is_eligible(obc_profile, obc_scheme)
    assert eligible is True

    # General user should NOT be eligible
    general_profile = {"age": 18, "income": 150000, "state": "Karnataka", "category": "General"}
    eligible, reason = is_eligible(general_profile, obc_scheme)
    assert eligible is False
    assert "category only" in reason.lower()


def test_eligibility_state_matching():
    """Test state-specific scheme matching"""
    # Maharashtra-specific scheme
    mh_scheme = next(s for s in SCHEMES if s["state"] == "Maharashtra")

    # Maharashtra user should be eligible (assuming age/income match)
    mh_profile = {"age": 18, "income": 500000, "state": "Maharashtra", "category": "General"}
    eligible, reason = is_eligible(mh_profile, mh_scheme)
    assert eligible is True

    # Karnataka user should NOT be eligible
    ka_profile = {"age": 18, "income": 500000, "state": "Karnataka", "category": "General"}
    eligible, reason = is_eligible(ka_profile, mh_scheme)
    assert eligible is False
    assert "only for" in reason.lower()


def test_eligibility_all_state():
    """Test schemes with state='ALL'"""
    all_state_scheme = next(s for s in SCHEMES if s["state"] == "ALL")

    states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi"]

    for state in states:
        profile = {"age": 20, "income": 200000, "state": state, "category": "General"}
        eligible, _ = is_eligible(profile, all_state_scheme)
        # Should be eligible regardless of state (if age/income match)


def test_eligibility_all_category():
    """Test schemes with category='ALL'"""
    all_category_scheme = next(s for s in SCHEMES if s["category"] == "ALL")

    categories = ["General", "SC", "ST", "OBC", "EWS", "Minority"]

    for category in categories:
        profile = {"age": 20, "income": 200000, "state": "Maharashtra", "category": category}
        eligible, _ = is_eligible(profile, all_category_scheme)
        # Should be eligible regardless of category (if age/income match)


def test_get_eligible_schemes():
    """Test getting all eligible schemes for a profile"""
    profile = {
        "age": 20,
        "income": 200000,
        "state": "Maharashtra",
        "category": "General"
    }

    eligible_schemes = get_eligible_schemes(profile)

    assert isinstance(eligible_schemes, list)
    assert len(eligible_schemes) > 0

    # All returned schemes should have eligibilityReason
    for scheme in eligible_schemes:
        assert "eligibilityReason" in scheme


def test_get_eligible_schemes_obc():
    """Test eligible schemes for OBC user"""
    profile = {
        "age": 18,
        "income": 150000,
        "state": "Karnataka",
        "category": "OBC"
    }

    eligible_schemes = get_eligible_schemes(profile)

    # Should include OBC-specific scheme
    scheme_ids = [s["id"] for s in eligible_schemes]
    assert "scheme_2" in scheme_ids  # PM YASASVI (OBC)


def test_get_eligible_schemes_high_income():
    """Test eligible schemes for high income user"""
    profile = {
        "age": 20,
        "income": 900000,
        "state": "Maharashtra",
        "category": "General"
    }

    eligible_schemes = get_eligible_schemes(profile)

    # Should only include schemes with high income limits
    for scheme in eligible_schemes:
        assert scheme["income_max"] >= 900000


def test_get_eligible_schemes_no_matches():
    """Test profile that matches no schemes"""
    profile = {
        "age": 50,  # Too old for all schemes
        "income": 100000,
        "state": "Maharashtra",
        "category": "General"
    }

    eligible_schemes = get_eligible_schemes(profile)

    assert len(eligible_schemes) == 0


def test_scheme_documents_not_empty():
    """Test that all schemes have required documents"""
    for scheme in SCHEMES:
        assert len(scheme["documents"]) > 0, f"Scheme {scheme['id']} has no documents"


def test_scheme_benefits_not_empty():
    """Test that all schemes have benefits description"""
    for scheme in SCHEMES:
        assert len(scheme["benefits"]) > 0, f"Scheme {scheme['id']} has no benefits"
        assert len(scheme["benefits"]) > 20, f"Scheme {scheme['id']} benefits too short"


def test_scheme_apply_links_valid():
    """Test that all schemes have valid apply links"""
    for scheme in SCHEMES:
        assert scheme["apply_link"].startswith("http"), f"Scheme {scheme['id']} has invalid apply link"
