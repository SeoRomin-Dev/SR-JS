/*
	@ SeoRomin Library Plugin: .hasClass()
	@ Checks if any of the elements in the set have the specified class.
	@ Returns true if at least one element has the class, otherwise false.
*/
(function() {

	$.extend('hasClass', function( className ) {
		if( typeof className !== 'string' ) {
			return false;
		}

		const trimmedClassName = className.trim();

		// Validate the input: must be a single, non-empty class name without whitespace
		if( !trimmedClassName || /\s/.test(trimmedClassName) ) {
			return false;
		}

		// Use .some() for efficiency - it stops as soon as a match is found
		return this['_sr_elements'].some(el => el.classList.contains(trimmedClassName));
	});

})();