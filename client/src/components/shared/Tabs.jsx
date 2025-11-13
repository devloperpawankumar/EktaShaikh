import React from 'react';

export default function Tabs({
  tabs,
  activeId,
  onChange,
  className = '',
  size = 'lg', // 'sm' | 'md' | 'lg' | 'xl'
  unstyledContainer = false,
  gapOverride,
  fontClass = 'heading-archivogrotesk font-extrabold',
}) {
  const sizePresets = {
    sm: {
      container: 'h-8',
      label: 'px-3 text-xs',
      tab: 'px-3 py-1 text-xs',
      gap: 'gap-1',
    },
    md: {
      container: 'h-10',
      label: 'px-4 text-sm',
      tab: 'px-4 py-1.5 text-sm',
      gap: 'gap-1.5',
    },
    lg: {
      container: 'h-12',
      label: 'px-5 text-sm tracking-widest',
      tab: 'px-5 py-2 text-sm',
      gap: 'gap-2',
    },
    xl: {
      container: 'h-14',
      label: 'px-6 text-base tracking-widest',
      tab: 'px-6 py-2.5 text-base',
      gap: 'gap-2.5',
    },
  };
  const s = sizePresets[size] || sizePresets.lg;
  const palette = [
    'hover:text-pink-400 hover:bg-pink-500/15',
    'hover:text-yellow-400 hover:bg-yellow-500/15',
    'hover:text-cyan-400 hover:bg-cyan-500/15',
    'hover:text-lime-400 hover:bg-lime-500/15',
    'hover:text-purple-400 hover:bg-purple-500/15',
  ];

  return (
    <div
      role="tablist"
      aria-label="Navigation"
      className={`inline-flex items-center ${gapOverride || s.gap} ${unstyledContainer ? '' : 'p-1 rounded-full glass'} ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        const colorClass = tab.colorClass || palette[index % palette.length];
        return (
          <button
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`group ${s.tab} ${unstyledContainer ? '' : 'rounded-full'} ${fontClass} transition-all duration-200 focus:outline-none focus-visible:ring-0 cursor-pointer text-white ${colorClass} ${
              isActive ? 'text-white' : ''
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}


