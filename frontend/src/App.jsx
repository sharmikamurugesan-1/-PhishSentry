import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import HomeScreen from './screens/HomeScreen';

// Code-split heavy routes for near-instant initial page loads
const CheckScreen = lazy(() => import('./screens/CheckScreen'));
const ResultScreen = lazy(() => import('./screens/ResultScreen'));
const HelpScreen = lazy(() => import('./screens/HelpScreen'));
const PrivacyScreen = lazy(() => import('./screens/PrivacyScreen'));
const EmailProtectionScreen = lazy(() => import('./screens/EmailProtectionScreen'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [activeCheck, setActiveCheck] = useState(null);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route 
              path="/" 
              element={<HomeScreen onCheckMessage={(text) => setActiveCheck({ originalText: text })} />} 
            />
            <Route 
              path="/check" 
              element={<CheckScreen onResultReceived={(data) => setActiveCheck(data)} />} 
            />
            <Route 
              path="/result" 
              element={<ResultScreen resultData={activeCheck} />} 
            />
            <Route 
              path="/email-protection" 
              element={<EmailProtectionScreen />} 
            />
            <Route 
              path="/help" 
              element={<HelpScreen />} 
            />
            <Route 
              path="/privacy" 
              element={<PrivacyScreen />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
