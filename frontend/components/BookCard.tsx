'use client';

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: 'like_new' | 'good' | 'fair';
  coverUrl?: string;
  seller: string;
  rating?: number;
  href: string;
}

const conditionBadgeColor = {
  like_new: 'success',
  good: 'muted',
  fair: 'warning',
} as const;

export default function BookCard({
  id,
  title,
  author,
  price,
  condition,
  coverUrl,
  seller,
  rating,
  href,
}: BookCardProps) {
  return (
    <a
      href={href}
      className="card group overflow-hidden"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-[#F9F7F2] to-[#E5E7EB] rounded-sm overflow-hidden mb-4">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-12 h-12 text-[#A4ACAF] mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.25m20-11c5.5 0 10 4.745 10 11m-21-4.5h20.25"
              />
            </svg>
            <span className="text-xs text-[#A4ACAF]">No cover</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-serif font-semibold text-lg line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
          {title}
        </h3>

        <p className="text-sm text-[#A4ACAF]">{author}</p>

        <div className="flex items-center justify-between pt-2">
          <span className="font-mono font-semibold text-[#4F46E5]">
            ${price.toFixed(2)}
          </span>
          <span className={`badge ${conditionBadgeColor[condition]}`}>
            {condition.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
          <span className="text-xs text-[#A4ACAF]">by {seller}</span>
          {rating && (
            <span className="text-xs font-semibold text-[#4F46E5]">
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
