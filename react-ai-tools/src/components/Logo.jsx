import { useId } from "react";

export function Logo() {
  const gid = useId().replace(/:/g, "");
  const gradId = `logoGrad-${gid}`;
  return (
    <span className="site-header__logo" aria-hidden="true">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path
          d="M18 4l2.2 6.8h7.1l-5.7 4.1 2.2 6.8L18 17.6l-5.8 4.1 2.2-6.8-5.7-4.1h7.1L18 4z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M10 22l1.5 4.5h4.7l-3.8 2.7 1.5 4.5-3.9-2.8-3.9 2.8 1.5-4.5-3.8-2.7h4.7L10 22z"
          fill={`url(#${gradId})`}
          opacity=".85"
        />
      </svg>
    </span>
  );
}
