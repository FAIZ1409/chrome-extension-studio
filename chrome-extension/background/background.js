/**
 * YouTube Focus Mode - Background Service Worker
 * Handles state management, notifications, and alarms
 */

// Default settings
const DEFAULT_SETTINGS = {
  focusModeEnabled: true,
  allowedKeywords: [
    'tutorial', 'course', 'lecture', 'coding', 'programming',
    'java', 'python', 'javascript', 'react', 'node',
    'dsa', 'data structures', 'algorithms', 'system design',
    'ai', 'machine learning', 'deep learning', 'ml',
    'web development', 'app development', 'frontend', 'backend',
    'computer science', 'engineering', 'mathematics', 'calculus',
    'interview', 'career', 'placement', 'leetcode', 'competitive programming'
  ],
  blockedKeywords: [
    'prank', 'vlog', 'roast', 'shorts', 'gaming', 'gameplay',
    'reaction', 'comedy', 'movie', 'music video', 'trailer',
    'tiktok', 'funny', 'meme', 'challenge', 'unboxing',
    'asmr', 'mukbang', 'drama', 'gossip', 'celebrity'
  ],
  stats: {
    educationalMinutes: 0,
    blockedCount: 0,
    focusStreak: 0,
    lastActiveDate: null
  }
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Focus Mode] Extension installed/updated', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings on fresh install
    await chrome.storage.sync.set({ focusSettings: DEFAULT_SETTINGS });
    console.log('[Focus Mode] Default settings initialized');
    
    // Show welcome notification
    showNotification(
      'YouTube Focus Mode Activated! 🎯',
      'Your distraction-free learning experience has begun. Stay focused!'
    );
  }
});

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Focus Mode] Message received:', message.type);
  
  switch (message.type) {
    case 'TIMER_COMPLETE':
      handleTimerComplete();
      break;
      
    case 'BLOCKED_CONTENT_ACCESSED':
      handleBlockedAccess(message.data);
      break;
      
    case 'GET_SETTINGS':
      getSettings().then(sendResponse);
      return true; // Will respond async
      
    case 'UPDATE_STATS':
      updateStats(message.stats).then(sendResponse);
      return true;
  }
});

/**
 * Handle Pomodoro timer completion
 */
function handleTimerComplete() {
  showNotification(
    'Pomodoro Complete! 🍅',
    'Great focus session! Take a 5-minute break, then get back to learning.'
  );
  
  // Play sound if supported
  // Note: Service workers can't directly play audio, 
  // but we can trigger it in the popup/content script
}

/**
 * Handle blocked content access attempt
 */
function handleBlockedAccess(data) {
  showNotification(
    'Stay Focused! 🎯',
    `"${data.title}" appears to be non-educational content. Remember your goals!`
  );
}

/**
 * Get current settings
 */
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    return result.focusSettings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[Focus Mode] Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update stats in storage
 */
async function updateStats(newStats) {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const settings = result.focusSettings || DEFAULT_SETTINGS;
    settings.stats = { ...settings.stats, ...newStats };
    await chrome.storage.sync.set({ focusSettings: settings });
    return { success: true };
  } catch (error) {
    console.error('[Focus Mode] Error updating stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Show browser notification
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

/**
 * Set up daily reset alarm
 */
chrome.alarms.create('dailyReset', {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60 // Every 24 hours
});

/**
 * Handle alarms
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReset') {
    console.log('[Focus Mode] Daily reset triggered');
    await resetDailyStats();
  }
});

/**
 * Get timestamp for next midnight
 */
function getNextMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Reset daily stats
 */
async function resetDailyStats() {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const settings = result.focusSettings || DEFAULT_SETTINGS;
    
    const today = new Date().toDateString();
    const lastActive = settings.stats.lastActiveDate;
    
    // Update streak
    if (lastActive) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActive === yesterday.toDateString()) {
        settings.stats.focusStreak += 1;
      } else if (lastActive !== today) {
        settings.stats.focusStreak = 0;
      }
    }
    
    // Reset daily counters
    settings.stats.educationalMinutes = 0;
    settings.stats.blockedCount = 0;
    settings.stats.lastActiveDate = today;
    
    await chrome.storage.sync.set({ focusSettings: settings });
    
    // Notify if streak is significant
    if (settings.stats.focusStreak > 0 && settings.stats.focusStreak % 7 === 0) {
      showNotification(
        `${settings.stats.focusStreak} Day Streak! 🔥`,
        'Amazing dedication to learning. Keep up the great work!'
      );
    }
  } catch (error) {
    console.error('[Focus Mode] Error resetting daily stats:', error);
  }
}

/**
 * Handle extension icon click (if no popup)
 */
chrome.action.onClicked.addListener(async (tab) => {
  // Toggle focus mode if clicked directly
  const settings = await getSettings();
  settings.focusModeEnabled = !settings.focusModeEnabled;
  await chrome.storage.sync.set({ focusSettings: settings });
  
  // Notify content script
  if (tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SETTINGS_UPDATED',
      settings
    });
  }
});

console.log('[Focus Mode] Background service worker initialized');
