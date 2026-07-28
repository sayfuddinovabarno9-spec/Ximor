export default function BrandMark({ className = "", alt = "ChOUZ Team" }) {
  const classes = ["brand-mark", className].filter(Boolean).join(" ");

  return (
    <img
      alt={alt}
      className={classes}
      decoding="async"
      draggable="false"
      src="/chouz-logo.png"
    />
  );
}
