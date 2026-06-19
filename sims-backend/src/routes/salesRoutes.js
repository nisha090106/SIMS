import express from 'express';
import { SalesController } from '../controllers/salesController.js';
import { authMiddleware, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// All roles can view
router.get('/', SalesController.getAll);
router.get('/:id', SalesController.getById);

// Creation
router.post('/', authorize('admin', 'manager', 'staff'), SalesController.create);

// Update/Delete
router.put('/:id', authorize('admin', 'manager', 'staff'), SalesController.update);
router.delete('/:id', authorize('admin', 'manager', 'staff'), SalesController.delete);

// Workflow
router.post('/:id/status', authorize('admin', 'manager', 'staff'), SalesController.updateStatus);

export default router;
