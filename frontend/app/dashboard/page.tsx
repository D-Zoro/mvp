'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import * as ordersApi from '@/lib/api/orders';
import AuthGuard from '@/components/AuthGuard';
import { Order } from '@/lib/api/types';

const DashboardContent = () => {
  const { user } = useAuth();
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders(),
  });

  const orders = ordersResponse?.items || [];

  const getStatusBadgeStyles = (status: string) => {
    const baseStyles = 'px-3 py-1 rounded-full text-sm font-medium';
    
    // Status from API is usually uppercase
    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
      case 'PAID':
      case 'DELIVERED':
        return `${baseStyles} bg-primary-container/10 text-primary`;
      case 'PENDING':
        return `${baseStyles} bg-tertiary-fixed/20 text-tertiary`;
      case 'CANCELLED':
      case 'REFUNDED':
        return `${baseStyles} bg-error-container/20 text-error`;
      default:
        return baseStyles;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <main className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <h1 className="text-3xl font-headline font-bold mb-8">My Dashboard</h1>

        {/* User Profile Card */}
        <div className="bg-surface-container rounded-lg border border-outline p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="space-y-3">
            <div>
              <span className="text-on-surface-variant text-sm">Name</span>
              <p className="text-on-surface font-medium">
                {user?.first_name} {user?.last_name || ''}
              </p>
            </div>
            <div>
              <span className="text-on-surface-variant text-sm">Email</span>
              <p className="text-on-surface font-medium">{user?.email || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant text-sm">Role</span>
              <p className="text-on-surface font-medium">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-surface-container rounded-lg border border-outline p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Orders</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-on-surface-variant">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-error">Failed to load orders</p>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-on-surface-variant">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-on-surface-variant font-semibold text-sm">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: Order) => (
                    <tr
                      key={order.id}
                      className="border-b border-outline hover:bg-surface-dim transition-colors"
                    >
                      <td className="py-3 px-4 text-on-surface font-medium">{order.id}</td>
                      <td className="py-3 px-4 text-on-surface">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown date'}
                      </td>
                      <td className="py-3 px-4 text-on-surface">${order.total_amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadgeStyles(order.status)}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
