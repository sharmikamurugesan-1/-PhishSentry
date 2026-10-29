/**
 * PhishShift API Client Service
 * Connects directly to deployed Flask Backend: https://phishsentry.onrender.com/
 */

import { COPY } from '../copy';

// Base URL configuration using standard Vite environment variable
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (RAW_BASE_URL !== undefined && RAW_BASE_URL !== '')
  ? RAW_BASE_URL.replace(/\/$/, '')
  : 'https://phishsentry.onrender.com';

/**
 * Extract suspicious links & potential brand imposter notes from text
 */
function extractLinksFromText(text) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|in|co|xyz|top|info|biz|ru|cn|cc|tk|io|live|club|vip|online|site|app)[^\s]*)/gi;
  const matches = text.match(urlRegex) || [];
  const uniqueUrls = Array.from(new Set(matches));

  const popularBrands = [
    { name: "State Bank of India", domain: "sbi.co.in", pattern: /sbi/i },
    { name: "HDFC Bank", domain: "hdfcbank.com", pattern: /hdfc/i },
    { name: "ICICI Bank", domain: "icicibank.com", pattern: /icici/i },
    { name: "Google", domain: "google.com", pattern: /google/i },
    { name: "Microsoft", domain: "microsoft.com", pattern: /microsoft|outlook|hotmail/i },
    { name: "Amazon", domain: "amazon.in", pattern: /amazon/i },
    { name: "Apple", domain: "apple.com", pattern: /apple|icloud/i },
    { name: "Netflix", domain: "netflix.com", pattern: /netflix/i },
    { name: "PayPal", domain: "paypal.com", pattern: /paypal/i },
    { name: "India Post", domain: "indiapost.gov.in", pattern: /indiapost|post.*gov/i }
  ];

  return uniqueUrls.map((url) => {
    let cleanUrl = url.trim();
    let hostname = cleanUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];

    let looksLike = null;
    let isSuspicious = false;
    let note = "Standard external link.";

    for (const brand of popularBrands) {
      if (brand.pattern.test(hostname) && !hostname.endsWith(brand.domain)) {
        looksLike = `${brand.name} (${brand.domain})`;
        isSuspicious = true;
        note = `This link imitates ${brand.name}, but directs to ${hostname}.`;
        break;
      }
    }

    const suspiciousTlds = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.click', '.loan', '.live'];
    if (suspiciousTlds.some(tld => hostname.endsWith(tld))) {
      isSuspicious = true;
      if (!looksLike) {
        note = `Uses a high-risk disposable domain extension (${hostname.slice(hostname.lastIndexOf('.'))}).`;
      }
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
      isSuspicious = true;
      note = "Uses a raw numeric IP address instead of a verified registered domain name.";
    }

    return {
      shown: cleanUrl,
      looks_like: looksLike,
      is_suspicious: isSuspicious,
      note: note
    };
  });
}

/**
 * Extract noticed phrases based on verified trigger patterns
 */
function extractNoticedPhrases(text) {
  const noticed = [];
  const lower = text.toLowerCase();

  const triggers = [
    { pattern: /\b(blocked|suspended|deactivated|disconnected|terminated|freeze)\b/i, text: "suspended", why: "Implies an urgent account restriction to provoke panicked action." },
    { pattern: /\b(immediately|urgent|hurry|act now|rush|within \d+ hours?)\b/i, text: "immediately", why: "Creates artificial time pressure to prevent deliberate checking." },
    { pattern: /\b(kyc|otp|pan card|aadhaar|password|pin|cvv)\b/i, text: "kyc", why: "Demands sensitive identity or authentication credentials." },
    { pattern: /\b(lottery|won|cashback|prize|reward|claim|refund|tax refund)\b/i, text: "refund", why: "Offers unexpected financial incentives to elicit clicks." },
    { pattern: /\b(wire transfer|gift card|crypto|bitcoin|usdt)\b/i, text: "wire transfer", why: "Requests irreversible payment or unmonitored transfer methods." },
    { pattern: /\b(arrest|warrant|police|cbi|customs|court|legal action)\b/i, text: "legal action", why: "Impersonates law enforcement or judicial bodies to intimidate victims." }
  ];

  for (const trig of triggers) {
    const match = text.match(trig.pattern);
    if (match) {
      noticed.push({
        text: match[0],
        why: trig.why
      });
    }
  }

  return noticed;
}

