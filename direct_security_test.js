#!/usr/bin/env node
/**
 * Direct Security Utilities Testing in Node.js
 */

const path = require('path');

// Import security utilities
const {
  validateVideoFile,
  sanitizeFilename,
  sanitizeThreshold,
  sanitizeDuration,
  sanitizeNumeric,
  rateLimit
} = require('./lib/security.js');

function testSecurityUtilities() {
  console.log("=== Testing Security Utilities Directly ===");
  
  let allPassed = true;
  
  try {
    // Test 1: Video file validation with invalid content
    console.log("\n1. Testing validateVideoFile with invalid content...");
    const fakeVideoBuffer = Buffer.from("This is not a video file");
    const result = validateVideoFile(fakeVideoBuffer);
    if (!result.valid && result.detectedType === null) {
      console.log("✅ Invalid video content properly rejected");
    } else {
      console.log(`❌ Invalid video content not rejected: ${JSON.stringify(result)}`);
      allPassed = false;
    }
    
    // Test 2: Video file validation with empty buffer
    console.log("\n2. Testing validateVideoFile with empty buffer...");
    const emptyBuffer = Buffer.alloc(0);
    const emptyResult = validateVideoFile(emptyBuffer);
    if (!emptyResult.valid) {
      console.log("✅ Empty buffer properly rejected");
    } else {
      console.log(`❌ Empty buffer not rejected: ${JSON.stringify(emptyResult)}`);
      allPassed = false;
    }
    
    // Test 3: Filename sanitization
    console.log("\n3. Testing sanitizeFilename...");
    const dangerousNames = [
      "../../../etc/passwd",
      "file<script>alert('xss')</script>.mp4",
      "file with spaces & symbols!@#$.mp4",
      "",
      null
    ];
    
    for (const name of dangerousNames) {
      const safeName = sanitizeFilename(name);
      if (safeName && !['/', '\\', '<', '>', '&'].some(char => safeName.includes(char))) {
        console.log(`✅ '${name}' sanitized to '${safeName}'`);
      } else {
        console.log(`❌ '${name}' not properly sanitized: '${safeName}'`);
        allPassed = false;
      }
    }
    
    // Test 4: Threshold sanitization
    console.log("\n4. Testing sanitizeThreshold...");
    const thresholdTests = [
      ['-100', '-60'],  // Should clamp to -60
      ['50', '0'],      // Should clamp to 0
      ['abc', '-30'],   // Should default to -30
      ['-45', '-45'],   // Should stay as is
    ];
    
    for (const [inputVal, expected] of thresholdTests) {
      const result = sanitizeThreshold(inputVal);
      if (result === expected) {
        console.log(`✅ Threshold '${inputVal}' -> '${result}' (expected '${expected}')`);
      } else {
        console.log(`❌ Threshold '${inputVal}' -> '${result}' (expected '${expected}')`);
        allPassed = false;
      }
    }
    
    // Test 5: Duration sanitization
    console.log("\n5. Testing sanitizeDuration...");
    const durationTests = [
      ['-5', '0.10'],    // Should clamp to 0.1
      ['100', '10.00'],  // Should clamp to 10
      ['xyz', '0.50'],   // Should default to 0.5
      ['2.5', '2.50'],   // Should stay as is
    ];
    
    for (const [inputVal, expected] of durationTests) {
      const result = sanitizeDuration(inputVal);
      if (result === expected) {
        console.log(`✅ Duration '${inputVal}' -> '${result}' (expected '${expected}')`);
      } else {
        console.log(`❌ Duration '${inputVal}' -> '${result}' (expected '${expected}')`);
        allPassed = false;
      }
    }
    
    // Test 6: Numeric sanitization
    console.log("\n6. Testing sanitizeNumeric...");
    let numResult = sanitizeNumeric('invalid', 0, 100, 50);
    if (numResult === 50) {
      console.log("✅ Invalid numeric input defaults correctly");
    } else {
      console.log(`❌ Invalid numeric input handling failed: ${numResult}`);
      allPassed = false;
    }
    
    numResult = sanitizeNumeric(150, 0, 100, 50);
    if (numResult === 100) {
      console.log("✅ Numeric input clamped to max correctly");
    } else {
      console.log(`❌ Numeric max clamping failed: ${numResult}`);
      allPassed = false;
    }
    
    numResult = sanitizeNumeric(-10, 0, 100, 50);
    if (numResult === 0) {
      console.log("✅ Numeric input clamped to min correctly");
    } else {
      console.log(`❌ Numeric min clamping failed: ${numResult}`);
      allPassed = false;
    }
    
    return allPassed;
    
  } catch (error) {
    console.log(`❌ Security utilities test failed: ${error.message}`);
    return false;
  }
}

function testMP4MagicBytes() {
  console.log("\n=== Testing MP4 Magic Bytes Recognition ===");
  
  try {
    // Create a buffer with MP4 magic bytes
    const mp4Header = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
      Buffer.from("mp4"),
      Buffer.alloc(20, 0)
    ]);
    
    const result = validateVideoFile(mp4Header);
    
    if (result.valid && result.detectedType === 'mp4') {
      console.log("✅ MP4 magic bytes properly recognized");
      return true;
    } else {
      console.log(`❌ MP4 magic bytes not recognized: ${JSON.stringify(result)}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ MP4 magic bytes test failed: ${error.message}`);
    return false;
  }
}

function testRateLimiting() {
  console.log("\n=== Testing Rate Limiting Logic ===");
  
  try {
    const testIP = "192.168.1.100";
    let allPassed = true;
    
    // Test normal rate limiting
    console.log("\n1. Testing normal rate limiting (5 requests max)...");
    for (let i = 1; i <= 6; i++) {
      const result = rateLimit(testIP, 5, 60000);
      if (i <= 5) {
        if (result.allowed) {
          console.log(`✅ Request ${i}: Allowed (remaining: ${result.remaining})`);
        } else {
          console.log(`❌ Request ${i}: Should be allowed but was blocked`);
          allPassed = false;
        }
      } else {
        if (!result.allowed) {
          console.log(`✅ Request ${i}: Properly rate limited`);
        } else {
          console.log(`❌ Request ${i}: Should be rate limited but was allowed`);
          allPassed = false;
        }
      }
    }
    
    // Test different IP gets fresh limit
    console.log("\n2. Testing different IP gets fresh limit...");
    const result = rateLimit("192.168.1.101", 5, 60000);
    if (result.allowed && result.remaining === 4) {
      console.log("✅ Different IP gets fresh rate limit");
    } else {
      console.log(`❌ Different IP rate limit failed: ${JSON.stringify(result)}`);
      allPassed = false;
    }
    
    return allPassed;
    
  } catch (error) {
    console.log(`❌ Rate limiting test failed: ${error.message}`);
    return false;
  }
}

function main() {
  console.log("🔧 Direct Security Utilities Testing (Node.js)");
  console.log("=".repeat(50));
  
  const results = [];
  results.push(testSecurityUtilities());
  results.push(testMP4MagicBytes());
  results.push(testRateLimiting());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Results: ${passed}/${total} test suites passed`);
  
  if (passed === total) {
    console.log("✅ All direct security utility tests passed!");
    process.exit(0);
  } else {
    console.log("❌ Some direct security utility tests failed");
    process.exit(1);
  }
}

main();