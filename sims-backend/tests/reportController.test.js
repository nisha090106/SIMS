import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { getDisplayName, buildLiveLowStockCondition } from '../src/controllers/reportController.js';

describe('reportController display name fallback', () => {
  it('builds a full name from first_name and last_name', () => {
    expect(getDisplayName({ first_name: 'Jane', last_name: 'Doe' })).toBe('Jane Doe');
  });

  it('falls back to email when names are missing', () => {
    expect(getDisplayName({ email: 'staff@example.com' }, 'System')).toBe('staff@example.com');
  });

  it('falls back to the provided default when no user data exists', () => {
    expect(getDisplayName(null, 'System')).toBe('System');
  });

  it('builds a live low-stock condition that compares inventory quantity to reorder level', () => {
    expect(buildLiveLowStockCondition()).toBe('i.quantity <= p.reorder_level');
  });
});
