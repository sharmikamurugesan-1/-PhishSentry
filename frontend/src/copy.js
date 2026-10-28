// PhishShift Copy & Content Repository
// Human-Made Editorial Tone: Calm, simple English. Zero technical jargon.

export const COPY = {
  brand: {
    name: "PhishShift",
    tagline: "Know the risk before you click",
    descriptor: "Public message security scanner",
    safeReassurance: "Temporary check · We don't save your messages."
  },

  navigation: {
    home: "Overview",
    check: "Check a message",
    scamHelp: "Already clicked?",
    privacy: "Privacy & architecture"
  },

  home: {
    heroKicker: "Check messages before you act",
    heroTitle: "Is that message genuine, or is it a trap?",
    heroSubtitle: "Spot scam patterns, fake senders, and hidden traps before you click.",
    ctaScan: "Check a message",
    ctaHelp: "How we help you",
    capabilitiesLabelAnalysis: "Message check",
    capabilitiesLabelSignals: "Warning signs",
    capabilitiesLabelExplanations: "Clear explanations",
    trustNote: "We don't save your messages.",

    // Core 3 Pillars
    pillarsTitle: "How PhishShift Protects You",
    pillarsSubtitle: "Clear, instant answers before you click an unfamiliar link or reply to a pushy message.",
    pillars: [
      {
        id: "urgency",
        title: "Spots Fake Panic & Pushy Language",
        summary: "Scammers manufacture artificial emergencies like 'account blocked' or 'electricity cut off'. We recognize the pressure tactics meant to stop you from thinking clearly."
      },
      {
        id: "domains",
        title: "Reads Web Links Safely as Plain Text",
        summary: "We inspect web addresses character by character without ever opening or visiting them. You see what a link really is with zero risk to your phone or computer."
      },
      {
        id: "privacy",
        title: "Strict Zero-Storage Privacy",
        summary: "Your message is processed in computer memory for a split second and immediately discarded. Nothing is saved to a database, tracked, or shared."
      }
    ],

    // How Results Are Interpreted
    interpretationTitle: "Understanding the Result",
    interpretationSubtitle: "Three simple categories so you always know what to do next.",
    levels: [
      {
        name: "Looks Safe",
        badge: "Low Risk",
        desc: "We did not find common scam language or deceptive links. Always double-check unexpected requests for money."
      },
      {
        name: "Needs Caution",
        badge: "Caution",
        desc: "The message is short or ambiguous. We recommend checking with the sender through an official contact method."
      },
      {
        name: "Likely a Scam",
        badge: "Likely Scam",
        desc: "The message shows clear warning signs: fake urgency, demands for private details, or deceptive links."
      }
    ],

    // Final CTA
    finalCtaTitle: "Check any message before you click.",
    finalCtaSubtitle: "A 5-second check can protect your bank account, personal details, and peace of mind.",
    finalCtaButton: "Check a message now"
  },

  check: {
    title: "Check a message",
    subtitle: "Paste an email, SMS, or text message you received. We will check it safely without opening any links.",
    pasteButton: "Paste from clipboard",
    clearButton: "Clear text",
    inputLabel: "Message to check",
    inputPlaceholder: "Paste the message here (including any links or sender details)...",
    guidance: "Accepts up to 5,000 characters. Checked securely in memory.",
    emptyStateTitle: "Nothing entered yet",
    emptyStateText: "Paste an email, SMS, or notification to see if it is safe.",
    submitButton: "Check this message",
    loadingTitle: "Checking your message...",
    loadingSubtitle: "Looking for pressure tactics, deceptive links, and hidden traps...",
    validationEmpty: "Please paste or type a message before checking.",
    validationTooLong: "Please shorten the message to under 5,000 characters.",
    clipboardError: "Clipboard access was blocked by your browser. Please paste into the box directly.",
    networkError: "Could not reach the security checker. Please check your connection and try again.",
    retryButton: "Try again"
  },

  result: {
    title: "Security Check Result",
    subtitle: "Confidential in-memory assessment",
    verdictLabels: {
      no_signs: {
        title: "Looks Safe",
        subtitle: "We found no common scam patterns or deceptive links in this text.",
        badge: "Looks Safe"
      },
      not_sure: {
        title: "Needs Caution",
        subtitle: "This message is ambiguous or incomplete. Proceed carefully.",
        badge: "Needs Caution"
      },
      likely_scam: {
        title: "Likely a Scam",
        subtitle: "This message contains clear warning signs designed to mislead you.",
        badge: "Likely a Scam"
      }
    },
    severityLevels: {
      low: "Low Risk",
      medium: "Moderate Risk",
      high: "Elevated Risk",
      critical: "Critical Risk"
    },
    messageTitle: "Your Message & Highlighted Findings",
    messageHint: "Click any highlighted phrase to see why it looks suspicious.",
    noticedTitle: "What we noticed",
    noticedEmpty: "No obvious warning words or pressure tactics found.",
    linksTitle: "Web links found in this message",
    linksSafeEmpty: "No web links found in this message.",
    linksOfficialNotice: "Links are inspected purely as text. We never visit or open unknown links.",
    actionsTitle: "What to do now",
    exploreTitle: "Explore the Evidence",
    exploreSubtitle: "Inspect the warning signs and web address details found in this message.",
    copyButton: "Copy result summary",
    copiedText: "Summary copied to clipboard",
    scanAnotherButton: "Check another message",
    disclaimer: "PhishShift provides automated guidance to help you recognize deception. When dealing with unexpected requests for money or personal data, always call the company on their official phone number."
  },

  help: {
    title: "Help & Guidance",
    subtitle: "Calm, clear steps if you have already clicked an unverified link or shared sensitive details.",
    quickStartTitle: "Emergency First Aid",
    scenarios: [
      {
        id: "funds",
        label: "I sent money or approved a transfer",
        urgency: "Immediate — First 2 Hours",
        summary: "Banks and payment apps can often stop or freeze transactions if you report them immediately.",
        actions: [
          {
            highlight: "Call 1930 immediately (National Cyber Crime Helpline)",
            detail: "Have your transaction ID, bank account number, and UPI reference ready.",
            linkUrl: "https://cybercrime.gov.in",
            linkLabel: "Visit cybercrime.gov.in"
          },
          {
            highlight: "Ask your bank to freeze net banking and UPI",
            detail: "Tell customer support to place a temporary freeze on your account to prevent further unauthorized transfers."
          }
        ]
      },
      {
        id: "password",
        label: "I typed a password or PIN into a fake website",
        urgency: "High Priority — Next 15 Minutes",
        summary: "Change your password immediately from a secure browser and log out of all active sessions.",
        actions: [
          {
            highlight: "Change your password right away on the real website",
            detail: "Type the official web address yourself in a new tab. Never use the link from the message."
          },
          {
            highlight: "Turn on two-factor authentication (2FA)",
            detail: "Use an authenticator app (such as Google Authenticator) rather than SMS where possible."
          }
        ]
      },
      {
        id: "clicked",
        label: "I only clicked a link, but did not enter anything",
        urgency: "Preventative Precaution",
        summary: "If you closed the browser promptly without typing details or downloading files, your risk is usually low.",
        actions: [
          {
            highlight: "Close the browser tab immediately",
            detail: "Do not approve any pop-up requests asking to allow notifications or install profiles."
          },
          {
            highlight: "Check your downloads folder",
            detail: "If any file downloaded automatically (.apk, .exe, .dmg), delete it immediately without opening it."
          }
        ]
      }
    ]
  },

  privacy: {
    title: "Privacy & Architecture",
    subtitle: "Built from day one to protect your privacy and your device.",
    principles: [
      {
        title: "Never Saved to Disk or Logged",
        description: "When you check a message, the text exists in computer memory solely for the few milliseconds needed to evaluate it. It is never written to a database, saved to log files, or used to build user profiles."
      },
      {
        title: "Never Opens or Resolves Links",
        description: "PhishShift never visits, opens, or pings web addresses found in your messages. We inspect them strictly as text strings to check their spelling, domain structure, and mimic patterns without exposing your device or downloading files."
      },
      {
        title: "No Account or Tracking Required",
        description: "You do not need to register, provide an email address, or install any software. There are no tracking pixels, ad networks, or third-party marketing cookies."
      },
      {
        title: "Transparent & Honest Results",
        description: "If a message is ambiguous or lacks enough context to be certain, we tell you openly. We never make up fake security scores or claim checks passed when information is missing."
      }
    ]
  }
};
