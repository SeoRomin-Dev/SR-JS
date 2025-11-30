/*
	@ SeoRomin Library Plugin: .parent()
	@ Gets the parent of each element, optionally filtered by a selector.
	@ Returns a new SR object with the unique parent elements.
*/
(function() {

	$.extend('parent', function( selector ) {
		const parents = new Set();

		this.each(function() {
			const parent = this.parentElement;
			if( parent ) {
				if( !selector || $._internal.matches(parent, selector) ) {
					parents.add(parent);
				}
			}
		});

		return $(parents);
	});

})();