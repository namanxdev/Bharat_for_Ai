"""
Test runner script for BharatConnect AI Backend
Run all tests with coverage reporting
"""
import subprocess
import sys


def run_tests():
    """Run pytest with coverage"""
    print("Running BharatConnect AI Backend Tests...\n")

    try:
        # Run pytest
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "test/", "-v"],
            cwd=".",
            capture_output=False
        )

        return result.returncode

    except Exception as e:
        print(f"Error running tests: {e}")
        return 1


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)
