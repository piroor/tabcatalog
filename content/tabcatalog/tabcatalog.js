var TabCatalog = { 
	PREFROOT : 'extensions.{049952B3-A745-43bd-8D26-D1349B1ED944}',
	
/* Utilities */ 
	
/* elements */ 
	
	get button() { 
		return document.getElementById('tabcatalog-button');
	},
 
	get catalog() { 
		return document.getElementById('tabcatalog-thumbnail-container');
	},
 
	get background() { 
		return document.getElementById('tabcatalog-background');
	},
	get backgroundBackup() {
		return document.getElementById('tabcatalog-background-backup');
	},
 
	get bgCanvas() { 
		if (!this._bgCanvas) {
			this._bgCanvas = document.getElementById('tabcatalog-background-canvas');
			this._bgCanvas.appendChild(document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'));
		}
		return this._bgCanvas;
	},
	_bgCanvas : null,
 
	get tabContextMenu() { 
		if (!this.mTabContextMenu) {
			var id = gBrowser.mStrip.getAttribute('context');
			var popup = (id == '_child') ? gBrowser.mStrip.getElementsByTagNameNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menupopup')[0] : document.getELementById(id) ;
			this.mTabContextMenu = popup;

			popup.appendChild(document.createElement('menuseparator'));
			popup.lastChild.setAttribute('class', 'tabcatalog-tabcontextmenu-separator');
			var sep = popup.lastChild;
			var range = document.createRange();
			range.selectNodeContents(this.tabSelectPopupMenu);
			popup.appendChild(range.cloneContents());
			range.detach();
			var tabcatalogItems = [];
			tabcatalogItems.push(sep);
			while (sep.nextSibling) {
				tabcatalogItems.push(sep.nextSibling);
				sep = sep.nextSibling;
				if (sep.getAttribute('oncommand'))
					eval('sep.addEventListener("command", function(event) { ' + sep.getAttribute('oncommand') + '; }, false);');
			}

			popup.addEventListener('popupshowing', function(aEvent) {
				TabCatalog.contextMenuShwon = true;
				var selectedTabItems = TabCatalog.getSelectedTabItems();
				for (var i = 0; i < tabcatalogItems.length; i++) {
					tabcatalogItems[i].hidden = !TabCatalog.shown;
					if (tabcatalogItems[i].getAttribute("for-multiple-selected") == "true") {
						if (selectedTabItems.snapshotLength < 2)
							tabcatalogItems[i].setAttribute('disabled', true);
						else
							tabcatalogItems[i].removeAttribute('disabled');
					}
				}
			}, false);

			popup.addEventListener('popuphidden', function(aEvent) {
				TabCatalog.contextMenuShwon = false;
				if (TabCatalog.shown)
					TabCatalog.updateUI();
			}, false);
		}
		return this.mTabContextMenu;
	},
	mTabContextMenu : null,
	get tabSelectPopupMenu() {
		if (!this._tabSelectPopupMenu) {
			this._tabSelectPopupMenu = document.getElementById('tabcatalog-tabselect-menu');
		}
		return this._tabSelectPopupMenu;
	},
	_tabSelectPopupMenu : null,
 
	get tabs() { 
		return gBrowser.mTabContainer.childNodes;
	},
  
/* state */ 
	
	get backgroundShown() { 
		return this.background.getAttribute('catalog-shown') == 'true';
	},
	set backgroundShown(val) {
		if (val == this.backgroundShown) return this.backgroundShown;

		if (val) {
			if (this.getPref('extensions.tabcatalog.rendering_quality') > 1) {
				var b = gBrowser.getBrowserForTab(gBrowser.selectedTab);
				var w = b.contentWindow;

				var cache  = this.bgCanvas.firstChild;
				cache.style.position = 'fixed';
				cache.style.left  = b.boxObject.x+'px';
				cache.style.top   = b.boxObject.y+'px';
				cache.style.width  = w.innerWidth+'px';
				cache.style.height = w.innerHeight+'px';
				cache.width  = w.innerWidth;
				cache.height = w.innerHeight;
				try {
					var ctx = cache.getContext("2d");
					ctx.clearRect(0, 0, w.innerWidth, w.innerHeight);
					ctx.save();
					ctx.drawWindow(w, w.scrollX, w.scrollY, w.innerWidth, w.innerHeight, "rgb(255,255,255)");
					ctx.restore();
				}
				catch(e) {
					dump('TabCatalog Error: ' + e.message + '\n');
				}
				cache.style.zIndex = 65000;
				this.bgCanvas.setAttribute('catalog-shown', true);
			}

			this.background.style.width  = this.backgroundBackup.style.width  = (window.innerWidth * 2)+'px';
			this.background.style.height = this.backgroundBackup.style.height = (window.innerHeight * 2)+'px';
			this.background.style.zIndex = this.backgroundBackup.style.zIndex = 65050;
			this.background.setAttribute('catalog-shown', true);
		}
		else {
			this.background.removeAttribute('catalog-shown');
			this.bgCanvas.removeAttribute('catalog-shown');
		}
		return this.backgroundShown;
	},
 
	get shown() { 
		return this.catalog.getAttribute('catalog-shown') == 'true';
	},
	set shown(val) {
		if (val) {
			this.backgroundShown = true;
			this.catalog.setAttribute('catalog-shown', true);
		}
		else {
			this.backgroundShown = false;
			this.catalog.removeAttribute('catalog-shown');
		}
		return this.shown;
	},
 
	get padding() { 
		if (this._padding < 0) {
			var style = window.getComputedStyle(document.getElementById('tabcatalog-padding-size-box'), null);
			this._padding = Math.max(
				parseInt(style.minWidth.match(/[0-9]+/) || 0),
				parseInt(style.maxWidth.match(/[0-9]+/) || 0),
				parseInt(style.width.match(/[0-9]+/) || 0)
			);
		}
		return this._padding;
	},
	_padding : -1,
	get header() {
		if (this._header < 0) {
			var style = window.getComputedStyle(document.getElementById('tabcatalog-header-size-box'), null);
			this._header = Math.max(
				parseInt(style.minWidth.match(/[0-9]+/) || 0),
				parseInt(style.maxWidth.match(/[0-9]+/) || 0),
				parseInt(style.width.match(/[0-9]+/) || 0)
			);
		}
		return this.getPref('extensions.tabcatalog.thumbnail.header') ? this._header : 0 ;
	},
	_header : -1,
	get shortcut() {
		if (!this._shortcut) {
			this._shortcut = TabCatalog_parseShortcut(this.getPref('extensions.tabcatalog.shortcut'));
		}
		return this._shortcut;
	},
	set shortcut(val) {
		this._shortcut = null;
		return this.shortcut;
	},
	_shortcut : null,
  
/* get items */ 
	
	getItems : function() 
	{
		if (!this.shown) return [];
		return this.catalog.parentNode.getElementsByAttribute('class', 'tabcatalog-thumbnail');
	},
 
	getFocusedItem : function(aPreventFallback) 
	{
		if (!this.shown) return null;

		var focused = this.catalog.parentNode.getElementsByAttribute('focused', 'true');
		if (!focused.length) {
			if (aPreventFallback) return null;
			focused = this.catalog.parentNode.getElementsByAttribute('selected', 'true');
		}

		return focused[0];
	},
 
	getSelectedTabItems : function() 
	{
		try {
			var xpathResult = document.evaluate(
					'descendant::*[@class and @class = "tabcatalog-thumbnail" and @selected = "true"]',
					this.catalog,
					document.createNSResolver(document.documentElement),
					XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
					null
				);
		}
		catch(e) {
			return { snapshotLength : 0 };
		}
		return xpathResult;
	},
 
	getTabFromThumbnailItem : function(aItem) 
	{
		return this.tabs[parseInt(aItem.getAttribute('tabIndex'))];
	},
 
	getActiveItemFromEvent : function(aEvent) 
	{
		var target;
		try {
			target = aEvent.originalTarget;
		}
		catch(e) {
		}
		if (!target) target = aEvent.target;

		try {
			var xpathResult = document.evaluate(
					'ancestor-or-self::*[@class and @class = "tabcatalog-thumbnail"]',
					target,
					document.createNSResolver(document.documentElement),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
  
/* check */ 
	
	isEventFiredInMenu : function(aEvent) 
	{
		try {
			var xpathResult = document.evaluate(
					'ancestor-or-self::*[local-name() = "menuitem"]',
					aEvent.originalTarget,
					document.createNSResolver(document.documentElement),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return false;
		}
		return xpathResult.singleNodeValue ? true : false ;
	},
 
	isEventFiredOnTabBar : function(aEvent) 
	{
		var node;
		try {
			node = aEvent.originalTarget;
		}
		catch(e) {
		}
		if (!node) node = aEvent.target;

		var tabContainer = gBrowser.mTabContainer;
		var catalog      = this.catalog;
		while (node && node != tabContainer && node != catalog)
			node = node.parentNode;

		return (node == tabContainer || node == catalog);
	},
 
	isKeyEventFiredInTextFields : function(aEvent) 
	{
		try { // in rich-textarea (ex. Gmail)
			var doc = Components.lookupMethod(aEvent.originalTarget, 'ownerDocument').call(aEvent.originalTarget);
			if (Components.lookupMethod(doc, 'designMode').call(doc) == 'on')
				return true;
		}
		catch(error) {
		}
		return /^(input|textarea|textbox|select)$/i.test(Components.lookupMethod(aEvent.originalTarget, 'localName').call(aEvent.originalTarget)) ? true : false ;
	},
 
	isKeyShowhide : function(aEvent) 
	{
		var shortcut = this.shortcut;
		return (
				(shortcut.keyCode && aEvent.keyCode==Components.interfaces.nsIDOMKeyEvent['DOM_'+shortcut.keyCode]) ||
				(shortcut.charCode && aEvent.charCode==shortcut.charCode)
			) &&
			shortcut.shiftKey == aEvent.shiftKey &&
			shortcut.altKey == aEvent.altKey &&
			shortcut.ctrlKey == aEvent.ctrlKey &&
			shortcut.metaKey == aEvent.metaKey;
	},
 
	isDisabled : function() 
	{
		return (document.getElementById('cmd_CustomizeToolbars').getAttribute('disabled') == 'true');
	},
  
	showPopupMenu : function(aEvent, aPopupMenu) 
	{
		var node = this.getActiveItemFromEvent(aEvent);
		if (node) {
			var index = parseInt(node.getAttribute('tabIndex'));
			document.popupNode = gBrowser.mTabContainer.childNodes[index];
		}
		else {
			node = this.catalog;
			document.popupNode = gBrowser.mTabContainer;
		}

		aPopupMenu.hidePopup();
		aPopupMenu.showPopup(
			node,
			aEvent.screenX-document.documentElement.boxObject.screenX,
			aEvent.screenY-document.documentElement.boxObject.screenY,
			'popup'
		);
	},
	contextMenuShwon : false,
 
	fillInTooltip : function(aNode) 
	{
		aNode = this.getActiveItemFromEvent({ target : aNode });
		if (!aNode) return false;

		var tooltip = document.getElementById('tabcatalog-tooltip');


		var title = aNode.getAttribute('title');
		if (title) {
			tooltip.firstChild.firstChild.removeAttribute('hidden');
			tooltip.firstChild.firstChild.setAttribute('value', title);
		}
		else
			tooltip.firstChild.firstChild.setAttribute('hidden', true);


		var uri = aNode.getAttribute('uri');
		uri = (uri == 'about:blank') ? '' : uri ;
		if (uri) {
			tooltip.firstChild.lastChild.removeAttribute('hidden');
			tooltip.firstChild.lastChild.setAttribute('value', uri);
		}
		else
			tooltip.firstChild.lastChild.setAttribute('hidden', true);


		return (title || uri) ? true : false ;
	},
  
/* Initializing */ 
	
	init : function() 
	{
		if (!('gBrowser' in window)) return;


		window.addEventListener('keydown',   this.onKeyDown,    true);
		window.addEventListener('keyup',     this.onKeyRelease, true);
		window.addEventListener('keypress',  this.onKeyRelease, true);
		window.addEventListener('mousedown', this.onMouseDown,  true);
		window.addEventListener('mouseup',   this.onMouseUp,    true);

		gBrowser.addEventListener('mouseover', this.onTabBarMouseOver, true);
		gBrowser.addEventListener('mouseout',  this.onTabBarMouseOut,  true);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing',  this.cancelContextMenu,  true);

		this.addPrefListener(gTabCatalogPrefListener);
		gTabCatalogPrefListener.observe(null, 'nsPref:changed', 'extensions.tabcatalog.override.allinonegest');
		gTabCatalogPrefListener.observe(null, 'nsPref:changed', 'extensions.tabcatalog.shortcut');
		gTabCatalogPrefListener.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.header');
		gTabCatalogPrefListener.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.closebox');
		gTabCatalogPrefListener.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.shortcut');

		window.addEventListener('unload', function() { TabCatalog.destruct(); }, false);

		gBrowser.mTabContainer.addEventListener('select', this.onTabSelect, true);
		gBrowser.selectedTab.__tabcatalog__lastSelectedTime = (new Date()).getTime();

		var nullPointer = this.tabContextMenu;

		this.initialShow();
	},
	initialShow : function()
	{
		// show custom buttons only in the initial startup
		var bar = document.getElementById('nav-bar');
		if (bar && bar.currentSet) {
			var STRBUNDLE = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);
			var msg = STRBUNDLE.createBundle('chrome://tabcatalog/locale/tabcatalog.properties');

			var PromptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);

			var currentset = bar.currentSet;
			var buttons = currentset.replace(/__empty/, '').split(',');
			var initial = [
					'tabcatalog-button'
				];
			for (var i in initial)
			{
				if (!this.getPref(this.PREFROOT+'.initialshow.'+initial[i])) {
					if (currentset.indexOf(initial[i]) < 0)
						buttons.push(initial[i]);
					this.setPref(this.PREFROOT+'.initialshow.'+initial[i], true);
				}
			}
			currentset = bar.currentSet.replace(/__empty/, '');
			var newset = buttons.join(',');
			if (currentset != newset &&
				PromptService.confirmEx(
					window,
					msg.GetStringFromName('initialshow_confirm_title'),
					msg.GetStringFromName('initialshow_confirm_text'),
					(PromptService.BUTTON_TITLE_YES * PromptService.BUTTON_POS_0) +
					(PromptService.BUTTON_TITLE_NO  * PromptService.BUTTON_POS_1),
					null, null, null, null, {}
				) == 0) {
				bar.currentSet = newset;
				bar.setAttribute('currentset', newset);
				document.persist(bar.id, 'currentset');
			}
			if ('BrowserToolboxCustomizeDone' in window)
				BrowserToolboxCustomizeDone(true);
		}
	},
 
	destruct : function() 
	{
		window.removeEventListener('keydown',   this.onKeyDown,    true);
		window.removeEventListener('keyup',     this.onKeyRelease, true);
		window.removeEventListener('keypress',  this.onKeyRelease, true);
		window.removeEventListener('mousedown', this.onMouseDown,  true);
		window.removeEventListener('mouseup',   this.onMouseUp,    true);

		gBrowser.removeEventListener('mouseover', this.onTabBarMouseOver, true);
		gBrowser.removeEventListener('mouseout',  this.onTabBarMouseOut,  true);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing',  this.cancelContextMenu,  true);

		this.removePrefListener(gTabCatalogPrefListener);

		gBrowser.mTabContainer.removeEventListener('select', this.onTabSelect, true);
	},
  
/* Event Handling */ 
	
/* General */ 
	
	onMouseDown : function(aEvent) 
	{
		if (
			TabCatalog.shown &&
			aEvent.button != 1 &&
			!TabCatalog.isDisabled() &&
			!TabCatalog.getActiveItemFromEvent(aEvent) &&
			!TabCatalog.isEventFiredInMenu(aEvent)
			) {
			TabCatalog.hide();
		}
		else {
			if (
				TabCatalog.shown &&
				aEvent.button == 1
				) {
				TabCatalog.catalogPanning = true;
				TabCatalog.panStartX = aEvent.screenX;
				TabCatalog.panStartY = aEvent.screenY;
			}
			TabCatalog['button'+aEvent.button+'Pressed'] = true;
			window.setTimeout('TabCatalog.button'+aEvent.button+'Pressed = false;', TabCatalog.getPref('extensions.tabcatalog.bothclick.delay') * 2);
		}
	},
	button0Pressed : false,
	button1Pressed : false,
	button2Pressed : false,
 
	onMouseUp : function(aEvent) 
	{
		if (
			!TabCatalog.isDisabled() &&
			!TabCatalog.shown &&
			TabCatalog.getPref('extensions.tabcatalog.bothclick.enabled') &&
			TabCatalog.button0Pressed && TabCatalog.button2Pressed
			) {
			aEvent.preventDefault();
			aEvent.stopPropagation();
			TabCatalog.show(TabCatalog.CALLED_BY_BOTH_CLICK);
		}

		if (TabCatalog.shown && aEvent.button == 1) {
			TabCatalog.button1Pressed = false;
			TabCatalog.exitPanningScroll();
		}
		else
			window.setTimeout('TabCatalog.button'+aEvent.button+'Pressed = false;', TabCatalog.getPref('extensions.tabcatalog.bothclick.delay'));
	},
 
	onMouseOver : function(aEvent) 
	{
		if (this.catalogShowing ||
			this.catalogHiding ||
			this.catalogScrolling ||
			this.catalogPanning ||
			this.isDisabled())
			return;

		var node = this.getActiveItemFromEvent(aEvent);
		if (node == this.lastMouseOverThumbnail) return;
		this.lastMouseOverThumbnail = node;

		if (!node) return;

		var focusedNode = this.getFocusedItem(true);
		if (node != focusedNode) {
			if (focusedNode) {
				focusedNode.parentNode.removeAttribute('container-focused');
				focusedNode.removeAttribute('focused');
			}
			node.parentNode.setAttribute('container-focused', true);
			node.setAttribute('focused', true);
		}

		if (this.thumbnailDragging) {
			if (node.getAttribute('selected') == 'true')
				node.removeAttribute('selected');
			else
				node.setAttribute('selected', true);
		}
		else {
			if (this.callingAction == this.CALLED_BY_TABBAR)
				this.onTabBarMouseOver(aEvent);
			else
				this.onButtonMouseOver(aEvent);
		}
	},
	
	delayedOnMouseOver : function(aBase) 
	{
		this.delayedOnMouseOverTimer = null;

		if (this.catalog.hasChildNodes()) return;

		this.show(aBase);
	},
 
	cancelDelayedMouseOver : function() 
	{
		if (this.delayedOnMouseOverTimer) {
			window.clearTimeout(this.delayedOnMouseOverTimer);
			this.delayedOnMouseOverTimer = null;
		}
	},
  
	onMouseOut : function(aEvent) 
	{
		if (this.catalogShowing ||
			this.catalogHiding ||
			this.catalogScrolling ||
			this.catalogPanning ||
			this.isDisabled() ||
			this.thumbnailDragging)
			return;

		if (this.callingAction == this.CALLED_BY_TABBAR)
			this.onTabBarMouseOut(aEvent);
		else
			this.onButtonMouseOut(aEvent);
	},
	
	delayedOnMouseOut : function() 
	{
		if (TabCatalog.shown) return;

		this.hide();
		this.cancelDelayedMouseOut();
	},
 
	cancelDelayedMouseOut : function() 
	{
		if (this.delayedOnMouseOutTimer) {
			window.clearTimeout(this.delayedOnMouseOutTimer);
			this.delayedOnMouseOutTimer = null;
		}
	},
  
	onCancel : function(aEvent) 
	{
		if (aEvent.type == 'resize' && aEvent.target != document)
			return;

		TabCatalog.hide();
	},
 
	onTabSelect : function(aEvent) 
	{
		if (!TabCatalog.catalogShowing)
			gBrowser.selectedTab.__tabcatalog__lastSelectedTime = (new Date()).getTime();
	},
  
/* Key Events */ 
	
	onKeyDown : function(aEvent) 
	{
		if (TabCatalog.isDisabled()) return;

		var isCharCursorKeys = false;
		if (
			TabCatalog.tabs.length > 1 &&
			(
				(
					TabCatalog.getPref('extensions.tabcatalog.override.ctrltab') &&
					!aEvent.altKey &&
					(navigator.platform.match(/mac/i) ? aEvent.metaKey : aEvent.ctrlKey )
				) ||
				(
					TabCatalog.shown &&
					(
						aEvent.keyCode == aEvent.DOM_VK_PAGE_UP ||
						aEvent.keyCode == aEvent.DOM_VK_PAGE_DOWN ||

						aEvent.keyCode == aEvent.DOM_VK_HOME ||
						aEvent.keyCode == aEvent.DOM_VK_END ||

						aEvent.keyCode == aEvent.DOM_VK_ADD ||
						aEvent.keyCode == aEvent.DOM_VK_SUBTRACT ||

						aEvent.keyCode == aEvent.DOM_VK_RETURN ||
						aEvent.keyCode == aEvent.DOM_VK_ENTER ||

						aEvent.keyCode == aEvent.DOM_VK_LEFT ||
						aEvent.keyCode == aEvent.DOM_VK_RIGHT ||
						aEvent.keyCode == aEvent.DOM_VK_UP ||
						aEvent.keyCode == aEvent.DOM_VK_DOWN ||

						aEvent.keyCode == aEvent.DOM_VK_H ||
						aEvent.keyCode == aEvent.DOM_VK_J ||
						aEvent.keyCode == aEvent.DOM_VK_K ||
						aEvent.keyCode == aEvent.DOM_VK_L ||

						aEvent.keyCode == aEvent.DOM_VK_NUMPAD1 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD2 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD3 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD4 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD5 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD6 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD7 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD8 ||
						aEvent.keyCode == aEvent.DOM_VK_NUMPAD9 ||

						(
							isCharCursorKeys = !TabCatalog.thumbnailShortcutEnabled ?
								/^[\-\+hjkl123456789]$/i.test(String.fromCharCode(aEvent.charCode)) :
								(
									( // 0-9
										aEvent.keyCode >=  0x30 &&
										aEvent.keyCode <=  0x39
									) ||
									( // A-Z
										aEvent.keyCode >=  0x41 &&
										aEvent.keyCode <=  0x5A
									) ||
									( // 0-9
										aEvent.charCode >=  0x30 &&
										aEvent.charCode <=  0x39
									) ||
									( // A-Z (large)
										aEvent.charCode >=  0x41 &&
										aEvent.charCode <=  0x5A
									) ||
									( // a-z (small)
										aEvent.charCode >=  0x61 &&
										aEvent.charCode <=  0x7A
									) ||
									aEvent.charCode ==  0x2B || // +
									aEvent.charCode ==  0x2D // -
								)
						)
					)
				) ||
				(
					!TabCatalog.isKeyEventFiredInTextFields(aEvent) &&
					TabCatalog.isKeyShowhide(aEvent)
				)
			)
			) {
			if (TabCatalog.shown && isCharCursorKeys) {
				aEvent.preventDefault();
				aEvent.stopPropagation();
			}
		}
		else {
			TabCatalog.hide();
		}
	},
 
	onKeyRelease : function(aEvent) 
	{
		if (TabCatalog.isDisabled()) return;

		var keyChar;

		if (
			TabCatalog.shown &&
			aEvent.type == 'keypress' &&
			(
				aEvent.keyCode == aEvent.DOM_VK_RETURN ||
				aEvent.keyCode == aEvent.DOM_VK_ENTER ||
				(
					!TabCatalog.thumbnailShortcutEnabled &&
					String.fromCharCode(aEvent.charCode) == '5'
				)
			)
			) {
		}
		else if (!TabCatalog.isKeyEventFiredInTextFields(aEvent) &&
				TabCatalog.isKeyShowhide(aEvent)) {
			if (aEvent.type == 'keypress') {
				if (TabCatalog.shown)
					TabCatalog.hide();
				else
					TabCatalog.show(TabCatalog.CALLED_BY_HOTKEY);
			}
			return;
		}
		else if (TabCatalog.shown &&
			(
				aEvent.keyCode == aEvent.DOM_VK_PAGE_UP ||
				aEvent.keyCode == aEvent.DOM_VK_PAGE_DOWN ||

				aEvent.keyCode == aEvent.DOM_VK_HOME ||
				aEvent.keyCode == aEvent.DOM_VK_END ||

				aEvent.keyCode == aEvent.DOM_VK_ADD ||
				aEvent.keyCode == aEvent.DOM_VK_SUBTRACT ||

				aEvent.keyCode == aEvent.DOM_VK_LEFT ||
				aEvent.keyCode == aEvent.DOM_VK_RIGHT ||
				aEvent.keyCode == aEvent.DOM_VK_UP ||
				aEvent.keyCode == aEvent.DOM_VK_DOWN ||

				(
					!TabCatalog.thumbnailShortcutEnabled ?
						/^[\-\+hjkl123456789]$/i.test(keyChar = String.fromCharCode(aEvent.charCode)) :
						(
							( // 0-9
								aEvent.keyCode >=  0x30 &&
								aEvent.keyCode <=  0x39
							) ||
							( // A-Z
								aEvent.keyCode >=  0x41 &&
								aEvent.keyCode <=  0x5A
							) ||
							( // 0-9
								aEvent.charCode >=  0x30 &&
								aEvent.charCode <=  0x39
							) ||
							( // A-Z (large)
								aEvent.charCode >=  0x41 &&
								aEvent.charCode <=  0x5A
							) ||
							( // a-z (small)
								aEvent.charCode >=  0x61 &&
								aEvent.charCode <=  0x7A
							) ||
							aEvent.charCode ==  0x2B || // +
							aEvent.charCode ==  0x2D // -
						)
				)
			)
			) {
			aEvent.preventDefault();
			aEvent.stopPropagation();
			if (aEvent.type == 'keypress') {
				switch (aEvent.keyCode)
				{
					case aEvent.DOM_VK_PAGE_UP:
						TabCatalog.scrollCatalogBy(-(window.innerHeight / 3 * 2));
						return;
					case aEvent.DOM_VK_PAGE_DOWN:
						TabCatalog.scrollCatalogBy(window.innerHeight / 3 * 2);
						return;

					case aEvent.DOM_VK_HOME:
						TabCatalog.moveFocusToItem(TabCatalog.getItems()[0]);
						return;
					case aEvent.DOM_VK_END:
						var items = TabCatalog.getItems();
						TabCatalog.moveFocusToItem(items[items.length-1]);
						return;

					default:
						if (aEvent.charCode ==  0x2B) { // + (zoom in)
							TabCatalog.zoom(1);
							return;
						}
						else if (aEvent.charCode ==  0x2D) { // - (zoom out)
							TabCatalog.zoom(-1);
							return;
						}
						else if (
							aEvent.keyCode == aEvent.DOM_VK_LEFT ||
							aEvent.keyCode == aEvent.DOM_VK_RIGHT ||
							aEvent.keyCode == aEvent.DOM_VK_UP ||
							aEvent.keyCode == aEvent.DOM_VK_DOWN ||
							!TabCatalog.thumbnailShortcutEnabled
							) {
							TabCatalog.moveFocus(
								(
									aEvent.keyCode == aEvent.DOM_VK_LEFT ||
									/^[h147]$/i.test(keyChar)
								) ? -1 : (
									aEvent.keyCode == aEvent.DOM_VK_RIGHT ||
									/^[l369]$/i.test(keyChar)
								) ? 1 : 0,
								(
									aEvent.keyCode == aEvent.DOM_VK_UP ||
									/^[k789]$/i.test(keyChar)
								) ? -1 : (
									aEvent.keyCode == aEvent.DOM_VK_DOWN ||
									/^[j123]$/i.test(keyChar)
								) ? 1 : 0
							);
							return;
						}
						else {
							var shortcutTarget = TabCatalog.catalog.parentNode.getElementsByAttribute('accesskey', String.fromCharCode(aEvent.charCode).toUpperCase());
							if (shortcutTarget.length) {
								gBrowser.selectedTab = TabCatalog.tabs[parseInt(shortcutTarget[0].getAttribute('tabIndex'))];
								TabCatalog.hide();
								return;
							}
						}
				}
			}
			else
				return;
		}
		else if (
				TabCatalog.shown &&
				TabCatalog.callingAction != TabCatalog.CALLED_BY_TABSWITCH
				) {
			aEvent.preventDefault();
			aEvent.stopPropagation();
			return;
		}
		else {
			if (!TabCatalog.getPref('extensions.tabcatalog.override.ctrltab')) {
				return;
			}

			var scrollDown,
				scrollUp;
			var standBy = scrollDown = scrollUp = (!aEvent.altKey && (navigator.platform.match(/mac/i) ? aEvent.metaKey : aEvent.ctrlKey ));

			scrollDown = scrollDown && (
					!aEvent.shiftKey &&
					(
						aEvent.keyCode == aEvent.DOM_VK_TAB ||
						aEvent.keyCode == aEvent.DOM_VK_PAGE_DOWN
					)
				);

			scrollUp = scrollUp && (
					aEvent.shiftKey ? (aEvent.keyCode == aEvent.DOM_VK_TAB) : (aEvent.keyCode == aEvent.DOM_VK_PAGE_UP)
				);

			if (
				scrollDown ||
				scrollUp ||
				( // when you release "shift" key on the menu
					TabCatalog.shown &&
					standBy && !aEvent.shiftKey &&
					aEvent.charCode == 0 && aEvent.keyCode == 16
				)
				) {
				TabCatalog.show(TabCatalog.CALLED_BY_TABSWITCH);
				if (
					aEvent.type == 'keypress') {
					aEvent.preventDefault();
					aEvent.stopPropagation();
					TabCatalog.scrollUpDown(scrollDown ? 1 : -1 );
				}

				return;
			}
		}

		var focusedNode = TabCatalog.getFocusedItem();
		if (focusedNode) {
			var index = parseInt(focusedNode.getAttribute('tabIndex'));
			gBrowser.selectedTab = TabCatalog.tabs[index];
		}

		TabCatalog.hide();
	},
  
/* Thumbnails */ 
	
	onCatalogClick : function(aEvent) 
	{
		var node = this.getActiveItemFromEvent(aEvent);

		var tab;
		if (node)
			tab = this.getTabFromThumbnailItem(node);

		if (
			aEvent.button == 1/* ||
			(
				aEvent.button == 0 &&
				(
					(this.callingAction != this.CALLED_BY_TABSWITCH && aEvent.ctrlKey) ||
					aEvent.metaKey
				)
			) */
			) {
			if (!this.ignoreMiddleClick && tab) {
				gBrowser.removeTab(tab);
				if (this.getPref('extensions.tabcatalog.keep_open.closetab'))
					this.updateUI();
				else
					this.hide();
			}
		}
		else if (
				aEvent.button == 0 &&
				aEvent.ctrlKey &&
				this.callingAction != this.CALLED_BY_TABSWITCH
				) {
			if (node.getAttribute('selected') == 'true')
				node.removeAttribute('selected');
			else
				node.setAttribute('selected', true);
		}
		else if (aEvent.button == 2) {
			this.showPopupMenu(aEvent, this.tabContextMenu);
		}
		else {
			if (tab) {
				gBrowser.selectedTab = tab;
				this.hide();
			}
		}

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
 
	onThumbnailCloseBoxClick : function(aEvent) 
	{
		var node = this.getActiveItemFromEvent(aEvent);
		if (!node) return;

		aEvent.preventDefault();
		aEvent.stopPropagation();

		var tab = this.getTabFromThumbnailItem(node);
		gBrowser.removeTab(tab);
		var base = this.callingAction;
		if (this.getPref('extensions.tabcatalog.keep_open.closetab'))
			this.updateUI();
		else
			this.hide();
	},
 
	onCatalogDragStart : function(aEvent) 
	{
		var node = TabCatalog.getActiveItemFromEvent(aEvent);
		TabCatalog.thumbnailDragging = true;
		node.setAttribute('selected', true);
	},
	thumbnailDragging : false,
 
	onCatalogDragEnd : function(aEvent) 
	{
		if (TabCatalog.thumbnailDragging) {
			TabCatalog.thumbnailDragging = false;
			if (TabCatalog.getSelectedTabItems().snapshotLength)
				TabCatalog.showPopupMenu(aEvent, TabCatalog.tabSelectPopupMenu);
		}
	},
 
	onWheelScroll : function(aEvent) 
	{
		var h = Math.max(
				TabCatalog.catalog.tnHeight / 2,
				window.innerHeight / 5
			);
		TabCatalog.scrollCatalogBy((aEvent.detail > 0 ? 1 : -1) * h);

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
 
	onPanningScroll : function(aEvent) 
	{
		var behavior = TabCatalog.getPref('extensions.tabcatalog.panning.scrollBehavior');
		if (
			!TabCatalog.catalogPanning ||
			behavior < 0 ||
			!TabCatalog.enterPanningScroll(aEvent)
			)
			return;

		var pos;

		switch (behavior) {
			default:
			case 0:
				var padding = window.innerHeight / 5;
				pos = (
						(
							TabCatalog.catalog.maxScrollY /
							(window.innerHeight - (padding * 2))
						) *
						(aEvent.screenY - window.screenY - padding)
					);
				break;

			case 1:
				pos = TabCatalog.panStartScrollY + (TabCatalog.panStartY - aEvent.screenY);
				break;
		}

		TabCatalog.scrollCatalogTo(pos, true);
	},
	panStartX : -1,
	panStartY : -1,
	enterPanningScroll : function(aEvent)
	{
		if (document.documentElement.getAttribute('tabcatalog-panning'))
			return true;

		if (
			Math.abs(this.panStartX - aEvent.screenX) < 3 &&
			Math.abs(this.panStartY - aEvent.screenY) < 3
			)
			return false;

		document.documentElement.setAttribute('tabcatalog-panning', true);

		this.panStartScrollX = this.catalog.scrollX;
		this.panStartScrollY = this.catalog.scrollY;

		this.catalogScrolling  = true;
		this.catalogPanning    = true;
		this.ignoreMiddleClick = true;

		return true;
	},
	exitPanningScroll : function()
	{
		this.panStartX = this.panStartY = this.panStartScrollX = this.panStartScrollY = -1;

		this.catalogScrolling = false;
		this.catalogPanning   = false;
		window.setTimeout('TabCatalog.ignoreMiddleClick = false', 0);

		document.documentElement.removeAttribute('tabcatalog-panning');
	},
  
/* Toolbar Button */ 
	
	onButtonMouseOver : function(aEvent) 
	{
		if ((this.callingAction & this.CALLED_MANUALLY) ||
			this.contextMenuShwon)
			return;

		if (this.getPref('extensions.tabcatalog.auto_show.enabled')) {
			this.cancelDelayedMouseOver();
			this.delayedOnMouseOverTimer = window.setTimeout('TabCatalog.delayedOnMouseOver(TabCatalog.CALLED_BY_BUTTON)', this.getPref('extensions.tabcatalog.auto_show.show_delay'));
		}

		this.cancelDelayedMouseOut();
	},
 
	onButtonMouseOut : function(aEvent) 
	{
		if ((this.callingAction & this.CALLED_MANUALLY) ||
			this.contextMenuShwon)
			return;

		this.cancelDelayedMouseOver();

		if (this.getPref('extensions.tabcatalog.auto_show.enabled')) {
			this.cancelDelayedMouseOut();
			this.delayedOnMouseOutTimer = window.setTimeout('TabCatalog.delayedOnMouseOut()', this.getPref('extensions.tabcatalog.auto_show.hide_delay'));
		}
	},
  
/* Tab Bar */ 
	
	onTabBarMouseOver : function(aEvent) 
	{
		if (!TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.enabled') ||
			(TabCatalog.callingAction & TabCatalog.CALLED_MANUALLY) ||
			TabCatalog.contextMenuShwon ||
			!TabCatalog.isEventFiredOnTabBar(aEvent))
			return;

		if (TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.enabled')) {
			TabCatalog.cancelDelayedMouseOver();
			TabCatalog.delayedOnMouseOverTimer = window.setTimeout('TabCatalog.delayedOnMouseOver(TabCatalog.CALLED_BY_TABBAR)', TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.show_delay'));
		}

		TabCatalog.cancelDelayedMouseOut();
	},
 
	onTabBarMouseOut : function(aEvent) 
	{
		if (!TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.enabled') ||
			(TabCatalog.callingAction & TabCatalog.CALLED_MANUALLY) ||
			TabCatalog.contextMenuShwon ||
			!TabCatalog.isEventFiredOnTabBar(aEvent))
			return;

		TabCatalog.cancelDelayedMouseOver();

		if (TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.enabled')) {
			TabCatalog.cancelDelayedMouseOut();
			TabCatalog.delayedOnMouseOutTimer = window.setTimeout('TabCatalog.delayedOnMouseOut()', TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.hide_delay'));
		}
	},
  
	cancelContextMenu : function(aEvent) 
	{
		if (
			TabCatalog.shown ||
			(
				!TabCatalog.isDisabled() &&
				TabCatalog.getPref('extensions.tabcatalog.bothclick.enabled') &&
				TabCatalog.button0Pressed && TabCatalog.button2Pressed
			)
			) {
			aEvent.preventDefault();
//			aEvent.stopPropagation(); // this may close the catalog too...
			return false;
		}
	},
  
/* Catarog Operations */ 
	
	show : function(aBase, aOnlyUpdate, aRelative) 
	{
		if (
			this.callingAction ||
			this.shown ||
			this.tabs.length == 1 ||
			this.isDisabled()
			)
			return;

		this.catalogShowing = true;

		this.shown = true;
		document.documentElement.setAttribute('tabcatalog-screen-show', 'true');

		if (this.hideTimer) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}

		var tabs = this.tabs;
		this.lastSelectedIndex = -1;
		for (var i = 0, max = tabs.length; i < max; i++)
		{
			if (tabs[i] == gBrowser.selectedTab) {
				this.lastSelectedIndex = i;
				break;
			}
		}

		if (
			(
				!aOnlyUpdate &&
				aRelative === void(0)
			) ||
			this.lastFocusedIndex >= this.tabs.length
			)
			this.lastFocusedIndex = -1;

		this.callingAction = aBase || this.callingAction || this.CALLED_BY_UNKNOWN ;
		this.initUI(aRelative);

		this.button0Pressed = false;
		this.button1Pressed = false;
		this.button2Pressed = false;

		if (this.catalog.overflow) {
			window.addEventListener('DOMMouseScroll', this.onWheelScroll, true);
			window.addEventListener('mousemove',      this.onPanningScroll, true);
		}
		window.addEventListener('resize', this.onCancel, true);
		window.addEventListener('blur',   this.onCancel, true);

		if (this.getPref('extensions.tabcatalog.rendering_quality') > 0)
			this.catalog.setAttribute('dropshadow', true);
		else
			this.catalog.removeAttribute('dropshadow');

		this.catalog.setAttribute('last-shown-time', (new Date()).getTime());


		var focusedNode = this.getFocusedItem();
		if (focusedNode)
			this.scrollCatalogToItem(focusedNode, true);

		window.setTimeout('TabCatalog.catalogShowing = false;', 100);
	},
	callingAction     : null,
	lastFocusedIndex  : -1,
	lastSelectedIndex : -1,

	CALLED_BY_UNKNOWN     : 1,

	CALLED_BY_BUTTONCLICK : 2,
	CALLED_BY_BOTH_CLICK  : 4,
	CALLED_BY_HOTKEY      : 8,
	CALLED_BY_TABSWITCH   : 16,
	CALLED_BY_AIOG        : 32,

	CALLED_MANUALLY       : 62,

	CALLED_BY_BUTTON      : 64,
	CALLED_BY_TABBAR      : 128,

	CALLED_AUTOMATICALLY  : 192,
 
	hide : function() 
	{
		if (!this.shown) return;

		this.catalogHiding = true;

		if (this.catalog.overflow) {
			window.removeEventListener('DOMMouseScroll', this.onWheelScroll, true);
			window.removeEventListener('mousemove',      this.onPanningScroll, true);
		}
		window.removeEventListener('resize', this.onCancel, true);
		window.removeEventListener('blur',   this.onCancel, true);

		this.animateStop();

		this.lastMouseOverThumbnail = null;
		this.lastSelectedIndex = -1;


		var focusedNode = this.getFocusedItem();
		this.lastFocusedIndex = (focusedNode) ? parseInt(focusedNode.getAttribute('tabIndex')) : -1 ;

		this.stopUpdateCanvas();
		this.clear();
		this.contextMenuShwon = false;
		this.shown = false;

		this.button0Pressed = false;
		this.button2Pressed = false;

		window.setTimeout('TabCatalog.tabSelectPopupMenu.hidePopup();', 10);
		window.setTimeout('TabCatalog.tabContextMenu.hidePopup();', 10);

		this.callingAction = null;
		document.documentElement.removeAttribute('tabcatalog-screen-show');

		if (this.delayedOnMouseOverTimer)
			window.clearTimeout(this.delayedOnMouseOverTimer);
		if (this.delayedOnMouseOutTimer)
			window.clearTimeout(this.delayedOnMouseOutTimer);

		window.setTimeout('TabCatalog.catalogHiding = false;', 100);
	},
 
	updateUI : function(aRelative) 
	{
		var base = this.callingAction;
		var tabs = this.tabs;
		var selectedTab = (this.lastSelectedIndex > -1 && this.lastSelectedIndex < tabs.length) ? tabs[this.lastSelectedIndex] : null ;
		if (selectedTab != gBrowser.selectedTab) {
			this.backgroundBackup.setAttribute('catalog-shown', true);
			this.hide();
			window.setTimeout('TabCatalog.backgroundBackup.removeAttribute("catalog-shown"); TabCatalog.show('+base+', true, '+aRelative+');', 0);
		}
		else {
			this.hide();
			TabCatalog.show(base, true, aRelative);
		}
	},
 
	initUI : function(aRelative) 
	{
		this.clear();


		var size = this.calculateThumbnailSize(aRelative);

		var i;
		var tabs = this.tabs;
		var max = tabs.length;

		var isSorted = this.getPref('extensions.tabcatalog.sort_by_focus');
		if (isSorted) {
			var tmpTabs     = [];
			var focusedTabs = [];
			for (i = 0; i < max; i++)
			{
				tabs[i].__tabcatalog__index = i;
				if (tabs[i].__tabcatalog__lastSelectedTime)
					focusedTabs.push(tabs[i]);
				else
					tmpTabs.push(tabs[i]);
			}

			focusedTabs.sort(
				function(aTabA, aTabB)
				{
					return (aTabB.__tabcatalog__lastSelectedTime - aTabA.__tabcatalog__lastSelectedTime);
				}
			);

			tabs = focusedTabs.concat(tmpTabs);
		}


		var colCount = 0;
		var rowCount = 1;

		this.updateCanvasCue = [];

		var padding = this.padding;
		var header  = this.header;

		var offsetX = parseInt(((window.innerWidth-(
					size.maxCol * (size.width + padding)
				))/2) + (padding/2));
		var offsetY = size.overflow ? padding :
				parseInt(((window.innerHeight-(
					size.maxRow * (size.height + padding + header)
				))/2) + (padding/2));

		for (i = 0; i < max; i++)
		{
			var b   = gBrowser.getBrowserForTab(tabs[i]);

			colCount++;
			if (colCount > size.maxCol) {
				rowCount++;
				colCount = 1;
			}

			var box = document.getElementById('thumbnail-item-template').firstChild.cloneNode(true);
			box.setAttribute('index',    i);
			box.setAttribute('tabIndex', isSorted ? tabs[i].__tabcatalog__index : i );
			box.setAttribute('title',    b.contentDocument.title);
			box.setAttribute('uri',      b.currentURI.spec);
			box.setAttribute('width',    size.width);
			box.setAttribute('height',   size.height);
			box.setAttribute('x',        colCount);
			box.setAttribute('y',        rowCount);
			box.setAttribute('thumbnail-position', colCount+'/'+rowCount);
			box.style.maxWidth  = size.width+'px';
			box.style.maxHeight = size.height+'px';
			if (i < 36) {
				var accesskey = Number(i).toString(36).toUpperCase();
				box.setAttribute('accesskey', accesskey);
				box.lastChild.lastChild.setAttribute('value', accesskey);
			}

			// for Tabbrowser Extensions
			var color = tabs[i].getAttribute('tab-color')
			if (color && (color = color.split(':')[0]) != 'default')
				box.style.outlineColor = color;

			var canvas = tabs[i].cachedCanvas;
			if (!canvas) {
				canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
				tabs[i].cachedCanvas = canvas;
				canvas.setAttribute('mouseover', 'TabCatalog.updateOneCanvas(this.thumbnailData, true);');
			}
			box.childNodes[1].appendChild(canvas);

			var thumbnail = document.createElement('thumbnail');
			thumbnail.posX = (offsetX + ((size.width + padding) * (colCount-1)));
			thumbnail.posY = (offsetY + ((size.height + padding + header) * (rowCount-1)));

			thumbnail.style.position = 'absolute';
			thumbnail.style.zIndex   = 65500;
			thumbnail.style.left     = thumbnail.posX + 'px';
			thumbnail.style.top      = thumbnail.posY + 'px';

			thumbnail.setAttribute('class', 'tabcatalog-thumbnail-box');
			thumbnail.appendChild(box);

			this.catalog.appendChild(thumbnail);

			if (
				this.lastFocusedIndex == i ||
				(
					this.lastFocusedIndex < 0 &&
					tabs[i] == gBrowser.selectedTab
				)
				) {
				thumbnail.setAttribute('container-focused', true);
				box.setAttribute('focused', true);
				box.setAttribute('current', true);
			}

			canvas.style.width  = canvas.style.maxWidth  = size.width+"px";
			canvas.style.height = canvas.style.maxHeight = size.height+"px";
			canvas.thumbnailData = {
				index  : (isSorted ? tabs[i].__tabcatalog__index : i ),
				width  : size.width,
				height : size.height,
				canvas : canvas,
				uri    : b.currentURI.spec
			};

			this.updateThumbnail(box);
			this.updateCanvasCue.push(canvas.thumbnailData);
		}

		this.catalog.posX       = 0;
		this.catalog.posY       = 0;
		this.catalog.style.left = 0;
		this.catalog.style.top  = 0;

		this.catalog.maxX       = size.maxCol;
		this.catalog.maxY       = size.maxRow;
		this.catalog.tnWidth    = size.width;
		this.catalog.tnHeight   = size.height;
		this.catalog.overflow   = size.overflow;

		this.catalog.scrollX    = 0;
		this.catalog.scrollY    = 0;
		this.catalog.maxScrollX = size.maxCol * (padding + size.width);
		this.catalog.maxScrollY = thumbnail.posY + size.height - window.innerHeight + padding + header;

		this.updateCanvas();
	},
	updateThumbnail : function(aThumbnailItem)
	{
		var tab = this.tabs[aThumbnailItem.getAttribute('tabIndex')];
		var b   = gBrowser.getBrowserForTab(tab);
		var w   = b.contentWindow;

		aThumbnailItem.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-label')[0].setAttribute('value', b.contentDocument.title);

		if (tab.getAttribute('image'))
			aThumbnailItem.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-favicon')[0].setAttribute('src', tab.getAttribute('image'));
	},
	
	calculateThumbnailSize : function(aRelative) 
	{
		var w = window.innerWidth;
		var h = window.innerHeight;

		var padding = this.padding;
		var header  = this.header;

		var tabNum = this.tabs.length;

		var boxObject = gBrowser.getBrowserForTab(gBrowser.selectedTab).boxObject;
		var scale = boxObject.height / boxObject.width;

		var thumbnailScale = Math.min(Math.max(this.getPref('extensions.tabcatalog.thumbnail.scale'), 1), 100) / 100;
		var minSize = this.getPref('extensions.tabcatalog.thumbnail.min.enabled') ? Math.min(this.getPref('extensions.tabcatalog.thumbnail.min.size'), (scale < 1 ? boxObject.width : boxObject.height )) : -1;

		var windowSize = ((w * h) / (tabNum / thumbnailScale));
		var boxWidth = parseInt(Math.min(Math.sqrt(windowSize), window.outerWidth * 0.4)) - 4 - padding;
		var boxHeight = parseInt(boxWidth * scale);

		var maxCol,
			overflow = false;

		if (
			aRelative !== void(0) ||
			minSize > 0
			) {
			if (aRelative > 0) {
				boxWidth = parseInt(Math.min(this.catalog.tnWidth * 1.2, boxObject.width));
				boxHeight = parseInt(boxWidth * scale);
			}
			else if (aRelative < 0) {
				boxWidth = parseInt(Math.max(this.catalog.tnWidth * 0.8, header));
				boxHeight = parseInt(boxWidth * scale);
			}
			else {
				if (scale < 1) {
					if (boxWidth <= minSize) {
						boxWidth = minSize;
						boxHeight = parseInt(boxWidth * scale);
					}
				}
				else if (boxHeight <= minSize) {
					boxHeight = minSize;
					boxWidth = parseInt(boxHeight / scale);
				}
			}
			maxCol = Math.max(1, Math.floor(w / (boxWidth + padding)));
			overflow = ((boxHeight + padding + header) * Math.ceil(tabNum / maxCol)) > h ;
		}
		else {
			var boxWidthBackup,
				maxRow;

			do {
				maxCol = Math.ceil(Math.sqrt(tabNum));
				while (maxCol > 1 && (boxWidth * maxCol) > w) {
					maxCol--;
				}

				boxWidthBackup = boxWidth;

				maxRow = Math.ceil(tabNum/maxCol);
				while ((boxHeight * maxRow) > h) {
					boxWidth = parseInt(boxWidth * 0.9);
					boxHeight = parseInt(boxWidth * scale);
				}
			} while (boxWidthBackup != boxWidth);
		}


		return {
			width    : boxWidth,
			height   : boxHeight,
			maxCol   : maxCol,
			maxRow   : Math.ceil(tabNum / maxCol),
			overflow : overflow
		};
	},
 
	updateCanvas : function() 
	{
		this.stopUpdateCanvas();
		window.setTimeout('TabCatalog.updateCanvasCallback()', 0);
	},
	stopUpdateCanvas : function()
	{
		if (this.updateCanvasTimer) {
			window.clearTimeout(this.updateCanvasTimer);
			this.updateCanvasTimer = null;
		}
	},
	updateCanvasCallback : function()
	{
		var cue    = this.updateCanvasCue;
		var newCue = [];
		for (var i = 0, max = cue.length; i < max; i++) {

			var data   = cue[i];
			var canvas = data.canvas;
			var tab    = this.tabs[data.index];

			if (tab.getAttribute('busy')) {
				newCue.push(data);
//				continue;
			}

			this.updateOneCanvas(data);
		}
		this.updateCanvasCue = newCue;

		if (!this.updateCanvasCue.length)
			this.stopUpdateCanvas();
		else
			this.updateCanvasTimer = window.setTimeout('TabCatalog.updateCanvasCallback()', 5000);
	},
	updateCanvasCue : [],
	updateCanvasTimer : null,
	updateOneCanvas : function(aData, aForceUpdate)
	{
		var canvas = aData.canvas;
		if (
			!aForceUpdate &&
			canvas.getAttribute('last-update-time') == this.catalog.getAttribute('last-shown-time') &&
			canvas.getAttribute('current-uri') == aData.uri
			)
			return;

		canvas.width  = canvas.maxWidth  = aData.width;
		canvas.height = canvas.maxHeight = aData.height;

		var tab = this.tabs[aData.index];
		var b   = gBrowser.getBrowserForTab(tab);
		var w   = b.contentWindow;

		try {
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, aData.width, aData.height);
			ctx.save();
			ctx.scale(aData.width/w.innerWidth, aData.height/w.innerHeight);
			ctx.drawWindow(w, w.scrollX, w.scrollY, w.innerWidth, w.innerHeight, "rgb(255,255,255)");
			ctx.restore();
		}
		catch(e) {
			dump('TabCatalog Error: ' + e.message + '\n');
		}

		canvas.setAttribute('current-uri', aData.uri);
		canvas.setAttribute('last-update-time', this.catalog.getAttribute('last-shown-time'));

		this.updateThumbnail(canvas.parentNode.parentNode);
	},
 
	clear : function() 
	{
		var nodes = this.catalog.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'canvas');
		for (var i = nodes.length-1; i > -1; i--)
			nodes[i].parentNode.removeChild(nodes[i]);

		var range = document.createRange();
		range.selectNodeContents(this.catalog);
		range.deleteContents();
		range.detach();
	},
  
	animate : function(aTarget, aProp, aStart, aEnd, aInterval, aCallbackFunc) 
	{
		this.animateStop();

		this.animateTarget   = aTarget;
		this.animateProp     = aProp;
		this.animateCurrent  = aStart;
		this.animateEnd      = aEnd;
		this.animateStep     = (aEnd - aStart) / 5;
		this.animateRegisteredCallbackFunc = aCallbackFunc;

		aTarget[aProp] = parseInt(aStart) + 'px';
		this.animateTimer  = window.setInterval(this.animateCallback, Math.max(1, Math.max(1, aInterval)/5), this);
	},
	animateCallback : function(aThis)
	{
		aThis.animateCurrent += aThis.animateStep;

		if ((aThis.animateStep < 0) ?
			(aThis.animateCurrent <= aThis.animateEnd) :
			(aThis.animateCurrent >= aThis.animateEnd)) {
			aThis.animateStop();
			return;
		}

		aThis.animateTarget[aThis.animateProp] = parseInt(aThis.animateCurrent) + 'px';
	},
	animateStop : function()
	{
		if (this.animateTimer) {
			window.clearTimeout(this.animateTimer);
			this.animateTimer = null;
		}
		if (this.animateTarget) {
			this.animateTarget[this.animateProp] = parseInt(this.animateEnd) + 'px';
			this.animateTarget = null;
		}
		try {
			if (this.animateRegisteredCallbackFunc &&
				typeof this.animateRegisteredCallbackFunc == 'function')
				this.animateRegisteredCallbackFunc();
		}
		catch(e) {
		}
		this.animateRegisteredCallbackFunc = null;
	},
  
/* Commands */ 
	
/* Thumbnail Focus */ 
	
	scrollUpDown : function(aDir) 
	{
		var focusedNode = this.getFocusedItem();
		if (!focusedNode) return;

		focusedNode.parentNode.removeAttribute('container-focused');
		focusedNode.removeAttribute('focused');

		var index = parseInt(focusedNode.getAttribute('index'));
		var max   = this.tabs.length;

		if (aDir < 0)
			index = (index - 1 + max) % max;
		else
			index = (index + 1) % max;

		focusedNode = this.catalog.parentNode.getElementsByAttribute('index', index)[0];
		focusedNode.parentNode.setAttribute('container-focused', true);
		focusedNode.setAttribute('focused', true);
		this.scrollCatalogToItem(focusedNode);
	},
 
	moveFocus : function(aX, aY) 
	{
		var focusedNode = this.getFocusedItem();
		if (!focusedNode) return;

		var maxX = this.catalog.maxX;
		var maxY = this.catalog.maxY;

		var x = parseInt(focusedNode.getAttribute('x'))-1;
		var y = parseInt(focusedNode.getAttribute('y'))-1;

		do {
			if (aX == 0) {
			}
			else if (aX < 0)
				x = (x - 1 + maxX) % maxX;
			else
				x = (x + 1) % maxX;

			if (aY == 0) {
			}
			else if (aY < 0)
				y = (y - 1 + maxY) % maxY;
			else
				y = (y + 1) % maxY;

			focusedNode = this.catalog.parentNode.getElementsByAttribute('thumbnail-position', (x+1)+'/'+(y+1));
		} while (focusedNode.length == 0);

		this.moveFocusToItem(focusedNode[0]);
	},
	moveFocusToItem : function(aItem)
	{
		var focusedNode = this.getFocusedItem();
		if (focusedNode) {
			focusedNode.parentNode.removeAttribute('container-focused');
			focusedNode.removeAttribute('focused');
		}
		aItem.parentNode.setAttribute('container-focused', true);
		aItem.setAttribute('focused', true);
		this.scrollCatalogToItem(aItem);
	},
	SCROLL_VERTICAL   : 1,
	SCROLL_HORIZONTAL : -1,
 
	scrollCatalogBy : function(aDelta, aDoNotAnimate) 
	{
		var originalY = this.catalog.posY;

		this.catalog.posY -= aDelta;
		this.catalog.posY = parseInt(
			(aDelta < 0) ?
				Math.min(this.catalog.posY, 0) :
				Math.max(this.catalog.posY, -this.catalog.maxScrollY)
		);

		this.catalogScrolling = true;

		if (aDoNotAnimate || !this.getPref('extensions.tabcatalog.animation.scroll.enabled')) {
			this.catalog.scrollY = -this.catalog.posY;
			this.catalog.style.top = this.catalog.posY + 'px';
			window.setTimeout(this.scrollCatalogByAnimationCallback, 100);
		}
		else {
			this.animate(
				this.catalog.style,
				'top',
				originalY,
				this.catalog.posY,
				this.getPref('extensions.tabcatalog.animation.scroll.timeout'),
				this.scrollCatalogByAnimationCallback
			);
		}
	},
	scrollCatalogByAnimationCallback : function()
	{
		TabCatalog.catalog.scrollY = -TabCatalog.catalog.posY;
		TabCatalog.catalogScrolling = false;
	},
 
	scrollCatalogTo : function(aY, aDoNotAnimate) 
	{
		this.scrollCatalogBy(aY - this.catalog.scrollY, aDoNotAnimate);
	},
 
	scrollCatalogToItem : function(aTarget, aDoNotAnimate) 
	{
		var h = aTarget.boxObject.height;
		if (
			aTarget.parentNode.posY + this.catalog.posY < 0 ||
			aTarget.parentNode.posY + this.catalog.posY + h > window.innerHeight
			)
			this.scrollCatalogTo(aTarget.parentNode.posY - this.padding - this.header, aDoNotAnimate);
	},
  
	closeSelectedTabs : function() 
	{
		var nodes = this.getSelectedTabItems();
		if (!nodes.snapshotLength) return;

		var i,
			max = nodes.snapshotLength;

		if (
			max > 1 &&
			'warnAboutClosingTabs' in gBrowser &&
			!gBrowser.warnAboutClosingTabs(false)
			)
			return;

		var tabs = [];
		for (i = 0; i < max; i++) {
			tabs.push(this.getTabFromThumbnailItem(nodes.snapshotItem(i)));
		}
		for (i = max-1; i > -1; i--) {
			gBrowser.removeTab(tabs[i]);
		}

		var base = this.callingAction;
		this.hide();
		if (this.getPref('extensions.tabcatalog.keep_open.closetab'))
			window.setTimeout('TabCatalog.show('+base+');', 0);
	},
 
	zoom : function(aRelative) 
	{
		this.updateUI(aRelative);
	},
  
/* Override */ 
	
/* All-In-One Gesture */ 
	
	aioTabWheelNav : function() 
	{
		var activeTab = aioContent.mTabContainer.selectedIndex;
		if (activeTab != aioTabSrc) {
			aioTabDest = -1;
			aioTabSrc = activeTab;
		}
		aioTabPU = new aioPopUp(activeTab, aioTabCount, "popup", aioOldX + 2, aioOldY + 2,
			aioReverseScroll && aioNoPopup, aioTabWheelEnd, aioTabPopping, aioTabWheeling);
		aioTabPU.createPopup("aioContent.mTabContainer.childNodes[i].label",
			"aioContent.mTabContainer.childNodes[i].getAttribute('image')", "");

		aioTabPU.scrollerNode.hidePopup();

		TabCatalog.show(TabCatalog.CALLED_BY_AIOG);
	},
	aioTabPopping : function(e)
	{
		var row = (aioTabDest != -1 && aioTabDest < aioTabPU.popupLength) ? aioTabDest : -1;
		aioTabPU.updatePopup(aioTabPU.initialRow, "font-weight:bold", row, "font-style:italic");
		if (aioNoPopup) {
			e.preventDefault(); //no popup
			if (aioWheelMode == 2) {
				var dir = aioCCW != aioReverseScroll ? -1 : 1 ;
				TabCatalog.scrollUpDown(dir);
				aioContent.mTabContainer.advanceSelectedTab(dir, true);
			}
		}
	},
	aioTabWheeling : function(e)
	{
		aioTabPU.scrollPopup(e);
		if (aioTabDest != -1 && aioTabDest < aioTabPU.popupLength)
			aioTabPU.scrollerNode.childNodes[aioTabDest].setAttribute("style", "font-style:" +
				((aioTabPU.activeRow == aioTabPU.initialRow) ? "italic" : "normal"));
		var dir = e.detail > 0 == aioReverseScroll ? -1 : 1 ;
		TabCatalog.scrollUpDown(dir);
		if (aioNoPopup) aioContent.mTabContainer.advanceSelectedTab(dir, true);
	},
	aioTabWheelEnd : function(e)
	{
		var focusedNode = TabCatalog.getFocusedItem();
		if (focusedNode) {
			var index = parseInt(focusedNode.getAttribute('tabIndex'));
			gBrowser.selectedTab = TabCatalog.tabs[index];
		}
		TabCatalog.hide();
		aioTabPU.closePopup('void(0)');
		aioRestoreListeners();
	},
   
/* Save/Load Prefs */ 
	
	knsISupportsString : Components.interfaces.nsISupportsString, 
 
	get Prefs() 
	{
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
 
	getPref : function(aPrefstring) 
	{
		try {
			switch (this.Prefs.getPrefType(aPrefstring))
			{
				case this.Prefs.PREF_STRING:
					return this.Prefs.getComplexValue(aPrefstring, this.knsISupportsString).data;
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var pref = this.Prefs ;
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				var string = Components.classes['@mozilla.org/supports-string;1'].createInstance(this.knsISupportsString);
				string.data = aNewValue;
				pref.setComplexValue(aPrefstring, this.knsISupportsString, string);
				break;
			case 'number':
				pref.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				pref.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.addObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.removeObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	}
   
}; 


var gTabCatalogPrefListener =
{
	domain  : 'extensions.tabcatalog',
	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;

		var value = TabCatalog.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.tabcatalog.override.allinonegest':
				// for All-In-One Gesture
				if ('aioTabWheelNav' in window &&
					!('__tabcatalog__aioTabWheelNav' in window)) {
					window.__tabcatalog__aioTabWheelNav = window.aioTabWheelNav;
					window.__tabcatalog__aioTabPopping  = window.aioTabPopping;
					window.__tabcatalog__aioTabWheeling = window.aioTabWheeling;
					window.__tabcatalog__aioTabWheelEnd = window.aioTabWheelEnd;
				}
				if (value) {
					window.aioTabWheelNav = TabCatalog.aioTabWheelNav;
					window.aioTabPopping  = TabCatalog.aioTabPopping;
					window.aioTabWheeling = TabCatalog.aioTabWheeling;
					window.aioTabWheelEnd = TabCatalog.aioTabWheelEnd;
				}
				else {
					window.aioTabWheelNav = window.__tabcatalog__aioTabWheelNav;
					window.aioTabPopping  = window.__tabcatalog__aioTabPopping;
					window.aioTabWheeling = window.__tabcatalog__aioTabWheeling;
					window.aioTabWheelEnd = window.__tabcatalog__aioTabWheelEnd;
				}
				break;

			case 'extensions.tabcatalog.shortcut':
				TabCatalog.shortcut = null;
				break;

			case 'extensions.tabcatalog.thumbnail.header':
				if (TabCatalog.getPref('extensions.tabcatalog.thumbnail.header'))
					TabCatalog.catalog.setAttribute('show-thumbnail-header', true);
				else
					TabCatalog.catalog.removeAttribute('show-thumbnail-header');
				break;

			case 'extensions.tabcatalog.thumbnail.closebox':
				if (TabCatalog.getPref('extensions.tabcatalog.thumbnail.closebox'))
					TabCatalog.catalog.setAttribute('show-thumbnail-closebox', true);
				else
					TabCatalog.catalog.removeAttribute('show-thumbnail-closebox');
				break;

			case 'extensions.tabcatalog.thumbnail.shortcut':
				TabCatalog.thumbnailShortcutEnabled = TabCatalog.getPref('extensions.tabcatalog.thumbnail.shortcut');
				if (TabCatalog.thumbnailShortcutEnabled)
					TabCatalog.catalog.setAttribute('show-thumbnail-shortcut', true);
				else
					TabCatalog.catalog.removeAttribute('show-thumbnail-shortcut');
				break;

			default:
				break;
		}
	}
};


window.addEventListener('load', function() {
	window.setTimeout('TabCatalog.init();', 0);
}, false);
 