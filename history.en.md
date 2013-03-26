# History

 - 2.0.2009110402
   * Improved: When the native Ctrl-Tab feature of Firefox 3.6 and later is available, then Tab Catalog doesn't override Ctrl-Tab action anymore.
 - 2.0.2009110401
   * Works on Minefield and Firefox 3.6.
   * Improved: Thumbnails are shown in a independent popup, not in a window.
   * Improved: Works with features for selected tabs with [Multiple Tab Handler](http://piro.sakura.ne.jp/xul/_multipletab.html.en).
 - 1.4.2008052701
   * Fixed: Initial dialog to confirm adding the toolbar button is shown correctly in Mac OS X.
 - 1.4.2008042801
   * Works on Firefox 3 beta5.
 - 1.4.2007090301
   * Improved: Catalog is shown more quickly, because thumbnails are updated in the background.
   * Fixed: Toolbar button is initialized correctly on the startup.
 - 1.4.2007052401
   * Fixed: Works with Tab Mix Plus again.
   * Fixed: Tooltips of thumbnails are updated correctly.
   * Modified: Some operations are skipped while thumbnails are dragged, when the thumbnail is blank, or the page is a plain text.
 - 1.4.2007052102
   * Updated: Hungarian locale is updated. (by Mikes Kaszmè´°n Istvè´°n)
 - 1.4.2007052101
   * Added: Hungarian locale is available. (by Mikes Kaszmè´°n Istvè´°n)
 - 1.4.2007052001
   * Improved: Wheel scrolling and toolbar buttons in thumbnails can be enabled parallelly.
   * Fixed: The toolbar icon is disabled when there is only one tab.
   * Modified: Preview of links are away from the pointer.
   * Fixed: Doubled tooltips disappeared.
   * Fixed: Broken appearance of "Close" button disappeared for some themes.
   * Modified: Obsolete codes disappeared.
   * Updated: Polish locale is updated. (by Michaè©» "Hoè©»ek" Poè©»tyn)
 - 1.4.2007051101
   * Modified: Click on unclickable element always selects the tab.
   * Fixed: The catalog will shown again after closing the last tab correctly.
 - 1.4.2007050901
   * Improved: Toolbar buttons are available in each thumbnail when the preference to browse in thumbnail is enabled.
   * Improved: The image is maximized for the thumbnail if the tab shows only one image.
   * Improved: Click on thumbnails which is for the tab including only one image focuses to the related tab anyway.
   * Improved: Clickabke elements are highlighted in thumbnails.
   * Fixed: Thumbnails are updated correctly for page transitions and closing windows.
   * Fixed: The position of clickable elements are parsed correctly.
 - 1.4.2007050701
   * Fixed: Thumbnails are updated correctly after it is moved.
 - 1.4.2007050601
   * Improved: You can operate browser from thumbnails directly: click links, scroll with wheel. (This is based on the implementation of the [Tab Scope](https://addons.mozilla.org/firefox/addon/4882).)
 - 1.3.2007042501
   * Fixed: Works with [All-in-One Gestures](https://addons.mozilla.org/firefox/addon/12) correctly.
 - 1.3.2007041801
   * Fixed: Auto-popup works correctly after the catalog is shown.
 - 1.3.2007040402
   * Improved: The catalog is shown more and more quickly.
   * Fixed: Thumbnails are rearranged by focus correctly.
 - 1.3.2007040401
   * Improved: Implementation of creating the catalog is restructured. It becomes to be shown more quickly. (maybe)
   * Improved: You can prevent showing the catalog for tab switching by Ctrl-Tab for a while.
   * Improved: Aspect ratio of thumbnails is fit to each window.
   * Fixed: The catalog will appear again correctly after you close other windows.
   * Fixed: On Linux, releasing of the shift key doesn't hide the catalog, for Ctrl-Tab and Ctrl-Shift-Tab hotkeys.
   * Updated: Polish locale is updated. (by Teo)
 - 1.2.2007032401
   * Updated: German locale is updated. (by ReinekeFux)
   * Updated: Polish locale is updated. (by Teo)
 - 1.2.2007031601
   * Improved: The action to request the last tab is closed closes the window too.
 - 1.2.2007030701
   * Fixed: Error on closing of the last tab disappeared.
   * Improved: Slider is available for the scrollbar of catalog.
 - 1.2.2007030502
   * Modified: Thumbnails are sorted in order which window is recently opened, not focused.
   * Improved: Thumbnails are split for each window, by splitters.
   * Improved: Scrollbar is available.
 - 1.2.2007030501
   * Fixed: Tabs can be closed correctly.
 - 1.2.2007022603
   * Fixed: The size of thumbnails is calculated correctly.
   * Improved: Thumbnails are updated in the background.
   * Updated: Polish locale is updated. (by Teo)
 - 1.2.2007022602
   * Fixed: Thumbnails are correctly rearranged by focus even if you see all of tabs in all of windows.
 - 1.2.2007022601
   * Improved: You can see thumbnails for all of tabs in all of windows at a time.
   * Improved: Wheel scrolling with pressed right button changes the size of thumbnails.
   * Fixed: To small thumbnails are shown in the middle of the screen correctly.
   * Modified: The algorithm of calculation for the size of thumbnails is changed.
   * Updated: Polish locale is replaced the one made by Teo.
 - 1.1.2007022401
   * Modified: Some HTML elements are converted to XUL elements.
   * Added: German language pack is available. (made by ReinekeFux)
 - 1.1.2006110601
   * Fixed: Initializing error disappeared. (Tab Mix Plus and other extensions are initialized correctly.)
 - 1.1.2006110502
   * Improved: "+" key for zoom-in and "-" key for zoom-out are available.
   * Improved: Thumnails are always shown smaller than the real size of the content area.
   * Modified: Blink of the screen is reduced.
   * Modified: The algorithm to calculate minimum size of thumbnails is corrected.
 - 1.1.2006110501
   * Improved: Page Up, Page Down, Home and End keys are available.
   * Improved: Direct-navigation-mode is available. Each thumbnail can be assigned shortcut from "0" to "Z".
   * Fixed: The context menu in the content area disappeared when thumbnails are shown (maybe).
   * Modified: Titlebar for each thumbnail is shown above each thumbnail, not on it.
   * Modified: The algorithm to calculate size of thumbnails is corrected.
 - 1.1.2006102901
   * Improved: Panninng-scroll for the thumbnail list is available.
   * Improved: Highlighted thumbnail becomes highly visible.
   * Improved: You can disable dropshadow and other effects.
   * Fixed: Blink of the screen is reduced.
   * Modified: Configuration dialog is restructured.
   * Modified: Internal codes are rewritten.
 - 1.1.2006102701
   * Fixed: Stops to work while you are customizing the toolbar.
   * Improved: You can disable animation effects.
 - 1.1.2006102603
   * Fixed: Now, unexpected "resize" events, not fired by resizing of the window itself, are ignored correctly.
   * Improved: When just after the thumbnails are shown, or, while thumbnails are scrolled by keyboard operations, thumbnails below the pointer doesn't get focused.
 - 1.1.2006102602
   * Fixed: Some minor problems are solved.
 - 1.1.2006102601
   * Fixed: Context menu disappeared for both-click.
   * Fixed: Invalid behavior of vi-style keys, "H" and "J" is corrected.
   * Modified: Thumbnails are hidden when the window lost its focus.
   * Improved: Minimum size of thumbnails can be customized.
   * Fixed: Preferences dialog works correctly even if its animation is available.
 - 1.1.2006102501
   * Improved: Favicons are shown on thumbnails.
   * Improved: "H", "J", "K" and "L" keys can move focus like vi.
   * Improved: You can move focus by the keypad (tenkey).
   * Modified: Cursor is changed on thumbnails.
   * Improved: Now, both click (both left and right buttons are clicked together) shows thumbnail list.
   * Improved: Now, ctrl-click selects a thumbnail, and dragging on thumbnails selects multiple thumbnails.
   * Improved: You can close multiple tabs when multiple thumbnails are selected, by the context menu.
 - 1.0.2006102404
   * Fixed: A few problems about auto-close of thumbnail list are solved.
 - 1.0.2006102403
   * Fixed: User-defined shortcut key is saved correctly.
   * Improved: Changed shortcut key will be available without firefox restarting.
   * Fixed: Broken order of thumbnails for sorted by "most recently viewed" was solved.
   * Modified: Preferences are rearranged.
 - 1.0.2006102402
   * Improved: Thumnails are always shown inside the window.
 - 1.0.2006102401
   * Improved: Implementation of thumbnail list was completely rewritten. Closebox and context menu on thumbnails works better.
   * Modified: Thumbails are always shown in the center of the window.
   * Modified: Fixed size thumbnails and thumbnail list are gone.
   * Improved: "F8" shows the thumbnail list.
   * Improved: You can move the focus on thumbnails by cursor keys - up, down, left and right.
 - 0.1.2006100802
   * Fixed: Initial startup problem (toolbar is not initialized) is solved.
 - 0.1.2006100801
   * Fixed: Keyboard shortcuts work correctly.
 - 0.1.2006100701
   * Improved: Thumbnails can be sorted in order recently focused.
 - 0.1.2006012001
   * Improved: Thumbnail list can be shown automatically when the tab bar is pointed.
 - 0.1.2006011301
   * Improved: Pointing on the toolbar icon doesn't show the thumbnails automatically if only one tab is open.
   * Fixed: Empty navigation-bar doesn't show initializing dialog anymore.
 - 0.1.2005110501
   * Improved: This extension confirms that a custom button should or shouldn't be inserted to the navigation toolbar.
 - 0.1.2005081901
   * Fixed: Errors in some windows disappeared.
   * Fixed: The thunmbnail list no longer appear when you move the pointer across the button.
 - 0.1.2005080303
   * Fixed: Needless popup opened by Ctrl-click on Firefox window disappeared.
   * Fixed: Operations are available correctly, after that the context menu on thumbnail images is closed.
 - 0.1.2005080302
   * Fixed: The thumbnail list keep its position for some cases, ex. tabs are closed from the list, or others.
 - 0.1.2005080301
   * Improved: Context menu for tabs can be opened by right-click on thumbnail images.
   * Improved: Overflowed thumbnails are shown with scrollbars.
   * Modified: The thumbnail list shown by Ctrl-Tab or some of other ways is placed to the left edge of the window.
   * Improved: The thumbnail list can be fixed to your favorite size.
   * Modified: Too large thumbnail images are scaled to 40% of the window size.
 - 0.1.2005080202-05
   * Improved: Middle-click on thumbnail closes the tab.
   * Improved: Thumbnail images are updated when it is pointed.
   * Improved: The title of the page and the URI are shwon as a tooltip on the thumbnail.
   * Modified: Thumbnail list keeps open when tabs are closed by middle-click.
   * Fixed: Ctrl-Tab for switching tabs with thumbnail view works correctly.
   * Improved: Titlebar and closebox in each thumbnail are available.
   * Improved: Size of thumbnail images can be fixed to your favorite size.
   * Improved: This can override the Scroll Wheel Navigation feature of "All-In-One Gestures" Extension.
 - 0.1.2005080201
   * Released.
