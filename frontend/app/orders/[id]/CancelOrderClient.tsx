'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface CancelOrderClientProps {
  orderId: string;
}

export default function CancelOrderClient({ orderId }: CancelOrderClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post(`/api/v1/orders/${orderId}/cancel`, {});
      // Refresh the page
      router.refresh();
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to cancel order. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
          <p className="text-sm text-[#F43F5E]">{error}</p>
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={isLoading}
        className="w-full px-4 py-2 border border-[#F43F5E] text-[#F43F5E] font-medium rounded-sm hover:bg-[#F43F5E]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Cancelling…' : 'Cancel Order'}
      </button>
    </>
  );
}
