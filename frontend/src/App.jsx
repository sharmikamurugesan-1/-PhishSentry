import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import HomeScreen from './screens/HomeScreen';
import CheckScreen from './screens/CheckScreen';
import ResultScreen from './screens/ResultScreen';
import HelpScreen from './screens/HelpScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import EmailProtectionScreen from './screens/EmailProtectionScreen';

export default function App() {
  const [activeCheck, setActiveCheck] = useState(null);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
