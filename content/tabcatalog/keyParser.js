function TabCatalog_parseShortcut(aShortcut)
{
	var keys = aShortcut.split('+');

	var keyCode = keys[keys.length-1].replace(/ /g, '_').toUpperCase();
	var key     = keyCode;

	keyCode = (keyCode.length == 1 || keyCode == 'SPACE') ? '' : 'VK_'+keyCode ;
	key = keyCode ? '' : keyCode ;

	return {
		key      : key,
		charCode : (key ? key.charCodeAt(0) : '' ),
		keyCode  : keyCode,
		altKey   : /alt/i.test(aShortcut),
		ctrlKey  : /ctrl|control/i.test(aShortcut),
		metaKey  : /meta/i.test(aShortcut),
		shiftKey : /shift/i.test(aShortcut),
		string   : aShortcut,
		modified : false
	};
}