/**
 * Check backend service health
 */
export async function checkBackendHealth() {
  try {
    const endpoints = [`${API_BASE_URL}/health`, `/health`];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // try next endpoint
      }
    }
    return { status: 'offline', error: 'Unable to reach backend' };
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Analyze a message using the deployed Flask ML backend (/predict)
 * @param {string} text The message text to analyze
 * @returns {Promise<Object>} Formatted result object matching ResultScreen requirements
 */
export async function analyzeMessage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error(COPY.check.validationEmpty || "Please paste or enter a message first.");
  }
  if (trimmed.length > 5000) {
    throw new Error(COPY.check.validationTooLong || "This message exceeds the maximum allowed length of 5,000 characters.");
  }

  // 1. First attempt: Direct /predict endpoint on deployed backend
  // Payload contract: { emails: [trimmed], model: 'lr' }
  const requestPayload = {
    emails: [trimmed],
    model: 'lr'
  };

  let rawData = null;
  let fetchError = null;

  // Try relative proxy route first (for local Vite dev), then direct deployed base URL
  const candidateUrls = [
    '/predict',
    `${API_BASE_URL}/predict`
  ];

  // Remove duplicates
  const uniqueUrls = Array.from(new Set(candidateUrls));

  for (const endpoint of uniqueUrls) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (response.ok) {
        rawData = await response.json();
        break;
      }
    } catch (err) {
      fetchError = err;
    }
  }

  // If /predict failed, try /api/check/message
  if (!rawData) {
    const fallbackUrls = [
      '/api/check/message',
      `${API_BASE_URL}/api/check/message`
    ];
    for (const endpoint of fallbackUrls) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        fetchError = err;
      }
    }
  }

  if (!rawData || !rawData.results || !rawData.results[0]) {
    throw new Error(
      fetchError?.message || COPY.check.networkError || "Could not reach the analysis server. Please check your connection and try again."
    );
  }

  // 2. Extract real predictions from the model result
  const modelResult = rawData.results[0];
  const modelScore = typeof modelResult.confidence_score === 'number'
    ? modelResult.confidence_score
    : (modelResult.prediction === 1 ? 0.95 : 0.05);

  const modelPrediction = modelResult.prediction; // 1 = Phishing, 0 = Safe
  const modelUsed = rawData.model_used || "Logistic Regression";

  // 3. Inspect lexical tokens and web links in the analyzed message
  const links = extractLinksFromText(trimmed);
  const noticed = extractNoticedPhrases(trimmed);
  const hasSuspiciousLink = links.some(l => l.is_suspicious);

  // 4. Determine verdict & severity level based on real model output + link evidence
  let verdict = 'not_sure';
  let severityLevel = 'medium';
  let reason = '';

  if (hasSuspiciousLink && modelScore >= 0.40) {
    verdict = 'likely_scam';
    severityLevel = modelScore >= 0.75 ? 'critical' : 'high';
    reason = 'This message combines scam language with an imposter or deceptive website link.';
  } else if (modelScore >= 0.65 || modelPrediction === 1) {
    verdict = 'likely_scam';
    severityLevel = modelScore >= 0.85 ? 'critical' : 'high';
    reason = 'The wording in this message closely matches patterns frequently observed in scam messages.';
  } else if (modelScore >= 0.35 || hasSuspiciousLink) {
    verdict = 'not_sure';
    severityLevel = 'medium';
    reason = 'This message contains ambiguous signals or unverified links. Proceed with caution.';
  } else {
    verdict = 'no_signs';
    severityLevel = 'low';
    reason = 'No obvious scam signals or deceptive links were identified in this message.';
  }

  // 5. Targeted safe actions
  const todo = verdict === 'likely_scam' ? [
    "Do not click any links or download attached files.",
    "Do not share OTPs, passwords, or identity numbers.",
    "Block the sender and report the message to official authorities."
  ] : verdict === 'not_sure' ? [
    "Verify the claim through an independent, official phone number or website.",
    "Never share OTPs, PINs, or banking passwords.",
    "Do not reply if you do not personally recognise the sender."
  ] : [
    "Still verify unexpected payment requests through a known phone number.",
    "Never share banking OTPs with anyone, even if they claim to be family or staff."
  ];

  return {
    verdict,
    severity_level: severityLevel,
    model_score: Math.round(modelScore * 10000) / 10000,
    model_type: modelUsed,
    reason,
    noticed,
    links: links.map(l => ({ shown: l.shown, looks_like: l.looks_like, note: l.note })),
    todo
  };
}

