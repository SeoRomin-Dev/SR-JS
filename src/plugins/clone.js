/*
	@ SeoRomin Library Plugin: .clone()
	@ Creates a deep copy of the set of matched elements.
	@ Optional arguments control whether data and event handlers are copied.
	@ Returns a new SR object with the cloned elements.
*/
(function() {

	$.extend('clone', function( withDataAndEvents = false, deepWithDataAndEvents = withDataAndEvents ) {
		const clonedElements = this['_sr_elements'].map(el => {
			return $._internal.cloneNode(el, withDataAndEvents, deepWithDataAndEvents);
		});

		return $(clonedElements);
	});

})();