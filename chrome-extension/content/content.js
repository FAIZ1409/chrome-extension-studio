/**
 * YouTube Focus Mode - Content Script
 * Handles DOM manipulation and content filtering on YouTube
 */

// Current settings
let settings = null;
let isInitialized = false;
let observer = null;
let scanInterval = null;

// Selectors for YouTube elements
const SELECTORS = {
  // Homepage elements to hide
  homeFeed: 'ytd-browse[page-subtype="home"] #contents',
  trending: 'ytd-browse[page-subtype="trending"]',
  shorts: 'ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], [is-shorts]',
  shortsTab: 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  shortsSection: 'ytd-rich-section-renderer:has([is-shorts])',
  
  // Video elements
  videoRenderer: 'ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer',
  videoTitle: '#video-title, #video-title-link',
  channelName: '#channel-name, ytd-channel-name',
  
  // Sidebar and recommendations
  recommendations: 'ytd-watch-next-secondary-results-renderer',
  relatedVideos: '#related #items',
  
  // Main content areas
  mainContent: '#primary, #content',
  pageManager: 'ytd-page-manager'
};

/**
 * Initialize the content script
 */
async function initialize() {
  if (isInitialized) return;
  
  console.log('[Focus Mode] Initializing...');
  
  // Load settings
  await loadSettings();
  
  // Inject custom styles
  injectStyles();
  
  // Initial scan
  if (settings.focusModeEnabled) {
    setTimeout(() => {
      scanAndFilter();
      checkForHomepage();
    }, 500);
  }
  
  // Set up mutation observer
  setupObserver();
  
  // Periodic scanning for dynamic content
  scanInterval = setInterval(() => {
    if (settings.focusModeEnabled) {
      scanAndFilter();
    }
  }, 2000);
  
  // Listen for navigation
  window.addEventListener('yt-navigate-finish', onNavigate);
  
  // Listen for settings updates
  chrome.runtime.onMessage.addListener(handleMessage);
  
  isInitialized = true;
  console.log('[Focus Mode] Initialized successfully');
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    settings = result.focusSettings || getDefaultSettings();
  } catch (error) {
    console.error('[Focus Mode] Error loading settings:', error);
    settings = getDefaultSettings();
  }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    focusModeEnabled: true,
    allowedKeywords: [
      'tutorial', 'course', 'lecture', 'coding', 'programming',
      'java', 'python', 'javascript', 'react', 'dsa', 'algorithms',
      'system design', 'ai', 'machine learning', 'web development',
      'interview', 'leetcode'
    ],
    blockedKeywords: [
      'prank', 'vlog', 'roast', 'shorts', 'gaming', 'reaction',
      'comedy', 'movie', 'music video', 'tiktok', 'funny', 'meme'
    ]
  };
}

/**
 * Inject custom CSS styles
 */
