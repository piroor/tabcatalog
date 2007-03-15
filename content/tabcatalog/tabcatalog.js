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
		var tabs = [];
		if (this.getPref('extensions.tabcatalog.showAllWindows')) {
			var windows = this.getPref('extensions.tabcatalog.window.sort_by_focus') ? this.browserWindowsWithFocusedOrder : this.browserWindowsWithOpenedOrder ;
			for (var i = 0; i < windows.length; i++)
				tabs = tabs.concat(Array.prototype.slice.call(windows[i].gBrowser.mTabContainer.childNodes));
		}
		else {
			tabs = gBrowser.mTabContainer.childNodes;
		}

		var isSorted = this.getPref('extensions.tabcatalog.sort_by_focus');
		if (isSorted) {
			var tmpTabs     = [];
			var focusedTabs = [];
			var max = tabs.length;
			for (var i = 0; i < max; i++)
			{
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

		return tabs;
	},
 
	get isMultiWindow() 
	{
		return this.getPref('extensions.tabcatalog.showAllWindows') &&
				(this.browserWindowsWithOpenedOrder.length > 1);
	},
 
	get splitByWindow() 
	{
		return this.getPref('extensions.tabcatalog.showAllWindows') &&
				!this.getPref('extensions.tabcatalog.sort_by_focus') &&
				this.getPref('extensions.tabcatalog.split_by_window');
	},
 
	get browserWindowsWithOpenedOrder() 
	{
		var browserWindows = [];

		var targets = this.WindowManager.getEnumerator('navigator:browser'),
			target;
		while (targets.hasMoreElements())
		{
			target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
			browserWindows.push(target);
		}

		return browserWindows;
	},
 
	get browserWindowsWithFocusedOrder() 
	{
		var browserWindows = this.browserWindowsWithOpenedOrder;

		// rearrange with z-order
		var results = [];
		var targets = this.WindowManager.getZOrderDOMWindowEnumerator('navigator:browser', true),
			target,
			i;
		while (targets.hasMoreElements())
		{
			target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
			for (i in browserWindows)
			{
				if (target != browserWindows[i]) continue;
				results.push(browserWindows[i]);
				browserWindows.splice(i, 1);
				break;
			}
		}

		return results.concat(browserWindows); // result + rest windows (have not shown yet)
	},
 
	get WindowManager() 
	{
		if (!this._WindowManager) {
			this._WindowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		}
		return this._WindowManager;
	},
	_WindowManager : null,
  
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
	get splitter() {
		if (this._splitter < 0) {
			var style = window.getComputedStyle(document.getElementById('tabcatalog-splitter-size-box'), null);
			this._splitter = Math.max(
				parseInt(style.minWidth.match(/[0-9]+/) || 0),
				parseInt(style.maxWidth.match(/[0-9]+/) || 0),
				parseInt(style.width.match(/[0-9]+/) || 0)
			);
		}
		return this._splitter;
	},
	_splitter : -1,
	get scrollbarSize() {
		if (this._scrollbarSize < 0) {
			var style = window.getComputedStyle(document.getElementById('tabcatalog-scrollbar-size-box'), null);
			this._scrollbarSize = Math.max(
				parseInt(style.minWidth.match(/[0-9]+/) || 0),
				parseInt(style.maxWidth.match(/[0-9]+/) || 0),
				parseInt(style.width.match(/[0-9]+/) || 0)
			);
		}
		return this._scrollbarSize;
	},
	_scrollbarSize : -1,
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
		return aItem.relatedTab;
	},
 
	getItemFromEvent : function(aEvent) 
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
		var node = this.getItemFromEvent(aEvent);
		if (node) {
			document.popupNode = node.relatedTab;
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
		aNode = this.getItemFromEvent({ target : aNode });
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
 
	drawWindowIndicator : function(aCanvas, aWindow) 
	{
		if (!aCanvas.parentNode) return;

		if (!aWindow.__tabcatalog__windowColor)
			aWindow.__tabcatalog__windowColor = this.getRandomColor();

		var box = aCanvas.parentNode.boxObject;
		var size = Math.min(15, parseInt(Math.min(box.width, box.height) / 3));

		try {
			var ctx = aCanvas.getContext('2d');
			ctx.save();
			ctx.fillStyle = aWindow.__tabcatalog__windowColor;
			ctx.beginPath();
			ctx.moveTo(0, box.height - size);
			ctx.lineTo(0, box.height);
			ctx.lineTo(size, box.height);
			ctx.fill();
			ctx.restore();
		}
		catch(e) {
			dump('TabCatalog Error: ' + e.message + '\n');
		}
	},
 
	getRandomColor : function() 
	{
		var rgb = [0, 0, 0];
		for (i in rgb)
		{
			rgb[i] = Math.floor(Math.random() * 256);
		}

		return 'rgba('+rgb.join(',')+', 0.75)';
	},
 
	removeTab : function(aTab, aOnlyRemove) 
	{
		var mode = this.getPref('extensions.tabcatalog.closeTabActionForLastTab');
		if (aTab.__tabcatalog__relatedTabBrowser.mTabContainer.childNodes.length == 1 &&
			mode != this.LAST_TAB_ACTION_CLOSE_TAB) {
			if (mode == this.LAST_TAB_ACTION_CLOSE_TAB_AND_WINDOW)
				aTab.__tabcatalog__relatedTabBrowser.removeTab(aTab);

			var win = aTab.ownerDocument.defaultView;
			if ('BrowserTryToCloseWindow' in win)
				win.setTimeout('BrowserTryToCloseWindow();', 0);
			else if ('TryToCloseWindow' in win)
				win.setTimeout('TryToCloseWindow();', 0);
			else
				win.setTimeout('window.close();', 0);

			if (win == window) {
				var base = this.callingAction;
				this.hide();
				if (this.getPref('extensions.tabcatalog.keep_open.closetab')) {
					var windows = this.browserWindowsWithFocusedOrder;
					for (var i in windows)
						if (windows[i] != win) {
							windows[i].focus();
							var count = 0;
							windows[i].setTimeout(function(aWindow) {
								if (win.closed)
									aWindow.TabCatalog.show(base);
								else if (count++ < 1000)
									aWindow.setTimeout(arguments.callee, 10, aWindow);
							}, 10, windows[i]);
							return;
						}
				}
			}
		}
		else {
			aTab.__tabcatalog__relatedTabBrowser.removeTab(aTab);
		}

		if (aOnlyRemove) return;

		if (this.getPref('extensions.tabcatalog.keep_open.closetab'))
			window.setTimeout('TabCatalog.updateUI();', 0);
		else
			this.hide();
	},
	LAST_TAB_ACTION_CLOSE_TAB            : 0,
	LAST_TAB_ACTION_CLOSE_TAB_AND_WINDOW : 1,
	LAST_TAB_ACTION_CLOSE_WINDOW         : 2,
 	 
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

		window.addEventListener('unload', function() {
			window.removeEventListener('unload', arguments.callee, false);
			TabCatalog.destroy();
		}, false);

		gBrowser.mTabContainer.addEventListener('select', this.onTabSelect, true);
		gBrowser.selectedTab.__tabcatalog__lastSelectedTime = (new Date()).getTime();

		this.updateTabBrowser(gBrowser);

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
	updateTabBrowser : function(aTabBrowser)
	{
		if (!this.getPref('extensions.tabcatalog.renderingInBackground')) return;

		var addTabMethod = 'addTab';
		var removeTabMethod = 'removeTab';
		if (aTabBrowser.__tabextensions__addTab) {
			addTabMethod = '__tabextensions__addTab';
			removeTabMethod = '__tabextensions__removeTab';
		}

		var originalAddTab = aTabBrowser[addTabMethod];
		aTabBrowser[addTabMethod] = function() {
			var tab = originalAddTab.apply(this, arguments);
			try {
				TabCatalog.getCanvasForTab(tab);
			}
			catch(e) {
			}
			return tab;
		};

		var originalRemoveTab = aTabBrowser[removeTabMethod];
		aTabBrowser[removeTabMethod] = function(aTab) {
			try {
				aTab.linkedBrowser.webProgress.removeProgressListener(aTab.cachedCanvas.progressFilter);
				aTab.cachedCanvas.progressFilter.removeProgressListener(aTab.cachedCanvas.progressListener);
				delete aTab.cachedCanvas.progressFilter;
				delete aTab.cachedCanvas.progressListener;
				delete aTab.cachedCanvas;
			}
			catch(e) {
			}

			var retVal = originalRemoveTab.apply(this, arguments);

			if (aTab.parentNode)
				TabCatalog.getCanvasForTab(aTab);

			return retVal;
		};

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.getCanvasForTab(tabs[i]);
		}

		delete addTabMethod;
		delete removeTabMethod;
		delete i;
		delete maxi;
		delete tabs;
	},
 
	destroy : function() 
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

		if (this.getPref('extensions.tabcatalog.renderingInBackground')) {
			var tabs = gBrowser.mTabContainer.childNodes;
			for (var i = 0, maxi = tabs.length; i < maxi; i++)
			{
				if (!tabs[i].cachedCanvas) continue;

				tabs[i].linkedBrowser.webProgress.removeProgressListener(tabs[i].cachedCanvas.progressFilter);
				tabs[i].cachedCanvas.progressFilter.removeProgressListener(tabs[i].cachedCanvas.progressListener);
				delete tabs[i].cachedCanvas.progressFilter;
				delete tabs[i].cachedCanvas.progressListener;
				delete tabs[i].cachedCanvas;
			}
		}
	},
  
