/*
	@ SeoRomin Library Plugin: .removeClass()
	@ Removes the specified class(es) from each element.
	@ If no class name is specified, it removes all classes.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('removeClass', function( className ) {
		// Case 1: A non-empty string with classes to remove is provided
		if( typeof className === 'string' && className ) {
			const classes = $._internal.splitByWhitespace(className);
			if( classes.length ) {
				this.each(function() {
					this.classList.remove(...classes);
				});
			}
		}
		// Case 2: No argument, so remove all classes
		else if( className === undefined || className === null || className === '' ) {
			this.each(function() {
				this.className = '';
			});
		}

		return this;
	});

})();