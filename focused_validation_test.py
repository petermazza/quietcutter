#!/usr/bin/env python3
"""
Focused Video Input Validation Test - waits for rate limits to reset
"""

import requests
import time
from io import BytesIO

BASE_URL = "https://vidtrim-16.preview.emergentagent.com"

def wait_for_rate_limit_reset():
    """Wait for rate limit to reset"""
    print("⏳ Waiting 65 seconds for rate limit to reset...")
    time.sleep(65)

def test_video_input_validation_focused():
    """Test input validation with rate limit consideration"""
    print("\n=== Focused Video Input Validation Test ===")
    
    all_passed = True
    
    # Test 1: Missing video file
    print("\n1. Testing missing video file...")
    try:
        response = requests.post(f"{BASE_URL}/api/process-video", data={}, timeout=10)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 400:
            error_data = response.json()
            print(f"Error message: {error_data.get('error', 'No error message')}")
            if 'No video file provided' in error_data.get('error', ''):
                print("✅ Missing video file properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        elif response.status_code == 429:
            print("⚠️  Rate limited - need to wait longer")
            return False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Missing video test failed: {e}")
        all_passed = False
    
    # Wait between tests
    wait_for_rate_limit_reset()
    
    # Test 2: Invalid file (text file with .mp4 extension)
    print("\n2. Testing invalid video file (magic bytes validation)...")
    try:
        fake_video = BytesIO(b"This is not a video file, just text content")
        files = {'video': ('fake.mp4', fake_video, 'video/mp4')}
        data = {'threshold': '-30', 'minDuration': '0.5'}
        
        response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=10)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 400:
            error_data = response.json()
            print(f"Error message: {error_data.get('error', 'No error message')}")
            if 'Invalid video file' in error_data.get('error', ''):
                print("✅ Invalid video file properly rejected (400)")
            else:
                print(f"❌ Wrong error message: {error_data}")
                all_passed = False
        elif response.status_code == 429:
            print("⚠️  Rate limited - need to wait longer")
            return False
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Invalid video test failed: {e}")
        all_passed = False
    
    # Wait between tests
    wait_for_rate_limit_reset()
    
    # Test 3: Create a file that simulates being oversized
    print("\n3. Testing file size validation logic...")
    try:
        # Create a 1MB file (smaller than 500MB limit but we can test the logic)
        large_content = b"x" * (1024 * 1024)  # 1MB
        large_video = BytesIO(large_content)
        files = {'video': ('large.mp4', large_video, 'video/mp4')}
        data = {'threshold': '-30', 'minDuration': '0.5'}
        
        response = requests.post(f"{BASE_URL}/api/process-video", files=files, data=data, timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 400:
            error_data = response.json()
            print(f"Error message: {error_data.get('error', 'No error message')}")
            if 'Invalid video file' in error_data.get('error', ''):
                print("✅ Large invalid file properly rejected for format (400)")
            elif 'too large' in error_data.get('error', '').lower():
                print("✅ Large file properly rejected for size (400)")
            else:
                print(f"❌ Unexpected error message: {error_data}")
                all_passed = False
        elif response.status_code == 413:
            error_data = response.json()
            print(f"Error message: {error_data.get('error', 'No error message')}")
            print("✅ Large file properly rejected (413)")
        elif response.status_code == 429:
            print("⚠️  Rate limited - need to wait longer")
            return False
        else:
            print(f"❌ Expected 400 or 413, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ Large file test failed: {e}")
        all_passed = False
    
    return all_passed

if __name__ == "__main__":
    success = test_video_input_validation_focused()
    if success:
        print("\n✅ All focused input validation tests passed!")
    else:
        print("\n❌ Some focused input validation tests failed")
    exit(0 if success else 1)