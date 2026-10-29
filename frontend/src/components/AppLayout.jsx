import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors relative">
      <Header />
      <main className="flex-1 w-full relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
