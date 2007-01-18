var SplitBrowser = { 
	
	get scrollbarSize() { 
		return nsPreferences.getIntPref('splitbrowser.appearance.scrollbar.size');
	},
 
	get subBrowserToolbarShowDelay() { 
		return nsPreferences.getIntPref('splitbrowser.delay.subbrowser.toolbar.show');
	},
	get subBrowserToolbarHideDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.subbrowser.toolbar.hide');
	},
 
	get isLinux() 
	{
		return (navigator.platform.indexOf('Linux') > -1);
	},
 
	get mainBrowserBox() 
	{
		return document.getElementById('appcontent').contentWrapper;
	},
 
	POSITION_LEFT   : 1, 
	POSITION_RIGHT  : 2,
	POSITION_TOP    : 4,
	POSITION_BOTTOM : 8,

	POSITION_HORIZONAL : 3,
	POSITION_VERTICAL  : 12,

	POSITION_BEFORE : 5,
	POSITION_AFTER  : 10,
 
	browsers  : [], 
	splitters : [],
 
	makeURIFromSpec : function(aURI) 
	{
		try {
			var newURI;
			aURI = aURI || '';
			if (aURI && aURI.indexOf('file:') == 0) {
				var fileHandler = this.mIOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
				var tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
				newURI = this.mIOService.newFileURI(tempLocalFile); // we can use this instance with the nsIFileURL interface.
			}
			else {
				newURI = this.mIOService.newURI(aURI, null, null);
			}
			return newURI;
		}
		catch(e){
		}
		return null;
	},
	mIOService : Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
 
