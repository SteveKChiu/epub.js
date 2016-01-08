EPUBJS.Render.Iframe = function() {
	this.iframe = null;
	this.document = null;
	this.window = null;
	this.docEl = null;
	this.bodyEl = null;

	this.startPos = 0;
	this.pageWidth = 0;
	this.pageHeight = 0;
    this.boundingWidth = 0;
    this.boundingHeight = 0;
	this.isVertical = false;
};

//-- Build up any html needed
EPUBJS.Render.Iframe.prototype.create = function(){
	this.iframe = document.createElement('iframe');
	this.iframe.id = "epubjs-iframe:" + EPUBJS.core.uuid();
//	this.iframe.scrolling = "no";
	this.iframe.seamless = "seamless";
	// Back up if seamless isn't supported
	this.iframe.style.border = "none";

	this.iframe.addEventListener("load", this.loaded.bind(this), false);

	this.isMobile = navigator.userAgent.match(/(iPad|iPhone|iPod|Mobile|Android)/g);
	this.transform = EPUBJS.core.prefixed('transform');

    if (this.isMobile) {
    	this.overflowScrolling = EPUBJS.core.prefixed('overflowScrolling');
    } else {
        this.iframe.scrolling = "no";
    }

	return this.iframe;
};

/**
* Sets the source of the iframe with the given URL string
* Takes:  Document Contents String
* Returns: promise with document element
*/
EPUBJS.Render.Iframe.prototype.load = function(contents, url){
	var render = this,
			deferred = new RSVP.defer();

	if(this.window) {
		this.unload();
	}

	this.iframe.onload = function(e) {
		var title;

		render.document = render.iframe.contentDocument;
		render.docEl = render.document.documentElement;
		render.headEl = render.document.head;
		render.bodyEl = render.document.body || render.document.querySelector("body");
		render.window = render.iframe.contentWindow;

		render.window.addEventListener("resize", render.resized.bind(render), false);

		// Reset the scroll position
		render.startPos = 0;
		render.setStartOffset(0);

		//-- Clear Margins
		if(render.bodyEl) {
			render.bodyEl.style.margin = "0";
		}

//		// HTML element must have direction set if RTL or columnns will
//		// not be in the correct direction in Firefox
//		// Firefox also need the html element to be position right
//		if(render.direction == "rtl" && render.docEl.dir != "rtl"){
//			render.docEl.dir = "rtl";
//			render.docEl.style.position = "absolute";
//			render.docEl.style.right = "0";
//		}

		deferred.resolve(render.docEl);
	};

	this.iframe.onerror = function(e) {
		//console.error("Error Loading Contents", e);
		deferred.reject({
				message : "Error Loading Contents: " + e,
				stack : new Error().stack
			});
	};

	// this.iframe.contentWindow.location.replace(url);
	this.document = this.iframe.contentDocument;

    if(!this.document) {
        deferred.reject(new Error("No Document Available"));
        return deferred.promise;
    }

    this.document.open();
    this.document.write(contents);
    this.document.close();

	return deferred.promise;
};


EPUBJS.Render.Iframe.prototype.loaded = function(v){
	var url = this.iframe.contentWindow.location.href;
	var baseEl, base;

	this.document = this.iframe.contentDocument;
	this.docEl = this.document.documentElement;
	this.headEl = this.document.head;
	this.bodyEl = this.document.body || this.document.querySelector("body");
	this.window = this.iframe.contentWindow;

	if(url != "about:blank"){
		baseEl = this.iframe.contentDocument.querySelector("base");
		base = baseEl.getAttribute('href');
		this.trigger("render:loaded", base);
	}
};

// Resize the iframe to the given width and height
EPUBJS.Render.Iframe.prototype.resize = function(width, height){
	var iframeBox;

	if(!this.iframe) return;

	this.iframe.height = height;

	if(!isNaN(width) && width % 2 !== 0){
		width += 1; //-- Prevent cutting off edges of text in columns
	}

	this.iframe.width = width;
//	// Get the fractional height and width of the iframe
//	// Default to orginal if bounding rect is 0
// 	this.width = this.iframe.getBoundingClientRect().width || width;
// 	this.height = this.iframe.getBoundingClientRect().height || height;
};


EPUBJS.Render.Iframe.prototype.resized = function(){
//	// Get the fractional height and width of the iframe
// 	this.width = this.iframe.getBoundingClientRect().width;
// 	this.height = this.iframe.getBoundingClientRect().height;
    if (!this.document) return;
    var range = this.document.createRange();
    range.selectNodeContents(this.bodyEl);
    var rect = range.getBoundingClientRect();
    this.boundingWidth = rect.width;
    this.boundingHeight = rect.height;
};

EPUBJS.Render.Iframe.prototype.totalWidth = function(){
    return this.boundingWidth;
};

EPUBJS.Render.Iframe.prototype.totalHeight = function(){
    return this.boundingHeight;
};

EPUBJS.Render.Iframe.prototype.setPageDimensions = function(pageWidth, pageHeight, isVertical){
	this.pageWidth = pageWidth;
	this.pageHeight = pageHeight;
    this.isVertical = isVertical;
    this.resized();
	this.scroll(pageWidth > this.iframe.width, pageHeight > this.iframe.height);

	//-- Add a page to the width of the document to account an for odd number of pages
	// this.docEl.style.width = this.docEl.scrollWidth + pageWidth + "px";
};

EPUBJS.Render.Iframe.prototype.setDirection = function(direction){

	this.direction = direction;

//	// Undo previous changes if needed
//	if(this.docEl && this.docEl.dir == "rtl"){
//		this.docEl.dir = "rtl";
//		this.docEl.style.position = "static";
//		this.docEl.style.right = "auto";
//	}

};

