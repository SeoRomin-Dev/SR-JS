/*
	@ SeoRomin Library Plugin: $.t()
	@ Static element creator: $.t('<div>', { class: 'foo' })
	@ Creates elements with attributes, props, and events in one go.
*/
(function() {

	$.t = function( html, props ) {
		if( typeof html !== 'string' ) {
			return $();
		}

		// Create element from HTML or a text node
		const $el = $._internal.isHtmlString(html) ? $(html) : $([document.createTextNode(html)]);

		if( !$el.length || !props || typeof props !== 'object' ) {
			return $el;
		}

		// A Set of common properties for faster direct assignment
		const commonProps = new Set([
			'id', 'value', 'textContent', 'innerHTML', 'checked', 'selected', 'disabled', 'title', 'href', 'src'
		]);

		// Optimize loop using Object.entries to iterate only own properties
		for( const [key, value] of Object.entries(props) ) {
			// Route properties to appropriate methods or set directly
			if( typeof value === 'function' ) {
				$el.on(key, value); // Events
			}
			else if( key === 'text' ) {
				$el.each(function() { this.textContent = value; });
			}
			else if( key === 'html' ) {
				$el.html(value);
			}
			else if( key === 'class' ) {
				$el.addClass(String(value));
			}
			else if( key === 'css' && typeof value === 'object' && value !== null ) {
				$el.css(value);
			}
			else if( key === 'data' && typeof value === 'object' && value !== null ) {
				$el.data(value);
			}
			else if( commonProps.has(key) ) {
				$el.each(function() { this[key] = value; }); // Common direct properties
			}
			else {
				$el.attr(key, value); // Fallback to attributes
			}
		}

		return $el;
	};

})();