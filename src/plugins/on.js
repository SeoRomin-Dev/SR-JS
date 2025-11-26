/*
	@ SeoRomin Library Plugin: .on()
	@ Attaches an event handler for one or more events.
	@ Supports direct and delegated events, multiple events, namespaces, and an event map.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('on', function( /* eventType, selector, handler, options */ ) {
		// All logic is centralized in a helper to be shared with .one()
		return $._internal.setupEvents(this, arguments, false);
	});

})();