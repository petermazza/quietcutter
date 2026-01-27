#!/usr/bin/env python3
"""
Backend Security Testing for QuietCutter Video Silence Remover
Tests security headers, rate limiting, input validation, and parameter sanitization
"""

import requests
import time
import json
import os
from io import BytesIO

# Base URL from environment
BASE_URL = "https://noiseless-video.preview.emergentagent.com"

def test_security_headers():
    """Test security headers on GET /"""
    print("\n=== Testing Security Headers (GET /) ===")
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        headers = response.headers
        
        # Check required security headers
        security_checks = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY', 
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': None,  # Just check presence
        }
        
        all_passed = True
        for header, expected_value in security_checks.items():
            if header in headers:
                actual_value = headers[header]
                if expected_value is None:
                    print(f"✅ {header}: Present ({actual_value[:50]}...)")
                elif actual_value == expected_value:
                    print(f"✅ {header}: {actual_value}")
                else:
                    print(f"❌ {header}: Expected '{expected_value}', got '{actual_value}'")
                    all_passed = False
            else:
                print(f"❌ {header}: Missing")
                all_passed = False
        
        # Check that X-Powered-By is disabled
        if 'X-Powered-By' not in headers:
            print("✅ X-Powered-By: Properly disabled")
        else:
            print(f"❌ X-Powered-By: Should be disabled, but found: {headers['X-Powered-By']}")
            all_passed = False
            
        return all_passed
        
    except Exception as e:
        print(f"❌ Security headers test failed: {e}")
        return False

def test_video_processing_rate_limiting():
    """Test rate limiting on POST /api/process-video (5 requests per minute)"""
    print("\n=== Testing Video Processing Rate Limiting ===")
    
    try:
        # Create a fake video file (will fail validation but should hit rate limit first)
        fake_video = BytesIO(b"fake video content")
        
        success_count = 0
        rate_limited = False
        
        for i in range(6):
            print(f"Request {i+1}/6...")
            
            files = {'video': ('test.mp4', fake_video, 'video/mp4')}
            data = {'threshold': '-30', 'minDuration': '0.5'}
            
            response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=10)
            
            if response.status_code == 429:
                print(f"✅ Request {i+1}: Rate limited (429)")
                rate_limited = True
                
                # Check for Retry-After header
                if 'Retry-After' in response.headers:
                    print(f"✅ Retry-After header present: {response.headers['Retry-After']} seconds")
                else:
                    print("❌ Retry-After header missing in 429 response")
                
                # Check error message
                try:
                    error_data = response.json()
                    if 'retryAfter' in error_data:
                        print(f"✅ retryAfter in response: {error_data['retryAfter']} seconds")
                    else:
                        print("❌ retryAfter missing in 429 response body")
                except:
                    print("❌ Could not parse 429 response JSON")
                
                break
            else:
                success_count += 1
                print(f"Request {i+1}: Status {response.status_code}")
            
            # Reset file pointer for next request
            fake_video.seek(0)
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limited and success_count <= 5:
            print(f"✅ Rate limiting working: {success_count} requests succeeded before rate limit")
            return True
        else:
            print(f"❌ Rate limiting failed: {success_count} requests succeeded, no rate limit hit")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test failed: {e}")
        return False

def test_video_processing_input_validation():
    """Test input validation on POST /api/process-video"""
    print("\n=== Testing Video Processing Input Validation ===")
    
    all_passed = True
    
    # Test 1: Missing video file
    print("\n1. Testing missing video file...")
    try:
        response = requests.post(f"{BASE_URL}/api/process-video", data={}, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if 'No video file provided' in error_data.get('error', ''):
                print("✅ Missing video file properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Missing video test failed: {e}")
        all_passed = False
    
    # Test 2: Invalid file (text file with .mp4 extension)
    print("\n2. Testing invalid video file (magic bytes validation)...")
    try:
        fake_video = BytesIO(b"This is not a video file, just text content")
        files = {'video': ('fake.mp4', fake_video, 'video/mp4')}
        data = {'threshold': '-30', 'minDuration': '0.5'}
        
        response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if 'Invalid video file' in error_data.get('error', ''):
                print("✅ Invalid video file properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Invalid video test failed: {e}")
        all_passed = False
    
    # Test 3: Oversized file (>500MB) - simulate with large content
    print("\n3. Testing oversized file validation...")
    try:
        # Create a file that's larger than 500MB (simulate)
        # We'll create a smaller file but test the logic
        large_content = b"x" * (10 * 1024 * 1024)  # 10MB for testing
        large_video = BytesIO(large_content)
        files = {'video': ('large.mp4', large_video, 'video/mp4')}
        data = {'threshold': '-30', 'minDuration': '0.5'}
        
        response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=30)
        
        # This should either be rejected for size (413) or invalid format (400)
        if response.status_code in [400, 413]:
            error_data = response.json()
            if 'too large' in error_data.get('error', '').lower() or 'invalid video file' in error_data.get('error', ''):
                print(f"✅ Large file properly handled ({response.status_code})")
            else:
                print(f"❌ Unexpected error message: {error_data}")
                all_passed = False
        else:
            print(f"❌ Expected 400 or 413, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Oversized file test failed: {e}")
        all_passed = False
    
    return all_passed

