// Test Engine Calculations
const assert = require('assert');

function calculateLunchBreak(checkInStr, checkOutStr, explicitPunches = []) {
  // explicitPunches: [{ start: '13:05', end: '13:50' }]
  if (explicitPunches.length > 0) {
    let explicitMins = 0;
    explicitPunches.forEach(p => {
      const [sh, sm] = p.start.split(':').map(Number);
      const [eh, em] = p.end.split(':').map(Number);
      explicitMins += (eh * 60 + em) - (sh * 60 + sm);
    });
    return {
      lunchDeductionMins: explicitMins,
      mode: 'ACTUAL',
      details: `Actual ${explicitMins}m`,
    };
  }

  // Auto overlap with 13:00 - 14:00
  const [inH, inM] = checkInStr.split(':').map(Number);
  const [outH, outM] = checkOutStr.split(':').map(Number);
  const startIST = inH * 60 + inM;
  const endIST = outH * 60 + outM;

  const LUNCH_START = 13 * 60; // 780
  const LUNCH_END = 14 * 60;   // 840

  const overlapStart = Math.max(startIST, LUNCH_START);
  const overlapEnd = Math.min(endIST, LUNCH_END);
  const overlapMins = Math.max(0, overlapEnd - overlapStart);
  const deductionMins = Math.min(overlapMins, 60);

  return {
    lunchDeductionMins: deductionMins,
    mode: deductionMins > 0 ? 'AUTO' : 'NONE',
    details: deductionMins > 0 ? `Auto 1:00 PM – 2:00 PM (${deductionMins}m deducted)` : 'No lunch overlap (0m)',
  };
}

console.log('🧪 RUNNING LUNCH OVERLAP & DOUBLE DEDUCTION UNIT TESTS...\n');

// Test 1: Full day 09:00 - 18:00
const t1 = calculateLunchBreak('09:00', '18:00');
console.log('Test 1 (09:00 - 18:00):', t1);
assert.strictEqual(t1.lunchDeductionMins, 60);
assert.strictEqual(t1.mode, 'AUTO');
console.log('✅ Test 1 Passed: 60 mins auto deducted');

// Test 2: Half day 09:00 - 13:30 (Leaves mid-lunch)
const t2 = calculateLunchBreak('09:00', '13:30');
console.log('\nTest 2 (09:00 - 13:30):', t2);
assert.strictEqual(t2.lunchDeductionMins, 30);
assert.strictEqual(t2.mode, 'AUTO');
console.log('✅ Test 2 Passed: exactly 30 mins auto deducted');

// Test 3: Afternoon shift 14:30 - 18:00 (Starts after lunch)
const t3 = calculateLunchBreak('14:30', '18:00');
console.log('\nTest 3 (14:30 - 18:00):', t3);
assert.strictEqual(t3.lunchDeductionMins, 0);
assert.strictEqual(t3.mode, 'NONE');
console.log('✅ Test 3 Passed: 0 mins auto deducted (no overlap)');

// Test 4: Midday span 12:30 - 14:30 (Spans entire lunch)
const t4 = calculateLunchBreak('12:30', '14:30');
console.log('\nTest 4 (12:30 - 14:30):', t4);
assert.strictEqual(t4.lunchDeductionMins, 60);
assert.strictEqual(t4.mode, 'AUTO');
console.log('✅ Test 4 Passed: 60 mins auto deducted');

// Test 5: Explicit biometric lunch punches 13:05 - 13:50 (45 mins)
const t5 = calculateLunchBreak('09:00', '18:00', [{ start: '13:05', end: '13:50' }]);
console.log('\nTest 5 (Explicit 13:05 - 13:50):', t5);
assert.strictEqual(t5.lunchDeductionMins, 45);
assert.strictEqual(t5.mode, 'ACTUAL');
console.log('✅ Test 5 Passed: exactly 45 mins deducted and auto 60m suppressed (no double deduction)');

console.log('\n🎉 ALL 5 UNIT TESTS PASSED WITH 100% ACCURACY!');
