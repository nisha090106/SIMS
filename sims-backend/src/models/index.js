import { Sequelize } from 'sequelize';
import UserModel from './User.js';
import WarehouseModel from './Warehouse.js';
import ProductModel from './Product.js';
import InventoryModel from './Inventory.js';
import SupplierModel from './Supplier.js';
import PurchaseOrderModel from './PurchaseOrder.js';
import SalesOrderModel from './SalesOrder.js';
import AuditLogModel from './AuditLog.js';
import ImportJobModel from './ImportJob.js';
import ReorderRuleModel from './ReorderRule.js';
import UserRequestModel from './UserRequest.js';
import UserRequestItemModel from './UserRequestItem.js';
import BarcodeScanLogModel from './BarcodeScanLog.js';
import AutomationLogModel from './AutomationLog.js';
import ProductCategoryModel from './ProductCategory.js';
import UnknownBarcodeModel from './UnknownBarcode.js';
import RequestModel from './Request.js';
import RequestItemModel from './RequestItem.js';
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
  },
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
const ImportJob = ImportJobModel(sequelize);
const ReorderRule = ReorderRuleModel(sequelize);
const UserRequest = UserRequestModel(sequelize);
const UserRequestItem = UserRequestItemModel(sequelize);
const BarcodeScanLog = BarcodeScanLogModel(sequelize);
const AutomationLog = AutomationLogModel(sequelize);
const ProductCategory = ProductCategoryModel(sequelize);
const UnknownBarcode = UnknownBarcodeModel(sequelize);
const Request = RequestModel(sequelize);
const RequestItem = RequestItemModel(sequelize);

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
PurchaseOrder.belongsTo(User,     { foreignKey: 'created_by',  as: 'created_by_user' });
PurchaseOrder.belongsTo(User,     { foreignKey: 'approved_by', as: 'approved_by_user' });
PurchaseOrder.belongsTo(User,     { foreignKey: 'received_by', as: 'received_by_user' });
PurchaseOrder.belongsTo(Warehouse,{ foreignKey: 'warehouse_id',as: 'warehouse' });
PurchaseOrder.belongsToMany(Product, { through: 'purchase_order_items', as: 'products' });

// SalesOrder associations
SalesOrder.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ImportJob associations
ImportJob.belongsTo(User, { foreignKey: 'triggered_by', as: 'triggeredBy' });
User.hasMany(ImportJob, { foreignKey: 'triggered_by', as: 'import_jobs' });

// ReorderRule associations
ReorderRule.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ReorderRule.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
ReorderRule.belongsTo(Supplier, { foreignKey: 'preferred_supplier_id', as: 'preferredSupplier' });
Product.hasOne(ReorderRule, { foreignKey: 'product_id', as: 'reorder_rule' });

// UserRequest associations
UserRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
UserRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
UserRequest.hasMany(UserRequestItem, { foreignKey: 'request_id', as: 'items' });
User.hasMany(UserRequest, { foreignKey: 'requested_by', as: 'requested_items' });

// UserRequestItem associations
UserRequestItem.belongsTo(UserRequest, { foreignKey: 'request_id', as: 'request' });
UserRequestItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// BarcodeScanLog associations
BarcodeScanLog.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
BarcodeScanLog.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
BarcodeScanLog.belongsTo(User, { foreignKey: 'scanned_by', as: 'scanner' });
User.hasMany(BarcodeScanLog, { foreignKey: 'scanned_by', as: 'barcode_scans' });

// ProductCategory associations
ProductCategory.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// UnknownBarcode associations
UnknownBarcode.belongsTo(User, { foreignKey: 'scanned_by', as: 'scanner' });
UnknownBarcode.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
UnknownBarcode.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
UnknownBarcode.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });

// Request associations
Request.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
Request.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Request.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
Request.belongsTo(User, { foreignKey: 'fulfilled_by', as: 'fulfiller' });
Request.hasMany(RequestItem, { foreignKey: 'request_id', as: 'items' });
User.hasMany(Request, { foreignKey: 'requester_id', as: 'requests_made' });
User.hasMany(Request, { foreignKey: 'approved_by', as: 'requests_approved' });

// RequestItem associations
RequestItem.belongsTo(Request, { foreignKey: 'request_id', as: 'request' });
RequestItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

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
  ImportJob,
  ReorderRule,
  UserRequest,
  UserRequestItem,
  BarcodeScanLog,
  AutomationLog,
  ProductCategory,
  UnknownBarcode,
  Request,
  RequestItem,
};

export default sequelize;
