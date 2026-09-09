/** Read-only star display -- rounds to the nearest whole star. */
export function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating);

  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-500">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true">
          {star <= filled ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}
