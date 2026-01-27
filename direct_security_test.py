#!/usr/bin/env python3
"""
Security Utilities Direct Testing - Test security functions directly
"""

import sys
import os
sys.path.append('/app')

# Test the security utilities directly
def test_security_utilities():
    """Test security utility functions directly"""
    print("=== Testing Security Utilities Directly ===")
    
    try:
        # Import the security functions
        from lib.security import (
            validateVideoFile, 
            sanitizeFilename, 
            sanitizeThreshold, 
            sanitizeDuration,
            sanitizeNumeric
        )
        
        all_passed = True
        
        # Test 1: Video file validation with invalid content
        print("\n1. Testing validateVideoFile with invalid content...")
        fake_video_buffer = b"This is not a video file"
        result = validateVideoFile(fake_video_buffer)
        if not result['valid'] and result['detectedType'] is None:
            print("✅ Invalid video content properly rejected")
        else:
            print(f"❌ Invalid video content not rejected: {result}")
            all_passed = False
        
        # Test 2: Video file validation with empty buffer
        print("\n2. Testing validateVideoFile with empty buffer...")
        empty_buffer = b""
        result = validateVideoFile(empty_buffer)
        if not result['valid']:
            print("✅ Empty buffer properly rejected")
        else:
            print(f"❌ Empty buffer not rejected: {result}")
            all_passed = False
        
        # Test 3: Filename sanitization
        print("\n3. Testing sanitizeFilename...")
        dangerous_names = [
            "../../../etc/passwd",
            "file<script>alert('xss')</script>.mp4",
            "file with spaces & symbols!@#$.mp4",
            "",
            None
        ]
        
        for name in dangerous_names:
            safe_name = sanitizeFilename(name)
            if safe_name and not any(char in safe_name for char in ['/', '\\', '<', '>', '&']):
                print(f"✅ '{name}' sanitized to '{safe_name}'")
            else:
                print(f"❌ '{name}' not properly sanitized: '{safe_name}'")
                all_passed = False
        
        # Test 4: Threshold sanitization
        print("\n4. Testing sanitizeThreshold...")
        threshold_tests = [
            ('-100', '-60'),  # Should clamp to -60
            ('50', '0'),      # Should clamp to 0
            ('abc', '-30'),   # Should default to -30
            ('-45', '-45'),   # Should stay as is
        ]
        
        for input_val, expected in threshold_tests:
            result = sanitizeThreshold(input_val)
            if result == expected:
                print(f"✅ Threshold '{input_val}' -> '{result}' (expected '{expected}')")
            else:
                print(f"❌ Threshold '{input_val}' -> '{result}' (expected '{expected}')")
                all_passed = False
        
        # Test 5: Duration sanitization
        print("\n5. Testing sanitizeDuration...")
        duration_tests = [
            ('-5', '0.10'),    # Should clamp to 0.1
            ('100', '10.00'),  # Should clamp to 10
            ('xyz', '0.50'),   # Should default to 0.5
            ('2.5', '2.50'),   # Should stay as is
        ]
        
        for input_val, expected in duration_tests:
            result = sanitizeDuration(input_val)
            if result == expected:
                print(f"✅ Duration '{input_val}' -> '{result}' (expected '{expected}')")
            else:
                print(f"❌ Duration '{input_val}' -> '{result}' (expected '{expected}')")
                all_passed = False
        
        # Test 6: Numeric sanitization
        print("\n6. Testing sanitizeNumeric...")
        result = sanitizeNumeric('invalid', 0, 100, 50)
        if result == 50:
            print("✅ Invalid numeric input defaults correctly")
        else:
            print(f"❌ Invalid numeric input handling failed: {result}")
            all_passed = False
        
        result = sanitizeNumeric(150, 0, 100, 50)
        if result == 100:
            print("✅ Numeric input clamped to max correctly")
        else:
            print(f"❌ Numeric max clamping failed: {result}")
            all_passed = False
        
        result = sanitizeNumeric(-10, 0, 100, 50)
        if result == 0:
            print("✅ Numeric input clamped to min correctly")
        else:
            print(f"❌ Numeric min clamping failed: {result}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Security utilities test failed: {e}")
        return False

def test_mp4_magic_bytes():
    """Test with actual MP4 magic bytes"""
    print("\n=== Testing MP4 Magic Bytes Recognition ===")
    
    try:
        from lib.security import validateVideoFile
        
        # Create a buffer with MP4 magic bytes
        mp4_header = bytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]) + b"mp4" + b"\x00" * 20
        result = validateVideoFile(mp4_header)
        
        if result['valid'] and result['detectedType'] == 'mp4':
            print("✅ MP4 magic bytes properly recognized")
            return True
        else:
            print(f"❌ MP4 magic bytes not recognized: {result}")
            return False
            
    except Exception as e:
        print(f"❌ MP4 magic bytes test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Direct Security Utilities Testing")
    print("=" * 50)
    
    results = []
    results.append(test_security_utilities())
    results.append(test_mp4_magic_bytes())
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 Results: {passed}/{total} test suites passed")
    
    if passed == total:
        print("✅ All direct security utility tests passed!")
        exit(0)
    else:
        print("❌ Some direct security utility tests failed")
        exit(1)