/* add sub-browser (split contents) */ 
	
	addSubBrowser : function(aURI, aBrowser, aPosition) 
	{
		var appcontent = document.getElementById('appcontent');
		var browser = aBrowser || this.getBrowserFromFrame(document.commandDispatcher.focusedWindow.top) || gBrowser ;
		var target  = browser.parentContainer || appcontent;
		var wrapper = browser.wrapper;
		if (wrapper == target.contentWrapper)
			wrapper = target.wrapper;

		var hContainer = target.hContainer;
		var vContainer = target.vContainer;

		var width  = (aPosition & this.POSITION_HORIZONAL) ? parseInt(browser.boxObject.width / 5 * 2) : -1 ;
		var height = (aPosition & this.POSITION_VERTICAL) ? parseInt(browser.boxObject.height / 5 * 2) : -1 ;

		var refNode = (aPosition & this.POSITION_HORIZONAL) ? wrapper : hContainer ;

		var browser   = this.createSubBrowser(aURI);
		var container = this.addContainerTo(target, aPosition, refNode, width, height, browser);
	},
 
	addSubBrowserFromTab : function(aTab, aPosition) { 
		var b = gBrowser;
/*
		var b = aTab;
		while (b.localName != 'tabbrowser')
		{
			b = b.parentNode;
		}
*/
		if (aTab.localName != 'tab')
			aTab = b.selectedTab;

		this.addSubBrowser(aTab.linkedBrowser.currentURI.spec, b, aPosition);
		if (nsPreferences.getBoolPref('splitbrowser.tab.closetab'))
			b.removeTab(aTab);
	},
 
	addContainerTo : function(aParent, aPosition, aRefNode, aWidth, aHeight, aContent) 
	{
		if (aPosition & this.POSITION_HORIZONAL)
			aHeight = -1;
		else
			aWidth = -1;

		var container = this.createContainer(aWidth, aHeight);
		var hContainer = aParent.hContainer;
		var vContainer = aParent.vContainer;

		var wrapper = this.createWrapper();
		wrapper.appendChild(container);

		var splitter = document.createElement('splitter');
		splitter.setAttribute('state', 'open');
		splitter.setAttribute('orient', ((aPosition & this.POSITION_HORIZONAL) ? 'horizontal' : 'vertical' ));
		splitter.setAttribute('collapse', ((aPosition & this.POSITION_AFTER) ? 'after' : 'before' ));

		switch (aPosition)
		{
			case this.POSITION_LEFT:
				if (!aRefNode) aRefNode = hContainer.firstChild;
				if (aContent)
					aRefNode.width = aRefNode.boxObject.width - aWidth;
				hContainer.insertBefore(wrapper, aRefNode);
				hContainer.insertBefore(splitter, aRefNode);
				break;

			default:
			case this.POSITION_RIGHT:
				if (!aRefNode) aRefNode = hContainer.lastChild;
				if (aContent)
					aRefNode.width = aRefNode.boxObject.width - aWidth;
				aRefNode = aRefNode.nextSibling;
				if (aRefNode) {
					hContainer.insertBefore(splitter, aRefNode);
					hContainer.insertBefore(wrapper, aRefNode);
				}
				else {
					hContainer.appendChild(splitter, aRefNode);
					hContainer.appendChild(wrapper, aRefNode);
				}
				break;

			case this.POSITION_TOP:
				if (!aRefNode) aRefNode = vContainer.firstChild;
				if (aContent)
					aRefNode.height = aRefNode.boxObject.height - aHeight;
				vContainer.insertBefore(wrapper, aRefNode);
				vContainer.insertBefore(splitter, aRefNode);
				break;

			case this.POSITION_BOTTOM:
				if (!aRefNode) aRefNode = vContainer.lastChild;
				if (aContent)
					aRefNode.height = aRefNode.boxObject.height - aHeight;
				aRefNode = aRefNode.nextSibling;
				if (aRefNode) {
					vContainer.insertBefore(splitter, aRefNode);
					vContainer.insertBefore(wrapper, aRefNode);
				}
				else {
					vContainer.appendChild(splitter, aRefNode);
					vContainer.appendChild(wrapper, aRefNode);
				}
				break;
		}

		if (aContent)
			container.appendChild(aContent);

		return container;
	},
 
	createSubBrowser : function(aURI) 
	{
		var browser = document.createElement('subbrowser');
		browser.setAttribute('flex', 1);
		if (aURI)
			browser.setAttribute('src', aURI);

		this.browsers.push(browser);

		return browser;
	},
 
	createWrapper : function() 
	{
		var wrapper = document.createElement('box');
		wrapper.setAttribute('flex', 1);
		wrapper.setAttribute('class', 'subbrowser-container-content-wrapper');
		return wrapper;
	},
 
	createContainer : function(aWidth, aHeight) 
	{
		var container = document.createElement('subbrowser-container');
		container.setAttribute('flex', 1);
		if (aWidth > -1) container.width = aWidth;
		if (aHeight > -1) container.height = aHeight;

		return container;
	},
 
	getBrowserFromFrame : function(aFrame) 
	{
		var docShell = aFrame
			.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);
		for (var i = 0, maxi = this.browsers.length; i < maxi; i++)
		{
			if (this.browsers[i].browser.docShell == docShell)
				return this.browsers[i];
		}
		return null;
	},
  
