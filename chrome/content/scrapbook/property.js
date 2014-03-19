
var sbPropService = {

	get STRING() { return document.getElementById("sbPropString"); },
	get ICON()   { return document.getElementById("sbPropIcon"); },

	id       : null,
	item     : null,
	resource : null,
	isTypeSeparator: false,
	isTypeBookmark : false,
	isTypeFolder   : false,
	isTypeNote     : false,
	isTypeFile     : false,
	isTypeSite     : false,

	init : function()
	{
		this.id = window.arguments[0];
		if (!this.id)
			return;
		this.item = ScrapBookData.newItem(this.id);
		this.resource = ScrapBookUtils.RDF.GetResource("urn:scrapbook:item" + this.id);
		for (var prop in this.item) {
			this.item[prop] = ScrapBookData.getProperty(this.resource, prop);
		}
		this.id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
		var dd = new Date(
			parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
			parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
		);
		var dateTime = dd.toLocaleString();
		document.getElementById("sbPropID").value      = this.item.id;
		document.getElementById("sbPropTitle").value   = this.item.title;
		document.getElementById("sbPropSource").value  = this.item.source;
		document.getElementById("sbPropDate").value    = dateTime;
		document.getElementById("sbPropChars").value   = this.item.chars;
		document.getElementById("sbPropComment").value = this.item.comment.replace(/ __BR__ /g, "\n");
		document.getElementById("sbPropMark").setAttribute("checked", this.item.type == "marked");
		this.ICON.src = this.item.icon ? this.item.icon : ScrapBookUtils.getDefaultIcon(this.item.type);
		document.title = this.item.title;
		if (ScrapBookData.isContainer(this.resource))
			this.item.type = "folder";
		var bundleName = "TYPE_PAGE";
		switch (this.item.type) {
			case "separator": this.isTypeSeparator = true; bundleName = "TYPE_SEPARATOR"; break;
			case "bookmark" : this.isTypeBookmark  = true; bundleName = "TYPE_BOOKMARK";  break;
			case "folder"   : this.isTypeFolder    = true; bundleName = "TYPE_FOLDER";    break;
			case "note"     : this.isTypeNote      = true; bundleName = "TYPE_NOTE";      break;
			case "file"     : 
			case "image"    : this.isTypeFile      = true; bundleName = "TYPE_FILE";      break;
			case "combine"  : this.isTypeSite      = true; bundleName = "TYPE_COMBINE";   break;
			case "site"     : this.isTypeSite      = true; bundleName = "TYPE_INDEPTH2";  break;
		}
		document.getElementById("sbPropType").value = this.STRING.getString(bundleName);
		document.getElementById("sbPropSourceRow").hidden = this.isTypeFolder || this.isTypeNote || this.isTypeSeparator;
		document.getElementById("sbPropCharsRow").hidden  = this.isTypeFolder || this.isTypeFile || this.isTypeBookmark || this.isTypeSeparator;
		document.getElementById("sbPropIconRow").hidden   = this.isTypeSeparator;
		document.getElementById("sbPropIconMenu").hidden  = this.isTypeNote;
		document.getElementById("sbPropSizeRow").hidden   = this.isTypeFolder || this.isTypeBookmark || this.isTypeSeparator;
		document.getElementById("sbPropMark").hidden      = this.isTypeFolder || this.isTypeNote || this.isTypeFile || this.isTypeSite || this.isTypeBookmark;
		document.getElementById("sbPropIconMenu").firstChild.firstChild.nextSibling.setAttribute("disabled", this.isTypeFolder || this.isTypeBookmark);
		if (this.isTypeNote)
			document.getElementById("sbPropTitle").removeAttribute("editable");
		this.updateCommentTab(this.item.comment);
		if (!this.isTypeFolder && !this.isTypeBookmark)
			setTimeout(function(){ sbPropService.delayedInit(); }, 0);
	},

	delayedInit : function()
	{
		var sizeCount = this.getTotalFileSize(this.id);
		var txt = sbPropService.formatFileSize(sizeCount[0]);
		txt += "  " + this.STRING.getFormattedString("FILES_COUNT", [sizeCount[1]]);
		document.getElementById("sbPropSize").value = txt;
	},

	accept : function()
	{
		var newVals = {
			title   : document.getElementById("sbPropTitle").value,
			source  : document.getElementById("sbPropSource").value,
			comment : ScrapBookUtils.escapeComment(document.getElementById("sbPropComment").value),
			type    : this.item.type,
			icon    : this.getIconURL()
		};
		if (!this.isTypeSeparator && !document.getElementById("sbPropMark").hidden)
			newVals.type = document.getElementById("sbPropMark").checked ? "marked" : "";
		var changed = false;
		var props = ["title", "source", "comment", "type", "icon"];
		for (var i = 0; i < props.length; i++) {
			if (this.item[props[i]] != newVals[props[i]]) {
				this.item[props[i]] = newVals[props[i]];
				changed = true;
			}
		}
		if (changed) {
			for (var prop in this.item)  {
				ScrapBookData.setProperty(this.resource, prop, this.item[prop]);
			}
			if (!this.isTypeFolder && !this.isTypeBookmark && !this.isTypeSeparator)
				ScrapBookUtils.writeIndexDat(this.item);
		}
		if (window.arguments[1])
			window.arguments[1].accept = true;
	},

	cancel : function()
	{
		if ( window.arguments[1] ) window.arguments[1].accept = false;
	},

	fillTitle : function(aPopupElem)
	{
		if ( this.isTypeFolder || this.isTypeNote || this.isTypeFile || this.isTypeBookmark ) return;
		if ( !aPopupElem.hasChildNodes() )
		{
			aPopupElem.parentNode.appendItem(this.getHTMLTitle(this.id, this.item.chars));
		}
	},

	setDefaultIcon : function()
	{
		this.ICON.src = ScrapBookUtils.getDefaultIcon(this.item.type);
	},

	getIconURL : function()
	{
		var iconURL = this.ICON.src;
		return ( iconURL.indexOf("chrome://scrapbook/skin/") == 0 ) ? "" : iconURL;
	},

	pickupIcon : function(aCommand, aPickerLabel)
	{
		var dir;
		if ( aCommand == "F" ) {
			dir = ScrapBookUtils.getContentDir(this.item.id, true);
			if ( !dir ) return;
		} else {
			dir = ScrapBookUtils.getScrapBookDir().clone();
			dir.append("icon");
			if ( !dir.exists() ) dir.create(dir.DIRECTORY_TYPE, 0700);
		}
		var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		FP.init(window, aPickerLabel, FP.modeOpen);
		FP.displayDirectory = dir;
		FP.appendFilters(FP.filterImages);
		if ( FP.show() == FP.returnOK )
		{
			var iconURL;
			if      ( aCommand == "F" && dir.contains(FP.file, false) ) iconURL = "resource://scrapbook/data/" + this.id + "/" + FP.file.leafName;
			else if ( aCommand == "U" && dir.contains(FP.file, false) ) iconURL = "resource://scrapbook/icon/" + FP.file.leafName;
			else iconURL = ScrapBookUtils.convertFilePathToURL(FP.file.path);
			this.ICON.src = iconURL;
		}
	},

	setIconURL : function()
	{
		var ret = { value : this.getIconURL() };
		var text = ScrapBookUtils.getLocaleString("URL") +":";
		if ( !ScrapBookUtils.PROMPT.prompt(window, "[ScrapBook]", text, ret, null, {}) ) return;
		if ( ret.value ) this.ICON.src = ret.value;
	},

	updateCommentTab : function(aComment)
	{
		var elem = document.getElementById("sbPropCommentTab");
		if ( aComment )
			elem.setAttribute("image", "chrome://scrapbook/skin/edit_comment.png");
		else
			elem.removeAttribute("image");
	},

	getHTMLTitle : function(aID, aChars)
	{
		var file  = ScrapBookUtils.getContentDir(aID, true);
		if ( !file ) return "";
		file.append("index.html");
		var content = ScrapBookUtils.convertToUnicode(ScrapBookUtils.readFile(file), aChars);
		return content.match(/<title>([^<]+?)<\/title>/im) ? RegExp.$1 : "";
	},

	getTotalFileSize : function(aID)
	{
		var totalSize = 0;
		var totalFile = 0;
		var dir = ScrapBookUtils.getContentDir(aID, true);
		if ( !dir || !dir.isDirectory() ) return [0, 0];
		var fileEnum = dir.directoryEntries;
		while ( fileEnum.hasMoreElements() )
		{
			var file = fileEnum.getNext().QueryInterface(Ci.nsIFile);
			totalSize += file.fileSize;
			totalFile++;
		}
		return [totalSize, totalFile];
	},

	formatFileSize : function(aBytes)
	{
		if ( aBytes > 1000 * 1000 ) {
			return this.divideBy100( Math.round( aBytes / 1024 / 1024 * 100 ) ) + " MB";
		} else if ( aBytes == 0 ) {
			return "0 KB";
		} else {
			var kbytes = Math.round( aBytes / 1024 );
			return (kbytes == 0 ? 1 : kbytes) + " KB";
		}
	},

	divideBy100 : function(aInt)
	{
		if ( aInt % 100 == 0 ) {
			return aInt / 100 + ".00";
		} else if ( aInt % 10 == 0 ) {
			return aInt / 100 + "0";
		} else {
			return aInt / 100;
		}
	},

};



