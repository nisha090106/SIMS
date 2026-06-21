import { resolveManagedWarehouseIdsForUser } from '../src/utils/warehouseAccess.js';

describe('resolveManagedWarehouseIdsForUser', () => {
  it('returns the warehouses assigned directly to a manager', async () => {
    const user = { id: 42, role: 'manager' };
    const warehouseModel = {
      findAll: async () => [{ warehouse_id: 10 }, { warehouse_id: 11 }],
    };
    const userModel = {
      findOne: async () => null,
    };

    const ids = await resolveManagedWarehouseIdsForUser(user, {
      warehouseModel,
      userModel,
      logger: { warn: jest.fn() },
    });

    expect(ids).toEqual([10, 11]);
  });

  it('falls back to the seeded manager account when no direct assignment is found', async () => {
    const user = { id: 7, role: 'manager', email: 'manager@sims.com' };
    const warehouseModel = {
      findAll: async ({ where }) => {
        if (where.manager_id === 7) return [];
        if (where.manager_id === 2) return [{ warehouse_id: 15 }];
        return [];
      },
    };
    const userModel = {
      findOne: async () => ({ id: 2, email: 'manager@sims.com', role: 'manager' }),
    };

    const ids = await resolveManagedWarehouseIdsForUser(user, {
      warehouseModel,
      userModel,
      logger: { warn: jest.fn() },
    });

    expect(ids).toEqual([15]);
  });
});