EPUBJS.Render.Iframe.prototype.setStartOffset = function(startPos){
	// this.bodyEl.style.marginLeft = -leftPos + "px";
	// this.docEl.style.marginLeft = -leftPos + "px";
	// this.docEl.style[EPUBJS.Render.Iframe.transform] = 'translate('+ (-leftPos) + 'px, 0)';

	if (this.isMobile) {
        if (this.isVertical) {
            this.docEl.style[this.transform] = 'translate(0px, '+ (-startPos) + 'px)';
        } else {
            this.docEl.style[this.transform] = 'translate('+ (-startPos) + 'px, 0px)';
        }
	} else {
        if (this.isVertical) {
            this.document.defaultView.scrollTo(0, startPos);
        } else {
            this.document.defaultView.scrollTo(startPos, 0);
        }
	}

};

EPUBJS.Render.Iframe.prototype.setStyle = function(style, val, prefixed){
	if(prefixed) {
		style = EPUBJS.core.prefixed(style);
	}

	if(this.bodyEl) this.bodyEl.style[style] = val;
};

EPUBJS.Render.Iframe.prototype.removeStyle = function(style){

	if(this.bodyEl) this.bodyEl.style[style] = '';

};

EPUBJS.Render.Iframe.prototype.addHeadTag = function(tag, attrs, _doc) {
	var doc = _doc || this.document;
	var tagEl = doc.createElement(tag);
	var headEl = doc.head;

	for(var attr in attrs) {
		tagEl.setAttribute(attr, attrs[attr]);
	}

	if(headEl) headEl.insertBefore(tagEl, headEl.firstChild);
};

EPUBJS.Render.Iframe.prototype.page = function(pg){
    //-- pages start at 1
	if (this.isVertical) {
        this.startPos = this.pageHeight * (pg-1);
	} else if (this.direction === "rtl") {
        var totalWidth = Math.ceil(this.boundingWidth / this.pageWidth) * this.pageWidth;
        this.startPos = totalWidth - this.pageWidth * pg;
	} else {
        this.startPos = this.pageWidth * (pg-1);
    }
    this.setStartOffset(this.startPos);
};

//-- Show the page containing an Element
EPUBJS.Render.Iframe.prototype.getPageNumberByElement = function(el){
	if (!el) return;
    var range = this.document.createRange();
    range.selectNodeContents(el);
    var rect = range.getBoundingClientRect();
	return this.getPageNumberByRect(rect);
};

//-- Show the page containing an Element
EPUBJS.Render.Iframe.prototype.getPageNumberByRect = function(boundingClientRect){
    if (this.isVertical) {
        var top = this.startPos + boundingClientRect.top;
        return Math.floor(top / this.pageHeight) + 1;
	} else if (this.direction === "rtl") {
        var totalWidth = Math.ceil(this.boundingWidth / this.pageWidth) * this.pageWidth;
        var right = totalWidth - (this.startPos + boundingClientRect.right);
        return Math.floor(right / this.pageWidth) + 1;
    } else {
        var left = this.startPos + boundingClientRect.left; //-- Calculate left offset compaired to scrolled position
        return Math.floor(left / this.pageWidth) + 1;
    }
};

// Return the root element of the content
EPUBJS.Render.Iframe.prototype.getBaseElement = function(){
	return this.bodyEl;
};

// Return the document element
EPUBJS.Render.Iframe.prototype.getDocumentElement = function(){
	return this.docEl;
};

//// Checks if an element is on the screen
//EPUBJS.Render.Iframe.prototype.isElementVisible = function(el){
//	if(el && typeof el.getBoundingClientRect === 'function'){
//		var rect = el.getBoundingClientRect();
//		var left = rect.left; //+ rect.width;
//        var top = rect.top;
//		return rect.width !== 0 &&
//            rect.height !== 0 && // Element not visible
//            left >= 0 &&
//            left < this.width &&
//            top >= 0 &&
//            top < this.height;
//	}
//
//	return false;
//};

EPUBJS.Render.Iframe.prototype.scroll = function(boolX, boolY, type){
	if (type) {
        this.scrollType = type;
		this.scrollDirectionX = boolX;
		this.scrollDirectionY = boolY;
	} else {
		boolX = this.scrollDirectionX && boolX;
		boolY = this.scrollDirectionY && boolY;
	}

    var parent = this.iframe.parentElement;
	if (boolX || boolY) {
        if (this.isMobile) {
            if (this.scrollType == "window") {
                parent.style.overflowX = "";
                parent.style.overflowY = "";
                parent.style[this.overflowScrolling] = "";
                this.iframe.scrolling = "yes";
            } else {
                parent.style.overflowX = boolX ? "auto" : "hidden";
                parent.style.overflowY = boolY ? "auto" : "hidden";
                parent.style[this.overflowScrolling] = "touch";
                this.iframe.scrolling = "";
            }
        } else {
            this.iframe.scrolling = "yes";
        }
	} else {
        if (this.isMobile) {
            parent.style.overflowX = "hidden";
            parent.style.overflowY = "hidden";
            parent.style[this.overflowScrolling] = "";
        }
        this.iframe.scrolling = "no";
	}
};

// Cleanup event listeners
EPUBJS.Render.Iframe.prototype.unload = function(){
	this.window.removeEventListener("resize", this.resized);
	this.window.location.reload();
};

//-- Enable binding events to Render
RSVP.EventTarget.mixin(EPUBJS.Render.Iframe.prototype);
