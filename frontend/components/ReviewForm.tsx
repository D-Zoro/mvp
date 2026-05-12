'use client';

import { useState, FormEvent } from 'react';
import { apiClient } from '@/lib/api';
import type { ReviewCreate, ReviewUpdate } from '@/types';

interface ReviewFormProps {
  mode: 'create' | 'edit';
  bookId?: string;
  reviewId?: string;
  initialRating?: number;
  initialComment?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  mode,
  bookId,
  reviewId,
  initialRating = 5,
  initialComment = '',
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'create' && !bookId) {
        throw new Error('Book ID required for creating review');
      }

      if (mode === 'edit' && !reviewId) {
        throw new Error('Review ID required for editing review');
      }

      if (mode === 'create') {
        const payload: ReviewCreate = {
          rating,
          comment,
        };
        await apiClient.post(`/api/v1/books/${bookId}/reviews`, payload);
      } else {
        const payload: ReviewUpdate = {
          rating,
          comment,
        };
        await apiClient.put(`/api/v1/reviews/${reviewId}`, payload);
      }

      onSuccess?.();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Failed to save review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewId) return;

    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await apiClient.delete(`/api/v1/reviews/${reviewId}`);
      onSuccess?.();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Failed to delete review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-sm shadow-sm p-6 border-l-4 border-[#4F46E5]">
      <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-6">
        {mode === 'create' ? 'Leave a Review' : 'Edit Your Review'}
      </h3>

      {error && (
        <div className="mb-6 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
          <p className="text-sm text-[#F43F5E]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Selector */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
            Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition-colors ${
                  star <= rating ? 'text-[#4F46E5]' : 'text-[#E5E7EB]'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-xs text-[#A4ACAF] mt-2">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Your Review
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Share your thoughts about this book..."
            rows={6}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
          />
          <p className="text-xs text-[#A4ACAF] mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            type="submit"
            disabled={loading || !comment.trim()}
            className="flex-1 bg-[#4F46E5] text-white font-medium py-2 rounded-sm hover:bg-[#3c37c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Post Review' : 'Update Review'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 border border-[#E5E7EB] text-[#1A1A1A] font-medium rounded-sm hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-6 border border-[#F43F5E] text-[#F43F5E] font-medium rounded-sm hover:bg-[#F43F5E]/10 disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
