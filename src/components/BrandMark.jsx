export default function BrandMark({ className = "", alt = "ChOUZ Team", variant = "wordmark" }) {
  const classes = ["brand-mark", className].filter(Boolean).join(" ");
  const src = variant === "mark" ? "/chouz-logo-mark.png" : "/chouz-logo.png";

  return (
    <img
      alt={alt}
      className={classes}
      decoding="async"
      draggable="false"
      src={src}
    />
  );
}
