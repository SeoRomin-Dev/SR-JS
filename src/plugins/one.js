/*
	@ SeoRomin Library Plugin: .one()
	@ Attaches an event handler that is executed at most once per element per event type.
	@ A lightweight wrapper for `.on(..., { once: true })`.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('one', function( /* eventType, selector, handler, options */ ) {
		// All logic is centralized in a helper to be shared with .on()
		return $._internal.setupEvents(this, arguments, true);
	});

})();