/* Event Handling */ 
	
/* General */ 
	
	onMouseDown : function(aEvent) 
	{
		if (
			TabCatalog.shown &&
			aEvent.button == 2 &&
			!TabCatalog.isDisabled() &&
			!TabCatalog.isEventFiredInMenu(aEvent)
			) {
			TabCatalog.catalogZooming = true;
		}
		else if (
			TabCatalog.shown &&
			aEvent.button != 1 &&
			!TabCatalog.isDisabled() &&
			!TabCatalog.getItemFromEvent(aEvent) &&
			!TabCatalog.isEventFiredInMenu(aEvent)
			) {
			if (aEvent.target.id == 'tabcatalog-scrollbar') {
				TabCatalog.catalogPanning = true;
				TabCatalog.catalogPanningByScrollbar = true;
				TabCatalog.panStartX = aEvent.screenX;
				TabCatalog.panStartY = aEvent.screenY;
			}
			else if (aEvent.target.id == 'tabcatalog-scrollbar-slider') {
				TabCatalog.onSliderClick(aEvent);
			}
			else
				TabCatalog.hide();
		}
		else {
			if (TabCatalog.shown && aEvent.button == 1) {
				TabCatalog.catalogPanning = true;
				TabCatalog.catalogPanningByScrollbar = false;
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
			!TabCatalog.shown &&
			!TabCatalog.isDisabled() &&
			TabCatalog.getPref('extensions.tabcatalog.bothclick.enabled') &&
			TabCatalog.button0Pressed && TabCatalog.button2Pressed
			) {
			aEvent.preventDefault();
			aEvent.stopPropagation();
			TabCatalog.show(TabCatalog.CALLED_BY_BOTH_CLICK);
		}

		if (TabCatalog.shown && TabCatalog.catalogPanning) {
			TabCatalog.button1Pressed = false;
			TabCatalog.exitPanningScroll();
		}
		else
			window.setTimeout('TabCatalog.button'+aEvent.button+'Pressed = false;', TabCatalog.getPref('extensions.tabcatalog.bothclick.delay'));

		window.setTimeout('TabCatalog.catalogZooming = false;');
	},
 
	onMouseOver : function(aEvent) 
	{
		if (this.catalogShowing ||
			this.catalogHiding ||
			this.catalogScrolling ||
			this.catalogPanning ||
			this.isDisabled())
			return;

		var node = this.getItemFromEvent(aEvent);
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
								shortcutTarget[0].relatedTabBrowser.selectedTab = shortcutTarget[0].relatedTab;
								TabCatalog.hide();
								shortcutTarget[0].relatedTab.ownerDocument.defaultView.focus();
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
			focusedNode.relatedTabBrowser.selectedTab = focusedNode.relatedTab;
			focusedNode.relatedTab.ownerDocument.defaultView.focus();
		}

		TabCatalog.hide();
	},
  
