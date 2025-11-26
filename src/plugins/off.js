/*
	@ SeoRomin Library Plugin: .off()
	@ Removes an event handler previously attached with .on().
	@ Can remove all, by type, by namespace, by selector, or a specific handler.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('off', function( eventType, selector, handler ) {
		// .off(): Remove all handlers for all types
		if( eventType === undefined ) {
			this.each(function() {
				if( this.__sr_dispatchers ) {
					Object.keys(this.__sr_dispatchers).forEach(key => {
						const [type, modifier] = key.split('_');
						const isPassive = modifier === 'passive';
						this.removeEventListener(type, $._internal.eventDispatcher, { passive: isPassive });
					});
				}

				this.__sr_events = [];
				this.__sr_dispatchers = {};
			});

			return this;
		}

		if( typeof eventType !== 'string' ) {
			return this;
		}

		let eventSelector, eventHandler;

		// Handle argument overloading to determine selector/handler for removal
		// .off('click.ns', handler)
		if( typeof selector === 'function' ) {
			eventSelector = null; // Target only direct handlers
			eventHandler = selector;
		}
		// .off('click.ns', '.selector', [handler])
		else if( typeof selector === 'string' ) {
			eventSelector = selector;
			eventHandler = handler; // Can be undefined
		}
		// .off('click.ns')
		else {
			eventSelector = undefined; // Wildcard: remove for all selectors (direct and delegated)
			eventHandler = undefined;  // Wildcard: remove for all handlers
		}

		const eventTypes = $._internal.splitByWhitespace(eventType);
		if( !eventTypes.length ) return this;

		this.each(function() {
			eventTypes.forEach(type => {
				$._internal.removeEvent(this, type, eventSelector, eventHandler);
			});
		});

		return this;
	});

})();