/* remove sub-browser (unsplit) */ 
	
	removeSubBrowser : function(aBrowser) 
	{
//dump('SubBrowserRemoveRequest\n');
		var appcontent = document.getElementById('appcontent');
		var browser   = aBrowser;
		var container = browser.parentContainer || appcontent;
		var wrapper   = browser.wrapper || container.contentWrapper;

		gBrowser.setAttribute('type', 'content-primary');

		browser.parentNode.removeChild(browser);
		wrapper.parentNode.removeChild(wrapper);

		for (var i = 0, maxi = this.browsers.length; i < maxi; i++)
		{
			if (this.browsers[i] == browser) {
				this.browsers.splice(i, 1);
				break;
			}
		}
		this.cleanUpContainer(container);
	},
	
	cleanUpContainer : function(aContainer) 
	{
		var container = aContainer;
		var parentContainer = container.parentContainer;

		var cont = container.hContainer;
		if (cont) {
			if (!cont.hasChildNodes()) {
				if (cont.previousSibling &&
					cont.previousSibling.localName == 'splitter') {
					cont.previousSibling.previousSibling.removeAttribute('height');
					cont.previousSibling.previousSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.previousSibling);
				}
				else if (cont.nextSibling &&
					cont.nextSibling.localName == 'splitter') {
					cont.nextSibling.nextSibling.removeAttribute('height');
					cont.nextSibling.nextSibling.removeAttribute('collapsed');
					container.vContainer.removeChild(cont.nextSibling);
				}
				container.vContainer.removeChild(cont);
			}
			else if (cont.childNodes.length % 2 == 0) {
				if (cont.firstChild.localName == 'splitter') {
					cont.removeChild(cont.firstChild);
				}
				else if (cont.lastChild.localName == 'splitter') {
					cont.removeChild(cont.lastChild);
				}
				else {
					for (var i = 0, maxi = cont.childNodes.length-1; i < maxi; i++)
					{
						if (cont.childNodes[i].localName == 'splitter' &&
							cont.childNodes[i+1].localName == 'splitter') {
							cont.removeChild(cont.childNodes[i]);
							break;
						}
					}
				}
			}
		}

		var cont = container.vContainer;
		if (!cont.hasChildNodes()) {
			var wrapper = container.parentNode;
			if (wrapper.previousSibling && wrapper.previousSibling.localName == 'splitter') {
				wrapper.previousSibling.previousSibling.removeAttribute('width');
				wrapper.previousSibling.previousSibling.removeAttribute('collapsed');
				wrapper.parentNode.removeChild(wrapper.previousSibling);
			}
			else if (wrapper.nextSibling && wrapper.nextSibling.localName == 'splitter') {
				wrapper.nextSibling.nextSibling.removeAttribute('width');
				wrapper.nextSibling.nextSibling.removeAttribute('collapsed');
				wrapper.parentNode.removeChild(wrapper.nextSibling);
			}
			wrapper.parentNode.removeChild(wrapper);
		}
		else if (cont.childNodes.length % 2 == 0) {
			if (cont.firstChild.localName == 'splitter') {
				cont.removeChild(cont.firstChild);
			}
			else if (cont.lastChild.localName == 'splitter') {
				cont.removeChild(cont.lastChild);
			}
			else {
				for (var i = 0, maxi = cont.childNodes.length-1; i < maxi; i++)
				{
					if (cont.childNodes[i].localName == 'splitter' &&
						cont.childNodes[i+1].localName == 'splitter') {
						cont.removeChild(cont.childNodes[i]);
						break;
					}
				}
			}
		}

		if (parentContainer) {
			this.cleanUpContainer(parentContainer);
		}
	},
  
	removeAllSubBrowsers : function() 
	{
		for (var i = this.browsers.length-1; i > -1; i--)
		{
			this.removeSubBrowser(this.browsers[i]);
		}
	},
  
