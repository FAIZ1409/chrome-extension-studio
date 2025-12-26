/**
 * YouTube Focus Mode - Popup Script
 * Handles the extension popup UI and settings management
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

// DOM Elements
let focusModeToggle;
let educationalTimeEl;
let blockedCountEl;
let focusStreakEl;
let allowedInput;
let blockedInput;
let allowedList;
let blockedList;
let timerDisplay;
let startTimerBtn;
let resetTimerBtn;

// Timer state
let timerInterval = null;
let timerSeconds = 25 * 60;
let isTimerRunning = false;

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  await loadSettings();
  setupEventListeners();
  updateTimerDisplay();
});

/**
 * Cache DOM elements
 */
function initializeElements() {
  focusModeToggle = document.getElementById('focusModeToggle');
  educationalTimeEl = document.getElementById('educationalTime');
  blockedCountEl = document.getElementById('blockedCount');
  focusStreakEl = document.getElementById('focusStreak');
  allowedInput = document.getElementById('allowedInput');
  blockedInput = document.getElementById('blockedInput');
  allowedList = document.getElementById('allowedList');
  blockedList = document.getElementById('blockedList');
  timerDisplay = document.getElementById('timerDisplay');
  startTimerBtn = document.getElementById('startTimer');
  resetTimerBtn = document.getElementById('resetTimer');
}

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const settings = result.focusSettings || DEFAULT_SETTINGS;
    
    // Update UI with settings
    focusModeToggle.checked = settings.focusModeEnabled;
    
    // Update stats
    updateStatsDisplay(settings.stats);
    
    // Render keyword lists
    renderKeywords('allowed', settings.allowedKeywords);
    renderKeywords('blocked', settings.blockedKeywords);
    
    // Check and update streak
    checkStreak(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings(updates) {
  try {
    const result = await chrome.storage.sync.get(['focusSettings']);
    const settings = { ...DEFAULT_SETTINGS, ...result.focusSettings, ...updates };
    await chrome.storage.sync.set({ focusSettings: settings });
    
    // Notify content script of changes
    chrome.tabs.query({ url: '*://www.youtube.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'SETTINGS_UPDATED', 
          settings 
        }).catch(() => {});
      });
    });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Update stats display
 */
function updateStatsDisplay(stats) {
  const minutes = stats.educationalMinutes || 0;
  educationalTimeEl.textContent = minutes >= 60 
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` 
    : `${minutes}m`;
  blockedCountEl.textContent = stats.blockedCount || 0;
  focusStreakEl.textContent = stats.focusStreak || 0;
}

/**
 * Check and update focus streak
 */
async function checkStreak(settings) {
  const today = new Date().toDateString();
  const lastActive = settings.stats.lastActiveDate;
  
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActive === yesterday.toDateString()) {
      // Continue streak
      settings.stats.focusStreak += 1;
    } else if (lastActive !== today) {
      // Reset streak if more than a day gap
      settings.stats.focusStreak = 1;
    }
    
    // Reset daily stats
    settings.stats.educationalMinutes = 0;
    settings.stats.blockedCount = 0;
    settings.stats.lastActiveDate = today;
    
    await saveSettings({ stats: settings.stats });
    updateStatsDisplay(settings.stats);
  }
}

/**
 * Render keywords list
 */
function renderKeywords(type, keywords) {
  const listEl = type === 'allowed' ? allowedList : blockedList;
  listEl.innerHTML = '';
  
  keywords.forEach(keyword => {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.innerHTML = `
      ${keyword}
      <button data-keyword="${keyword}" data-type="${type}" aria-label="Remove ${keyword}">×</button>
    `;
    listEl.appendChild(tag);
  });
}

/**
 * Add keyword to list
 */
async function addKeyword(type) {
  const input = type === 'allowed' ? allowedInput : blockedInput;
  const keyword = input.value.trim().toLowerCase();
  
  if (!keyword) return;
  
  const result = await chrome.storage.sync.get(['focusSettings']);
  const settings = result.focusSettings || DEFAULT_SETTINGS;
  const keywordList = type === 'allowed' ? 'allowedKeywords' : 'blockedKeywords';
  
  if (!settings[keywordList].includes(keyword)) {
    settings[keywordList].push(keyword);
    await saveSettings({ [keywordList]: settings[keywordList] });
    renderKeywords(type, settings[keywordList]);
  }
  
  input.value = '';
}

/**
 * Remove keyword from list
 */
async function removeKeyword(keyword, type) {
  const result = await chrome.storage.sync.get(['focusSettings']);
  const settings = result.focusSettings || DEFAULT_SETTINGS;
  const keywordList = type === 'allowed' ? 'allowedKeywords' : 'blockedKeywords';
  
  settings[keywordList] = settings[keywordList].filter(k => k !== keyword);
  await saveSettings({ [keywordList]: settings[keywordList] });
  renderKeywords(type, settings[keywordList]);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Focus mode toggle
  focusModeToggle.addEventListener('change', async (e) => {
    await saveSettings({ focusModeEnabled: e.target.checked });
  });
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
    });
  });
  
  // Add keywords
  document.getElementById('addAllowed').addEventListener('click', () => addKeyword('allowed'));
  document.getElementById('addBlocked').addEventListener('click', () => addKeyword('blocked'));
  
  // Enter key for inputs
  allowedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword('allowed');
  });
  blockedInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addKeyword('blocked');
  });
  
  // Remove keywords (event delegation)
  allowedList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      removeKeyword(e.target.dataset.keyword, 'allowed');
    }
  });
  blockedList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      removeKeyword(e.target.dataset.keyword, 'blocked');
    }
  });
  
  // Timer controls
  startTimerBtn.addEventListener('click', toggleTimer);
  resetTimerBtn.addEventListener('click', resetTimer);
  
  // Timer presets
  document.querySelectorAll('.preset').forEach(preset => {
    preset.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
      timerSeconds = parseInt(preset.dataset.time) * 60;
      updateTimerDisplay();
      if (isTimerRunning) {
        stopTimer();
      }
    });
  });
  
  // Reset stats
  document.getElementById('resetStats').addEventListener('click', async () => {
    if (confirm('Reset all daily stats?')) {
      await saveSettings({
        stats: {
          educationalMinutes: 0,
          blockedCount: 0,
          focusStreak: 0,
          lastActiveDate: new Date().toDateString()
        }
      });
      updateStatsDisplay({ educationalMinutes: 0, blockedCount: 0, focusStreak: 0 });
    }
  });
}

/**
 * Timer functions
 */
function toggleTimer() {
  if (isTimerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  isTimerRunning = true;
  startTimerBtn.textContent = 'Pause';
  
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    
    if (timerSeconds <= 0) {
      stopTimer();
      chrome.runtime.sendMessage({ type: 'TIMER_COMPLETE' });
      timerSeconds = 25 * 60;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  isTimerRunning = false;
  startTimerBtn.textContent = 'Start';
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  const activePreset = document.querySelector('.preset.active');
  timerSeconds = activePreset ? parseInt(activePreset.dataset.time) * 60 : 25 * 60;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
