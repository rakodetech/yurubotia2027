/**
 * OESVICA Chatbot Embeddable Widget
 * Universal script for embedding the Worker Self-Service Chatbot on any website.
 *
 * Usage:
 * <script type="text/javascript">
 *   (function(d, t) {
 *     var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
 *     v.onload = function() {
 *       window.oesvicaChat.load({
 *         serverUrl: 'https://tu-servidor-oesvica.com',
 *         title: 'Atención al Trabajador OESVICA',
 *         position: 'right'
 *       });
 *     };
 *     v.src = 'https://tu-servidor-oesvica.com/interface/widget.js';
 *     v.type = 'text/javascript';
 *     s.parentNode.insertBefore(v, s);
 *   })(document, 'script');
 * </script>
 */

(function (window, document) {
  'use strict';

  // Prevent multiple initializations
  if (window.oesvicaChat && window.oesvicaChat.isLoaded) {
    return;
  }

  // Detect script source to automatically infer serverUrl
  var currentScript = document.currentScript;
  var inferredServerUrl = '';
  if (currentScript && currentScript.src) {
    try {
      var parsedUrl = new URL(currentScript.src);
      inferredServerUrl = parsedUrl.origin;
    } catch (e) {}
  }
  if (!inferredServerUrl && window.location.origin) {
    inferredServerUrl = window.location.origin;
  }

  var defaultConfig = {
    serverUrl: inferredServerUrl,
    title: 'Atención al Trabajador OESVICA',
    themeColor: '#2563eb',
    position: 'right', // 'right' or 'left'
    autoOpen: false,
    zIndex: 999999
  };

  var state = {
    isOpen: false,
    config: defaultConfig,
    containerEl: null,
    iframeEl: null,
    buttonEl: null
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
      '  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(37, 99, 235, 0.3);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;',
      '  user-select: none;',
      '}',
      '#oesvica-widget-btn:hover {',
      '  transform: scale(1.06);',
      '  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.32), 0 3px 8px rgba(37, 99, 235, 0.4);',
      '}',
      '#oesvica-widget-btn:active {',
      '  transform: scale(0.95);',
      '}',
      '#oesvica-widget-badge {',
      '  position: absolute;',
      '  top: -3px;',
      '  right: -3px;',
      '  background: #10b981;',
      '  width: 14px;',
      '  height: 14px;',
      '  border-radius: 50%;',
      '  border: 2px solid #ffffff;',
      '}',
      '#oesvica-widget-iframe-container {',
      '  position: fixed;',
      '  ' + (config.position === 'left' ? 'left: 20px;' : 'right: 20px;') + '',
      '  bottom: 92px;',
      '  width: 420px;',
      '  max-width: calc(100vw - 40px);',
      '  height: 680px;',
      '  max-height: calc(100vh - 120px);',
      '  background: #0f172a;',
      '  border-radius: 20px;',
      '  overflow: hidden;',
      '  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 2px 10px rgba(0, 0, 0, 0.15);',
      '  border: 1px solid rgba(255, 255, 255, 0.1);',
      '  transform-origin: ' + (config.position === 'left' ? 'bottom left' : 'bottom right') + ';',
      '  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;',
      '  z-index: ' + config.zIndex + ';',
      '}',
      '#oesvica-widget-iframe-container.oesvica-hidden {',
      '  opacity: 0;',
      '  transform: scale(0.85) translateY(20px);',
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
      '  #oesvica-widget-iframe-container.oesvica-visible ~ #oesvica-widget-root #oesvica-widget-btn {',
      '    display: none;',
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
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '  <line x1="18" y1="6" x2="6" y2="18"></line>',
      '  <line x1="6" y1="6" x2="18" y2="18"></line>',
      '</svg>'
    ].join('');
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

    // Lazy load iframe src if not loaded yet
    if (state.iframeEl && !state.iframeEl.src) {
      var srcUrl = state.config.serverUrl;
      // Guarantee valid URL
      if (!srcUrl.startsWith('http://') && !srcUrl.startsWith('https://')) {
        srcUrl = 'https://' + srcUrl;
      }
      state.iframeEl.src = srcUrl;
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
    var config = Object.assign({}, defaultConfig, userConfig || {});
    state.config = config;

    // Inject styles
    injectStyles(config);

    // Root button element
    var rootEl = document.createElement('div');
    rootEl.id = 'oesvica-widget-root';

    var btnEl = document.createElement('button');
    btnEl.id = 'oesvica-widget-btn';
    btnEl.setAttribute('type', 'button');
    btnEl.setAttribute('aria-label', config.title || 'Abrir chatbot de atención al trabajador');
    btnEl.setAttribute('aria-expanded', 'false');
    btnEl.innerHTML = createLauncherIcon() + '<span id="oesvica-widget-badge"></span>';
    btnEl.addEventListener('click', toggleChat);
    rootEl.appendChild(btnEl);
    state.buttonEl = btnEl;

    // Iframe container
    var containerEl = document.createElement('div');
    containerEl.id = 'oesvica-widget-iframe-container';
    containerEl.className = 'oesvica-hidden';

    var iframeEl = document.createElement('iframe');
    iframeEl.id = 'oesvica-widget-iframe';
    iframeEl.title = config.title;
    iframeEl.allow = 'microphone; clipboard-write; autoplay';

    // Set server URL
    var srcUrl = config.serverUrl || inferredServerUrl;
    if (config.autoOpen) {
      iframeEl.src = srcUrl;
    }

    containerEl.appendChild(iframeEl);
    state.containerEl = containerEl;
    state.iframeEl = iframeEl;

    // Add to body
    document.body.appendChild(containerEl);
    document.body.appendChild(rootEl);

    if (config.autoOpen) {
      openChat();
    }

    window.oesvicaChat.isLoaded = true;
  }

  // Public API exposed on window
  window.oesvicaChat = {
    isLoaded: false,
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

})(window, document);
