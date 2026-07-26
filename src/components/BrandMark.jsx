export default function BrandMark({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`brand-mark ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M12 12h.01" />
      <path d="M19.1 4.9c2.1 2.1-.5 8.2-5.8 13.5-5.3 5.3-11.4 7.9-13.5 5.8-2.1-2.1.5-8.2 5.8-13.5C10.9 5.4 17 2.8 19.1 4.9Z" />
      <path d="M4.9 4.9C2.8 7 5.4 13.1 10.7 18.4c5.3 5.3 11.4 7.9 13.5 5.8 2.1-2.1-.5-8.2-5.8-13.5C13.1 5.4 7 2.8 4.9 4.9Z" />
    </svg>
  );
}
