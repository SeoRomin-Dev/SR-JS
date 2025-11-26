/*
	@ SeoRomin Library Plugin: .children()
	@ Gets children of each element, optionally filtered by a selector.
	@ Returns a new SR object with the found child elements.
*/
(function() {

	$.extend('children', function( selector ) {
		if( selector && typeof selector !== 'string' ) {
			return $();
		}

		const childrenElements = new Set();

		this.each(function() {
			// Ensure the context element has children (e.g., not a window or text node)
			if( this.children ) {
				// Iterate directly over the live HTMLCollection for efficiency
				for( const child of this.children ) {
					if( !selector || child.matches(selector) ) {
						childrenElements.add(child);
					}
				}
			}
		});

		return $(childrenElements);
	});

})();