/**
 * OESVICA Chatbot Embeddable Widget
 * Universal script for embedding the Worker Self-Service Chatbot on any website.
 * Supports 1-line script tag auto-initialization and programmatic API (voiceflow/intercom style).
 */

(function (window, document) {
  'use strict';

  // Prevent multiple initializations
  if (window.oesvicaChat && window.oesvicaChat.isLoaded) {
    return;
  }

  // Helper to locate the script tag that loaded this file
  function findScriptTag() {
    if (document.currentScript) {
      return document.currentScript;
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && (s.src.indexOf('widget.js') !== -1 || s.getAttribute('data-oesvica-widget') !== null)) {
        return s;
      }
    }
    return null;
  }

  var scriptEl = findScriptTag();
  var detectedServerUrl = '';

  // 1. Detect server URL from script tag src or data-server-url
  if (scriptEl) {
    if (scriptEl.getAttribute('data-server-url')) {
      detectedServerUrl = scriptEl.getAttribute('data-server-url');
    } else if (scriptEl.src) {
      try {
        var parsedUrl = new URL(scriptEl.src);
        detectedServerUrl = parsedUrl.origin;
      } catch (e) {
        // Fallback for older browsers
        var match = scriptEl.src.match(/^(https?:\/\/[^\/]+)/i);
        if (match) detectedServerUrl = match[1];
      }
    }
  }

  // 2. Fallback to global config or window.location.origin
  if (!detectedServerUrl && window.oesvicaChatConfig && window.oesvicaChatConfig.serverUrl) {
    detectedServerUrl = window.oesvicaChatConfig.serverUrl;
  }
  if (!detectedServerUrl && typeof window !== 'undefined' && window.location && window.location.origin) {
    detectedServerUrl = window.location.origin;
  }

  var defaultConfig = {
    serverUrl: detectedServerUrl,
    title: 'Atención al Trabajador OESVICA',
    themeColor: '#2563eb',
    position: 'right', // 'right' | 'left'
    autoOpen: false,
    zIndex: 999999
  };

  var state = {
    isOpen: false,
    config: defaultConfig,
    containerEl: null,
    iframeEl: null,
    buttonEl: null,
    isInitialized: false
  };

  function injectStyles(config) {
    if (document.getElementById('oesvica-widget-styles')) return;

    var styleEl = document.createElement('style');
    styleEl.id = 'oesvica-widget-styles';
    styleEl.innerHTML = [
      '#oesvica-widget-root {',
      '  position: fixed;',
      '  ' + (config.position === 'left' ? 'left: 20px;' : 'right: 20px;') + '',
      '  bottom: 20px;',
      '  z-index: ' + config.zIndex + ';',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
      '  box-sizing: border-box;',
      '}',
      '#oesvica-widget-root * { box-sizing: border-box; }',
      '#oesvica-widget-btn {',
      '  width: 60px;',
      '  height: 60px;',
      '  border-radius: 50%;',
      '  background: linear-gradient(135deg, ' + config.themeColor + ' 0%, #1d4ed8 100%);',
      '  color: #ffffff;',
      '  border: none;',
      '  outline: none;',
      '  cursor: pointer;',
      '  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(37, 99, 235, 0.4);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;',
      '  user-select: none;',
      '}',
      '#oesvica-widget-btn:hover {',
      '  transform: scale(1.08);',
      '  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35), 0 3px 10px rgba(37, 99, 235, 0.5);',
      '}',
      '#oesvica-widget-btn:active {',
      '  transform: scale(0.94);',
      '}',
      '#oesvica-widget-badge {',
      '  position: absolute;',
      '  top: 1px;',
      '  right: 1px;',
      '  background: #10b981;',
      '  width: 14px;',
      '  height: 14px;',
      '  border-radius: 50%;',
      '  border: 2px solid #ffffff;',
      '  box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);',
      '}',
      '#oesvica-widget-iframe-container {',
      '  position: fixed;',
      '  ' + (config.position === 'left' ? 'left: 20px;' : 'right: 20px;') + '',
      '  bottom: 92px;',
      '  width: 430px;',
      '  max-width: calc(100vw - 32px);',
      '  height: 700px;',
      '  max-height: calc(100vh - 110px);',
      '  background: #0f172a;',
      '  border-radius: 20px;',
      '  overflow: hidden;',
      '  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 4px 14px rgba(0, 0, 0, 0.2);',
      '  border: 1px solid rgba(255, 255, 255, 0.12);',
      '  transform-origin: ' + (config.position === 'left' ? 'bottom left' : 'bottom right') + ';',
      '  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;',
      '  z-index: ' + config.zIndex + ';',
      '}',
      '#oesvica-widget-iframe-container.oesvica-hidden {',
      '  opacity: 0;',
      '  transform: scale(0.9) translateY(20px);',
      '  visibility: hidden;',
      '  pointer-events: none;',
      '}',
      '#oesvica-widget-iframe-container.oesvica-visible {',
      '  opacity: 1;',
      '  transform: scale(1) translateY(0);',
      '  visibility: visible;',
      '  pointer-events: auto;',
      '}',
      '#oesvica-widget-iframe {',
      '  width: 100%;',
      '  height: 100%;',
      '  border: none;',
      '  display: block;',
      '  background: #0f172a;',
      '}',
      '@media (max-width: 480px) {',
      '  #oesvica-widget-iframe-container {',
      '    ' + (config.position === 'left' ? 'left: 0;' : 'right: 0;') + '',
      '    bottom: 0;',
      '    width: 100vw;',
      '    max-width: 100vw;',
      '    height: 100vh;',
      '    max-height: 100vh;',
      '    border-radius: 0;',
      '    border: none;',
      '  }',
      '}'
    ].join('\n');

    document.head.appendChild(styleEl);
  }

  function createLauncherIcon() {
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
      '  <path d="M8 9h8"></path>',
      '  <path d="M8 13h5"></path>',
      '</svg>'
    ].join('');
  }

  function createCloseIcon() {
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
      '  <line x1="18" y1="6" x2="6" y2="18"></line>',
      '  <line x1="6" y1="6" x2="18" y2="18"></line>',
      '</svg>'
    ].join('');
  }

  function buildIframeUrl(serverUrl) {
    var rawUrl = (serverUrl || detectedServerUrl || '').trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }
    // Remove trailing slash
    rawUrl = rawUrl.replace(/\/+$/, '');
    // Append embed parameter
    var separator = rawUrl.indexOf('?') === -1 ? '?' : '&';
    return rawUrl + separator + 'embed=true';
  }

  function toggleChat() {
    if (state.isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    if (!state.containerEl) return;
    state.isOpen = true;
    state.containerEl.className = 'oesvica-visible';
    state.buttonEl.innerHTML = createCloseIcon() + '<span id="oesvica-widget-badge"></span>';
    state.buttonEl.setAttribute('aria-expanded', 'true');

    if (state.iframeEl && !state.iframeEl.src) {
      state.iframeEl.src = buildIframeUrl(state.config.serverUrl);
    }
  }

  function closeChat() {
    if (!state.containerEl) return;
    state.isOpen = false;
    state.containerEl.className = 'oesvica-hidden';
    state.buttonEl.innerHTML = createLauncherIcon() + '<span id="oesvica-widget-badge"></span>';
    state.buttonEl.setAttribute('aria-expanded', 'false');
  }

  function init(userConfig) {
    if (state.isInitialized) return;

    var config = Object.assign({}, defaultConfig, userConfig || {});
    // If user provided a serverUrl, make sure it is respected
    if (userConfig && userConfig.serverUrl) {
      config.serverUrl = userConfig.serverUrl;
    } else if (!config.serverUrl) {
      config.serverUrl = detectedServerUrl;
    }

    state.config = config;

    injectStyles(config);

    var rootEl = document.createElement('div');
    rootEl.id = 'oesvica-widget-root';

    var btnEl = document.createElement('button');
    btnEl.id = 'oesvica-widget-btn';
    btnEl.setAttribute('type', 'button');
    btnEl.setAttribute('aria-label', config.title || 'Abrir chatbot de atención al trabajador OESVICA');
    btnEl.setAttribute('aria-expanded', 'false');
    btnEl.innerHTML = createLauncherIcon() + '<span id="oesvica-widget-badge"></span>';
    btnEl.addEventListener('click', toggleChat);
    rootEl.appendChild(btnEl);
    state.buttonEl = btnEl;

    var containerEl = document.createElement('div');
    containerEl.id = 'oesvica-widget-iframe-container';
    containerEl.className = 'oesvica-hidden';

    var iframeEl = document.createElement('iframe');
    iframeEl.id = 'oesvica-widget-iframe';
    iframeEl.title = config.title;
    iframeEl.allow = 'microphone; clipboard-write; autoplay; speaker';
    iframeEl.setAttribute('loading', 'lazy');

    if (config.autoOpen) {
      iframeEl.src = buildIframeUrl(config.serverUrl);
    }

    containerEl.appendChild(iframeEl);
    state.containerEl = containerEl;
    state.iframeEl = iframeEl;

    document.body.appendChild(containerEl);
    document.body.appendChild(rootEl);

    state.isInitialized = true;
    window.oesvicaChat.isLoaded = true;

    if (config.autoOpen) {
      openChat();
    }
  }

  // Public API
  window.oesvicaChat = {
    isLoaded: false,
    serverUrl: detectedServerUrl,
    load: function (opts) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          init(opts);
        });
      } else {
        init(opts);
      }
    },
    open: openChat,
    close: closeChat,
    toggle: toggleChat
  };

  // Auto-initialization unless explicitly disabled with data-manual="true"
  var isManual = false;
  if (scriptEl) {
    var manualAttr = scriptEl.getAttribute('data-manual');
    if (manualAttr === 'true' || manualAttr === '1') {
      isManual = true;
    }
  }
  if (window.oesvicaChatConfig && window.oesvicaChatConfig.manual) {
    isManual = true;
  }

  if (!isManual) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        init(window.oesvicaChatConfig || {});
      });
    } else {
      init(window.oesvicaChatConfig || {});
    }
  }

})(window, document);
