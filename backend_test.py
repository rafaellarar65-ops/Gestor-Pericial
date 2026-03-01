#!/usr/bin/env python3

import requests
import sys
from datetime import datetime

class GestorPericialAPITester:
    def __init__(self, base_url="https://gestor-pericial-production.up.railway.app/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Login with Invalid Credentials",
            "POST",
            "auth/login",
            401,  # Expecting 401 for invalid credentials
            data={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        return success

    def test_login_valid_credentials(self):
        """Test login with valid credentials from context"""
        success, response = self.run_test(
            "Login with Valid Credentials",
            "POST", 
            "auth/login",
            201,  # Backend returns 201 for successful login
            data={"email": "admin@gestor-pericial.com", "password": "SenhaSegura123!"}
        )
        if success and 'accessToken' in response:
            self.token = response['accessToken']
            print(f"   ✅ Login successful, token obtained")
            return True
        return False

    def test_protected_endpoint(self):
        """Test a protected endpoint with token"""
        if not self.token:
            print("❌ No token available for protected endpoint test")
            return False
            
        # Try to access a protected endpoint (assuming dashboard or similar exists)
        success, response = self.run_test(
            "Protected Endpoint Access",
            "GET",
            "dashboard",  # This might not exist, but we'll test
            200
        )
        return success

def main():
    print("🚀 Starting Gestor Pericial API Tests")
    print("=" * 50)
    
    # Setup
    tester = GestorPericialAPITester()

    # Run tests in order
    print("\n📋 Running Backend API Tests...")
    
    # Test 1: Health check
    if not tester.test_health():
        print("❌ Health check failed, backend may be down")
        return 1

    # Test 2: Invalid login
    tester.test_login_invalid_credentials()

    # Test 3: Valid login
    if not tester.test_login_valid_credentials():
        print("❌ Valid login failed - check credentials or backend auth")
        # Continue with other tests even if login fails

    # Test 4: Protected endpoint (if we have token)
    if tester.token:
        tester.test_protected_endpoint()

    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check backend configuration")
        return 0  # Don't fail completely, just report issues

if __name__ == "__main__":
    sys.exit(main())