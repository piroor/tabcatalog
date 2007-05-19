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
			{
				if (!windows[i].gBrowser) continue;
				tabs = tabs.concat(Array.prototype.slice.call(windows[i].gBrowser.mTabContainer.childNodes));
				if (this.shouldRebuild(windows[i]))
					this.rebuildRequest = true;
			}
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
				this.updateBackground(true);
				var cache  = this.bgCanvas.firstChild;
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
	updateBackground : function(aForce)
	{
		if (
			!(aForce || this.backgroundShown) ||
			this.getPref('extensions.tabcatalog.rendering_quality') < 2
			) return;

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
 
	set rebuildRequest(val) 
	{
		if (val) {
			this.mRebuildRequestDate = (new Date()).getTime();
		}
		else {
			this.mLastRebuildDate = (new Date()).getTime();
		}
		return this.rebuildRequest;
	},
	mRebuildRequestDate : (new Date()).getTime(),
	mLastRebuildDate    : -1,
 
	shouldRebuild : function(aWindow) 
	{
		if (!aWindow) aWindow = window;
		return aWindow.TabCatalog.mRebuildRequestDate > this.mLastRebuildDate;
	},
  
/* get items */ 
	
	getItems : function() 
	{
		return Array.prototype.slice.call(this.catalog.getElementsByAttribute('class', 'tabcatalog-thumbnail'));
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
					document.createNSResolver(this.NSResolver),
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
 
	getItemForTab : function(aTab) 
	{
		var items = this.getItems();
		for (var i = 0, maxi = items.length; i < maxi; i++)
		{
			if (items[i].relatedTab == aTab)
				return items[i];
		}
		return null;
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

		var d = target.ownerDocument;
		try {
			var xpathResult = d.evaluate(
					'ancestor-or-self::*[@class and @class = "tabcatalog-thumbnail"]',
					target,
					d.createNSResolver(this.NSResolver),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
 
	getCanvasFromEvent : function(aEvent) 
	{
		var target;
		try {
			target = aEvent.originalTarget;
		}
		catch(e) {
		}
		if (!target) target = aEvent.target;

		var d = target.ownerDocument;
		try {
			var xpathResult = d.evaluate(
					'ancestor-or-self::*[local-name() = "canvas"]',
					target,
					d.createNSResolver(this.NSResolver),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
 
	getImageInLink : function(aNode) 
	{
		if (!aNode) return null;
		var d = aNode.ownerDocument;
		try {
			var xpathResult = d.evaluate(
					'descendant::*[local-name() = "img" or local-name() = "IMG"]',
					aNode,
					d.createNSResolver(this.NSResolver),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
 
	getParentClickableNode : function(aNode) 
	{
		if (!aNode) return null;
		var d = aNode.ownerDocument;
		try {
			var xpathResult = d.evaluate(
					'ancestor-or-self::*[((local-name() = "a" or local-name() = "A") and @href) or local-name() = "button" or local-name() = "BUTTON" or ((local-name() = "input" or local-name() = "INPUT") and (@type = "SUBMIT" or @type = "submit" or @type = "BUTTON" or @type = "button" or @type = "IMAGE" or @type = "image"))]',
					aNode,
					d.createNSResolver(this.NSResolver),
					XPathResult.FIRST_ORDERED_NODE_TYPE,
					null
				);
		}
		catch(e) {
			return null;
		}
		return xpathResult.singleNodeValue;
	},
 
	NSResolver : { 
		lookupNamespaceURI : function(aPrefix)
		{
			switch (aPrefix)
			{
				case 'xul':
					return 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
				case 'html':
				case 'xhtml':
					return 'http://www.w3.org/1999/xhtml';
				case 'xlink':
					return 'http://www.w3.org/1999/xlink';
				default:
					return '';
			}
		}
	},
 
	// Emulate events on canvas for related window 
	// codes from Tab Scope ( https://addons.mozilla.org/firefox/addon/4882 )
	 
	_getCorrespondingWindowAndPoint : function(aScreenX, aScreenY, aTargetThumbnail) 
	{
		var canvas  = aTargetThumbnail.relatedCanvas;
		var browser = aTargetThumbnail.relatedTab.linkedBrowser;

		var win = browser.contentWindow;
		var box = canvas.ownerDocument.getBoxObjectFor(canvas);
		var x = aScreenX - box.screenX;
		var y = aScreenY - box.screenY;
/*
		var css = window.getComputedStyle(canvas, null);
		x -= parseInt(css.marginLeft, 10) + parseInt(css.borderLeftWidth, 10) + parseInt(css.paddingLeft, 10);
		y -= parseInt(css.marginTop, 10)  + parseInt(css.borderTopWidth, 10)  + parseInt(css.paddingTop, 10);
*/
		var xScale = canvas.width / win.innerWidth;
		var yScale = canvas.height / win.innerHeight;
		var docBox = win.document.getBoxObjectFor(win.document.documentElement);
		x = parseInt(x / xScale, 10) + docBox.screenX + win.scrollX;
		y = parseInt(y / yScale, 10) + docBox.screenY + win.scrollY;
		return { window : this.getWindowFromPoint(win, x, y), x : x, y : y };
	},
	 
	getWindowFromPoint : function(aWindow, aScreenX, aScreenY) 
	{
		var wins = this.flattenWindows(aWindow);
		for (var i = wins.length - 1; i >= 0; i--) {
			var win = wins[i];
			var frameList = [];
			var arr = win.document.getElementsByTagName('frame');
			for (var j = 0; j < arr.length; j++)
				frameList.push(arr[j]);
			var arr = win.document.getElementsByTagName('iframe');
			for (var j = 0; j < arr.length; j++)
				frameList.push(arr[j]);
			for (var j = frameList.length - 1; j >= 0; j--) {
				var box = win.document.getBoxObjectFor(frameList[j]);
				var l = box.screenX;
				var t = box.screenY;
				var r = l + box.width;
				var b = t + box.height;
				if (l <= aScreenX && aScreenX <= r && t <= aScreenY && aScreenY <= b)
					return frameList[j].contentWindow;
			}
		}
		return aWindow;
	},
	
	flattenWindows : function(aWindow) 
	{
		var ret = [aWindow];
		for (var i = 0; i < aWindow.frames.length; i++)
			ret = ret.concat(this.flattenWindows(aWindow.frames[i]));
		return ret;
	},
   
	getClickableElementFromPoint : function(aWindow, aScreenX, aScreenY) 
	{
		var accNode;
		try {
			/*
				クリック位置からアクセシビリティ用のノードを得る
				参考：http://www.mozilla-japan.org/access/architecture.html
			*/
			var accService = Components.classes['@mozilla.org/accessibilityService;1']
								.getService(Components.interfaces.nsIAccessibilityService);
			var acc = accService.getAccessibleFor(aWindow.document);
			var box = aWindow.document.getBoxObjectFor(aWindow.document.documentElement);
			accNode = /* acc.getChildAtPoint(aScreenX - box.screenX, aScreenY - box.screenY) || */ acc.getChildAtPoint(aScreenX, aScreenY);
			/* アクセシビリティ用のノードからDOMのノードを得る */
			accNode = accNode.QueryInterface(Components.interfaces.nsIAccessNode).DOMNode;
//dump(accNode+'\n');
//dump(accNode.localName+'\n');
			/*
				この時点で、得られたノードがクリック可能な要素またはその子孫である場合、
				祖先をたどってクリック可能な要素を返す。
			*/
			var clickable = accNode ? this.getParentClickableNode(accNode) : null ;
			if (clickable)
				return this.getImageInLink(clickable) || clickable;
		}
		catch(e) {
//			dump(e+'\n');
		}

		var doc = aWindow.document;
		/*
			アクセシビリティ用のノードから得られたDOMノードがクリック可能な要素または
			その子孫で *なかった* 場合でも、かなり近い位置の祖先ノードは取得できている。
			なので、検索をそこからスタートすれば、相当な高速化になる。
		*/
		var startNode = accNode || doc;
		var filter = function(aNode) {
			switch (aNode.localName) {
				case 'A':
					if (aNode.href)
						return NodeFilter.FILTER_ACCEPT;
					break;
				case 'BUTTON':
					return NodeFilter.FILTER_ACCEPT;
					break;
				case 'INPUT':
					if (aNode.type == 'button' || aNode.type == 'submit' || aNode.type == 'image')
						return NodeFilter.FILTER_ACCEPT;
					break;
			}
			return NodeFilter.FILTER_SKIP;
		};
		var img;
		var walker = aWindow.document.createTreeWalker(startNode, NodeFilter.SHOW_ELEMENT, filter, false);
		for (var node = walker.firstChild(); node != null; node = walker.nextNode())
		{
			if (
				node.hasChildNodes() &&
				(img = this.getImageInLink(node))
				)
				node = img;
			var box = doc.getBoxObjectFor(node);
			var l = box.screenX;
			var t = box.screenY;
			var r = l + box.width;
			var b = t + box.height;
			if (l <= aScreenX && aScreenX <= r && t <= aScreenY && aScreenY <= b)
				return node;
		}
		return null;
	},
   
/* check */ 
	
	isEventFiredInMenu : function(aEvent) 
	{
		var d = aEvent.originalTarget.ownerDocument;
		try {
			var xpathResult = d.evaluate(
					'ancestor-or-self::*[local-name() = "menuitem"]',
					aEvent.originalTarget,
					d.createNSResolver(this.NSResolver),
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
 
	isDelayed : function(aEvent) 
	{

		if (
			this.getPref('extensions.tabcatalog.override.ctrltab.delay.enabled') &&
			!aEvent.altKey &&
			(navigator.platform.match(/mac/i) ? aEvent.metaKey : aEvent.ctrlKey ) &&
			(
				aEvent.keyCode == aEvent.DOM_VK_TAB ||
				aEvent.keyCode == aEvent.DOM_VK_PAGE_DOWN ||
				aEvent.keyCode == aEvent.DOM_VK_PAGE_UP ||
				aEvent.keyCode == aEvent.DOM_VK_SHIFT
			)
			) {
			var nowTime = (new Date()).getTime();
			if (aEvent.type == 'keydown' && this.delayedKeydownTime < 0)
				this.delayedKeydownTime = nowTime;

			if (nowTime - this.delayedKeydownTime <= this.getPref('extensions.tabcatalog.override.ctrltab.delay'))
				return true;

			return false;
		}

		this.delayedKeydownTime = -1;
		return false;
	},
	delayedKeydownTime : -1,
  
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
			else {
				window.focus();
				var count = 0;
				window.setTimeout(function(aWindow) {
					if (win.closed)
						TabCatalog.show(base);
					else if (count++ < 1000)
						window.setTimeout(arguments.callee, 10);
				}, 10);
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
		window.addEventListener('resize',    this.onResize,     true);

		gBrowser.addEventListener('mouseover', this.onTabBarMouseOver, true);
		gBrowser.addEventListener('mouseout',  this.onTabBarMouseOut,  true);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing',  this.cancelContextMenu,  true);

		this.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.override.allinonegest');
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.shortcut');
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.header');
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.closebox');
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.thumbnail.shortcut');
		this.observe(null, 'nsPref:changed', 'extensions.tabcatalog.send_click_event');

		window.addEventListener('unload', function() {
			window.removeEventListener('unload', arguments.callee, false);
			TabCatalog.destroy();
		}, false);

		gBrowser.mTabContainer.addEventListener('select', this.onTabSelect, true);
		gBrowser.selectedTab.__tabcatalog__lastSelectedTime = (new Date()).getTime();

		this.updateTabBrowser(gBrowser);

		var nullPointer = this.tabContextMenu;

		var ObserverService = Components
			.classes['@mozilla.org/observer-service;1']
			.getService(Components.interfaces.nsIObserverService);
		ObserverService.addObserver(this, 'TabCatalog:browserWindowClosed', false);

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
		var addTabMethod = 'addTab';
		var removeTabMethod = 'removeTab';
		if (aTabBrowser.__tabextensions__addTab) {
			addTabMethod = '__tabextensions__addTab';
			removeTabMethod = '__tabextensions__removeTab';
		}

		aTabBrowser.__tabcatalog__originalAddTab = aTabBrowser[addTabMethod];
		aTabBrowser[addTabMethod] = function() {
			var tab = this.__tabcatalog__originalAddTab.apply(this, arguments);
			TabCatalog.rebuildRequest = true;
			try {
				TabCatalog.initTab(tab, this);
				if (TabCatalog.shown)
					window.setTimeout('TabCatalog.updateUI();', 0);
			}
			catch(e) {
			}
			return tab;
		};

		aTabBrowser.__tabcatalog__originalRemoveTab = aTabBrowser[removeTabMethod];
		aTabBrowser[removeTabMethod] = function(aTab) {
			try {
				TabCatalog.destroyTab(aTab);
			}
			catch(e) {
			}

			var retVal = this.__tabcatalog__originalRemoveTab.apply(this, arguments);

			if (aTab.parentNode)
				TabCatalog.initTab(aTab, this);

			TabCatalog.rebuildRequest = true;

			return retVal;
		};

		aTabBrowser.__tabcatalog__originalMoveTabTo = aTabBrowser.moveTabTo;
		aTabBrowser.moveTabTo = function() {
			var tab = this.__tabcatalog__originalMoveTabTo.apply(this, arguments);
			TabCatalog.rebuildRequest = true;
			return tab;
		};

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.initTab(tabs[i], aTabBrowser);
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
		window.removeEventListener('resize',    this.onResize,     true);

		gBrowser.removeEventListener('mouseover', this.onTabBarMouseOver, true);
		gBrowser.removeEventListener('mouseout',  this.onTabBarMouseOut,  true);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing',  this.cancelContextMenu,  true);

		this.removePrefListener(this);

		gBrowser.mTabContainer.removeEventListener('select', this.onTabSelect, true);

		var tabs = gBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.destroyTab(tabs[i]);
		}

		var ObserverService = Components
			.classes['@mozilla.org/observer-service;1']
			.getService(Components.interfaces.nsIObserverService);
		ObserverService.removeObserver(this, 'TabCatalog:browserWindowClosed');
		ObserverService.notifyObservers(window, 'TabCatalog:browserWindowClosed', null);

		this.updateCanvasCue = [];
		this.initCanvasCue = [];
	},
  
/* nsIObserver */ 
	
	domain  : 'extensions.tabcatalog', 
 
	observe : function(aSubject, aTopic, aPrefName) 
	{
		switch (aTopic)
		{
			case 'TabCatalog:browserWindowClosed':
				if (this.getPref('extensions.tabcatalog.showAllWindows'))
					this.rebuildRequest = true;
				break;

			case 'nsPref:changed':
				var value = this.getPref(aPrefName);
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
						this.shortcut = null;
						break;

					case 'extensions.tabcatalog.thumbnail.header':
						if (this.getPref(aPrefName))
							this.catalog.setAttribute('show-thumbnail-header', true);
						else
							this.catalog.removeAttribute('show-thumbnail-header');
						break;

					case 'extensions.tabcatalog.thumbnail.closebox':
						if (this.getPref(aPrefName))
							this.catalog.setAttribute('show-thumbnail-closebox', true);
						else
							this.catalog.removeAttribute('show-thumbnail-closebox');
						break;

					case 'extensions.tabcatalog.thumbnail.shortcut':
						this.thumbnailShortcutEnabled = this.getPref(aPrefName);
						if (this.thumbnailShortcutEnabled)
							this.catalog.setAttribute('show-thumbnail-shortcut', true);
						else
							this.catalog.removeAttribute('show-thumbnail-shortcut');
						break;

					case 'extensions.tabcatalog.thumbnail.min.size':
						this.rebuildRequest = true;
						break;

					case 'extensions.tabcatalog.send_click_event':
						this.shouldSendClickEvent = this.getPref(aPrefName);
						if (this.shouldSendClickEvent)
							this.catalog.setAttribute('show-thumbnail-toolbar-buttons', true);
						else
							this.catalog.removeAttribute('show-thumbnail-toolbar-buttons');
						break;

					default:
						break;
				}
				break;
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

		this.show(aBase);
	},
 
	cancelDelayedMouseOver : function() 
	{
		if (this.delayedOnMouseOverTimer) {
			window.clearTimeout(this.delayedOnMouseOverTimer);
			this.delayedOnMouseOverTimer = null;
		}
	},
  
	onResize : function(aEvent) 
	{
		if (aEvent.target != document)
			return;

		TabCatalog.rebuildRequest = true;
		TabCatalog.hide();
	},
 	
	onBlur : function(aEvent) 
	{
		TabCatalog.hide();
	},
 
	onTabSelect : function(aEvent) 
	{
		if (!TabCatalog.catalogShowing) {
			gBrowser.selectedTab.__tabcatalog__lastSelectedTime = (new Date()).getTime();
			if (TabCatalog.getPref('extensions.tabcatalog.sort_by_focus'))
				TabCatalog.rebuildRequest = true;
		}
	},
  
/* Key Events */ 
	
	onKeyDown : function(aEvent) 
	{
		if (
			TabCatalog.isDisabled() ||
			TabCatalog.isDelayed(aEvent)
			) return;

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
		if (
			TabCatalog.isDisabled() ||
			TabCatalog.isDelayed(aEvent)
			) return;

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
					standBy &&
					(
						(!aEvent.shiftKey && !navigator.platform.match(/linux/i)) ||
						(aEvent.shiftKey && navigator.platform.match(/linux/i))
					) &&
					(aEvent.charCode == 0 && aEvent.keyCode == 16)
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

		var isMiddleClick = (
				aEvent.type == 'click' &&
				(
					aEvent.button == 1/* ||
					(
						aEvent.button == 0 &&
						(
							(this.callingAction != this.CALLED_BY_TABSWITCH && aEvent.ctrlKey) ||
							aEvent.metaKey
						)
					) */
				)
			);

		if (
			aEvent.type == 'click' &&
			aEvent.button == 0 &&
			aEvent.ctrlKey &&
			this.callingAction != this.CALLED_BY_TABSWITCH
			) {
			if (node.getAttribute('selected') == 'true')
				node.removeAttribute('selected');
			else
				node.setAttribute('selected', true);
		}
		else if (aEvent.type == 'click' && aEvent.button == 2) {
			this.showPopupMenu(aEvent, this.tabContextMenu);
		}
		else if (tab) {
			if (
				aEvent.type == 'click' &&
				this.shouldSendClickEvent &&
				this.getCanvasFromEvent(aEvent) &&
				tab.linkedBrowser.contentDocument.contentType.indexOf('image') != 0
				) {
				if (
					this.sendClickEvent(aEvent, node) ||
					(
						(
							!isMiddleClick ||
							this.getPref('extensions.tabcatalog.send_click_event.middlebutton')
						) &&
						this.getPref('extensions.tabcatalog.send_click_event.ignore_on_unclickable')
					)
					) return;
			}

			if (isMiddleClick) {
				if (!this.ignoreMiddleClick)
					this.removeTab(tab);
			}
			else {
				node.relatedTabBrowser.selectedTab = tab;
				tab.ownerDocument.defaultView.focus();
				this.hide();
			}
		}

		aEvent.preventDefault();
		aEvent.stopPropagation();
	},
	 
	sendClickEvent : function(aEvent, aTargetThumbnail) 
	{
		/*
		// Gecko 1.9
		try {
			var canvas  = aTargetThumbnail.relatedCanvas;
			var browser = aTargetThumbnail.relatedTab.linkedBrowser;

			var box = canvas.ownerDocument.getBoxObjectFor(canvas);
			var scale = browser.boxObject.width / box.width;
			var x = parseInt((aEvent.screenX - box.screenX) * scale);
			var y = parseInt((aEvent.screenY - box.screenY) * scale);

			var utils = browser.contentWindow
					.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
					.getInterface(Components.interfaces.nsIDOMWindowUtils);
			utils.sendMouseEvent(aEvent.type, x, y, aEvent.button, aEvent.detail, 0);
			return true;
		}
		catch(e) {
		}
		*/

		var ret = this._getCorrespondingWindowAndPoint(aEvent.screenX, aEvent.screenY, aTargetThumbnail);
		var elt = this.getClickableElementFromPoint(ret.window, ret.x, ret.y);
		if (!elt)
			return false;
		var evt = ret.window.document.createEvent('MouseEvents');
		evt.initMouseEvent(
			aEvent.type,
			true,
			false,
			ret.window.document.defaultView,
			aEvent.detail,
			aEvent.screenX,
			aEvent.screenY,
			ret.x,
			ret.y,
			aEvent.ctrlKey,
			aEvent.altKey,
			aEvent.shiftKey,
			aEvent.metaKey,
			aEvent.button,
			null
		);
		elt.dispatchEvent(evt);
		return true;
	},
  
	onCatalogToolbarButtonCommand : function(aEvent) 
	{
		var item   = this.getItemFromEvent(aEvent);
		var b      = item.relatedTab.linkedBrowser;
		var button = aEvent.target;

		switch (button.getAttribute('class').split(' ')[1])
		{
			case 'goBack':
				if (b.canGoBack) {
					b.goBack();
				}
				break;

			case 'goForward':
				if (b.canGoForward) {
					b.goForward();
				}
				break;

			case 'reload':
				if (aEvent.shiftKey) {
					var webNav = b.webNavigation;
					try {
						var sh = webNav.sessionHistory;
						if (sh)
							webNav = sh.QueryInterface(nsIWebNavigation);
					}
					catch(e) {
					}
					const reloadFlags = webNav.LOAD_FLAGS_BYPASS_PROXY | webNav.LOAD_FLAGS_BYPASS_CACHE;
					try {
						webNav.reload(reloadFlags);
					}
					catch(e) {
					}
				}
				else
					b.reload();
				break;

			case 'stop':
				b.stop();
				break;

			default:
				return;
		}

		aEvent.stopPropagation();
		aEvent.preventDefault();
	},
 
	onCatalogMouseMove : function(aEvent) 
	{
		if (!TabCatalog.isSendingScrollEvent)
			TabCatalog.redrawBoxOnLink(aEvent);
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
		else if (TabCatalog.getPref('extensions.tabcatalog.send_wheel_event') &&
				TabCatalog.getCanvasFromEvent(aEvent) &&
				TabCatalog.sendWheelScrollEvent(aEvent, TabCatalog.getItemFromEvent(aEvent))) {
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
	 
	sendWheelScrollEvent : function(aEvent, aTargetThumbnail) 
	{
		var canvas  = aTargetThumbnail.relatedCanvas;
		var browser = aTargetThumbnail.relatedTab.linkedBrowser;

		var box = canvas.ownerDocument.getBoxObjectFor(canvas);
		var ret = this._getCorrespondingWindowAndPoint(
			aEvent.screenX + box.screenX,
			aEvent.screenY + box.screenY,
			aTargetThumbnail
		);

		if (!ret.window.scrollMaxY) return false;

		this.isSendingScrollEvent = true;

		if (aEvent.detail < 0)
			ret.window.scrollBy(0, -100);
		else
			ret.window.scrollBy(0, +100);

		if (!aTargetThumbnail.updateTimer) {
			aTargetThumbnail.updateTimer = setTimeout(function() {
				TabCatalog.isSendingScrollEvent = false;
				TabCatalog.updateOneCanvas({
					canvas        : canvas,
					tab           : aTargetThumbnail.relatedTab,
					isMultiWindow : TabCatalog.isMultiWindow
				});
				if (aTargetThumbnail.relatedTab == aTargetThumbnail.relatedTabBrowser.selectedTab)
					TabCatalog.updateBackground();
				aTargetThumbnail.updateTimer = null;
			}, 50);
		}

		return true;
	},
  
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
							TabCatalog.catalog.scrollMaxY /
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
	},
 
	onButtonMouseOut : function(aEvent) 
	{
		if ((this.callingAction & this.CALLED_MANUALLY) ||
			this.contextMenuShwon)
			return;

		this.cancelDelayedMouseOver();
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
	},
 
	onTabBarMouseOut : function(aEvent) 
	{
		if (!TabCatalog.getPref('extensions.tabcatalog.auto_show.tabbar.enabled') ||
			(TabCatalog.callingAction & TabCatalog.CALLED_MANUALLY) ||
			TabCatalog.contextMenuShwon ||
			!TabCatalog.isEventFiredOnTabBar(aEvent))
			return;

		TabCatalog.cancelDelayedMouseOver();
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

		var nodes = this.getSelectedTabItems();
		if (nodes.snapshotLength) {
			for (i = nodes.snapshotLength-1; i > -1; i--)
				nodes.snapshotItem(i).removeAttribute('selected');
		}

		this.callingAction = aBase || this.callingAction || this.CALLED_BY_UNKNOWN ;
		this.initUI(aRelative);

		var items = this.getItems();
		this.moveFocusToItem(items[this.lastFocusedIndex], true);

		if (this.shouldSendClickEvent &&
			this.getPref('extensions.tabcatalog.send_click_event.indicate_clickable'))
			window.addEventListener('mousemove', this.onCatalogMouseMove, true);

		this.button0Pressed = false;
		this.button1Pressed = false;
		this.button2Pressed = false;

		window.addEventListener('DOMMouseScroll', this.onWheelScroll, true);
		if (this.catalog.overflow) {
			window.addEventListener('mousemove', this.onPanningScroll, true);
		}
		window.addEventListener('blur', this.onBlur, true);

		if (this.getPref('extensions.tabcatalog.rendering_quality') > 0)
			this.catalog.setAttribute('dropshadow', true);
		else
			this.catalog.removeAttribute('dropshadow');


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

	CALLED_MANUALLY       : 62, // 2+4+8+16+32

	CALLED_BY_BUTTON      : 64,
	CALLED_BY_TABBAR      : 128,

	CALLED_AUTOMATICALLY  : 192, // 64+128

	CALLED_FOR_SWITCHING  : 48, // 16+32
 
	hide : function() 
	{
		if (!this.shown) return;

		this.catalogHiding = true;

		try {
			window.removeEventListener('mousemove', this.onCatalogMouseMove, true);
		}
		catch(e) {
		}

		window.removeEventListener('DOMMouseScroll', this.onWheelScroll, true);
		if (this.catalog.overflow) {
			window.removeEventListener('mousemove', this.onPanningScroll, true);
		}
		window.removeEventListener('blur', this.onBlur, true);

		this.animateStop();

		this.lastMouseOverThumbnail = null;
		this.lastSelectedIndex = -1;


		var focusedNode = this.getFocusedItem();
		this.lastFocusedIndex = (focusedNode) ? parseInt(focusedNode.getAttribute('index')) : -1 ;

		this.stopInitCanvas();
		this.stopUpdateCanvas();
//		this.clear();
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
//dump('REBUILD ? '+this.shouldRebuild()+'\n');
		if (!this.shouldRebuild()) {
			var tabs = this.tabs;
			for (var i = 0, max = tabs.length; i < max; i++)
			{
				if (
					this.lastFocusedIndex == i ||
					(
						this.lastFocusedIndex < 0 &&
						tabs[i] == tabs[i].__tabcatalog__relatedTabBrowser.selectedTab &&
						tabs[i].ownerDocument.defaultView == window
					)
					) {
					this.lastFocusedIndex = i;
				}
			}

			this.initCanvas();
			this.updateCanvas();

			return;
		}

		this.rebuildRequest = false;

		this.clear(true);

		var tabs = this.tabs;
		var matrixData = this.getThumbnailMatrix(tabs, aRelative);

		this.updateCanvasCue = [];
		this.initCanvasCue = [];

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

		matrixData.isMultiWindow = this.isMultiWindow;
		matrixData.splitByWindow = this.splitByWindow;

		var current = 0;
		var items   = this.getItems();
		var max     = tabs.length;
		while (items.length > max)
		{
			this.catalog.removeChild(items[items.length-1].parentNode);
			items.splice(items.length-1, 1);
		}

		for (var i = 0; i < max; i++)
		{
			if (
				i > 0 &&
				matrixData.splitByWindow &&
				tabs[i].ownerDocument != tabs[i-1].ownerDocument
				) {
				var splitter = document.createElement('box');
				splitter.setAttribute('class', 'tabcatalog-splitter');
				this.catalog.appendChild(splitter);

				splitter.style.position = 'absolute';
				splitter.style.zIndex   = 65500;
				splitter.style.left     = (offsetX - padding) + 'px !important';
				splitter.style.top      = parseInt(thumbnail.posYBase + matrixData.height + padding + padding + ((splitterHeight) / 2)) + 'px !important';
				splitter.style.width    = (window.innerWidth - ((offsetX - padding) * 2)) + 'px';
			}

			var b = tabs[i].linkedBrowser;

			matrixData.matrix[i].width  = matrixData.width;
			matrixData.matrix[i].height = matrixData.height;
			if (matrixData.matrix[i].aspectRatio < 1)
				matrixData.matrix[i].height = Math.min(matrixData.height, matrixData.width * matrixData.matrix[i].aspectRatio);
			else
				matrixData.matrix[i].width = Math.min(matrixData.width, matrixData.height / matrixData.matrix[i].aspectRatio);

			var box = (i in items) ? items[i] : document.getElementById('thumbnail-item-template').firstChild.cloneNode(true) ;
			var thumbnail = (i in items) ? box.parentNode : null ;

			if (!thumbnail) {
				thumbnail = document.createElement('thumbnail');
				thumbnail.setAttribute('class', 'tabcatalog-thumbnail-box');
				thumbnail.appendChild(box);
				this.catalog.appendChild(thumbnail);
			}

			if (box.relatedCanvas) {
				box.relatedCanvas.width = 0;
				box.relatedCanvas.height = 0;
				box.childNodes[1].style.width  = box.childNodes[1].style.maxWidth  = box.relatedCanvas.style.width  = box.relatedCanvas.style.maxWidth  = 0;
				box.childNodes[1].style.height = box.childNodes[1].style.maxHeight = box.relatedCanvas.style.height = box.relatedCanvas.style.maxHeight = 0;
			}

			box.setAttribute('index', i);
			box.setAttribute('title', b.contentDocument.title);
			box.setAttribute('uri',   b.currentURI.spec);
			box.setAttribute('x',     matrixData.matrix[i].x);
			box.setAttribute('y',     matrixData.matrix[i].y);
			box.setAttribute('thumbnail-position', matrixData.matrix[i].x+'/'+matrixData.matrix[i].y);

			box.childNodes[1].style.width  = box.childNodes[1].style.maxWidth  = matrixData.matrix[i].width+'px';
			box.childNodes[1].style.height = box.childNodes[1].style.maxHeight = matrixData.matrix[i].height+'px';

			if (i < 36) {
				var accesskey = Number(i).toString(36).toUpperCase();
				box.setAttribute('accesskey', accesskey);
				box.lastChild.lastChild.setAttribute('value', accesskey);
			}
			else {
				box.removeAttribute('accesskey');
				box.lastChild.lastChild.removeAttribute('value');
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
			else
				box.style.outlineColor = '';

			thumbnail.posXBase = offsetX + matrixData.matrix[i].posX;
			thumbnail.posYBase = offsetY + matrixData.matrix[i].posY;

			thumbnail.posX = thumbnail.posXBase + ((matrixData.width - matrixData.matrix[i].width) / 2);
			thumbnail.posY = thumbnail.posYBase + ((matrixData.height - matrixData.matrix[i].height) / 2);

			thumbnail.style.position = 'absolute';
			thumbnail.style.zIndex   = 65500;
			thumbnail.style.left     = thumbnail.posX + 'px';
			thumbnail.style.top      = thumbnail.posY + 'px';

			if (
				this.lastFocusedIndex == i ||
				(
					this.lastFocusedIndex < 0 &&
					tabs[i] == tabs[i].__tabcatalog__relatedTabBrowser.selectedTab &&
					tabs[i].ownerDocument.defaultView == window
				)
				) {
				this.lastFocusedIndex = i;
				current = i;
			}

			this.initCanvasCue.push({
				index      : i,
				tab        : tabs[i],
				matrixData : matrixData,
				box        : box
			});

			this.updateThumbnail(box);
		}


		/*
			現在のタブを中心にして、前後のタブのサムネイルから更新していく。
			一覧の左上から更新していくのに比べて、体感的にはこっちの方が
			「待たされている」感が少なくてすむ……はず。
		*/

		// 現在のタブのサムネイルは常にすぐ更新
		this.initOneCanvas(this.initCanvasCue[current]);

		items = this.getItems();
		var newCue = [];
		var nextCue = current;
		var prevCue = current;
		var max = this.initCanvasCue.length;
		var count = 0;
		var checked = {};
		while (count < max-1)
		{
			nextCue = (nextCue + 1) % max;
			if (!(nextCue in checked)) {
				if (items[nextCue].relatedCanvas)
					this.initOneCanvas(this.initCanvasCue[nextCue]);
				else
					newCue.push(this.initCanvasCue[nextCue]);

				checked[nextCue] = true;
				count++;
			}

			prevCue = (prevCue - 1 + max) % max;
			if (!(prevCue in checked)) {
				if (items[prevCue].relatedCanvas)
					this.initOneCanvas(this.initCanvasCue[prevCue]);
				else
					newCue.push(this.initCanvasCue[prevCue]);

				checked[prevCue] = true;
				count++;
			}
		}
		this.initCanvasCue = newCue;


		this.initCanvas();
		this.updateCanvas();

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
		this.catalog.scrollMaxY = offsetY + matrixData.matrix[max-1].posY + matrixData.height - window.innerHeight + padding + header;

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
			slider.style.height = (window.innerHeight + this.catalog.scrollMaxY)+'px';

			var bar = document.createElement('box');
			bar.setAttribute('class', 'tabcatalog-scrollbar');
			bar.setAttribute('id',    'tabcatalog-scrollbar');
			this.catalog.appendChild(bar);

			bar.style.position = 'fixed';
			bar.style.left = (window.innerWidth - this.scrollbarSize)+'px';
			bar.style.zIndex = 165000;
			bar.style.width = this.scrollbarSize+'px';

			bar.style.height = parseInt(window.innerHeight * window.innerHeight / (window.innerHeight + this.catalog.scrollMaxY))+'px';

			this.catalog.scrollbar = bar;

			this.updateScrollbar();
		}
		else
			this.catalog.scrollbar = null;
	},
 
	initCanvas : function() 
	{
		if (this.initCanvasTimer) return;
		window.setTimeout('TabCatalog.initCanvasCallback()', 0);
	},
	stopInitCanvas : function()
	{
		if (this.initCanvasTimer) {
			window.clearTimeout(this.initCanvasTimer);
			this.initCanvasTimer = null;
		}
	},
	initCanvasCallback : function()
	{
		if (!this.initCanvasCue.length) {
			this.stopInitCanvas();
			return;
		}

		var cue = this.initCanvasCue[0];
		this.initCanvasCue.splice(0, 1);
		this.initOneCanvas(cue);

		if (!this.initCanvasCue.length)
			this.stopInitCanvas();
		else
			this.initCanvasTimer = window.setTimeout('TabCatalog.initCanvasCallback()', 0);
	},
	initCanvasCue : [],
	initCanvasTimer : null,
	initOneCanvas : function(aCue)
	{
		var index      = aCue.index;
		var tab        = aCue.tab;
		var matrixData = aCue.matrixData;
		var box        = aCue.box;

		var width  = matrixData.matrix[index].width;
		var height = matrixData.matrix[index].height;

		var canvas = box.relatedCanvas || document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas') ;
		canvas.style.width  = canvas.style.maxWidth  = width+"px";
		canvas.style.height = canvas.style.maxHeight = height+"px";

		if (!canvas.relatedBox) {
			box.childNodes[1].appendChild(canvas);
			canvas.relatedBox = box;
			box.relatedCanvas = canvas;
		}

		if (matrixData.isMultiWindow)
			this.drawWindowIndicator(canvas, tab.ownerDocument.defaultView);

		var thumbnailData = {
			tab    : tab,
			width  : matrixData.width,
			height : matrixData.height,
			canvas : canvas,
			isMultiWindow : matrixData.isMultiWindow
		};

		if (tab.getAttribute('busy')) {
			this.updateCanvasCue.push(thumbnailData);
			this.updateCanvas();
		}
		else {
			this.updateOneCanvas(thumbnailData);
		}
	},
 
	updateScrollbar : function(aCurrent) 
	{
		if (!this.catalog.scrollbar) return;

		var curPos = aCurrent;
		if (curPos === void(0))
			curPos = this.catalog.scrollY;

		curPos = Math.max(Math.min(curPos, TabCatalog.catalog.scrollMaxY), 0);

		this.catalog.scrollbar.style.top = parseInt((window.innerHeight - this.catalog.scrollbar.boxObject.height) * (curPos / this.catalog.scrollMaxY))+'px';
	},
 
	initTab : function(aTab, aTabBrowser) 
	{
		if (aTab.__tabcatalog__progressListener) return;

		var filter = Components.classes['@mozilla.org/appshell/component/browser-status-filter;1'].createInstance(Components.interfaces.nsIWebProgress);
		var listener = this.createProgressListener(aTab, aTabBrowser);
		filter.addProgressListener(listener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTab.linkedBrowser.webProgress.addProgressListener(filter, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

		aTab.__tabcatalog__progressListener = listener;
		aTab.__tabcatalog__progressFilter   = filter;
	},
 
	destroyTab : function(aTab) 
	{
		if (!aTab.__tabcatalog__progressListener) return;

		aTab.linkedBrowser.webProgress.removeProgressListener(aTab.__tabcatalog__progressFilter);
		aTab.__tabcatalog__progressFilter.removeProgressListener(aTab.__tabcatalog__progressListener);
		delete aTab.__tabcatalog__progressFilter;
		delete aTab.__tabcatalog__progressListener.mTab;
		delete aTab.__tabcatalog__progressListener.mBrowser;
		delete aTab.__tabcatalog__progressListener.mTabBrowser;
		delete aTab.__tabcatalog__progressListener;
	},
 
	getCanvasForTab : function(aTab) 
	{
		var tabs = this.tabs;
		var items = this.getItems();
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			if (tabs[i] == aTab) {
				if (i in items)
					return items[i].relatedCanvas;
				break;
			}
		}
		return null;
	},
 
	createProgressListener : function(aTab, aTabBrowser) 
	{
		return {
			mTab        : aTab,
			mBrowser    : aTab.linkedBrowser,
			mTabBrowser : aTabBrowser,
			onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
			{
				var item = TabCatalog.getItemForTab(this.mTab);
				if (item) {
					item.totalProgress = aMaxTotalProgress ? aCurTotalProgress / aMaxTotalProgress : 0;
					item.removeAttribute('busy');
					TabCatalog.updateThumbnail(item);
				}
			},
			onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
			{
				const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
				if (
					aStateFlags & nsIWebProgressListener.STATE_STOP &&
					aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
					) {
					var canvas = TabCatalog.getCanvasForTab(this.mTab);
					if (canvas)
						TabCatalog.updateOneCanvas({
							tab    : this.mTab,
							canvas : canvas,
							isMultiWindow : TabCatalog.isMultiWindow
						});

					if (this.mTab == this.mTabBrowser.selectedTab)
						TabCatalog.updateBackground();

					var item = TabCatalog.getItemForTab(this.mTab);
					if (item) {
						item.removeAttribute('busy');
						TabCatalog.updateThumbnail(item, true);
					}
				}
				else if (
					aStateFlags & nsIWebProgressListener.STATE_START &&
					aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
					) {
					var item = TabCatalog.getItemForTab(this.mTab);
					if (item) {
						item.setAttribute('busy', true);
						TabCatalog.updateThumbnail(item);
					}
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
 
	updateThumbnail : function(aThumbnailItem, aUpdateWithDelay) 
	{
		var item = aThumbnailItem;
		if (!item) return;

		var tab = item.relatedTab;
		var b   = tab.linkedBrowser;
		var w   = b.contentWindow;

		var title = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-label')[0];
		if (!aUpdateWithDelay)
			title.setAttribute('value', b.contentDocument.title || tab.getAttribute('label'));
		else
			window.setTimeout(function() { title.setAttribute('value', b.contentDocument.title || tab.getAttribute('label')); }, 0);

		var isBusy = item.getAttribute('busy') == 'true';

		var icon = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-favicon')[0];
		if (!isBusy) {
			var updateFavicon = function() {
				var favicon = tab.getAttribute('image');
				if (favicon) icon.setAttribute('src', favicon);
			};
			if (!aUpdateWithDelay)
				updateFavicon();
			else
				window.setTimeout(updateFavicon, 0);
		}
		else if (icon.hasAttribute('src')) {
			icon.removeAttribute('src');
		}

		var progress = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-header-progress')[0];
		if (item.totalProgress &&
			item.totalProgress < 1) {
			progress.removeAttribute('collapsed');
			progress.setAttribute('mode', 'normal');
			progress.setAttribute('value', parseInt(item.totalProgress * 100));
		}
		else {
			progress.setAttribute('collapsed', true);
		}

		var backButton = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-toolbar-item goBack')[0];
		var forwardButton = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-toolbar-item goForward')[0];
		var stopButton = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-toolbar-item stop')[0];
		var reloadButton = item.getElementsByAttribute('class', 'tabcatalog-thumbnail-toolbar-item reload')[0];
		if (this.shouldSendClickEvent) {
			if (!isBusy) {
				stopButton.setAttribute('disabled', true);
				reloadButton.removeAttribute('disabled');
				try {
					if (b.canGoBack)
						backButton.removeAttribute('disabled');
					else
						backButton.setAttribute('disabled', true);

					if (b.canGoForward)
						forwardButton.removeAttribute('disabled');
					else
						forwardButton.setAttribute('disabled', true);
				}
				catch(e) {
					backButton.setAttribute('disabled', true);
					forwardButton.setAttribute('disabled', true);
				}
			}
			else {
				stopButton.removeAttribute('disabled');
				reloadButton.setAttribute('disabled', true);
			}
		}
	},
	 
	getThumbnailMatrix : function(aTabs, aRelative) 
	{
		var padding = this.padding;
		var header  = this.header;

		var tabs = aTabs || this.tabs;
		var tabNum = tabs.length;

		// すべての基準となるサムネイルの縦横サイズの計算
		var boxObject, aspectRatio;
		if (this.getPref('extensions.tabcatalog.showAllWindows')) {
			// 複数ウィンドウの場合は、すべてのウィンドウの中で最も正方形に近いものを基準に計算する
			var windows = this.browserWindowsWithOpenedOrder;
			var lastAspectRatio = 0;
			for (var i = 0, maxi = windows.length; i < maxi; i++)
			{
				boxObject   = windows[i].gBrowser.getBrowserForTab(windows[i].gBrowser.selectedTab).boxObject;
				aspectRatio = boxObject.height / boxObject.width;
				if (Math.abs(1 - aspectRatio) < Math.abs(1 - lastAspectRatio)) {
					lastAspectRatio = aspectRatio;
					lastBoxObject   = boxObject;
				}
			}
			boxObject   = lastBoxObject;
			aspectRatio = lastAspectRatio;
		}
		else {
			boxObject   = gBrowser.getBrowserForTab(gBrowser.selectedTab).boxObject;
			aspectRatio = boxObject.height / boxObject.width;
		}

		var minSize = this.getPref('extensions.tabcatalog.thumbnail.min.enabled') ? Math.min(this.getPref('extensions.tabcatalog.thumbnail.min.size'), (aspectRatio  < 1 ? boxObject.width : boxObject.height )) : -1;

		// ウィンドウの中に敷き詰められるサムネイルの、理論上の最大サイズ（縦横比を無視したもの）を計算する
		var thumbnailMaxSize = window.innerWidth * window.innerHeight * 0.9 / tabNum;
		var boxWidth = parseInt(Math.min(Math.sqrt(thumbnailMaxSize), window.outerWidth * 0.5)) - padding;
		var boxHeight = parseInt(boxWidth * aspectRatio );

		var matrixData;

		if (aRelative !== void(0)) { // サムネイルの拡大・縮小の場合。これは簡易的な計算でよい。
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

			// ウィンドウ内にきちんと収まるサイズになるまで、サムネイルを少しずつ小さくしていく
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

			var boxObject   = tabs[i].linkedBrowser.boxObject;
			var aspectRatio = boxObject.height / boxObject.width;

			matrix.push({
				x : colCount,
				y : rowCount,
				posX : ((aWidth + padding) * (colCount - 1)),
				posY : (offsetY + ((aHeight + padding + header) * (rowCount-1))),
				aspectRatio : aspectRatio
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
		if (this.updateCanvasTimer) return;
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
		if (!this.updateCanvasCue.length) {
			this.stopUpdateCanvas();
			return;
		}

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
	 
	updateOneCanvas : function(aData, aImage) 
	{
		var canvas = aData.canvas;

		var tab = aData.tab;
		var b = tab.linkedBrowser;
		var w = b.contentWindow;

		var isImage = b.contentDocument.contentType.indexOf('image') == 0;

		var width  = aData.width || w.innerWidth;
		var height = aData.height || w.innerHeight;

		if (aData.width || aData.height) {
			canvas.width  = canvas.maxWidth  = width;
			canvas.height = canvas.maxHeight = height;
		}
		else {
			width = canvas.width;
			height = canvas.height;
		}

		if (!isImage) {
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
		}
		else {
			if (aImage && aImage instanceof Image) {
				try {
					var ctx = canvas.getContext('2d');
					ctx.fillStyle = '#fff';
					ctx.fillRect(0, 0, width, height);
					var iW = parseInt(aImage.width);
					var iH = parseInt(aImage.height);
					var x = 0;
					var y = 0;
					ctx.save();
					if ((iW / iH) < 1) {
						iW = iW * height / iH;
						x = Math.floor((width - iW) / 2 );
						iH = height;
					}
					else {
						iH = iH * width / iW;
						y = Math.floor((height - iH) / 2 );
						iW = width;
					}
					ctx.drawImage(aImage, x, y, iW, iH);
					ctx.restore();
				}
				catch(e) {
					dump('TabCatalog Error: ' + e.message + '\n');
				}
			}
			else {
				var img = new Image();
				img.src = b.currentURI.spec;
				var self = this;
				img.addEventListener('load', function() {
					img.removeEventListener('load', arguments.callee, false);
					self.updateOneCanvas(aData, img);
					delete self;
					delete img;
					delete ctx;
					delete b;
					delete w;
				}, false);
				return;
			}
		}

		if (aData.isMultiWindow)
			this.drawWindowIndicator(canvas, tab.ownerDocument.defaultView);

		if (canvas.parentNode && !aData.onlyRedraw)
			this.updateThumbnail(canvas.parentNode.parentNode);
	},
  
	redrawBoxOnLink : function(aEvent) 
	{
		var node = this.getItemFromEvent(aEvent);
		var tab;
		if (node)
			tab = this.getTabFromThumbnailItem(node);

		var canvas = this.getCanvasFromEvent(aEvent);
		if (!canvas ||
			!tab ||
			tab.linkedBrowser.contentDocument.contentType.indexOf('image') == 0)
			return;

		var ret = this._getCorrespondingWindowAndPoint(aEvent.screenX, aEvent.screenY, node);
		var elt = this.getClickableElementFromPoint(ret.window, ret.x, ret.y);

		if ('__tabcatalog__lastHoverClickable' in ret.window &&
			elt &&
			elt == ret.window.__tabcatalog__lastHoverClickable)
			return;

		ret.window.__tabcatalog__lastHoverClickable = elt;

		this.updateOneCanvas({
			canvas        : canvas,
			tab           : tab,
			isMultiWindow : this.isMultiWindow,
			onlyRedraw    : true
		});

		if (!elt) return;

		var browser = tab.linkedBrowser;
		var cBox = canvas.ownerDocument.getBoxObjectFor(canvas);
		var bBox = browser.ownerDocument.getBoxObjectFor(browser);

		var box = elt.ownerDocument.getBoxObjectFor(elt);
		var xScale = cBox.width / bBox.width;
		var yScale = cBox.height / bBox.height;
		var x = parseInt((box.screenX - bBox.screenX) * xScale);
		var y = parseInt((box.screenY - bBox.screenY) * yScale);
		var w = parseInt(box.width * xScale);
		var h = parseInt(box.height * yScale);

		try {
			var ctx = canvas.getContext('2d');
			ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
			ctx.fillRect(x, y, w, h);
			ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
			ctx.strokeRect(x, y, w, h);

			var loupeX = 0;
			var loupeY = h;
			var loupeW = Math.min(box.width, parseInt(cBox.width * 0.6));
			var loupeH = Math.min(box.height, parseInt(cBox.height * 0.6));

			if (x + (w / 2) < (cBox.width / 2)) { // left half
				if (x > -1)
					loupeX = x;
			}
			else { // right half
				if (x+w - loupeW > -1)
					loupeX = x+w - loupeW;
				else
					loupeX = 0;
			}
			if (loupeX + loupeW > cBox.width)
				loupeW = cBox.width - loupeX;

			if (y + (h / 2) < (cBox.height / 2)) { // upper half
				if (y+h > -1)
					loupeY = y+h;
			}
			else { // lower half
				if (y-loupeH > -1)
					loupeY = y-loupeH;
				else
					loupeY = 0;
				if (loupeY + loupeH > y)
					loupeH = y;
			}
			if (loupeY + loupeH > cBox.height)
				loupeH = cBox.height - loupeY;

			loupeW = Math.min(loupeW, cBox.width - loupeX);
			loupeH = Math.min(loupeH, cBox.height - loupeY);

			ctx.save();
			ctx.translate(loupeX, loupeY);
			ctx.globalAlpha = 0.9;
			ctx.drawWindow(
				ret.window,
				box.screenX - bBox.screenX + ret.window.scrollX,
				box.screenY - bBox.screenY + ret.window.scrollY,
				loupeW,
				loupeH,
				'rgb(255,255,255)'
			);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
			ctx.strokeRect(-1, -1, loupeW+2, loupeH+2);
			ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
			ctx.strokeRect(0, 0, loupeW, loupeH);
			ctx.restore();
		}
		catch(e) {
		}
	},
 
	clear : function(aKeepThumbnails) 
	{
		if (aKeepThumbnails) {
			var slider    = document.getElementById('tabcatalog-scrollbar-slider');
			if (slider)
				slider.parentNode.removeChild(slider);

			var scrollbar = document.getElementById('tabcatalog-scrollbar');
			if (scrollbar)
				scrollbar.parentNode.removeChild(scrollbar);

			var splitters = this.catalog.getElementsByAttribute('class', 'tabcatalog-splitter');
			for (var i = splitters.length-1; i > -1; i--)
				splitters[i].parentNode.removeChild(splitters[i]);

			return;
		}

		var nodes = this.catalog.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'canvas');
		for (var i = nodes.length-1; i > -1; i--)
		{
			delete nodes[i].relatedBox.relatedTab;
			delete nodes[i].relatedBox.relatedTabBrowser;
			delete nodes[i].relatedBox;
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
	moveFocusToItem : function(aItem, aSetCurrent)
	{
		var focusedNode = this.getFocusedItem();
		if (focusedNode) {
			focusedNode.parentNode.removeAttribute('container-focused');
			focusedNode.removeAttribute('focused');
		}
		aItem.parentNode.setAttribute('container-focused', true);
		aItem.setAttribute('focused', true);

		if (aSetCurrent) {
			var current = this.catalog.parentNode.getElementsByAttribute('current', 'true');
			if (current.length)
				current[0].removeAttribute('current');
			aItem.setAttribute('current', true);
		}

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
				Math.max(this.catalog.posY, -this.catalog.scrollMaxY)
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

window.addEventListener('load', function() {
	window.setTimeout('TabCatalog.init();', 0);
}, false);
 
