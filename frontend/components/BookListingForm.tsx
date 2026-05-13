'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { apiClient } from '@/lib/api';
import type { BookResponse } from '@/types';

interface BookListingFormProps {
  initialBook?: BookResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  title: string;
  author: string;
  isbn: string;
  description: string;
  condition: 'MINT' | 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
  price: string;
  quantity: string;
  category: string;
  status: 'draft' | 'active';
  images: File[];
  previewImages: string[];
}

const CONDITIONS = ['MINT', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'] as const;

export default function BookListingForm({
  initialBook,
  onSuccess,
  onCancel,
}: BookListingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: initialBook?.title || '',
    author: initialBook?.author || '',
    isbn: initialBook?.isbn || '',
    description: initialBook?.description || '',
    condition: (initialBook?.condition as any) || 'GOOD',
    price: initialBook ? parseFloat(initialBook.price).toFixed(2) : '',
    quantity: initialBook?.quantity?.toString() || '1',
    category: initialBook?.category || '',
    status: (initialBook?.status as 'draft' | 'active') || 'draft',
    images: [],
    previewImages: initialBook?.primary_image ? [initialBook.primary_image] : [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
      previewImages: [
        ...prev.previewImages,
        ...files.map((f) => URL.createObjectURL(f)),
      ],
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      previewImages: prev.previewImages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (
        !formData.title ||
        !formData.author ||
        !formData.price ||
        !formData.category
      ) {
        throw new Error('Please fill in all required fields');
      }

      const payload: any = {
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn || null,
        description: formData.description,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 1,
        category: formData.category,
        status: formData.status,
      };

      // Upload images if there are new ones
      const uploadedImages: string[] = [];
      for (const file of formData.images) {
        const imageFormData = new FormData();
        imageFormData.append('file', file);

        const uploadResponse = await apiClient.post<{ url: string }>(
          '/api/v1/upload',
          imageFormData as any
        );

        uploadedImages.push(uploadResponse.url);
      }

      if (uploadedImages.length > 0) {
        payload.primary_image = uploadedImages[0];
      }

      // Create or update book
      if (initialBook) {
        await apiClient.put(`/api/v1/books/${initialBook.id}`, payload);
      } else {
        await apiClient.post('/api/v1/books', payload);
      }

      onSuccess?.();
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : 'Failed to save book. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-sm">
          <p className="text-sm text-[#F43F5E]">{error}</p>
        </div>
      )}

      {/* Title & Author */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Author *
          </label>
          <input
            id="author"
            name="author"
            type="text"
            required
            value={formData.author}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>
      </div>

      {/* ISBN & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="isbn" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            ISBN
          </label>
          <input
            id="isbn"
            name="isbn"
            type="text"
            value={formData.isbn}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Category *
          </label>
          <input
            id="category"
            name="category"
            type="text"
            required
            value={formData.category}
            onChange={handleInputChange}
            placeholder="e.g., Fiction, Non-Fiction"
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>
      </div>

      {/* Price & Condition & Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Price *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.price}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            max="999"
            value={formData.quantity}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe the book's condition, any marks, special features..."
          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-sm focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          Cover Image
        </label>

        {formData.previewImages.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {formData.previewImages.map((image, idx) => (
              <div key={idx} className="relative">
                <img
                  src={image}
                  alt="preview"
                  className="w-full aspect-[3/4] object-cover rounded-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 bg-[#F43F5E] text-white w-6 h-6 rounded-sm flex items-center justify-center hover:bg-[#D63447] transition-colors text-sm font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="block px-4 py-8 border-2 border-dashed border-[#E5E7EB] rounded-sm text-center cursor-pointer hover:border-[#4F46E5] transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <div className="text-[#4F46E5] font-medium">Click to upload images</div>
          <p className="text-xs text-[#A4ACAF] mt-1">PNG, JPG up to 10MB</p>
        </label>
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.status === 'active'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.checked ? 'active' : 'draft',
              }))
            }
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-[#1A1A1A]">
            Publish immediately (instead of saving as draft)
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#4F46E5] text-white font-medium py-3 rounded-sm hover:bg-[#3c37c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? 'Saving…'
            : initialBook
            ? 'Update Listing'
            : 'Create Listing'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 border border-[#E5E7EB] text-[#1A1A1A] font-medium rounded-sm hover:bg-[#F9F7F2] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
