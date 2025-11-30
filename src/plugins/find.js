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
			// Use the safe, context-aware query helper which handles document context correctly
			const found = $._internal.scopedQuerySelectorAll(this, selector);
			found.forEach(el => foundElements.add(el));
		});

		return $(foundElements);
	});

})();