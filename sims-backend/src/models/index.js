import { Sequelize } from 'sequelize';
import UserModel from './User.js';
import WarehouseModel from './Warehouse.js';
import ProductModel from './Product.js';
import InventoryModel from './Inventory.js';
import SupplierModel from './Supplier.js';
import PurchaseOrderModel from './PurchaseOrder.js';
import SalesOrderModel from './SalesOrder.js';
import AuditLogModel from './AuditLog.js';
import config from '../config/database.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions,
  }
);

// Initialize models
const User = UserModel(sequelize);
const Warehouse = WarehouseModel(sequelize);
const Product = ProductModel(sequelize);
const Inventory = InventoryModel(sequelize);
const Supplier = SupplierModel(sequelize);
const PurchaseOrder = PurchaseOrderModel(sequelize);
const SalesOrder = SalesOrderModel(sequelize);
const AuditLog = AuditLogModel(sequelize);

// Define Associations
// User associations
User.hasMany(Warehouse, { foreignKey: 'manager_id', as: 'warehouses' });
User.hasMany(PurchaseOrder, { foreignKey: 'created_by', as: 'purchase_orders' });
User.hasMany(SalesOrder, { foreignKey: 'created_by', as: 'sales_orders' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });

// Warehouse associations
Warehouse.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
Warehouse.hasMany(Inventory, { foreignKey: 'warehouse_id', as: 'inventory' });

// Product associations
Product.hasMany(Inventory, { foreignKey: 'product_id', as: 'inventory' });
Product.belongsToMany(PurchaseOrder, { through: 'purchase_order_items', as: 'purchase_orders' });

// Inventory associations
Inventory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Inventory.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// Supplier associations
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplier_id', as: 'purchase_orders' });

// PurchaseOrder associations
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
PurchaseOrder.belongsToMany(Product, { through: 'purchase_order_items', as: 'products' });

// SalesOrder associations
SalesOrder.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Export
export {
  sequelize,
  User,
  Warehouse,
  Product,
  Inventory,
  Supplier,
  PurchaseOrder,
  SalesOrder,
  AuditLog,
};

export default sequelize;