/* save / load */ 
	
	save : function() 
	{
		var state = this.getContainerState(document.getElementById('appcontent'));
		nsPreferences.setUnicharPref('splitbrowser.state', state.toSource());
	},
	
	getContainerState : function(aContainer) 
	{
		var state = {
				children : []
			};

		var hContainer = aContainer.hContainer;
		if (hContainer) {
			var contentWrapper = aContainer.contentWrapper;
			var originalContent = contentWrapper || hContainer.firstChild;
			if (contentWrapper) {
				state.content = {
					width   : contentWrapper.boxObject.width,
					height  : contentWrapper.boxObject.height,
				};
				if (aContainer.firstChild.localName == 'subbrowser') {
					state.content.type    = 'subbrowser';
					state.content.uri     = aContainer.firstChild.src;
					state.content.history = this.serializeSessionHistory(aContainer.firstChild.browser);
				}
				else {
					state.content.type = 'root';
				}
			}
			else {
				state.content = this.getContainerState(originalContent.firstChild);
			}

			var node = originalContent.previousSibling;
			while (node)
			{
				if (node.localName == 'splitter') {
					node = node.previousSibling;
					continue;
				}
				state.children.push(this.getContainerState(node.firstChild));
				state.children[state.children.length-1].position = this.POSITION_LEFT;
				state.children[state.children.length-1].width    = node.boxObject.width;
				if (node.nextSibling.getAttribute('state') == 'collapsed')
					state.children[state.children.length-1].collapsed = true;
				node = node.previousSibling;
			}

			var node = originalContent.nextSibling;
			while (node)
			{
				if (node.localName == 'splitter') {
					node = node.nextSibling;
					continue;
				}
				state.children.push(this.getContainerState(node.firstChild));
				state.children[state.children.length-1].position = this.POSITION_RIGHT;
				state.children[state.children.length-1].width    = node.boxObject.width;
				if (node.previousSibling.getAttribute('state') == 'collapsed')
					state.children[state.children.length-1].collapsed = true;
				node = node.nextSibling;
			}
		}

		var vContainer = aContainer.vContainer;

		var originalContent = hContainer || vContainer.firstChild;
		if (!hContainer) {
			state.content = {
				type    : 'subbrowser',
				uri     : originalContent.firstChild.firstChild.src,
				width   : originalContent.boxObject.width,
				height  : originalContent.boxObject.height,
				history : this.serializeSessionHistory(originalContent.firstChild.firstChild.browser)
			};
		}
		else if (!state.content) {
			state.content = this.getContainerState(originalContent.firstChild);
		}

		var node = originalContent.previousSibling;
		while (node)
		{
			if (node.localName == 'splitter') {
				node = node.previousSibling;
				continue;
			}
			state.children.push(this.getContainerState(node.firstChild));
			state.children[state.children.length-1].position = this.POSITION_TOP;
			state.children[state.children.length-1].height   = node.boxObject.height;
			if (node.nextSibling.getAttribute('state') == 'collapsed')
				state.children[state.children.length-1].collapsed = true;
			node = node.previousSibling;
		}

		var node = originalContent.nextSibling;
		while (node)
		{
			if (node.localName == 'splitter') {
				node = node.nextSibling;
				continue;
			}
			state.children.push(this.getContainerState(node.firstChild));
			state.children[state.children.length-1].position = this.POSITION_BOTTOM;
			state.children[state.children.length-1].height   = node.boxObject.height;
			if (node.previousSibling.getAttribute('state') == 'collapsed')
				state.children[state.children.length-1].collapsed = true;
			node = node.nextSibling;
		}

		return state;
	},
 
	serializeSessionHistory : function(aBrowser) 
	{
		var SH = null;
		try {
			SH = aBrowser.sessionHistory;
		}
		catch(e) {
		}

		var entries = [],
			entry,
			x       = {},
			y       = {},
			content;
		if (SH)
			for (i = 0; i < SH.count; i++)
			{
				entry = this.serializeHistoryEntry(SH.getEntryAtIndex(i, false));
				if (entry)
					entries.push(entry);
			}

		return {
			entries : entries,
			index   : (SH ? SH.index : -1 )
		};
	},
 
	serializeHistoryEntry : function(aEntry) 
	{
		if (!aEntry) return null;

		aEntry = aEntry.QueryInterface(Components.interfaces.nsIHistoryEntry);
		aEntry = aEntry.QueryInterface(Components.interfaces.nsISHEntry);

		var x = {}, y = {};
		aEntry.getScrollPosition(x, y);

		var data = {
			id         : aEntry.ID, // to compare with saved data
			uri        : (aEntry.URI ? aEntry.URI.spec : null ),
			title      : aEntry.title,
			isSubFrame : aEntry.isSubFrame,
			x          : Math.max(x.value, 0),
			y          : Math.max(y.value, 0),
			children   : []
		};

		// get post data
		if ('cacheKey' in aEntry && aEntry.cacheKey) {
			data.cacheKey = aEntry.cacheKey.QueryInterface(Components.interfaces.nsISupportsPRUint32).data;
		}
		else {
			data.cacheKey = 0;
		}

		var children = [];
		try {
			aEntry = aEntry.QueryInterface(Components.interfaces.nsISHContainer);
		}
		catch(e) {
			return data;
		}

		for (var i = 0, maxi = aEntry.childCount; i < maxi; i++)
		{
			data.children.push(this.serializeHistoryEntry(aEntry.GetChildAt(i)));
		}
		return data;
	},
  
	load : function() 
	{
		var state = nsPreferences.copyUnicharPref('splitbrowser.state');
		if (!state) return;
		try {
			eval('state = '+state);
		}
		catch(e) {
			return;
		}

		this.buildContent(state, document.getElementById('appcontent'));
	},
	
	buildContent : function(aState, aContainer) 
	{
		switch (aState.content.type)
		{
			default:
				var wrapper = aContainer.contentWrapper;
				wrapper.parentNode.removeChild(wrapper);
				break;

			case 'subbrowser':
				var b = this.createSubBrowser(aState.content.uri);
				aContainer.appendChild(b);
				aContainer.hContainer.width  = aState.content.width;
				aContainer.hContainer.height = aState.content.height;

				aContainer.contentWrapper.width  = aState.content.width;
				aContainer.contentWrapper.height = aState.content.height;

				if (aState.content.history) {
					var SHInternal = b.browser.sessionHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);
					for (var i in aState.content.history.entries)
						SHInternal.addEntry(
							this.deserializeHistoryEntry(aState.content.history.entries[i]),
							true
						);
					try {
						b.browser.gotoIndex(aState.content.history.index);
					}
					catch(e) { // when the entry is moving in frames...
						try {
							b.browser.gotoIndex(b.sessionHistory.count-1);
						}
						catch(ex) { // when there is no history, do nothing
						}
					}
				}

				break;

			case 'root':
				aContainer.contentWrapper.width  = aState.content.width;
				aContainer.contentWrapper.height = aState.content.height;
				break;
		}

		var container;
		for (var i = 0, maxi = aState.children.length; i < maxi; i++)
		{
			container = this.addContainerTo(
				aContainer,
				aState.children[i].position,
				null,
				aState.children[i].width,
				aState.children[i].height
			);
			if (aState.children[i].collapsed)
				(aState.children[i].position & this.POSITION_BEFORE ? container.nextSibling : container.previousSibling).setAttribute('state', 'collapsed');
			this.buildContent(aState.children[i], container);
		}

		if (!aContainer.hContainer.hasChildNodes()) {
			aContainer.vContainer.removeChild(aContainer.hContainer);
		}
	},
 
	deserializeHistoryEntry : function(aData) 
	{
		var entry = Components.classes['@mozilla.org/browser/session-history-entry;1'].createInstance(Components.interfaces.nsISHEntry);
		entry = entry.QueryInterface(Components.interfaces.nsIHistoryEntry);

		entry.setURI(this.makeURIFromSpec(aData.uri));
		entry.setTitle(aData.title);
		entry.setIsSubFrame(aData.isSubFrame);
		entry.loadType = Components.interfaces.nsIDocShellLoadInfo.loadHistory;

		entry.setScrollPosition(aData.x, aData.y);


		if ('cacheKey' in aData && aData.cacheKey) {
			var cacheKey = Components.classes['@mozilla.org/supports-PRUint32;1'].createInstance(Components.interfaces.nsISupportsPRUint32);
			cacheKey.type = cacheKey.TYPE_PRUINT32;
			cacheKey.data = parseInt(aData.cacheKey);
			cacheKey = cacheKey.QueryInterface(Components.interfaces.nsISupports);

			entry.cacheKey         = cacheKey;
			entry.expirationStatus = 'expirationStatus' in aData ? aData.expirationStatus : null ;
		}

		if (!aData.children || !aData.children.length) return entry;

		entry = entry.QueryInterface(Components.interfaces.nsISHContainer);
		for (var i in aData.children)
			entry.AddChild(
				this.deserializeHistoryEntry(
					aData.children[i]
				),
				i
			);

		return entry;
	},
   
