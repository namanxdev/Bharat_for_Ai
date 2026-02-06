"""
Quick test script to verify all imports work correctly
Run this before starting the server to catch any import errors
"""
import sys

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")

    try:
        print("  - Importing config...")
        import config

        print("  - Importing data.schemes...")
        from data import schemes

        print("  - Importing models.schemas...")
        from models import schemas

        print("  - Importing services...")
        from services import vector_service, llm_service, sms_service

        print("  - Importing routes...")
        from routes import chat, eligibility, sms, health

        print("  - Importing main...")
        import main

        print("\nAll imports successful!")
        print(f"Total schemes loaded: {len(schemes.SCHEMES)}")

        # Test eligibility logic
        test_profile = {
            "age": 20,
            "income": 200000,
            "state": "Maharashtra",
            "category": "General"
        }

        eligible = schemes.get_eligible_schemes(test_profile)
        print(f"Test eligibility check: {len(eligible)} schemes found for sample profile")

        return True

    except Exception as e:
        print(f"\nImport error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
