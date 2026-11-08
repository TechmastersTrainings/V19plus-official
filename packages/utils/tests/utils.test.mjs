import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  formatDuration,
  formatTime,
  calculateProgressPercentage,
} from '../dist/index.js';

describe('Shared Utilities Unit Tests', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      assert.equal(validateEmail('user@example.com'), true);
      assert.equal(validateEmail('support@v19plus.com'), true);
      assert.equal(validateEmail('first.last@domain.co.in'), true);
    });

    it('should return false for invalid emails', () => {
      assert.equal(validateEmail(''), false);
      assert.equal(validateEmail('plainaddress'), false);
      assert.equal(validateEmail('@missingusername.com'), false);
      assert.equal(validateEmail('missing@domain'), false);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes under 60 as Xm', () => {
      assert.equal(formatDuration(45), '45m');
      assert.equal(formatDuration(1), '1m');
    });

    it('should format full hours without minutes', () => {
      assert.equal(formatDuration(60), '1h');
      assert.equal(formatDuration(120), '2h');
    });

    it('should format hours and minutes correctly', () => {
      assert.equal(formatDuration(95), '1h 35m');
      assert.equal(formatDuration(150), '2h 30m');
    });
  });

  describe('formatTime', () => {
    it('should format seconds into MM:SS for durations under an hour', () => {
      assert.equal(formatTime(0), '0:00');
      assert.equal(formatTime(45), '0:45');
      assert.equal(formatTime(75), '1:15');
      assert.equal(formatTime(599), '9:59');
    });

    it('should format seconds into H:MM:SS for durations over an hour', () => {
      assert.equal(formatTime(3600), '1:00:00');
      assert.equal(formatTime(3665), '1:01:05');
      assert.equal(formatTime(7200), '2:00:00');
    });
  });

  describe('calculateProgressPercentage', () => {
    it('should correctly calculate progress percentage', () => {
      assert.equal(calculateProgressPercentage(50, 100), 50);
      assert.equal(calculateProgressPercentage(1800, 7200), 25);
    });

    it('should return 0 when total duration is 0 or negative', () => {
      assert.equal(calculateProgressPercentage(10, 0), 0);
      assert.equal(calculateProgressPercentage(10, -5), 0);
    });

    it('should clamp max progress to 100%', () => {
      assert.equal(calculateProgressPercentage(7500, 7200), 100);
    });
  });
});

