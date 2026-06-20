import { Op, fn, col, literal } from 'sequelize';
import { Product, Inventory, sequelize } from './src/models/index.js';

async function test() {
  try {
    const invWhere = {};
    const productWhere = {};
    
    const catTotals = await Inventory.findAll({
      where: invWhere,
      include: [{ model: Product, as: 'product', where: productWhere, attributes: [] }],
      attributes: [
        [col('product.category'), 'category'],
        [fn('SUM', col('quantity')), 'units'],
        [fn('SUM', literal('quantity * product.unit_price')), 'value'],
        [fn('SUM', literal('quantity * COALESCE(product.cost_price, product.unit_price)')), 'cost'],
        [fn('COUNT', literal('DISTINCT product.sku')), 'skus']
      ],
      group: ['product.category'],
      raw: true,
    });
    console.log(catTotals);
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

test();
