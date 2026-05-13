'use client';

import { useState } from 'react';
import ReviewForm from '@/components/ReviewForm';

interface ReviewFormClientProps {
  bookId: string;
}

export default function ReviewFormClient({ bookId }: ReviewFormClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setShowForm(false);
    // Trigger a refresh of reviews (in a real app, would refetch)
    setRefreshKey((k) => k + 1);
  };

  return (
    <div key={refreshKey}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 bg-[#4F46E5] text-white font-medium py-2 px-4 rounded-sm hover:bg-[#3c37c4] transition-colors"
        >
          Leave a Review
        </button>
      ) : (
        <ReviewForm
          mode="create"
          bookId={bookId}
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
