/*
	@ SeoRomin Library Plugin: .find()
	@ Gets descendants of each element, filtered by a selector.
	@ Returns a new SR object with the unique found elements.
*/
(function() {

	$.extend('find', function( selector ) {
		if( typeof selector !== 'string' || !selector ) {
			return $();
		}

		const foundElements = new Set();

		this.each(function() {
			// Ensure the context element has querySelectorAll (e.g., not a window or text node)
			if( typeof this.querySelectorAll === 'function' ) {
				this.querySelectorAll(selector).forEach(found => {
					foundElements.add(found);
				});
			}
		});

		return $(foundElements);
	});

})();