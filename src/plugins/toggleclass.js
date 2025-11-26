/*
	@ SeoRomin Library Plugin: .toggleClass()
	@ Toggles one or more classes on each element.
	@ An optional boolean 'state' argument can force add (true) or remove (false).
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('toggleClass', function( className, state ) {
		const classes = $._internal.splitByWhitespace(className);
		if( !classes.length ) {
			return this;
		}

		// classList.toggle(token, force) natively supports the second boolean argument
		this.each(function() {
			classes.forEach(cls => {
				this.classList.toggle(cls, state);
			});
		});

		return this;
	});

})();