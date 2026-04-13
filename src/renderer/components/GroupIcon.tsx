/**
 * GroupIcon Component
 *
 * Renders SVG line icons for skill groups (Apple / Heroicons stroke style).
 * Falls back to rendering legacy emoji values or a default folder icon.
 */

// SVG path data for each group icon
export const GROUP_SVG_ICONS: Record<string, string> = {
  lightning:  'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  target:     'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z',
  code:       'M16 18l6-6-6-6M8 6l-6 6 6 6',
  beaker:     'M9 3v7.2c0 .3-.1.6-.3.8L4.5 17c-.5.8.1 1.8 1 1.8h13c.9 0 1.5-1 1-1.8l-4.2-6c-.2-.2-.3-.5-.3-.8V3M7 3h10M10 9h4',
  rocket:     'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 2l-5.5 9h4v5l5.5-9h-4V2z',
  book:       'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2.5 2.5 0 012.5-2.5H20v15H6.5A2.5 2.5 0 004 19.5z',
  bug:        'M12 2a7 7 0 00-7 7c0 4 3 7 7 9 4-2 7-5 7-9a7 7 0 00-7-7zM9.5 9h5M9.5 12h5',
  cog:        'M12 15a3 3 0 100-6 3 3 0 000 6zm0-10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm8.66-12.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-17.32 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm17.32 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3.34 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  shield:     'M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z',
  chart:      'M3 3v18h18M7 16l4-4 4 4 5-6',
  link:       'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  cloud:      'M6.5 19.5a4 4 0 01-.87-7.9A5.5 5.5 0 0116.9 9 4.5 4.5 0 0119 17.5H6.5z',
  brain:      'M12 2a6 6 0 00-6 6c0 2 1 3.5 2.5 4.5L9 14v4h6v-4l.5-1.5C17 11.5 18 10 18 8a6 6 0 00-6-6zM9 21h6',
  database:   'M4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7M4 7c0 1.1 3.6 2 8 2s8-.9 8-2M4 7c0-1.1 3.6-2 8-2s8 .9 8 2M4 12c0 1.1 3.6 2 8 2s8-.9 8-2',
  refresh:    'M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 005.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 013.51 15',
  globe:      'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2z',
};

// Legacy emoji-to-icon mapping for backward compatibility
const EMOJI_TO_ICON: Record<string, string> = {
  '📋': 'book',
  '💻': 'code',
  '🔧': 'cog',
  '🧪': 'beaker',
  '🚀': 'rocket',
  '🎯': 'target',
  '⚙️': 'cog',
  '📊': 'chart',
  '⚡': 'lightning',
  '⌨️': 'code',
  '🔬': 'beaker',
  '📘': 'book',
  '🐞': 'bug',
  '🛡️': 'shield',
  '📈': 'chart',
  '🔗': 'link',
  '☁️': 'cloud',
  '🧠': 'brain',
  '💾': 'database',
  '🔄': 'refresh',
  '🌐': 'globe',
  '📁': 'book',
};

interface GroupIconProps {
  icon?: string;
  className?: string;
}

export default function GroupIcon({ icon, className = 'w-5 h-5' }: GroupIconProps) {
  // Resolve legacy emoji values to SVG icon names
  const resolvedIcon = icon ? (EMOJI_TO_ICON[icon] ?? icon) : undefined;
  const pathData = resolvedIcon ? GROUP_SVG_ICONS[resolvedIcon] : undefined;
  if (pathData) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d={pathData} />
      </svg>
    );
  }
  // default: folder icon
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