/**
 * Robust fetch helper that checks both relative and deployed base URLs
 */
async function apiRequest(path, options = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urls = [
    cleanPath,
    `${API_BASE_URL}${cleanPath}`
  ];
  const uniqueUrls = Array.from(new Set(urls));

  let lastError = null;
  for (const url of uniqueUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });
      if (res.ok) {
        return await res.json();
      }
      // If server returned structured JSON error
      try {
        const errorData = await res.json();
        throw new Error(errorData.error || `Request failed (${res.status})`);
      } catch (parseErr) {
        throw new Error(parseErr.message || `Request failed with status ${res.status}`);
      }
    } catch (err) {
      lastError = err;
      // If it was a 4xx validation error thrown above, don't retry with next URL
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
    }
  }
  throw lastError || new Error("Could not reach backend server.");
}

// ----------------------------------------------------
// Automatic Email Protection API Client Services
// ----------------------------------------------------

export async function getInboxStatus() {
  return await apiRequest('/api/inbox/status');
}

export async function connectInbox(provider = 'demo', email = '', isDemo = true) {
  return await apiRequest('/api/inbox/connect', {
    method: 'POST',
    body: JSON.stringify({ provider, email, is_demo: isDemo })
  });
}

export async function scanInbox() {
  return await apiRequest('/api/inbox/scan', {
    method: 'POST'
  });
}

export async function getInboxMessages(status = 'all') {
  return await apiRequest(`/api/inbox/messages?status=${encodeURIComponent(status)}`);
}

export async function reviewInboxMessage(messageId, action, confirmation = false, extras = {}) {
  return await apiRequest('/api/inbox/review', {
    method: 'POST',
    body: JSON.stringify({
      message_id: messageId,
      action,
      confirmation,
      ...extras
    })
  });
}

export async function getSenders(listType = '') {
  const query = listType ? `?list_type=${encodeURIComponent(listType)}` : '';
  return await apiRequest(`/api/senders${query}`);
}

export async function addSender(email, listType = 'trusted', note = '') {
  return await apiRequest('/api/senders', {
    method: 'POST',
    body: JSON.stringify({ email, list_type: listType, note })
  });
}

export async function deleteSender(senderId) {
  return await apiRequest(`/api/senders/${senderId}`, {
    method: 'DELETE'
  });
}

export async function getThreatAlerts() {
  return await apiRequest('/api/alerts');
}

export async function markAlertRead(alertId, isRead = true) {
  return await apiRequest(`/api/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: isRead })
  });
}

export async function dismissAlert(alertId) {
  return await apiRequest(`/api/alerts/${alertId}`, {
    method: 'DELETE'
  });
}

export async function resetDemoInbox() {
  return await apiRequest('/api/inbox/reset-demo', {
    method: 'POST'
  });
}
