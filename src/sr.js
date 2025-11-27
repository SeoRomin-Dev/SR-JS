/*
	@ SeoRomin Library
	@ Pure JS in action
	@ Copyright (c) by SeoRomin
*/

const $ = (function() {
	// Internal property to store the DOM elements array on each SR instance
	const _elements = '_sr_elements';

	function SR( selector, context ) {
		// Always return a new SR instance
		if( !(this instanceof SR) ) {
			return new SR(selector, context);
		}

		// Handle $(function() { ... }) for DOM ready
		// Don't select any elements, just execute the function on ready
		if( typeof selector === 'function' ) {
			if( document.readyState === 'interactive' || document.readyState === 'complete' ) {
				selector();
			} else {
				document.addEventListener('DOMContentLoaded', selector, { once: true });
			}
			this[_elements] = [];
		} else {
			let nodes = [];

			// 1. Handle String Selectors (HTML or CSS)
			if( typeof selector === 'string' ) {
				if( $._internal.isHtmlString(selector) ) {
					nodes = $._internal.createNodesFromHTML(selector.trim());
				} else {
					// CSS Selector with Context
					if( context ) {
						// Support SR object as context
						if( context instanceof SR ) {
							// Manually collect nodes from context elements to avoid dependency on .find()
							context[_elements].forEach(ctxEl => {
								if( ctxEl.querySelectorAll ) {
									const found = ctxEl.querySelectorAll(selector.trim());
									nodes.push(...found);
								}
							});
						}
						// Support DOM Element as context
						else if( context.nodeType ) {
							nodes = context.querySelectorAll(selector.trim());
						}
						// Fallback (e.g. context is invalid or unknown type)
						else {
							nodes = document.querySelectorAll(selector.trim());
						}
					} else {
						nodes = document.querySelectorAll(selector.trim());
					}
				}
			}
			// 2. Handle SR Instances
			else if( selector instanceof SR ) {
				nodes = selector[_elements];
			}
			// 3. Handle Single DOM Element or Window
			else if( selector === window || (selector && selector.nodeType) ) {
				nodes = [selector];
			}
			// 4. Handle Iterables (NodeList, Array, etc.)
			else if( selector && typeof selector === 'object' && typeof selector[Symbol.iterator] === 'function' ) {
				nodes = selector;
			}

			// Convert to Array to normalize NodeLists, etc.
			let elements = Array.from(nodes || []);

			// Context Filtering for non-string selectors (e.g. $(arrayOfDivs, container))
			// Only apply if context is provided and we have elements
			if( context && typeof selector !== 'string' && elements.length ) {
				// Normalize context to an array of nodes
				const contextNodes = (context instanceof SR) ? context[_elements] : (context.nodeType ? [context] : []);

				if( contextNodes.length ) {
					// Optimization: Fast path for single context (most common case)
					if( contextNodes.length === 1 ) {
						const ctx = contextNodes[0];
						elements = elements.filter(el => el.nodeType && ctx !== el && ctx.contains(el));
					} else {
						elements = elements.filter(el => {
							// Element must be a Node and contained within a context node (excluding the context node itself)
							return el.nodeType && contextNodes.some(ctx => ctx !== el && ctx.contains(el));
						});
					}
				}
			}

			// Store unique elements using Set
			this[_elements] = [...new Set(elements)];
		}

		// Proxy for direct property access on the first element (e.g., $(window).innerHeight)
		return new Proxy(this, {
			get( target, prop, receiver ) {
				// Priority 1: SR's own methods (e.g., .each())
				if( Reflect.has(target, prop) ) {
					return Reflect.get(target, prop, receiver);
				}

				// Priority 2: Indexed access (e.g., $('p')[0])
				if( typeof prop === 'string' && /^\d+$/.test(prop) ) {
					return target[_elements][parseInt(prop, 10)];
				}

				// Priority 3: Properties of the first DOM element
				const firstEl = target[_elements][0];
				if( firstEl ) {
					const value = firstEl[prop];
					// Bind element's methods to the element itself
					return typeof value === 'function' ? value.bind(firstEl) : value;
				}
			},

			set( target, prop, value, receiver ) {
				// Set property on the wrapper if it exists
				if( Reflect.has(target, prop) ) {
					return Reflect.set(target, prop, value, receiver);
				}

				// Set element by index
				if( typeof prop === 'string' && /^\d+$/.test(prop) ) {
					target[_elements][parseInt(prop, 10)] = value;
					return true;
				}

				// Set property on the first element
				const firstEl = target[_elements][0];
				if( firstEl ) {
					return Reflect.set(firstEl, prop, value);
				}

				return Reflect.set(target, prop, value, receiver);
			}
		});
	}

	// Prototype alias
	SR.fn = SR.prototype = {
		constructor: SR,

		// Get the number of elements in the collection
		get length() {
			return this[_elements].length;
		},

		// Make SR objects iterable (allows for...of loops)
		[Symbol.iterator]: function* () {
			for( const el of this[_elements] ) {
				yield el;
			}
		}
	};

	// Namespace for internal helper functions
	SR._internal = {};

	// Securely adds a new method to the prototype
	// Only for internal plugins
	SR.extend = function( name, func ) {
		if( typeof name !== 'string' || typeof func !== 'function' ) {
			console.error('SR: To add a plugin, you must provide a name (string) and a function.');
			return;
		}

		if( SR.fn.hasOwnProperty(name) ) {
			console.warn(`SR: Plugin "${name}" already exists. It will not be replaced.`);
			return;
		}

		// Add as a non-writable, non-configurable property
		Object.defineProperty(SR.fn, name, {
			value: func,
			enumerable: true,
			writable: false,
			configurable: false
		});
	};

	// --- Public Extensibility ---

	// Securely adds a new instance plugin for developers
	SR.plugin = function( name, func ) {
		if( typeof name !== 'string' || !name.trim() ) {
			console.error('SR Plugin: Plugin name must be a non-empty string.');
			return;
		}

		if( typeof func !== 'function' ) {
			console.error(`SR Plugin: The plugin "${name}" must be a function.`);
			return;
		}

		if( SR.fn.hasOwnProperty(name) ) {
			console.warn(`SR Plugin: A method named "${name}" already exists on the prototype. It will not be replaced.`);
			return;
		}

		// Add the new plugin to the prototype
		Object.defineProperty(SR.fn, name, {
			value: func,
			enumerable: true,
			writable: false,
			configurable: false
		});
	};

	// Flexibly adds a new static method for developers
	SR.method = function( name, func ) {
		if( typeof name !== 'string' || !name.trim() ) {
			console.error('SR Method: Static method name must be a non-empty string.');
			return;
		}

		if( typeof func !== 'function' ) {
			console.error(`SR Method: The method "${name}" must be a function.`);
			return;
		}

		const descriptor = Object.getOwnPropertyDescriptor(SR, name);
		if( descriptor ) {
			if( !descriptor.configurable ) {
				console.error(`SR Method: Cannot overwrite non-configurable static method "${name}".`);
				return;
			}

			console.warn(`SR Method: A static method named "${name}" already exists. It will be overwritten.`);
		}

		// Add/overwrite the method on the static SR/$ object, making it extensible
		Object.defineProperty(SR, name, {
			value: func,
			enumerable: true,
			writable: true,
			configurable: true
		});
	};

	return SR;

})();