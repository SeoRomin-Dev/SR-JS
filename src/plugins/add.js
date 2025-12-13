/*
	@ SeoRomin Library Plugin: .add()
	@ Adds elements to the current set.
	@ Returns a new SR object with the unique, sorted union of elements.
*/
(function() {

	$.extend('add', function( selector ) {
		const $elementsToAdd = $(selector);

		// Optimize Set creation: Start with existing elements and add new ones individually
		// This avoids creating a temporary intermediate array with spread syntax
		const combinedElements = new Set(this['_sr_elements']);
		$elementsToAdd['_sr_elements'].forEach(el => combinedElements.add(el));

		// Use the centralized sorting helper
		const sortedElements = $._internal.uniqueSort(combinedElements);

		return $(sortedElements);
	});

})();