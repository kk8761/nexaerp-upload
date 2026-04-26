/**
 * Order Routes
 * API endpoints for order management
 * Requirements: 1.6
 */

import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const router = Router();

// Order CRUD operations
router.post('/', OrderController.createOrder);
router.get('/', OrderController.searchOrders);
router.get('/statistics', OrderController.getStatistics);
router.get('/recent', OrderController.getRecentOrders);
router.get('/by-number/:orderNo', OrderController.getOrderByNumber);
router.get('/:id', OrderController.getOrder);
router.put('/:id', OrderController.updateOrder);

// Order state management
router.post('/:id/transition', OrderController.transitionState);
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;
