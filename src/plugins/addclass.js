/*
	@ SeoRomin Library Plugin: .addClass()
	@ Adds the specified class(es) to each element.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('addClass', function( className ) {
		const classes = $._internal.splitByWhitespace(className);
		if( !classes.length ) {
			return this;
		}

		this.each(function() {
			this.classList.add(...classes);
		});

		return this;
	});

})();