function injectStyles() {
  if (document.getElementById('focus-mode-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'focus-mode-styles';
  style.textContent = `
    /* Focus Mode Dashboard */
    .focus-mode-dashboard {
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 40px;
      text-align: center;
      overflow: auto;
    }
    
    .focus-mode-dashboard.hidden {
      display: none !important;
    }
    
    .focus-dashboard-content {
      max-width: 600px;
      animation: fadeIn 0.5s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .focus-icon {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 10px 40px rgba(139, 92, 246, 0.4);
    }
    
    .focus-icon svg {
      width: 48px;
      height: 48px;
      color: white;
    }
    
    .focus-title {
      font-size: 42px;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }
    
    .focus-quote {
      font-size: 20px;
      color: #9ca3af;
      margin-bottom: 40px;
      font-style: italic;
    }
    
    .focus-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 40px;
    }
    
    .focus-btn {
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .focus-btn-primary {
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      color: white;
      border: none;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
    }
    
    .focus-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
    }
    
    .focus-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e4e4f7;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .focus-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .focus-tips {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    
    .focus-tip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: left;
    }
    
    .focus-tip-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      font-size: 20px;
    }
    
    .focus-tip-title {
      color: #e4e4f7;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .focus-tip-text {
      color: #9ca3af;
      font-size: 14px;
    }
    
    /* Hidden elements */
    .focus-hidden {
      display: none !important;
    }
    
    /* Blocked video overlay */
    .focus-blocked-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 15, 35, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }
    
    .focus-blocked-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .focus-blocked-text {
      color: #ef4444;
      font-weight: 600;
      font-size: 14px;
    }
    
    /* Educational badge */
    .focus-edu-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Check if we're on the homepage and show dashboard
 */
function checkForHomepage() {
  const isHome = window.location.pathname === '/' || 
                 window.location.pathname === '/feed/subscriptions' ||
                 document.querySelector('ytd-browse[page-subtype="home"]');
  
  if (isHome && settings.focusModeEnabled) {
    showFocusDashboard();
  } else {
    hideFocusDashboard();
  }
}

/**
 * Show the Focus Mode Dashboard
 */
function showFocusDashboard() {
  let dashboard = document.getElementById('focus-mode-dashboard');
  
  if (!dashboard) {
    dashboard = document.createElement('div');
    dashboard.id = 'focus-mode-dashboard';
    dashboard.className = 'focus-mode-dashboard';
    dashboard.innerHTML = `
      <div class="focus-dashboard-content">
        <div class="focus-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="focus-title">Focus Mode Active</h1>
        <p class="focus-quote">"Stay focused. Build your future. One tutorial at a time."</p>
        
        <div class="focus-actions">
          <button class="focus-btn focus-btn-primary" id="focus-search-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Search Educational Content
          </button>
          <button class="focus-btn focus-btn-secondary" id="focus-subscriptions-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 11a9 9 0 0 1 9 9"/>
              <path d="M4 4a16 16 0 0 1 16 16"/>
              <circle cx="5" cy="19" r="1"/>
            </svg>
            My Subscriptions
          </button>
        </div>
        
        <div class="focus-tips">
          <div class="focus-tip">
            <div class="focus-tip-icon" style="background: rgba(34, 197, 94, 0.2);">📚</div>
            <div class="focus-tip-title">Learn Something New</div>
            <div class="focus-tip-text">Search for tutorials on topics you want to master</div>
          </div>
          <div class="focus-tip">
            <div class="focus-tip-icon" style="background: rgba(59, 130, 246, 0.2);">🎯</div>
            <div class="focus-tip-title">Stay Consistent</div>
            <div class="focus-tip-text">Build your streak by learning every day</div>
          </div>
          <div class="focus-tip">
            <div class="focus-tip-icon" style="background: rgba(251, 191, 36, 0.2);">⏱️</div>
            <div class="focus-tip-title">Use Pomodoro</div>
            <div class="focus-tip-text">Focus for 25 minutes, then take a short break</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dashboard);
    
    // Add event listeners
    document.getElementById('focus-search-btn').addEventListener('click', () => {
      const searchBox = document.querySelector('input#search');
      if (searchBox) {
        hideFocusDashboard();
        searchBox.focus();
      }
    });
    
    document.getElementById('focus-subscriptions-btn').addEventListener('click', () => {
      window.location.href = '/feed/subscriptions';
    });
  }
  
  dashboard.classList.remove('hidden');
  
  // Hide YouTube's home content
  const homeContent = document.querySelector(SELECTORS.homeFeed);
  if (homeContent) {
    homeContent.classList.add('focus-hidden');
  }
}

/**
 * Hide the Focus Mode Dashboard
 */
function hideFocusDashboard() {
  const dashboard = document.getElementById('focus-mode-dashboard');
  if (dashboard) {
    dashboard.classList.add('hidden');
  }
  
  // Show YouTube content again if focus mode is off
  if (!settings.focusModeEnabled) {
    const homeContent = document.querySelector(SELECTORS.homeFeed);
    if (homeContent) {
      homeContent.classList.remove('focus-hidden');
    }
  }
}

/**
 * Main scanning and filtering function
 */
function scanAndFilter() {
  if (!settings.focusModeEnabled) {
    removeAllFilters();
    return;
  }
  
  // Hide Shorts everywhere
  hideShorts();
  
  // Filter video content
  filterVideos();
  
  // Track time on educational content
  trackEducationalTime();
}

/**
 * Hide all Shorts content
 */
function hideShorts() {
  const shortsElements = document.querySelectorAll(SELECTORS.shorts);
  shortsElements.forEach(el => el.classList.add('focus-hidden'));
  
  const shortsTab = document.querySelector(SELECTORS.shortsTab);
  if (shortsTab) shortsTab.classList.add('focus-hidden');
  
  const shortsSection = document.querySelectorAll(SELECTORS.shortsSection);
  shortsSection.forEach(el => el.classList.add('focus-hidden'));
}

/**
 * Filter videos based on keywords
 */
function filterVideos() {
  const videos = document.querySelectorAll(SELECTORS.videoRenderer);
  let blockedCount = 0;
  
  videos.forEach(video => {
    // Skip if already processed
    if (video.dataset.focusProcessed === 'true') return;
    video.dataset.focusProcessed = 'true';
    
    const titleEl = video.querySelector(SELECTORS.videoTitle);
    const channelEl = video.querySelector(SELECTORS.channelName);
    
    if (!titleEl) return;
    
    const title = titleEl.textContent.toLowerCase();
    const channel = channelEl ? channelEl.textContent.toLowerCase() : '';
    const combinedText = `${title} ${channel}`;
    
    // Check classification
    const classification = classifyContent(combinedText);
    
    if (classification === 'blocked') {
      hideVideo(video);
      blockedCount++;
    } else if (classification === 'educational') {
      markAsEducational(video);
    }
  });
  
  // Update blocked count in storage
  if (blockedCount > 0) {
    updateBlockedCount(blockedCount);
  }
}

