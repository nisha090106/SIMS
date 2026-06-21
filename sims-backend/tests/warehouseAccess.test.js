import path from 'node:path';
import { jest } from '@jest/globals';

const mockResolveManagedWarehouseIdsForUser = jest.fn();
const warehouseAccessPath = path.resolve(process.cwd(), 'src/utils/warehouseAccess.js');

jest.unstable_mockModule(warehouseAccessPath, () => ({
  resolveManagedWarehouseIdsForUser: mockResolveManagedWarehouseIdsForUser,
}));

const { warehouseIsolation } = await import('../src/middlewares/warehouseIsolation.js');

describe('warehouseIsolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes staff users to their assigned warehouse', async () => {
    const req = { user: { id: 9, role: 'staff', warehouse_id: 4 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mockResolveManagedWarehouseIdsForUser.mockResolvedValue([4]);

    await warehouseIsolation(req, res, next);

    expect(req.allowedWarehouseIds).toEqual([4]);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
