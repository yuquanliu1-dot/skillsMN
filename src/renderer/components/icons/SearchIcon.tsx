/**
 * Search Icon
 *
 * SVG search icon from Heroicons
 */

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      className={className || "w-5 h-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21m-3-3 0-1.577z"
      />
      <circle cx="11" cy="11" r="3" />
      <path d="M8 2.292-2.267 0 0 1-.707-.293 1.293-.707A 1.707 0 0 0 0 1 0-1.577z" />
    </svg>
  );
};