/* popup-buttons */ 
	addButtonIsShown : false,
	
	get addButton() { 
		return document.getElementById('splitbrowser-add-button');
	},
 
	get addButtonSize() { 
		return nsPreferences.getIntPref('splitbrowser.appearance.addbuttons.size');
	},
	get addButtonAreaSize() {
		return nsPreferences.getIntPref('splitbrowser.appearance.addbuttons.area');
	},
	get addButtonShowDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.addbuttons.show');
	},
	get addButtonHideDelay() {
		return nsPreferences.getIntPref('splitbrowser.delay.addbuttons.hide');
	},
 
	showAddButton : function(aEvent) 
	{
		if (this.showAddButtonTimer) {
			this.showAddButtonTimer = null;
			window.clearTimeout(this.showAddButtonTimer);
		}

		if (aEvent.firedBy.indexOf('drag') == 0) {
			this.showAddButtonNow(this, aEvent);
		}
		else {
			this.showAddButtonTimer = window.setTimeout(this.showAddButtonNow, this.addButtonShowDelay, this, aEvent);
		}
	},
	
	showAddButtonNow : function(aThis, aEvent) 
	{
		if (!aThis) aThis = this;

		if (aThis.addButtonIsShown) {
			if (aThis.hideAddButtonTimer)
				aThis.stopDelayedHideAddButtonTimer();
			aThis.delayedHideAddButton();
			return;
		}

		var node = aEvent.targetSubBrowser;

		if (!(
			node.mIsMouseOverTop ||
			node.mIsMouseOverBottom ||
			node.mIsMouseOverLeft ||
			node.mIsMouseOverRight
			)) {
			return;
		}

		aThis.addButtonIsShown = true;

		aThis.hideAddButton();

		var box    = node.contentAreaSizeObject;
		var button = aThis.addButton;
		button.hidden = button.parentNode.hidden = false;

		var size  = aThis.addButtonSize;

		button.width = button.height = size;

		var pos;
		if (aEvent.isTop) {
			pos = 'top';
			button.width  = box.areaWidth;
			button.parentNode.style.top = box.y+'px';
			button.parentNode.style.left = box.areaX+'px';
		}
		else if (aEvent.isBottom) {
			pos = 'bottom';
			button.width = box.areaWidth;
			button.parentNode.style.top = (box.y + box.height - size)+'px';
			button.parentNode.style.left = box.areaX+'px';
		}
		else if (aEvent.isLeft) {
			pos = 'left';
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = box.x+'px';
		}
		else if (aEvent.isRight) {
			pos = 'right';
			button.height = box.areaHeight;
			button.parentNode.style.top = box.areaY+'px';
			button.parentNode.style.left = (box.x + box.width - size)+'px';
		}

		button.className = pos;
		button.setAttribute('tooltiptext', button.getAttribute('tooltiptext-'+pos));
		button.targetSubBrowser = node;

		if (aThis.hideAddButtonTimer)
			aThis.stopDelayedHideAddButtonTimer();
		aThis.delayedHideAddButton();
	},
  
	hideAddButton : function(aEvent) 
	{
		this.stopDelayedHideAddButtonTimer();

		var button = this.addButton;
		button.hidden = button.parentNode.hidden = true;
		button.targetSubBrowser = null;

		if (aEvent && aEvent.force) {
			if (this.showAddButtonTimer) {
				window.clearTimeout(this.showAddButtonTimer);
				this.showAddButtonTimer = null;
			}
		}

		this.addButtonIsShown = false;
	},
 
	delayedHideAddButton : function() 
	{
		if (this.hideAddButtonTimer) return;
		this.stopDelayedHideAddButtonTimer();
		this.hideAddButtonTimer = window.setTimeout(this.delayedHideAddButtonCallback, this.addButtonHideDelay, this);
	},
	
	delayedHideAddButtonCallback : function(aThis) 
	{
		aThis.stopDelayedHideAddButtonTimer();
		aThis.hideAddButton();
	},
 
	stopDelayedHideAddButtonTimer : function() 
	{
		window.clearTimeout(this.hideAddButtonTimer);
		this.hideAddButtonTimer = null;
	},
  
	onAddButtonCommand : function(aEvent) 
	{
		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var browser   = aEvent.target.targetSubBrowser;
		newEvent.targetSubBrowser = browser;
		newEvent.targetContainer = browser.parentContainer || document.getElementById('appcontent');
		newEvent.targetPosition = SplitBrowser['POSITION_'+aEvent.target.className.toUpperCase()];
		newEvent.targetURI = browser.src;
		aEvent.target.dispatchEvent(newEvent);

		window.setTimeout('SplitBrowser.hideAddButton()', 0);
	},
 
	addButtonDNDObserver : { 
		onDragOver : function() {},

		onDrop: function(aEvent, aXferData, aDragSession)
		{
			aEvent.preventDefault();
			aEvent.preventBubble();

			// "window.retrieveURLFromData()" is old implementation
			var url = 'retrieveURLFromData' in window ? retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) : transferUtils.retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) ;
			if (!url || !url.length || url.indexOf(' ', 0) != -1)
				return;

			var sourceDoc = aDragSession.sourceDocument;
			if (sourceDoc) {
				var sourceURI = sourceDoc.documentURI;
				const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
				var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
				try {
					secMan.checkLoadURIStr(sourceURI, url, nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					aEvent.stopPropagation();
					throw 'Drop of ' + url + ' denied.';
				}
			}

			SplitBrowser.fireSubBrowserAddRequestEventFromButton(getShortcutOrURI(url));
			window.setTimeout('SplitBrowser.hideAddButton();', 0);
		},

		getSupportedFlavours: function ()
		{
			var flavourSet = new FlavourSet();
			flavourSet.appendFlavour('text/x-moz-url');
			flavourSet.appendFlavour('text/unicode');
			flavourSet.appendFlavour('application/x-moz-file', 'nsIFile');
			return flavourSet;
		}
	},
 
	contentAreaOnDrop: function (aEvent, aXferData, aDragSession) 
	{
		// "window.retrieveURLFromData()" is old implementation
		var url = 'retrieveURLFromData' in window ? retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) : transferUtils.retrieveURLFromData(aXferData.data, aXferData.flavour.contentType) ;
		if (url && url.length && url.indexOf(' ', 0) == -1) {
			var sourceDoc = aDragSession.sourceDocument;
			if (sourceDoc) {
				var sourceURI = sourceDoc.documentURI;
				const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
				var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
				try {
					secMan.checkLoadURIStr(sourceURI, url, nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					aEvent.stopPropagation();
					throw 'Drop of ' + url + ' denied.';
				}
			}
		}
		else {
			url = null;
		}

		// fallback for Linux
		// in Linux, "dragdrop" event doesn't fire on the button.
		var box = SplitBrowser.mainBrowserBox;
		var check = box.checkEventFiredOnEdge(aEvent);
		if (
			url &&
			SplitBrowser.addButton.targetSubBrowser == box &&
			(
				check.isTop ||
				check.isBottom ||
				check.isLeft ||
				check.isRight
			)
			) {
			SplitBrowser.fireSubBrowserAddRequestEventFromButton(getShortcutOrURI(url));
			aEvent.preventDefault();
			aEvent.preventBubble();
			return void(0);
		}
		else {
			return this.__splitbrowser__onDrop(aEvent, aXferData, aDragSession);
		}
	},
 
	fireSubBrowserAddRequestEventFromButton : function(aURI) 
	{
		var newEvent = document.createEvent('Events');
		newEvent.initEvent('SubBrowserAddRequest', false, true);

		var button = this.addButton;
		var browser = button.targetSubBrowser;
		newEvent.targetSubBrowser = browser;
		newEvent.targetContainer = browser.parentContainer || document.getElementById('appcontent');
		newEvent.targetPosition = SplitBrowser['POSITION_'+button.className.toUpperCase()];
		newEvent.targetURI = aURI;
		button.dispatchEvent(newEvent);
	},
  