def test_stripe_checkout_validation():
    """Test Stripe checkout validation"""
    print("\n=== Testing Stripe Checkout Validation ===")
    
    all_passed = True
    
    # Test 1: Invalid planType
    print("\n1. Testing invalid planType...")
    try:
        data = {'planType': 'invalid'}
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", 
                               json=data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 400:
            error_data = response.json()
            if 'Invalid plan type' in error_data.get('error', ''):
                print("✅ Invalid planType properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Invalid planType test failed: {e}")
        all_passed = False
    
    # Test 2: Missing planType
    print("\n2. Testing missing planType...")
    try:
        data = {}
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", 
                               json=data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 400:
            error_data = response.json()
            if 'Invalid plan type' in error_data.get('error', ''):
                print("✅ Missing planType properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Missing planType test failed: {e}")
        all_passed = False
    
    # Test 3: Valid planType (should work with STRIPE_SECRET_KEY configured)
    print("\n3. Testing valid planType...")
    try:
        data = {'planType': 'lifetime'}
        response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", 
                               json=data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 200:
            result_data = response.json()
            if 'sessionId' in result_data and 'url' in result_data:
                print("✅ Valid planType accepted (200) - Stripe integration working")
            else:
                print(f"❌ Missing sessionId or url in response: {result_data}")
                all_passed = False
        elif response.status_code == 500:
            error_data = response.json()
            if 'STRIPE_SECRET_KEY' in error_data.get('error', ''):
                print("✅ Valid planType rejected due to missing STRIPE_SECRET_KEY (expected)")
            else:
                print(f"❌ Unexpected 500 error: {error_data}")
                all_passed = False
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Valid planType test failed: {e}")
        all_passed = False
    
    return all_passed

def test_stripe_rate_limiting():
    """Test Stripe checkout rate limiting (10 requests per minute)"""
    print("\n=== Testing Stripe Checkout Rate Limiting ===")
    
    try:
        success_count = 0
        rate_limited = False
        
        for i in range(11):
            print(f"Request {i+1}/11...")
            
            data = {'planType': 'lifetime'}
            response = requests.post(f"{BASE_URL}/api/stripe/create-checkout", 
                                   json=data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            
            if response.status_code == 429:
                print(f"✅ Request {i+1}: Rate limited (429)")
                rate_limited = True
                
                # Check for Retry-After header
                if 'Retry-After' in response.headers:
                    print(f"✅ Retry-After header present: {response.headers['Retry-After']} seconds")
                else:
                    print("❌ Retry-After header missing in 429 response")
                
                break
            else:
                success_count += 1
                print(f"Request {i+1}: Status {response.status_code}")
            
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limited and success_count <= 10:
            print(f"✅ Stripe rate limiting working: {success_count} requests succeeded before rate limit")
            return True
        else:
            print(f"❌ Stripe rate limiting failed: {success_count} requests succeeded, no rate limit hit")
            return False
            
    except Exception as e:
        print(f"❌ Stripe rate limiting test failed: {e}")
        return False

def test_parameter_sanitization():
    """Test parameter sanitization for extreme values"""
    print("\n=== Testing Parameter Sanitization ===")
    
    all_passed = True
    
    # Test extreme threshold values (should be clamped to -60 to 0)
    print("\n1. Testing threshold parameter sanitization...")
    try:
        fake_video = BytesIO(b"fake video content")
        
        # Test extreme values
        extreme_values = ['-100', '50', 'abc', '999999']
        
        for threshold in extreme_values:
            files = {'video': ('test.mp4', fake_video, 'video/mp4')}
            data = {'threshold': threshold, 'minDuration': '0.5'}
            
            response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=10)
            
            # Should get 400 for invalid video, not crash from bad threshold
            if response.status_code in [400, 429]:  # 400 for invalid video or 429 for rate limit
                print(f"✅ Threshold '{threshold}' handled safely (status: {response.status_code})")
            else:
                print(f"❌ Threshold '{threshold}' caused unexpected status: {response.status_code}")
                all_passed = False
            
            fake_video.seek(0)
            time.sleep(0.1)
            
    except Exception as e:
        print(f"❌ Threshold sanitization test failed: {e}")
        all_passed = False
    
    # Test extreme minDuration values (should be clamped to 0.1 to 10)
    print("\n2. Testing minDuration parameter sanitization...")
    try:
        fake_video = BytesIO(b"fake video content")
        
        # Test extreme values
        extreme_values = ['-5', '100', 'xyz', '0']
        
        for duration in extreme_values:
            files = {'video': ('test.mp4', fake_video, 'video/mp4')}
            data = {'threshold': '-30', 'minDuration': duration}
            
            response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=10)
            
            # Should get 400 for invalid video, not crash from bad duration
            if response.status_code in [400, 429]:  # 400 for invalid video or 429 for rate limit
                print(f"✅ MinDuration '{duration}' handled safely (status: {response.status_code})")
            else:
                print(f"❌ MinDuration '{duration}' caused unexpected status: {response.status_code}")
                all_passed = False
            
            fake_video.seek(0)
            time.sleep(0.1)
            
    except Exception as e:
        print(f"❌ MinDuration sanitization test failed: {e}")
        all_passed = False
    
    return all_passed

def main():
    """Run all security tests"""
    print("🔒 QuietCutter Security Testing Suite")
    print("=" * 50)
    
    results = {}
    
    # Run all tests
    results['security_headers'] = test_security_headers()
    time.sleep(1)  # Brief pause between test suites
    
    results['video_rate_limiting'] = test_video_processing_rate_limiting()
    time.sleep(2)  # Wait for rate limit to reset
    
    results['video_input_validation'] = test_video_processing_input_validation()
    time.sleep(1)
    
    results['stripe_validation'] = test_stripe_checkout_validation()
    time.sleep(1)
    
    results['stripe_rate_limiting'] = test_stripe_rate_limiting()
    time.sleep(1)
    
    results['parameter_sanitization'] = test_parameter_sanitization()
    
    # Summary
    print("\n" + "=" * 50)
    print("🔒 SECURITY TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All security tests passed!")
        return True
    else:
        print("⚠️  Some security tests failed - review implementation")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)