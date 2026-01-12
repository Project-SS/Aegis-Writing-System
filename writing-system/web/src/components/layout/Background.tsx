'use client';

import { useState, useEffect } from 'react';

interface BackgroundProps {
  children: React.ReactNode;
}

export function Background({ children }: BackgroundProps) {
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    // Check if background image exists
    const img = new window.Image();
    img.onload = () => setBgLoaded(true);
    img.src = '/dashboard-bg.jpg';
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        {bgLoaded ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
            style={{ backgroundImage: 'url(/dashboard-bg.jpg)' }}
          />
        ) : (
          /* Fallback gradient background when image is not available */
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a4a] via-[#0d1f2d] to-[#0a1520]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/70 via-[var(--bg-primary)]/50 to-[var(--bg-primary)]" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
