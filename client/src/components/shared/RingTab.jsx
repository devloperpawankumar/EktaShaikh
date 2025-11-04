import React from 'react';

export default function RingTab({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}


