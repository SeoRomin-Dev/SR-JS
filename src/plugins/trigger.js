/*
	@ SeoRomin Library Plugin: .trigger()
	@ Executes all handlers for a given event type on the matched elements by dispatching a native-like event.
	@ Uses the native `dispatchEvent` for robust, browser-compliant behavior.
	@ Optional `extraParameters` are passed to handlers via `event.detail`.
	@ Returns the original SR object for chaining.
*/
(function() {

	// A set of events that do not bubble in the DOM standard
	// Our synthetic event will respect this for better compliance
	const nonBubblingEvents = new Set(['mouseenter', 'mouseleave', 'focus', 'blur', 'load', 'unload', 'scroll']);

	$.extend('trigger', function( eventType, extraParameters ) {
		const eventTypes = $._internal.splitByWhitespace(eventType);
		if( !eventTypes.length ) {
			return this;
		}

		return this.each(function() {
			const element = this;

			eventTypes.forEach(fullType => {
				const parts = fullType.split('.');
				const baseType = parts[0];
				if( !baseType ) return; // Ignore if called with just a namespace, e.g., '.myPlugin'

				const namespaces = parts.slice(1);
				const bubbles = !nonBubblingEvents.has(baseType);
				let event;

				// Create a new event that can bubble and be cancelled
				// Using CustomEvent allows us to pass `extraParameters` and our internal namespaces
				try {
					event = new CustomEvent(baseType, {
						bubbles: bubbles,
						cancelable: true,
						detail: {
							_sr_extra: extraParameters,
							_sr_namespaces: namespaces.length ? namespaces : undefined
						}
					});
				} catch( e ) {
					// Fallback for older environments
					event = document.createEvent('CustomEvent');
					event.initCustomEvent(baseType, bubbles, true, {
						_sr_extra: extraParameters,
						_sr_namespaces: namespaces.length ? namespaces : undefined
					});
				}

				// Add a flag to distinguish our synthetic trigger from an organic user event
				Object.defineProperty(event, 'isTrigger', { value: true, configurable: true });

				// Dispatch the event on the element
				// This will cause the browser to execute all listeners for this event type
				// (including our dispatcher) and handle the bubbling process
				element.dispatchEvent(event);
			});
		});
	});

})();