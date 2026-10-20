(function () {
  'use strict';
  try {
    var W = window;
    var D = document;
    if (typeof W.__rkForceMode === 'undefined') W.__rkForceMode = null;

    var viewport = D.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = D.createElement('meta');
      viewport.name = 'viewport';
      (D.head || D.documentElement).appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width,initial-scale=1,viewport-fit=cover');

    var styleId = 'rk-phone-layout-v14';
    var style = D.getElementById(styleId);
    if (!style) {
      style = D.createElement('style');
      style.id = styleId;
      (D.head || D.documentElement).appendChild(style);
    }
    style.textContent =
      'body.rk-phone-list #side,body.rk-phone-list .rk-phone-side-pane{' +
        'display:flex!important;flex:1 1 100%!important;width:100%!important;' +
        'max-width:100%!important;min-width:0!important;}' +
      'body.rk-phone-list #main,body.rk-phone-list .rk-phone-main-pane{display:none!important;}' +
      'body.rk-phone-chat #side,body.rk-phone-panel #side,' +
      'body.rk-phone-chat .rk-phone-side-pane,body.rk-phone-panel .rk-phone-side-pane{display:none!important;}' +
      'body.rk-phone-chat #main,body.rk-phone-panel #main,' +
      'body.rk-phone-chat .rk-phone-main-pane,body.rk-phone-panel .rk-phone-main-pane{' +
        'display:flex!important;flex:1 1 100%!important;width:100%!important;' +
        'max-width:100%!important;min-width:0!important;}' +
      'body.rk-phone-list #app,body.rk-phone-chat #app,body.rk-phone-panel #app{overflow:hidden!important;}' +
      '#main footer [contenteditable=true],#main [data-testid="conversation-compose-box-input"]{font-size:16px!important;}';

    function getPanes() {
      var side = D.querySelector('#side') || D.querySelector('#pane-side') || D.querySelector('[data-testid="chat-list"]');
      var main = D.querySelector('#main') || D.querySelector('[data-testid="conversation-panel-wrapper"]');
      if (side) side.classList.add('rk-phone-side-pane');
      if (main) main.classList.add('rk-phone-main-pane');
      return { side: side, main: main };
    }

    function isNarrowPhone() {
      var viewportWidth = W.innerWidth || 9999;
      var documentWidth = (D.documentElement && D.documentElement.clientWidth) || 9999;
      var screenWidth = (W.screen && W.screen.width) || 9999;
      var screenHeight = (W.screen && W.screen.height) || 9999;
      return Math.min(viewportWidth, documentWidth, screenWidth, screenHeight) <= 760;
    }

    function inferMode() {
      var panes = getPanes();
      var main = panes.main;
      if (!main) return 'list';
      var text = (main.innerText || '').toLowerCase().slice(0, 2600);
      var intro = !!main.querySelector('#intro,[data-testid="intro"],[data-testid*="intro"]') ||
        /select a chat to start messaging|pilih chat untuk mulai mengirim pesan|start a conversation|mulai percakapan/.test(text);
      var composer = !!main.querySelector('footer [contenteditable="true"],[data-testid="conversation-compose-box-input"],[data-tab="10"][contenteditable="true"]');
      var header = !!main.querySelector('[data-testid="conversation-panel-header"],[data-testid="conversation-header"],[data-testid="conversation-info-header"]');
      var messages = !!main.querySelector('[data-testid="conversation-panel-body"],[data-testid="conversation-panel-messages"],[data-testid="conversation-panel-wrapper"]');
      var special = !!main.querySelector('[data-testid*="status-v3-viewer"],[data-testid*="media-viewer"],[data-testid*="status-viewer"],[data-testid*="settings-view"],[data-testid*="settings-main"]');
      var empty = !(main.innerText || '').trim() && !main.querySelector('video,canvas,[role="dialog"]');
      if (special) return 'panel';
      if (!intro && (composer || header || messages)) return 'chat';
      if (intro || empty) return 'list';
      return 'panel';
    }

    function syncMode() {
      try {
        var body = D.body;
        var panes = getPanes();
        if (!body) return;
        if (!isNarrowPhone() || !panes.side || !panes.main) {
          body.classList.remove('rk-phone-list', 'rk-phone-chat', 'rk-phone-panel');
          return;
        }
        // Forced mode lasts until a user action changes it. This avoids the observer
        // snapping back to the previously selected desktop pane one second later.
        var mode = W.__rkForceMode || inferMode();
        body.classList.toggle('rk-phone-list', mode === 'list');
        body.classList.toggle('rk-phone-chat', mode === 'chat');
        body.classList.toggle('rk-phone-panel', mode === 'panel');
      } catch (ignore) { }
    }

    W.__rkPhoneSync = syncMode;
    W.__rkReturnToList = function () {
      try {
        var body = D.body;
        if (!body || W.__rkForceMode === 'list') return false;
        var currentIsPanel = body.classList.contains('rk-phone-chat') || body.classList.contains('rk-phone-panel') ||
          W.__rkForceMode === 'chat' || W.__rkForceMode === 'panel' || inferMode() !== 'list';
        if (!currentIsPanel) return false;
        W.__rkForceMode = 'list';
        syncMode();
        return true;
      } catch (ignore) { return false; }
    };

    function closestRow(target, sidePane) {
      if (!target || !target.closest) return null;
      var row = target.closest(
        '#side [data-testid*="cell-frame-container"],' +
        '#side [data-testid*="chat-list-item"],' +
        '#side [data-testid*="cell-frame"],' +
        '#side [role="row"],#side [role="listitem"],' +
        '#pane-side [data-testid*="cell-frame-container"],' +
        '#pane-side [role="row"],#pane-side [role="listitem"],' +
        '[data-testid="chat-list"] [data-testid*="cell-frame-container"],' +
        '[data-testid="chat-list"] [role="row"],[data-testid="chat-list"] [role="listitem"]'
      );
      if (row) return row;

      // Fallback for WhatsApp Web builds that rename their chat-row test IDs:
      // taps in the actual list area count as a chat selection, but search/header
      // controls and buttons are excluded so they do not unexpectedly open a pane.
      if (sidePane) {
        var blocked = target.closest('input,textarea,[contenteditable="true"],header,button,' +
          '[role="button"],[data-testid*="search"],[data-testid*="filter"],[data-testid*="menu"],' +
          '[aria-label*="Search"],[aria-label*="search"]');
        if (blocked) return null;
        var paneRect = sidePane.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        var relativeY = targetRect.top + (targetRect.height / 2) - paneRect.top;
        if (relativeY > Math.min(125, paneRect.height * 0.24)) {
          return target.closest('[tabindex="0"]') || target.closest('[role="listitem"]') || target;
        }
      }
      return null;
    }

    if (!W.__rkPhoneClickHook) {
      W.__rkPhoneClickHook = true;
      D.addEventListener('click', function (event) {
        try {
          var target = event.target;
          if (target && target.nodeType !== 1) target = target.parentElement;
          if (!target || !target.closest) return;
          var panes = getPanes();
          if (!panes.side || !panes.side.contains(target)) return;

          var row = closestRow(target, panes.side);
          if (row) {
            var rowInfo = ((row.innerText || '') + ' ' + (row.getAttribute('aria-label') || '') + ' ' +
              (row.getAttribute('data-testid') || '')).toLowerCase();
            W.__rkForceMode = (rowInfo.indexOf('status') >= 0 || rowInfo.indexOf('update') >= 0) ? 'panel' : 'chat';
          } else {
            // Keep the list visible while the user focuses search or other list controls.
            // Do not let old conversation DOM force the old chat back on-screen.
            var navigation = target.closest('[data-testid*="status"],[aria-label*="Status"],[aria-label*="Updates"],[data-testid*="settings"]');
            if (navigation) W.__rkForceMode = 'panel';
            else if (W.__rkForceMode !== 'list') W.__rkForceMode = null;
          }
          // Delay the visual switch so WhatsApp's own click handler processes the tap first.
          W.setTimeout(syncMode, 160);
          W.setTimeout(syncMode, 420);
          W.setTimeout(syncMode, 850);
        } catch (ignore) { }
      }, true);
      W.addEventListener('resize', function () { W.setTimeout(syncMode, 120); });
    }

    if (!W.__rkPhoneObserver && D.body) {
      W.__rkPhoneObserver = new MutationObserver(function () {
        if (W.__rkPhoneTimer) W.clearTimeout(W.__rkPhoneTimer);
        W.__rkPhoneTimer = W.setTimeout(syncMode, 180);
      });
      // Child changes only; observing every style/class attribute is too noisy for a chat UI.
      W.__rkPhoneObserver.observe(D.body, { childList: true, subtree: true });
    }

    syncMode();
    if (W.__rkPhoneResync) W.clearInterval(W.__rkPhoneResync);
    W.__rkPhoneResync = W.setInterval(syncMode, 700);
    return 'ok';
  } catch (ignore) {
    return 'ignored';
  }
})();
