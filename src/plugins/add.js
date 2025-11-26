/*
	@ SeoRomin Library Plugin: .add()
	@ Adds elements to the current set.
	@ Returns a new SR object with the unique, sorted union of elements.
*/
(function() {

	$.extend('add', function( selector ) {
		const $elementsToAdd = $(selector);
		const combinedElements = new Set([...this['_sr_elements'], ...$elementsToAdd['_sr_elements']]);

		// Sort the combined elements in document order
		const sortedElements = Array.from(combinedElements).sort((a, b) => {
			if( a === b ) return 0;
			// Use compareDocumentPosition for a robust, cross-browser sort
			if( a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ) {
				return -1; // a comes before b
			}
			return 1; // b comes before a
		});

		return $(sortedElements);
	});

})();