/* Thumbnails */ 
	
	onCatalogClick : function(aEvent) 
	{
		var node = this.getItemFromEvent(aEvent);

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
			if (!this.ignoreMiddleClick && tab)
				this.removeTab(tab);
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
				node.relatedTabBrowser.selectedTab = tab;
				tab.ownerDocument.defaultView.focus();
				this.hide();
			}
		}

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
 
	onBackgroundClick : function(aEvent) 
	{
		if (!this.catalogZooming)
			this.hide();
	},
 
	onThumbnailCloseBoxClick : function(aEvent) 
	{
		var node = this.getItemFromEvent(aEvent);
		if (!node) return;

		aEvent.preventDefault();
		aEvent.stopPropagation();

		this.removeTab(node.relatedTab);
	},
 
	onSliderClick : function(aEvent) 
	{
		var box = this.catalog.scrollbar.boxObject;

		if (aEvent.screenY < box.screenY)
			TabCatalog.scrollCatalogBy(-(window.innerHeight / 3 * 2));
		else if (aEvent.screenY > box.screenY + box.height)
			TabCatalog.scrollCatalogBy(window.innerHeight / 3 * 2);

		aEvent.stopPropagation();
	},
 
	onCatalogDragStart : function(aEvent) 
	{
		var node = TabCatalog.getItemFromEvent(aEvent);
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
		if (TabCatalog.catalogZooming) {
			var dir = aEvent.detail;
			if (TabCatalog.getPref('extensions.tabcatalog.zoom.reverseWheelScrollDirection')) dir = -dir;

			if (
				(dir > 0 && TabCatalog.scrollCounter < 0) ||
				(dir < 0 && TabCatalog.scrollCounter > 0)
				)
				TabCatalog.scrollCounter = 0;

			TabCatalog.scrollCounter += dir;
			if (Math.abs(TabCatalog.scrollCounter) >= TabCatalog.scrollThreshold) {
				TabCatalog.zoom(dir);
				TabCatalog.scrollCounter = 0;
			}

			aEvent.preventDefault();
			aEvent.stopPropagation();
		}
		else if (TabCatalog.catalog.overflow) {
			var h = Math.max(
					TabCatalog.catalog.tnHeight / 2,
					window.innerHeight / 5
				);
			TabCatalog.scrollCatalogBy((aEvent.detail > 0 ? 1 : -1) * h);
			aEvent.preventDefault();
			aEvent.stopPropagation();
		}
	},
	scrollCounter : 0,
	scrollThreshold : 5,
 
	onPanningScroll : function(aEvent) 
	{
		if (
			!TabCatalog.catalogPanning ||
			TabCatalog.catalogPanningBehavior < 0 ||
			!TabCatalog.enterPanningScroll(aEvent)
			)
			return;

		var pos;

		switch (TabCatalog.catalogPanningBehavior) {
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

		this.catalogPanningBehavior = this.catalogPanningByScrollbar ? 0 : TabCatalog.getPref('extensions.tabcatalog.panning.scrollBehavior') ;

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
		var tabs = this.tabs;

		if (
			this.callingAction ||
			this.shown ||
			tabs.length == 1 ||
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

		this.lastSelectedIndex = -1;
		for (var i = 0, max = tabs.length; i < max; i++)
		{
			if (tabs[i] == tabs[i].ownerDocument.defaultView.gBrowser.selectedTab) {
				this.lastSelectedIndex = i;
				break;
			}
		}

		if (
			(
				!aOnlyUpdate &&
				aRelative === void(0)
			) ||
			this.lastFocusedIndex >= tabs.length
			)
			this.lastFocusedIndex = -1;

		this.callingAction = aBase || this.callingAction || this.CALLED_BY_UNKNOWN ;
		this.initUI(aRelative);

		this.button0Pressed = false;
		this.button1Pressed = false;
		this.button2Pressed = false;

		window.addEventListener('DOMMouseScroll', this.onWheelScroll, true);
		if (this.catalog.overflow) {
			window.addEventListener('mousemove', this.onPanningScroll, true);
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

		window.removeEventListener('DOMMouseScroll', this.onWheelScroll, true);
		if (this.catalog.overflow) {
			window.removeEventListener('mousemove', this.onPanningScroll, true);
		}
		window.removeEventListener('resize', this.onCancel, true);
		window.removeEventListener('blur',   this.onCancel, true);

		this.animateStop();

		this.lastMouseOverThumbnail = null;
		this.lastSelectedIndex = -1;


		var focusedNode = this.getFocusedItem();
		this.lastFocusedIndex = (focusedNode) ? parseInt(focusedNode.getAttribute('index')) : -1 ;

		this.stopUpdateCanvas();
		this.clear();
		this.contextMenuShwon = false;
		this.shown = false;

		this.button0Pressed = false;
		this.button1Pressed = false;
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


		var tabs = this.tabs;
		var matrixData = this.getThumbnailMatrix(tabs, aRelative);

		var i;
		var max = tabs.length;

		var colCount = 0;
		var rowCount = 1;

		this.updateCanvasCue = [];

		var padding         = this.padding;
		var header          = this.header;
		var splitterHeight  = this.splitter;

		var offsetX = parseInt(((window.innerWidth-(
					matrixData.maxCol * (matrixData.width + padding)
				))/2) + (padding/2));

		var offsetY = matrixData.overflow ? padding :
				parseInt(((window.innerHeight-(
					(matrixData.maxRow * (matrixData.height + padding + header)) + matrixData.offsetY
				))/2) + (padding/2));

		var isMultiWindow = this.isMultiWindow;

		var splitByWindow = this.splitByWindow;
		var splitter;
		var splitterHeight  = this.splitter;

		var browser;
		for (i = 0; i < max; i++)
		{
			if (
				i > 0 &&
				splitByWindow &&
				tabs[i].ownerDocument != tabs[i-1].ownerDocument
				) {
				var splitter = document.createElement('box');
				splitter.setAttribute('class', 'tabcatalog-splitter');
				this.catalog.appendChild(splitter);

				splitter.style.position = 'absolute';
				splitter.style.zIndex   = 65500;
				splitter.style.left     = (offsetX - padding) + 'px !important';
				splitter.style.top      = parseInt(thumbnail.posY + matrixData.height + padding + padding + ((splitterHeight) / 2)) + 'px !important';
				splitter.style.width    = (window.innerWidth - ((offsetX - padding) * 2)) + 'px';
			}

			var b = tabs[i].linkedBrowser;

			var box = document.getElementById('thumbnail-item-template').firstChild.cloneNode(true);
			box.setAttribute('index',    i);
			box.setAttribute('title',    b.contentDocument.title);
			box.setAttribute('uri',      b.currentURI.spec);
			box.setAttribute('width',    matrixData.width);
			box.setAttribute('height',   matrixData.height);
			box.setAttribute('x',        matrixData.matrix[i].x);
			box.setAttribute('y',        matrixData.matrix[i].y);
			box.setAttribute('thumbnail-position', matrixData.matrix[i].x+'/'+matrixData.matrix[i].y);
			box.style.maxWidth  = matrixData.width+'px';
			box.style.maxHeight = matrixData.height+'px';
			if (i < 36) {
				var accesskey = Number(i).toString(36).toUpperCase();
				box.setAttribute('accesskey', accesskey);
				box.lastChild.lastChild.setAttribute('value', accesskey);
			}

			box.relatedTab        = tabs[i];
			box.relatedTabBrowser = tabs[i].__tabcatalog__relatedTabBrowser || tabs[i].parentNode;
			while (box.relatedTabBrowser.localName != 'tabbrowser')
			{
				box.relatedTabBrowser = box.relatedTabBrowser.parentNode;
				tabs[i].__tabcatalog__relatedTabBrowser = box.relatedTabBrowser;
			}

			// for Tabbrowser Extensions
			var color = tabs[i].getAttribute('tab-color')
			if (color && (color = color.split(':')[0]) != 'default')
				box.style.outlineColor = color;

			var canvas = this.getCanvasForTab(tabs[i]);
			box.childNodes[1].appendChild(canvas);
			canvas.relatedBox = box;

			if (isMultiWindow)
				this.drawWindowIndicator(canvas, tabs[i].ownerDocument.defaultView);

			var thumbnail = document.createElement('thumbnail');
			thumbnail.posX = offsetX + matrixData.matrix[i].posX;
			thumbnail.posY = offsetY + matrixData.matrix[i].posY;

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
					tabs[i] == tabs[i].__tabcatalog__relatedTabBrowser.selectedTab &&
					tabs[i].ownerDocument.defaultView == window
				)
				) {
				thumbnail.setAttribute('container-focused', true);
				box.setAttribute('focused', true);
				box.setAttribute('current', true);
			}

			canvas.style.width  = canvas.style.maxWidth  = matrixData.width+"px";
			canvas.style.height = canvas.style.maxHeight = matrixData.height+"px";
			canvas.thumbnailData = {
				tab    : tabs[i],
				width  : matrixData.width,
				height : matrixData.height,
				canvas : canvas,
				uri    : b.currentURI.spec,
				isMultiWindow : isMultiWindow
			};

			this.updateThumbnail(box);
			this.updateCanvasCue.push(canvas.thumbnailData);
		}

		this.catalog.posX       = 0;
		this.catalog.posY       = 0;
		this.catalog.style.left = 0;
		this.catalog.style.top  = 0;

		this.catalog.maxX       = matrixData.maxCol;
		this.catalog.maxY       = matrixData.maxRow;
		this.catalog.tnWidth    = matrixData.width;
		this.catalog.tnHeight   = matrixData.height;
		this.catalog.overflow   = matrixData.overflow;

		this.catalog.scrollX    = 0;
		this.catalog.scrollY    = 0;
		this.catalog.maxScrollX = matrixData.maxCol * (padding + matrixData.width);
		this.catalog.maxScrollY = thumbnail.posY + matrixData.height - window.innerHeight + padding + header;

		if (matrixData.overflow &&
			this.getPref('extensions.tabcatalog.show_scrollbar')) {
			var slider = document.createElement('box');
			slider.setAttribute('class', 'tabcatalog-scrollbar-slider');
			slider.setAttribute('id',    'tabcatalog-scrollbar-slider');
			this.catalog.appendChild(slider);

			slider.style.position = 'fixed';
			slider.style.left = (window.innerWidth - this.scrollbarSize)+'px';
			slider.style.zIndex = 135000;
			slider.style.width = this.scrollbarSize+'px';
			slider.style.height = (window.innerHeight + this.catalog.maxScrollY)+'px';

			var bar = document.createElement('box');
			bar.setAttribute('class', 'tabcatalog-scrollbar');
			bar.setAttribute('id',    'tabcatalog-scrollbar');
			this.catalog.appendChild(bar);

			bar.style.position = 'fixed';
			bar.style.left = (window.innerWidth - this.scrollbarSize)+'px';
			bar.style.zIndex = 165000;
			bar.style.width = this.scrollbarSize+'px';

			bar.style.height = parseInt(window.innerHeight * window.innerHeight / (window.innerHeight + this.catalog.maxScrollY))+'px';

			this.catalog.scrollbar = bar;

			this.updateScrollbar();
		}
		else
			this.catalog.scrollbar = null;

		this.updateCanvas();
	},
 
	updateScrollbar : function(aCurrent) 
	{
		if (!this.catalog.scrollbar) return;

		var curPos = aCurrent;
		if (curPos === void(0))
			curPos = this.catalog.scrollY;

		curPos = Math.max(Math.min(curPos, TabCatalog.catalog.maxScrollY), 0);

		this.catalog.scrollbar.style.top = parseInt((window.innerHeight - this.catalog.scrollbar.boxObject.height) * (curPos / this.catalog.maxScrollY))+'px';
	},
 
	getCanvasForTab : function(aTab) 
	{
		if (aTab.cachedCanvas) return aTab.cachedCanvas;

		var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.setAttribute('mouseover', 'TabCatalog.updateOneCanvas(this.thumbnailData, true);');

		if (this.getPref('extensions.tabcatalog.renderingInBackground')) {
			var filter = Components.classes['@mozilla.org/appshell/component/browser-status-filter;1'].createInstance(Components.interfaces.nsIWebProgress);
			var listener = this.createProgressListener(aTab, aTab.linkedBrowser);
			filter.addProgressListener(listener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
			aTab.linkedBrowser.webProgress.addProgressListener(filter, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

			canvas.progressListener = listener;
			canvas.progressFilter   = filter;
		}

		aTab.cachedCanvas = canvas;

		return canvas;
	},
 
	createProgressListener : function(aTab, aBrowser) 
	{
		return {
			mTab           : aTab,
			mBrowser       : aBrowser,
			onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
			{
			},
			onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
			{
				const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
				if (
					aStateFlags & nsIWebProgressListener.STATE_STOP &&
					aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK &&
					this.mTab.cachedCanvas
					) {
					TabCatalog.updateOneCanvas({
						tab    : this.mTab,
						canvas : this.mTab.cachedCanvas,
						uri    : aWebProgress.DOMWindow.location.href,
						isMultiWindow : TabCatalog.isMultiWindow
					}, true);
				}
			},
			onLocationChange : function(aWebProgress, aRequest, aLocation)
			{
			},
			onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
			{
			},
			onSecurityChange : function(aWebProgress, aRequest, aState)
			{
			},
			QueryInterface : function(aIID)
			{
				if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
					aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
					aIID.equals(Components.interfaces.nsISupports))
					return this;
				throw Components.results.NS_NOINTERFACE;
			}

		};
	},
 
	updateThumbnail : function(aThumbnailItem) 
	{
		var tab = aThumbnailItem.relatedTab;
		var b   = tab.linkedBrowser;
		var w   = b.contentWindow;

		aThumbnailItem.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-label')[0].setAttribute('value', b.contentDocument.title);

		if (tab.getAttribute('image'))
			aThumbnailItem.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-favicon')[0].setAttribute('src', tab.getAttribute('image'));
	},
	
	getThumbnailMatrix : function(aTabs, aRelative) 
	{
		var padding = this.padding;
		var header  = this.header;

		var tabs = aTabs || this.tabs;
		var tabNum = tabs.length;

		var boxObject = gBrowser.getBrowserForTab(gBrowser.selectedTab).boxObject;
		var aspectRatio  = boxObject.height / boxObject.width;

		var minSize = this.getPref('extensions.tabcatalog.thumbnail.min.enabled') ? Math.min(this.getPref('extensions.tabcatalog.thumbnail.min.size'), (aspectRatio  < 1 ? boxObject.width : boxObject.height )) : -1;

		var thumbnailMaxSize = window.innerWidth * window.innerHeight * 0.9 / tabNum;
		var boxWidth = parseInt(Math.min(Math.sqrt(thumbnailMaxSize), window.outerWidth * 0.5)) - padding;
		var boxHeight = parseInt(boxWidth * aspectRatio );

		var matrixData;

		if (aRelative !== void(0)) {
			if (aRelative > 0) {
				boxWidth = parseInt(Math.min(this.catalog.tnWidth * 1.2, boxObject.width - padding - padding));
				boxHeight = parseInt(boxWidth * aspectRatio );
			}
			else if (aRelative < 0) {
				boxWidth = parseInt(Math.max(this.catalog.tnWidth * 0.7, header));
				boxHeight = parseInt(boxWidth * aspectRatio );
			}
			matrixData = this.getThumbnailMatrixSub(boxWidth, boxHeight, tabs);
		}
		else {
			var minBoxWidth = minSize,
				minBoxHeight = minSize;
			if (minSize > -1) {
				if (aspectRatio  < 1)
					minBoxHeight = parseInt(minBoxWidth * aspectRatio);
				else
					minBoxWidth = parseInt(minBoxHeight / aspectRatio);

				boxWidth = Math.max(minBoxWidth, boxWidth);
				boxHeight = Math.max(minBoxHeight, parseInt(boxWidth * aspectRatio));
			}

			do {
				matrixData = this.getThumbnailMatrixSub(boxWidth, boxHeight, tabs);
				if (
					!matrixData.overflow ||
					boxWidth == minBoxWidth ||
					boxHeight == minBoxHeight
					)
					break;

				boxWidth = Math.max(minBoxWidth, parseInt(boxWidth * 0.9));
				boxHeight = Math.max(minBoxHeight, parseInt(boxWidth * aspectRatio));
			} while (true);
		}

		return {
			width    : boxWidth,
			height   : boxHeight,
			maxCol   : matrixData.maxCol,
			maxRow   : matrixData.maxRow,
			matrix   : matrixData.matrix,
			offsetY  : matrixData.offsetY,
			overflow : matrixData.overflow
		};
	},
 
	getThumbnailMatrixSub : function(aWidth, aHeight, aTabs) 
	{
		var tabs = aTabs || this.tabs;
		var tabNum = tabs.length;

		var padding = this.padding;
		var header  = this.header;
		var splitterHeight  = this.splitter;

		var splitByWindow = this.splitByWindow;

		var maxCol = Math.max(1, Math.floor((window.innerWidth - padding) / (aWidth + padding)));

		var matrix = [],
			offsetY = 0,
			colCount = 0,
			rowCount = 1;

		for (var i = 0; i < tabNum; i++)
		{
			colCount++;
			split = (
				i > 0 &&
				splitByWindow &&
				tabs[i].ownerDocument != tabs[i-1].ownerDocument
			);
			if ((colCount > maxCol) || split) {
				rowCount++;
				colCount = 1;
				if (split)
					offsetY += (padding + splitterHeight);
			}
			matrix.push({
				x : colCount,
				y : rowCount,
				posX : ((aWidth + padding) * (colCount - 1)),
				posY : (offsetY + ((aHeight + padding + header) * (rowCount-1)))
			});
		}
		return {
			matrix   : matrix,
			offsetY  : offsetY,
			maxCol   : maxCol,
			maxRow   : rowCount,
			overflow : (((aHeight + padding + header) * rowCount + padding + offsetY) > window.innerHeight)
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
			var tab    = data.tab;

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

		var tab = aData.tab;
		var b   = tab.linkedBrowser;
		var w   = b.contentWindow;

		var width  = aData.width || w.innerWidth;
		var height = aData.height || w.innerHeight;

		canvas.width  = canvas.maxWidth  = width;
		canvas.height = canvas.maxHeight = height;

		try {
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, width, height);
			ctx.save();
			ctx.scale(width/w.innerWidth, height/w.innerHeight);
			ctx.drawWindow(w, w.scrollX, w.scrollY, w.innerWidth, w.innerHeight, 'rgb(255,255,255)');
			ctx.restore();
		}
		catch(e) {
			dump('TabCatalog Error: ' + e.message + '\n');
		}

		if (aData.isMultiWindow)
			this.drawWindowIndicator(canvas, tab.ownerDocument.defaultView);

		canvas.setAttribute('current-uri', aData.uri);
		canvas.setAttribute('last-update-time', this.catalog.getAttribute('last-shown-time'));

		if (canvas.parentNode)
			this.updateThumbnail(canvas.parentNode.parentNode);
	},
 
	clear : function() 
	{
		var nodes = this.catalog.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'canvas');
		for (var i = nodes.length-1; i > -1; i--)
		{
			delete nodes[i].relatedBox.relatedTab;
			delete nodes[i].relatedBox.relatedTabBrowser;
			delete nodes[i].relatedBox;
			delete nodes[i].thumbnailData;
			nodes[i].parentNode.removeChild(nodes[i]);
		}

		var range = document.createRange();
		range.selectNodeContents(this.catalog);
		range.deleteContents();
		range.detach();
	},
  
	animate : function(aTarget, aProp, aStart, aEnd, aInterval, aCallbackFunc, aEndCallbackFunc) 
	{
		this.animateStop();

		this.animateTarget   = aTarget;
		this.animateProp     = aProp;
		this.animateCurrent  = aStart;
		this.animateEnd      = aEnd;
		this.animateStep     = (aEnd - aStart) / 5;
		this.animateRegisteredCallbackFunc    = aCallbackFunc;
		this.animateRegisteredEndCallbackFunc = aEndCallbackFunc;

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

		try {
			if (aThis.animateRegisteredCallbackFunc &&
				typeof aThis.animateRegisteredCallbackFunc == 'function')
				aThis.animateRegisteredCallbackFunc(aThis.animateCurrent);
		}
		catch(e) {
		}
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
			if (this.animateRegisteredEndCallbackFunc &&
				typeof this.animateRegisteredEndCallbackFunc == 'function')
				this.animateRegisteredEndCallbackFunc();
		}
		catch(e) {
		}
		this.animateRegisteredCallbackFunc = null;
		this.animateRegisteredEndCallbackFunc = null;
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
			this.updateScrollbar();
			window.setTimeout(this.scrollCatalogByAnimationEndCallback, 100);
		}
		else {
			this.animate(
				this.catalog.style,
				'top',
				originalY,
				this.catalog.posY,
				this.getPref('extensions.tabcatalog.animation.scroll.timeout'),
				this.scrollCatalogByAnimationCallback,
				this.scrollCatalogByAnimationEndCallback
			);
		}
	},
	scrollCatalogByAnimationCallback : function(aCurPos)
	{
		TabCatalog.updateScrollbar(-parseInt(aCurPos));
	},
	scrollCatalogByAnimationEndCallback : function()
	{
		TabCatalog.catalog.scrollY = -TabCatalog.catalog.posY;
		TabCatalog.updateScrollbar();
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

		for (i = max-1; i > -1; i--) {
			this.removeTab(nodes.snapshotItem(i).relatedTab, true);
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
			focusedNode.relatedTabBrowser.selectedTab = focusedNode.relatedTab;
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
 
