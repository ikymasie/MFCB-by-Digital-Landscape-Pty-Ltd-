import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Top accent bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#003366] z-50" />
      {children}
    </div>
  );
}
