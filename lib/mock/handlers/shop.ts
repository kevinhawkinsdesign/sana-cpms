import { Route } from '../matcher';
import { ok, notFound } from '../respond';
import { db, genId, now } from '../db';

export const shopRoutes: Route[] = [
  { method: 'GET', pattern: '/api/client/shop-vehicles', handler: () => ok({ vehicles: db.shopVehicles }) },
  {
    method: 'GET',
    pattern: '/api/client/shop-vehicles/:shopId',
    handler: (ctx) => {
      const v = db.shopVehicles.find((x) => x.shopId === ctx.params.shopId || x.id === ctx.params.shopId);
      if (!v) return notFound('Vehicle not found');
      return ok({ vehicles: [v] });
    },
  },
  {
    method: 'POST',
    pattern: '/api/client/shop-orders',
    handler: (ctx) => {
      const order = { id: genId('order'), orderId: genId('ORD').toUpperCase(), status: 'PENDING', isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body };
      db.shopOrders.push(order);
      return ok({ order }, 'Order placed');
    },
  },
  { method: 'GET', pattern: '/api/admin/shop/vehicles', handler: () => ok({ shopVehicles: db.shopVehicles }) },
  {
    method: 'POST',
    pattern: '/api/admin/shop/vehicles',
    handler: (ctx) => {
      const vehicle = { id: genId('shop'), shopId: genId('SHOP').toUpperCase(), isActive: true, createdAt: now(), updatedAt: now(), availableColors: [], ...ctx.body };
      db.shopVehicles.push(vehicle);
      return ok({ shopVehicle: vehicle }, 'Vehicle created');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/shop/vehicles/:vehicleId',
    handler: (ctx) => {
      const v = db.shopVehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      Object.assign(v, ctx.body, { updatedAt: now() });
      return ok({ shopVehicle: v }, 'Vehicle updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/shop/vehicles/:vehicleId',
    handler: (ctx) => {
      const idx = db.shopVehicles.findIndex((x) => x.id === ctx.params.vehicleId);
      if (idx === -1) return notFound('Vehicle not found');
      db.shopVehicles.splice(idx, 1);
      return ok({}, 'Vehicle deleted');
    },
  },
  { method: 'GET', pattern: '/api/admin/shop/orders', handler: () => ok({ shopOrders: db.shopOrders }) },
  {
    method: 'PUT',
    pattern: '/api/admin/shop/orders/:orderId/status',
    handler: (ctx) => {
      const order = db.shopOrders.find((o) => o.id === ctx.params.orderId);
      if (!order) return notFound('Order not found');
      order.status = ctx.body?.orderStatus || ctx.body?.status || order.status;
      order.updatedAt = now();
      return ok({ shopOrder: order }, 'Order status updated');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/shop/orders/:orderId',
    handler: (ctx) => {
      const order = db.shopOrders.find((o) => o.id === ctx.params.orderId);
      if (!order) return notFound('Order not found');
      Object.assign(order, ctx.body, { updatedAt: now() });
      return ok({ order }, 'Order updated');
    },
  },
];