/* animation */ 
	
	animationStart : function(aInfo) 
	{
		this.animationStop();
		aInfo.startTime = (new Date()).getTime();
		this.animationInfo = aInfo;
		this.animationTimer = window.setInterval(this.animationCallback, 1);
	},
 
	animationCallback : function() 
	{
		var info = SplitBrowser.animationInfo;
		var now = (new Date()).getTime();

try {
		var progress = Math.max(1, now - info.startTime) / info.timeout;
		info.target.style.border  = '1px solid red !important;';
		if (info.orient == 'horizontal')
			info.target.style.maxWidth  = parseInt((1 - progress) * info.maxW)+'px !important';
		else
			info.target.style.maxHeight = parseInt((1 - progress) * info.maxH)+'px !important';
}
catch(e) {
	//dump(e+'\n');
}
		if (now - info.startTime > info.timeout)
			SplitBrowser.animationStop();
	},
 
	animationStop : function() 
	{
		if (this.animationTimer) {
			window.clearInterval(this.animationTimer);
			if (this.animationInfo)
				this.animationInfo.callback(this.animationInfo);
			this.animationTimer = null;
			this.animationInfo = null;
		}
	},

  
	init : function() 
	{
		document.documentElement.addEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.addEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.addEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.addEventListener('SubBrowserExitContentAreaEdge', this, false);

		document.getElementById('contentAreaContextMenu').addEventListener('popupshowing', this, false);

		window.addEventListener('resize', this, false);
		window.addEventListener('unload', this, false);

		window.removeEventListener('load', this, false);

		this.insertSeparateTabItem(gBrowser);

		if (this.isLinux && 'contentAreaDNDObserver' in window) {
			contentAreaDNDObserver.__splitbrowser__onDrop = contentAreaDNDObserver.onDrop;
			contentAreaDNDObserver.onDrop = this.contentAreaOnDrop;
		}

		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			this.load();
	},
	
	insertSeparateTabItem : function(aBrowser) 
	{
		var menu = document.getElementById('splitbrowser-tab-context-item-link-template').cloneNode(true);

		var tabContext = document.getAnonymousElementByAttribute(aBrowser, 'anonid', 'tabContextMenu');
		var separator = tabContext.firstChild;
		while (separator.localName != 'menuseparator' && separator)
		{
			separator = separator.nextSibling;
		}
		if (separator)
			tabContext.insertBefore(menu, separator);
		else
			tabContext.appendChild(menu);

		menu.setAttribute('id', 'splitbrowser-tab-context-item-link-'+(aBrowser.id || parseInt(Math.random() * 1000)));
	},
  
	destroy : function() 
	{
		if (nsPreferences.getBoolPref('splitbrowser.state.restore'))
			this.save();

		document.documentElement.removeEventListener('SubBrowserAddRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserRemoveRequest', this, false);
		document.documentElement.removeEventListener('SubBrowserEnterContentAreaEdge', this, false);
		document.documentElement.removeEventListener('SubBrowserExitContentAreaEdge', this, false);

		document.getElementById('contentAreaContextMenu').removeEventListener('popupshowing', this, false);

		window.removeEventListener('resize', this, false);
		window.removeEventListener('unload', this, false);
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;

			case 'SubBrowserAddRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				this.addSubBrowser(aEvent.targetURI, aEvent.targetSubBrowser, aEvent.targetPosition);
				break;

			case 'SubBrowserRemoveRequest':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				this.removeSubBrowser(aEvent.originalTarget || aEvent.target);
				break;

			case 'SubBrowserEnterContentAreaEdge':
				this.showAddButton(aEvent);
				break;

			case 'SubBrowserExitContentAreaEdge':
//				this.hideAddButton(aEvent);
				this.delayedHideAddButton();
				break;

			case 'resize':
				window.setTimeout('SplitBrowser.hideAddButton();', 0);
				break;

			case 'popupshowing':
				var item = document.getElementById('splitbrowser-context-item-link');
				if (gContextMenu.onLink)
					item.removeAttribute('hidden');
				else
					item.setAttribute('hidden', true);
				break;
		}
	}
 
}; 
  
window.addEventListener('load', SplitBrowser, false); 
 