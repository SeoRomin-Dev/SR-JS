/*
	@ SeoRomin Library Plugin: .is()
	@ Checks if at least one element in the set matches the given selector, element, or function.
	@ Supports custom pseudo-selectors like: :visible, :hidden, :empty.
*/
(function() {

	// Helper to check if an element is visible in the layout
	// Note: An element is considered visible if it consumes space in the document
	// Elements with `visibility: hidden` are considered visible as long as they have a non-zero size
	const isVisible = el => {
		// 1. Must be connected to the DOM to be visible
		if( !el.isConnected ) {
			return false;
		}

		// 2. Must not have display: none
		if( window.getComputedStyle(el).display === 'none' ) {
			return false;
		}

		// 3. For SVG, check bounding box. A try/catch is needed as getBBox() can fail
		if( el instanceof SVGElement ) {
			try {
				const bbox = el.getBBox();
				return bbox.width > 0 || bbox.height > 0;
			} catch( e ) {
				return false; // Fails on elements like <defs> or if not rendered
			}
		}

		// 4. For HTML, check that it has layout dimensions
		return el.getClientRects().length > 0;
	};

	$.extend('is', function( selector ) {
		if( !this.length || !selector ) {
			return false;
		}

		// Case 1: Selector is a string
		if( typeof selector === 'string' ) {
			const filters = [];
			const customPseudoRegex = /:(visible|hidden|empty)/g;

			// Separate standard selector from custom pseudo-selectors
			const baseSelector = selector.replace(customPseudoRegex, (match, type) => {
				filters.push({ type });
				return '';
			}).trim();

			let errorLogged = false;

			return this['_sr_elements'].some(el => {
				// Check against the standard CSS part first for performance
				if( baseSelector ) {
					try {
						// .matches() is only available on Element nodes
						if( el.nodeType !== 1 || !el.matches(baseSelector) ) {
							return false;
						}
					} catch( e ) {
						// Log invalid selector error only once to avoid console spam
						if( !errorLogged ) {
							console.error(`SR: Invalid selector for .is(): "${baseSelector}"`);
							errorLogged = true;
						}
						return false; // An invalid selector cannot match
					}
				}

				// Then, apply all custom filters
				return filters.every(filter => {
					switch( filter.type ) {
						case 'visible': return isVisible(el);
						case 'hidden':  return !isVisible(el);
						case 'empty':   return el.childNodes.length === 0;
					}
					return false;
				});
			});
		}

		// Case 2: Selector is a function
		if( typeof selector === 'function' ) {
			return this['_sr_elements'].some((el, index) => selector.call(el, index, el));
		}

		// Case 3: Selector is an element, SR object, or iterable
		let elementsToCompare;
		if( selector instanceof $ ) {
			elementsToCompare = selector['_sr_elements'];
		} else if( selector.nodeType ) {
			elementsToCompare = [selector];
		} else if( typeof selector[Symbol.iterator] === 'function' ) {
			elementsToCompare = Array.from(selector);
		} else {
			return false;
		}

		// Use a Set for fast lookups
		const comparisonSet = new Set(elementsToCompare);
		return this['_sr_elements'].some(el => comparisonSet.has(el));
	});

})();