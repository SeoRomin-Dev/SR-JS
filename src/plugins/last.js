/*
	@ SeoRomin Library Plugin: .last()
	@ Reduces the set of matched elements to the last in the set.
	@ Returns a new SR object containing only the last element.
*/
(function() {

	$.extend('last', function() {
		const { _sr_elements: elements } = this;
		const { length } = elements;
		// If the set is empty, return an empty SR object
		return length ? $(elements[length - 1]) : $();
	});

})();