/**
 * Classify content as educational, blocked, or neutral
 */
function classifyContent(text) {
  const lowerText = text.toLowerCase();
  
  // Check blocked keywords first
  for (const keyword of settings.blockedKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return 'blocked';
    }
  }
  
  // Check allowed keywords
  for (const keyword of settings.allowedKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return 'educational';
    }
  }
  
  return 'neutral';
}

/**
 * Hide a video element
 */
function hideVideo(video) {
  video.classList.add('focus-hidden');
}

/**
 * Mark video as educational
 */
function markAsEducational(video) {
  if (video.querySelector('.focus-edu-badge')) return;
  
  const thumbnail = video.querySelector('ytd-thumbnail, #thumbnail');
  if (thumbnail) {
    thumbnail.style.position = 'relative';
    const badge = document.createElement('div');
    badge.className = 'focus-edu-badge';
    badge.innerHTML = '✓ Educational';
    thumbnail.appendChild(badge);
  }
}

/**
 * Update blocked count in storage
 */
async function updateBlockedCount(count) {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const currentSettings = result.focusSettings || settings;
    currentSettings.stats = currentSettings.stats || {};
    currentSettings.stats.blockedCount = (currentSettings.stats.blockedCount || 0) + count;
    await chrome.storage.sync.set({ focusSettings: currentSettings });
  } catch (error) {
    console.error('[Focus Mode] Error updating blocked count:', error);
  }
}

/**
 * Track time spent on educational content
 */
let lastTrackTime = Date.now();
function trackEducationalTime() {
  // Only track on watch pages
  if (!window.location.pathname.includes('/watch')) return;
  
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
  if (!videoTitle) return;
  
  const title = videoTitle.textContent.toLowerCase();
  const isEducational = settings.allowedKeywords.some(kw => title.includes(kw.toLowerCase()));
  
  if (isEducational) {
    const now = Date.now();
    const elapsed = Math.floor((now - lastTrackTime) / 60000); // minutes
    
    if (elapsed >= 1) {
      updateEducationalTime(elapsed);
      lastTrackTime = now;
    }
  }
}

/**
 * Update educational time in storage
 */
async function updateEducationalTime(minutes) {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const currentSettings = result.focusSettings || settings;
    currentSettings.stats = currentSettings.stats || {};
    currentSettings.stats.educationalMinutes = (currentSettings.stats.educationalMinutes || 0) + minutes;
    await chrome.storage.sync.set({ focusSettings: currentSettings });
  } catch (error) {
    console.error('[Focus Mode] Error updating educational time:', error);
  }
}

/**
 * Remove all filters (when focus mode is disabled)
 */
function removeAllFilters() {
  document.querySelectorAll('.focus-hidden').forEach(el => {
    el.classList.remove('focus-hidden');
  });
  document.querySelectorAll('.focus-edu-badge').forEach(el => el.remove());
  document.querySelectorAll('[data-focus-processed]').forEach(el => {
    el.removeAttribute('data-focus-processed');
  });
  hideFocusDashboard();
}

/**
 * Handle navigation events
 */
function onNavigate() {
  console.log('[Focus Mode] Navigation detected');
  
  // Reset processed flags for new content
  document.querySelectorAll('[data-focus-processed]').forEach(el => {
    el.removeAttribute('data-focus-processed');
  });
  
  if (settings.focusModeEnabled) {
    setTimeout(() => {
      scanAndFilter();
      checkForHomepage();
    }, 500);
  }
}

/**
 * Set up mutation observer for dynamic content
 */
function setupObserver() {
  if (observer) observer.disconnect();
  
  observer = new MutationObserver((mutations) => {
    if (!settings.focusModeEnabled) return;
    
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    
    if (shouldScan) {
      // Debounce scanning
      clearTimeout(window.focusScanTimeout);
      window.focusScanTimeout = setTimeout(scanAndFilter, 200);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Handle messages from popup/background
 */
function handleMessage(message, sender, sendResponse) {
  if (message.type === 'SETTINGS_UPDATED') {
    settings = message.settings;
    
    if (settings.focusModeEnabled) {
      scanAndFilter();
      checkForHomepage();
    } else {
      removeAllFilters();
    }
    
    sendResponse({ success: true });
  }
  return true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
