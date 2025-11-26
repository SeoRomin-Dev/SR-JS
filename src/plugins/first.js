/*
	@ SeoRomin Library Plugin: .first()
	@ Reduces the set of matched elements to the first in the set.
	@ Returns a new SR object containing only the first element.
*/
(function() {

	$.extend('first', function() {
		const { _sr_elements: elements } = this;
		// If the set is empty, return an empty SR object
		return elements.length ? $(elements[0]) : $();
	});

})();