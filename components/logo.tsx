export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="10" r="3.2" fill="currentColor" />
      <path
        d="M16 14 L9.5 25.5 M16 14 L16 26 M16 14 L22.5 25.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
