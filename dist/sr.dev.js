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
				const trimmedSelector = selector.trim();
				if( $._internal.isHtmlString(trimmedSelector) ) {
					nodes = $._internal.createNodesFromHTML(trimmedSelector);
				} else {
					// CSS Selector with Context
					if( context ) {
						// Support SR object as context
						if( context instanceof SR ) {
							context[_elements].forEach(ctxEl => {
								nodes.push(...$._internal.scopedQuerySelectorAll(ctxEl, trimmedSelector));
							});
						}
						// Support DOM Element as context
						else if( context.nodeType ) {
							nodes = $._internal.scopedQuerySelectorAll(context, trimmedSelector);
						}
						// Fallback (e.g. context is invalid or unknown type)
						else {
							nodes = $._internal.scopedQuerySelectorAll(document, trimmedSelector);
						}
					} else {
						nodes = $._internal.scopedQuerySelectorAll(document, trimmedSelector);
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
/*
	@ SeoRomin Library
	@ Internal helper functions. Not for public use.
*/
(function() {
	// Converts kebab-case to camelCase (e.g., 'background-color' -> 'backgroundColor')
	$._internal.camelCase = str => str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());

	// Converts camelCase to kebab-case (e.g., 'backgroundColor' -> 'background-color')
	$._internal.camelToKebab = str => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

	// Safely splits a string by whitespace into an array
	$._internal.splitByWhitespace = str => {
		return typeof str === 'string' ? (str.match(/\S+/g) || []) : [];
	};

	// Checks if a string is likely an HTML tag
	$._internal.isHtmlString = str => {
		if( typeof str !== 'string' ) return false;
		const trimmed = str.trim();
		return trimmed.startsWith('<') && trimmed.endsWith('>') && trimmed.length >= 3;
	};

	// WeakMap for element data storage, prevents memory leaks
	$._internal.dataCache = new WeakMap();

	// Creates DOM nodes from an HTML or SVG string
	$._internal.createNodesFromHTML = function( html ) {
		let nodes;
		const isSVG = /^<(?<tag>svg|g|path|circle|rect|line|text)/i.test(html);

		if( isSVG ) {
			// Use DOMParser for robust SVG parsing
			const parser = new DOMParser();
			const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${html}</svg>`, 'image/svg+xml');

			const parseError = doc.querySelector('parsererror');
			if( parseError ) {
				console.error('SR: Error parsing SVG string.', parseError.textContent);
				nodes = [];
			} else {
				// Return the children of the temporary <svg> wrapper
				nodes = Array.from(doc.documentElement.childNodes).filter(node => node.nodeType === 1);
			}
		} else {
			// Use a <template> element for safe HTML parsing
			const template = document.createElement('template');
			template.innerHTML = html;
			nodes = template.content.childNodes;
		}

		return nodes;
	};

	// Centralized event setup logic for .on() and .one()
	$._internal.setupEvents = function( srInstance, args, isOnce ) {
		const [eventType, selector, handler, options] = args;
		const isEventObject = typeof eventType === 'object' && eventType !== null;
		let eventSelector, eventHandler, eventOptions;

		// --- Argument Overloading ---

		// Case 1: .on({ eventMap }, [selector], [options])
		if( isEventObject ) {
			if( typeof selector === 'object' && selector !== null ) {
				eventSelector = null;
				eventOptions = selector;
			} else {
				eventSelector = (typeof selector === 'string') ? (selector.trim() || null) : null;
				eventOptions = handler;
			}
		}
		// Case 2: .on('click', ...)
		else if( typeof eventType === 'string' ) {
			let sel = selector;
			let hnd = handler;
			let opts = options;

			if( typeof sel === 'function' ) {
				opts = hnd;
				hnd = sel;
				sel = null;
			}

			if( typeof hnd !== 'function' ) {
				return srInstance;
			}

			eventHandler = hnd;
			eventOptions = opts;
			eventSelector = (typeof sel === 'string') ? (sel.trim() || null) : null;
		} else {
			return srInstance;
		}

		const finalOptions = (typeof eventOptions === 'object' && eventOptions !== null) ? { ...eventOptions } : {};
		if( isOnce ) {
			finalOptions.once = true;
		}

		srInstance.each(function() {
			const element = this;
			if( isEventObject ) {
				for( const events in eventType ) {
					if( Object.hasOwn(eventType, events) && typeof eventType[events] === 'function' ) {
						$._internal.addEvent(element, events, eventSelector, eventType[events], finalOptions);
					}
				}
			} else {
				$._internal.addEvent(element, eventType, eventSelector, eventHandler, finalOptions);
			}
		});

		return srInstance;
	};

	// Attaches an event handler and its data to a raw element
	$._internal.addEvent = function( element, eventType, selector, handler, options = {} ) {
		const eventTypes = $._internal.splitByWhitespace(eventType);
		if( !eventTypes.length ) return;

		const { once = false, passive = false } = options;

		if( !element.__sr_events ) element.__sr_events = [];
		if( !element.__sr_dispatchers ) element.__sr_dispatchers = {};

		eventTypes.forEach(fullType => {
			const parts = fullType.split('.');
			const type = parts[0];
			// Sort namespaces for consistent matching, e.g., 'click.foo.bar' is same as 'click.bar.foo'
			const namespace = parts.slice(1).sort().join('.');

			if( !type ) return; // e.g., if eventType was just ".foo"

			// Store handler details on the element
			element.__sr_events.push({ type, namespace, handler, selector, once, passive, originalType: fullType });

			// Attach a single dispatcher per event type and passive flag
			const dispatcherKey = `${type}_${passive ? 'passive' : 'active'}`;
			if( !element.__sr_dispatchers[dispatcherKey] ) {
				element.addEventListener(type, $._internal.eventDispatcher, { passive });
				element.__sr_dispatchers[dispatcherKey] = true;
			}
		});
	};

	// Helper to check if a stored event matches the removal criteria
	$._internal.eventMatchesCriteria = ( event, type, namespaces, selector, handler ) => {
		// 1. Check type (if specified)
		if( type && event.type !== type ) {
			return false;
		}

		// 2. Check namespaces (if specified)
		if( namespaces.length > 0 ) {
			const eventNamespaces = event.namespace ? event.namespace.split('.') : [];
			// The stored event must contain ALL of the specified namespaces
			if( !namespaces.every(ns => eventNamespaces.includes(ns)) ) {
				return false;
			}
		}

		// 3. Check selector (undefined = wildcard, null = direct)
		if( selector !== undefined && event.selector !== selector ) {
			return false;
		}

		// 4. Check handler (if specified)
		if( handler && event.handler !== handler ) {
			return false;
		}

		return true; // It's a match for removal
	};

	// Helper to clean up event dispatchers after handlers are removed
	const _cleanupDispatchers = ( element, typesToClean, remainingEvents ) => {
		if( !element.__sr_dispatchers ) return;

		typesToClean.forEach(type => {
			if( !element.__sr_dispatchers ) return; // Re-check in case it was deleted
			const remainingForType = remainingEvents.filter(e => e.type === type);

			const hasActive = remainingForType.some(e => !e.passive);
			const hasPassive = remainingForType.some(e => e.passive);

			const activeKey = `${type}_active`;
			if( !hasActive && element.__sr_dispatchers[activeKey] ) {
				element.removeEventListener(type, $._internal.eventDispatcher, { passive: false });
				delete element.__sr_dispatchers[activeKey];
			}

			const passiveKey = `${type}_passive`;
			if( !hasPassive && element.__sr_dispatchers[passiveKey] ) {
				element.removeEventListener(type, $._internal.eventDispatcher, { passive: true });
				delete element.__sr_dispatchers[passiveKey];
			}
		});
	};

	// Removes event handlers and cleans up dispatchers if no handlers remain
	$._internal.removeEvent = function( element, eventType, selector, handler ) {
		const events = element.__sr_events;
		if( !events || !events.length ) return;

		const typesBeforeRemoval = new Set(events.map(e => e.type));

		// Parse removal criteria
		const parts = eventType ? eventType.split('.') : [''];
		const typeToRemove = parts[0];
		const namespacesToRemove = parts.slice(1).filter(Boolean);

		// Keep events that DO NOT match the removal criteria
		const remainingEvents = events.filter(e => {
			return !$._internal.eventMatchesCriteria(e, typeToRemove, namespacesToRemove, selector, handler);
		});

		element.__sr_events = remainingEvents;

		// Cleanup: Remove dispatchers if no corresponding handlers are left
		_cleanupDispatchers(element, typesBeforeRemoval, remainingEvents);
	};

	// Helper for delegated events to find the target for complex selectors (>, +, ~)
	$._internal.findDelegatedTarget = ( event, container, selector ) => {
		const potentialTargets = new Set($._internal.scopedQuerySelectorAll(container, selector));
		if( potentialTargets.size === 0 ) return null;

		let current = event.target;
		// Traverse from the event target up to the container
		while( current && current !== container.parentElement ) {
			if( potentialTargets.has(current) ) {
				return current; // Found a match
			}
			if( current === container ) break; // Stop if we reach the container itself
			current = current.parentElement;
		}
		return null; // No match found in the ancestry chain
	};

	// Helper to determine if a handler should run for a given event, checking namespaces
	$._internal.shouldHandlerRunForEvent = ( handler, event ) => {
		// 1. Must match the event type (e.g., 'click')
		if( handler.type !== event.type ) {
			return false;
		}

		// 2. If event was triggered with namespaces, handler must match
		const triggeredNamespaces = event.isTrigger ? (event.detail?._sr_namespaces || []) : null;
		if( triggeredNamespaces ) {
			const handlerNamespaces = handler.namespace ? handler.namespace.split('.') : [];
			// A handler with no namespace will run for any namespaced trigger of the same type
			if( handlerNamespaces.length === 0 ) {
				return true;
			}
			// A handler with namespaces will only run if all its namespaces are present in the trigger
			return handlerNamespaces.every(ns => triggeredNamespaces.includes(ns));
		}

		// 3. For organic events or triggers without namespaces, run all handlers for the type
		return true;
	};

	// Helper to execute a handler and manage 'once' logic
	const _executeHandler = ( container, storedEvent, event, targetElement ) => {
		storedEvent.handler.call(targetElement, event);
		if( storedEvent.once ) {
			$._internal.removeEvent(container, storedEvent.originalType, storedEvent.selector, storedEvent.handler);
		}
	};

	// Centralized event handler for direct and delegated events
	$._internal.eventDispatcher = function( event ) {
		const container = this; // The element the listener is attached to
		const allHandlers = container.__sr_events || [];
		if( !allHandlers.length ) return;

		const handlersToRun = allHandlers.filter(h => $._internal.shouldHandlerRunForEvent(h, event));
		if( !handlersToRun.length ) return;

		// Iterate over a copy in case a handler modifies the array
		[...handlersToRun].forEach(storedEvent => {
			const { selector } = storedEvent;

			if( !selector ) { // Direct event
				_executeHandler(container, storedEvent, event, container);
			} else { // Delegated event
				let matchingTarget = null;

				// Use a specialized path for selectors starting with a combinator (>, +, ~) or :scope
				if( /^\s*(:scope|[>+~])/.test(selector) ) {
					matchingTarget = $._internal.findDelegatedTarget(event, container, selector);
				} else {
					// Fast path: Use .closest() for standard selectors
					try {
						const closest = event.target.closest(selector);
						if( closest && container.contains(closest) ) {
							matchingTarget = closest;
						}
					} catch( e ) {
						// Silently fail, as matchingTarget will remain null
					}
				}

				if( matchingTarget ) {
					_executeHandler(container, storedEvent, event, matchingTarget);
				}
			}
		});
	};

	// Recursively cleans up SR data and events from a node and its descendants
	$._internal.cleanupNodeTree = function( rootNode, cleanRoot = true ) {
		if( !rootNode || rootNode.nodeType !== 1 ) return; // Guard against non-elements

		// Determine the list of nodes to clean based on the `cleanRoot` flag
		const nodesToClean = cleanRoot
			? [rootNode, ...rootNode.querySelectorAll('*')]
			: [...rootNode.querySelectorAll('*')];

		for( const node of nodesToClean ) {
			// 1. Remove event listeners and dispatchers
			if( node.__sr_dispatchers ) {
				Object.keys(node.__sr_dispatchers).forEach(key => {
					const [type, modifier] = key.split('_');
					const isPassive = modifier === 'passive';
					node.removeEventListener(type, $._internal.eventDispatcher, { passive: isPassive });
				});
				delete node.__sr_dispatchers;
			}
			if( node.__sr_events ) {
				delete node.__sr_events;
			}

			// 2. Remove from the central data cache
			$._internal.dataCache.delete(node);
		}
	};

	// Clones a node, optionally with its data and events
	$._internal.cloneNode = function( originalEl, withDataAndEvents, deepWithDataAndEvents ) {
		const clonedEl = originalEl.cloneNode(true);

		const copyProps = ( source, dest ) => {
			// Copy SR event handlers
			if( source.__sr_events ) {
				source.__sr_events.forEach(event => {
					const { originalType, selector, handler, once, passive } = event;
					$._internal.addEvent(dest, originalType, selector, handler, { once, passive });
				});
			}
			// Deep copy SR data from cache
			const sourceData = $._internal.dataCache.get(source);
			if( sourceData ) {
				$._internal.dataCache.set(dest, structuredClone(sourceData));
			}
			// Ensure SVG attributes are copied
			if( source instanceof SVGElement ) {
				for( const attr of source.attributes ) {
					dest.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
				}
			}
		};

		// Copy for the root element
		if( withDataAndEvents ) {
			copyProps(originalEl, clonedEl);
		}

		// Copy for all descendant elements
		if( deepWithDataAndEvents ) {
			const sourceDescendants = originalEl.querySelectorAll('*');
			const clonedDescendants = clonedEl.querySelectorAll('*');
			for( let i = 0; i < sourceDescendants.length; i++ ) {
				copyProps(sourceDescendants[i], clonedDescendants[i]);
			}
		}

		return clonedEl;
	};

	// Cache for default display values by tag name
	$._internal.defaultDisplayMap = {};

	// Helper to determine the default display for an element's tag
	$._internal.getDefaultDisplay = (el) => {
		const tagName = el.tagName;
		if( $._internal.defaultDisplayMap[tagName] ) {
			return $._internal.defaultDisplayMap[tagName];
		}

		const tempEl = document.createElement(tagName);
		// Use document.documentElement as a fallback if document.body is not yet available
		const parent = document.body || document.documentElement;

		parent.appendChild(tempEl);
		const display = window.getComputedStyle(tempEl).display;
		parent.removeChild(tempEl);

		$._internal.defaultDisplayMap[tagName] = (display && display !== 'none') ? display : 'block';
		return $._internal.defaultDisplayMap[tagName];
	};

	// Helper to resolve the display value for an element being shown
	$._internal.resolveDisplayValue = (el) => {
		// 1. Check cache for a *defined* and non-null previous value
		const data = $._internal.dataCache.get(el);
		const storedDisplay = (data && Object.hasOwn(data, '_srOldDisplay')) ? data['_srOldDisplay'] : undefined;

		if( typeof storedDisplay === 'string' ) {
			return storedDisplay;
		}

		// 2. Try to reveal natural display by clearing inline 'none'
		if( el.style.display === 'none' ) {
			el.style.display = '';
		}

		const fromCSS = window.getComputedStyle(el).display;

		// 3. If CSS is valid and not 'none', use it
		if( fromCSS && fromCSS !== 'none' ) {
			return fromCSS;
		}

		// 4. Fallback to tag default
		return $._internal.getDefaultDisplay(el);
	};

	// Helper to remove an attribute, correctly handling SVG namespaces
	$._internal.removeAttribute = function( el, name ) {
		if( el instanceof SVGElement ) {
			const attrNode = el.getAttributeNode(name);
			if( attrNode && attrNode.namespaceURI ) {
				el.removeAttributeNS(attrNode.namespaceURI, attrNode.localName);
				return;
			}
		}
		el.removeAttribute(name);
	};

	// A set of common CSS properties that are unitless
	$._internal.unitlessCssProps = new Set([
		'animationIterationCount',
		'columnCount',
		'fillOpacity',
		'flex',
		'flexGrow',
		'flexShrink',
		'fontWeight',
		'gridArea',
		'gridColumn',
		'gridRow',
		'lineHeight',
		'opacity',
		'order',
		'orphans',
		'scale',
		'widows',
		'zIndex',
		'zoom',
		'strokeOpacity'
	]);

	// Regular expression to detect selectors starting with a combinator
	const reCombinator = /^\s*[>+~]/;

	// A safe and context-aware querySelectorAll that handles document vs element contexts
	$._internal.scopedQuerySelectorAll = function( element, selector ) {
		// 1. Determine the correct execution context
		//    - If the base element is the document AND the selector starts with a combinator,
		//      we must use document.documentElement to make it a valid query
		//    - Otherwise, we use the element itself. This fixes issues like $('html')
		const isDoc = element && element.nodeType === 9;
		const hasCombinator = reCombinator.test(selector);
		const context = (isDoc && hasCombinator) ? element.documentElement : element;

		if( !context || typeof context.querySelectorAll !== 'function' ) {
			return [];
		}

		// 2. Normalize the selector
		//    - If a selector part starts with a combinator, it needs `:scope` prepended
		//      to be valid when run on a specific element context
		//    - This is NOT needed for document (nodeType 9), but IS needed for element (nodeType 1)
		const needsScope = context.nodeType !== 9;
		const finalSelector = selector.split(',').map(s => {
			const trimmed = s.trim();
			return (needsScope && reCombinator.test(trimmed)) ? `:scope ${trimmed}` : trimmed;
		}).join(',');

		// 3. Execute the query within a try/catch
		try {
			return Array.from(context.querySelectorAll(finalSelector));
		} catch( e ) {
			// Silently fail on invalid selectors
			return [];
		}
	};

	// A safe .matches() wrapper that won't throw on invalid selectors
	$._internal.matches = ( el, selector ) => {
		if( !el || el.nodeType !== 1 || !selector || typeof selector !== 'string' ) {
			return false;
		}
		try {
			return el.matches(selector);
		} catch( e ) {
			return false;
		}
	};

	// --- Animation Helpers ---

	// Animation queue management
	$._internal.animationQueues = new WeakMap();

	// Adds an animation to an element's queue
	$._internal.enqueueAnimation = (el, fn) => {
		if( !$._internal.animationQueues.has(el) ) {
			$._internal.animationQueues.set(el, []);
		}

		const queue = $._internal.animationQueues.get(el);
		queue.push(fn);
		if( queue.length === 1 ) {
			fn();
		}
	};

	// Removes the completed animation from the queue and runs the next one
	$._internal.dequeueAnimation = (el) => {
		const queue = $._internal.animationQueues.get(el);
		if( !queue ) {
			return;
		}

		queue.shift();
		if( queue.length ) {
			queue[0]();
		}
	};

})();
/*
	@ SeoRomin Library Plugin: .add()
	@ Adds elements to the current set.
	@ Returns a new SR object with the unique, sorted union of elements.
*/
(function() {

	$.extend('add', function( selector ) {
		const $elementsToAdd = $(selector);
		const combinedElements = new Set([...this['_sr_elements'], ...$elementsToAdd['_sr_elements']]);

		// Sort the combined elements in document order
		const sortedElements = Array.from(combinedElements).sort((a, b) => {
			if( a === b ) return 0;
			// Use compareDocumentPosition for a robust, cross-browser sort
			if( a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ) {
				return -1; // a comes before b
			}
			return 1; // b comes before a
		});

		return $(sortedElements);
	});

})();
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
/*
	@ SeoRomin Library Plugin: .after()
	@ Inserts content after each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('after', function( content ) {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot, not a live collection
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Use the native DOM method to insert the nodes
			targetEl.after(...nodesToInsert);
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: $.ajax()
	@ Performs asynchronous HTTP (Ajax) requests.
	@ Optimized for modern browsers using Fetch API.
*/
(function() {

	// --- Custom Error Classes ---

	class HttpError extends Error {
		constructor( response, responseText ) {
			super(`SR: HTTP Error ${response.status}: ${response.statusText}`);
			this.name = 'HttpError';
			this.status = response.status;
			this.statusText = response.statusText;
			this.responseText = responseText;
			this.response = response; // Full response object for advanced inspection
		}
	}

	class ParserError extends Error {
		constructor( message, responseText, originalError ) {
			super(`SR: Parser Error: ${message}`);
			this.name = 'ParserError';
			this.responseText = responseText;
			this.cause = originalError; // Original error for debugging
		}
	}

	class TimeoutError extends Error {
		constructor( timeout ) {
			super(`SR: Request Timeout (${timeout}ms)`);
			this.name = 'TimeoutError';
			this.status = 0;
			this.statusText = 'timeout';
		}
	}

	class ManualAbortError extends Error {
		constructor() {
			super('SR: Request Aborted');
			// Overwrite name to be consistent with native abort for generic error handling
			this.name = 'AbortError';
			this.status = 0;
			this.statusText = 'abort';
		}
	}

	// --- Helper Functions ---

	// A recursive query string serializer
	// Supports nested objects (key[subkey]=value) and arrays (key[]=value)
	const toQueryString = ( data ) => {
		const parts = [];

		const build = ( prefix, obj ) => {
			if( prefix && (obj instanceof File || obj instanceof Blob) ) {
				throw new TypeError('SR: Cannot serialize File/Blob - use FormData with processData: false');
			}

			if( Array.isArray(obj) ) {
				// Serialize array items
				obj.forEach(( v, i ) => {
					// Style: brackets [] for simple arrays, [index] for complex (objects)
					const isComplex = typeof v === 'object' && v !== null;
					build(isComplex ? `${prefix}[${i}]` : `${prefix}[]`, v);
				});
			} else if( obj !== null && typeof obj === 'object' ) {
				// Serialize object keys
				for( const name in obj ) {
					if( Object.hasOwn(obj, name) ) {
						build(prefix ? `${prefix}[${name}]` : name, obj[name]);
					}
				}
			} else {
				// Primitive value
				const val = typeof obj === 'function' ? obj() : obj;
				if( val !== undefined ) {
					parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(val === null ? '' : val)}`);
				}
			}
		};

		build('', data);
		// Replace spaces with '+' for standard application/x-www-form-urlencoded encoding
		return parts.join('&').replace(/%20/g, '+');
	};

	// --- Main AJAX Function ---

	$.ajax = function( options = {} ) {
		// 1. Set Defaults and Configuration
		const {
			url,
			method,
			headers = {},
			data = null,
			dataType,
			contentType = 'application/x-www-form-urlencoded; charset=UTF-8',
			processData = true,
			cache = true,
			timeout = 0,
			crossDomain = undefined, // Undefined allows auto-detection
			xhrFields = {}
		} = options;

		if( !url ) {
			return Promise.reject(new Error('SR: AJAX URL is required'));
		}

		// Normalize method and dataType for robust handling
		const methodUpper = String(method || 'GET').toUpperCase();
		const finalDataType = String(dataType || 'text').toLowerCase();

		// Explicitly reject Blob/ArrayBuffer if processData is true
		if( processData && (data instanceof Blob || data instanceof ArrayBuffer) ) {
			throw new TypeError('SR: processData must be false for Blob or ArrayBuffer data.');
		}

		const isGetOrHead = methodUpper === 'GET' || methodUpper === 'HEAD';
		const reqHeaders = new Headers(headers);
		let reqBody = undefined;
		let reqUrl = url;

		// 2. Cache Configuration
		if( isGetOrHead && !cache ) {
			const [baseUrl, hash] = reqUrl.split('#');
			const urlParts = baseUrl.split('?');
			const path = urlParts[0];
			const existingParams = new URLSearchParams(urlParts[1] || '');
			existingParams.set('_', Date.now());
			reqUrl = `${path}?${existingParams.toString()}`;
			if( hash !== undefined ) {
				reqUrl += `#${hash}`;
			}
		}

		// 3. Header Finalization

		// Auto-detect crossDomain if not explicitly provided
		const isCrossDomain = crossDomain !== undefined ? !!crossDomain : (() => {
			try {
				// Resolve the request URL against the current window location
				const requestOrigin = new URL(reqUrl, window.location.href).origin;
				return requestOrigin !== window.location.origin;
			} catch( e ) {
				return true; // Fail safe: treat invalid URLs as cross-domain
			}
		})();

		// Add X-Requested-With header for same-origin requests
		// This is crucial for servers to detect AJAX requests
		if( !isCrossDomain && !reqHeaders.has('X-Requested-With') ) {
			reqHeaders.set('X-Requested-With', 'XMLHttpRequest');
		}

		if( typeof contentType === 'string' && !isGetOrHead && !reqHeaders.has('Content-Type') ) {
			// Set the default Content-Type unless processData is false and data is a raw string
			if( processData || typeof data !== 'string' ) {
				reqHeaders.set('Content-Type', contentType);
			}
		}

		if( data instanceof FormData && contentType === false ) {
			reqHeaders.delete('Content-Type');
		}

		// 4. Data and Body Preparation
		if( data !== null && data !== undefined ) {
			if( processData && data instanceof URLSearchParams ) {
				throw new TypeError('SR: Use data.toString() for URLSearchParams');
			}

			const isRawData = data instanceof Blob || data instanceof ArrayBuffer || data instanceof FormData;

			if( isGetOrHead ) {
				if( processData && !isRawData ) {
					const qs = typeof data === 'string' ? data : toQueryString(data);
					if( qs ) reqUrl += (reqUrl.includes('?') ? '&' : '?') + qs;
				}
			} else {
				if( !processData || isRawData ) {
					reqBody = data;
				} else {
					const finalContentType = reqHeaders.get('Content-Type')?.toLowerCase() || '';
					if( finalContentType.includes('application/json') ) {
						reqBody = typeof data === 'string' ? data : JSON.stringify(data);
					} else {
						reqBody = typeof data === 'string' ? data : toQueryString(data);
					}
				}
			}
		}

		// Set Accept header based on dataType if not explicitly provided
		if( !reqHeaders.has('Accept') ) {
			switch( finalDataType ) {
				case 'json':
					reqHeaders.set('Accept', 'application/json, text/javascript, */*; q=0.01');
				break;
				case 'html':
					reqHeaders.set('Accept', 'text/html, */*; q=0.01');
				break;
				case 'script':
					reqHeaders.set('Accept', 'text/javascript, application/javascript, */*; q=0.01');
				break;
				case 'text':
					reqHeaders.set('Accept', 'text/plain, */*; q=0.01');
				break;
				default:
					reqHeaders.set('Accept', '*/*');
				break;
			}
		}

		// Determine credentials policy
		// Default to 'same-origin' to behave like standard XHR (sending cookies for same domain)
		let credentials = 'same-origin';
		if( xhrFields.withCredentials === true ) {
			credentials = 'include';
		} else if( xhrFields.withCredentials === false ) {
			credentials = 'omit';
		}

		// 5. Execute Request with Timeout
		const controller = new AbortController();
		// Pass a reason to distinguish timeout from manual abort
		const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(new TimeoutError(timeout)), timeout) : null;

		return fetch(reqUrl, {
			method: methodUpper,
			headers: reqHeaders,
			body: isGetOrHead ? undefined : reqBody,
			signal: controller.signal,
			credentials
		})
		.then(async res => {
			const text = await res.text().catch(() => '');

			if( !res.ok ) {
				throw new HttpError(res, text);
			}

			if( finalDataType === 'json' ) {
				if( !text.trim() ) {
					return null; // An empty body is valid and parses to null
				}
				// We attempt to parse any response as JSON if requested, regardless of headers
				try {
					return JSON.parse(text);
				} catch( e ) {
					throw new ParserError(e.message, text, e);
				}
			}

			return text;
		})
		.catch(err => {
			if( err.name === 'AbortError' ) {
				// If a reason was provided (e.g., our TimeoutError), re-throw it
				if( controller.signal.reason ) {
					throw controller.signal.reason;
				}
				// Otherwise, it was a manual user-initiated abort
				throw new ManualAbortError();
			}
			// Re-throw other custom errors (HttpError, ParserError, etc.)
			throw err;
		})
		.finally(() => {
			if( timeoutId ) clearTimeout(timeoutId);
		});
	};

})();
/*
	@ SeoRomin Library Plugin: Animation Suite
	@ Contains: .animate(), .delay(), .stop(), .fadeIn/Out/Toggle(), .slideUp/Down/Toggle()
	@ Implements a robust CSS transition-based animation engine with queueing.
*/
(function() {

	const SPEEDS = { slow: 600, fast: 200, _default: 400 };
	const DEFAULT_EASING = 'swing';

	// Maps standard easing names to CSS values
	const CSS_EASINGS = {
		'linear': 'linear',
		'swing': 'ease-out',
		'ease': 'ease',
		'ease-in': 'ease-in',
		'ease-out': 'ease-out',
		'ease-in-out': 'ease-in-out'
	};

	// CSS properties animated during slide effects
	const SLIDE_PROPERTIES = ['height', 'maxHeight', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderBottomWidth'];

	// --- Core Animation Engine ---

	// Accessing offsetHeight forces the browser to recalculate styles (Reflow)
	const forceReflow = ( element ) => void element.offsetHeight;

	// Retrieves the current animation state for an element
	const getAnimationState = ( element ) => $._internal.dataCache.get(element)?.['_sr_anim'];

	// Sets or removes the animation state in the cache
	const setAnimationState = ( element, state ) => {
		const data = $._internal.dataCache.get(element) || {};
		if( state === null ) {
			delete data['_sr_anim'];
		} else {
			data['_sr_anim'] = state;
		}
		$._internal.dataCache.set(element, data);
	};

	// Final animation cleanup: removes listeners, restores styles, and dequeues
	const finishAnimation = ( element, state, runCallback ) => {
		if( !state ) return;

		clearTimeout(state.timer);
		element.removeEventListener('transitionend', state.onEnd);

		// Synchronously restore original properties so the next animation
		// (if queued) reads the correct baseline state immediately.
		if( state.originalWillChange ) {
			element.style.willChange = state.originalWillChange;
		} else {
			element.style.removeProperty('will-change');
		}

		if( state.originalTransition ) {
			element.style.transition = state.originalTransition;
		} else {
			element.style.removeProperty('transition');
		}

		if( runCallback && typeof state.callback === 'function' ) {
			state.callback.call(element);
		}

		setAnimationState(element, null);
		$._internal.dequeueAnimation(element);
	};

	// Applies target styles and sets up the CSS transition
	const runAnimation = ( element, targetStyles, duration, easing, callback ) => {
		const transitionProperties = Object.keys(targetStyles).map(prop => $._internal.camelToKebab(prop));

		if( !transitionProperties.length ) {
			if( typeof callback === 'function' ) callback.call(element);
			$._internal.dequeueAnimation(element);
			return;
		}

		// Hint to the browser for optimization, robustly handling existing values
		const originalWillChange = element.style.willChange;
		const willChangeProps = new Set(originalWillChange && originalWillChange !== 'auto' ? originalWillChange.split(', ') : []);

		transitionProperties.forEach(prop => willChangeProps.add(prop));
		element.style.willChange = [...willChangeProps].join(', ');

		const onTransitionEnd = (event) => {
			// Ignore events bubbling from children
			if( event && event.target !== element ) return;
			const state = getAnimationState(element);
			if( state ) finishAnimation(element, state, true);
		};

		setAnimationState(element, {
			originalTransition: element.style.transition,
			originalWillChange: originalWillChange,
			targetProps: targetStyles,
			onEnd: onTransitionEnd,
			timer: setTimeout(onTransitionEnd, duration + 50), // Failsafe
			callback: callback
		});

		element.style.transition = transitionProperties.map(prop => `${prop} ${duration}ms ${easing}`).join(', ');
		element.addEventListener('transitionend', onTransitionEnd);
		Object.assign(element.style, targetStyles);
	};

	// Normalizes overloaded animation arguments into a standard object
	const resolveAnimationArguments = ( duration, easing, callback ) => {
		let d = duration;
		let e = easing;
		let cb = callback;

		// Case 1: First argument is a function, e.g., .fadeIn(callback)
		if( typeof d === 'function' ) {
			cb = d;
			d = SPEEDS._default;
			// Note: `e` (easing) is passed through => it's not reset to default
		}
		// Case 2: First argument is a string
		else if( typeof d === 'string' ) {
			if( SPEEDS[d] ) { // e.g., .fadeIn('fast')
				d = SPEEDS[d];
			}
			else { // e.g., .fadeIn('linear', callback)
				cb = e;
				e = d;
				d = SPEEDS._default;
			}
		}

		// Case 3: Second argument is a function, e.g., .fadeIn(400, callback)
		if( typeof e === 'function' ) {
			cb = e;
			e = DEFAULT_EASING;
		}

		// Final normalization and return
		const finalDuration = (typeof d === 'number' && d >= 0) ? d : SPEEDS._default;
		const finalEasing = CSS_EASINGS[e] || CSS_EASINGS[DEFAULT_EASING];

		return { duration: finalDuration, easing: finalEasing, callback: cb };
	};

	// --- Public Animation Methods ---

	$.extend('animate', function( properties, settings ) {
		const s = settings || {};
		const animationOptions = resolveAnimationArguments(s.duration, s.easing, s.after);

		return this.each(function() {
			const element = this;
			$._internal.enqueueAnimation(element, () => {
				if( !element.isConnected ) {
					return $._internal.dequeueAnimation(element);
				}

				const computedStyle = window.getComputedStyle(element);
				const targetStyles = {};

				for( const propertyName in properties ) {
					if( !Object.hasOwn(properties, propertyName) ) continue;

					const camelCaseProperty = $._internal.camelCase(propertyName);
					let value = properties[propertyName];

					// Automatically append 'px' to numeric values for properties that are not unitless
					if( typeof value === 'number' && !$._internal.unitlessCssProps.has(camelCaseProperty) ) {
						value += 'px';
					}

					// Animate only if the target value is different
					if( computedStyle[camelCaseProperty] !== String(value) ) {
						targetStyles[camelCaseProperty] = String(value);
					}
				}

				forceReflow(element);
				runAnimation(element, targetStyles, animationOptions.duration, animationOptions.easing, animationOptions.callback);
			});
		});
	});

	$.extend('delay', function( duration ) {
		return this.each(function() {
			const element = this;
			$._internal.enqueueAnimation(element, () => {
				const timerId = setTimeout(() => {
					setAnimationState(element, null);
					$._internal.dequeueAnimation(element);
				}, parseFloat(duration) || 0);
				setAnimationState(element, { timer: timerId, isDelay: true });
			});
		});
	});

	$.extend('stop', function( clearQueue = false, jumpToEnd = clearQueue ) {
		return this.each(function() {
			const element = this;
			const animationState = getAnimationState(element);

			if( clearQueue ) {
				const queue = $._internal.animationQueues.get(element);
				if( queue ) queue.length = 0;
			}

			if( !animationState ) {
				if( !clearQueue ) $._internal.dequeueAnimation(element);
				return;
			}

			if( animationState.isDelay ) {
				clearTimeout(animationState.timer);
			} else {
				const stylesToApply = {};

				if( jumpToEnd ) {
					// Apply the final target styles
					Object.assign(stylesToApply, animationState.targetProps);
				} else {
					// Capture current computed styles to freeze the animation
					const computed = window.getComputedStyle(element);
					Object.keys(animationState.targetProps).forEach(propertyName => {
						stylesToApply[propertyName] = computed[propertyName];
					});
				}

				element.style.transition = 'none';
				Object.assign(element.style, stylesToApply);
				forceReflow(element);
			}

			// Run callback only if jumping to end of a real animation (not a delay)
			const shouldRunCallback = jumpToEnd && !animationState.isDelay;
			finishAnimation(element, animationState, shouldRunCallback);
		});
	});

	// --- Generic Show/Hide/Toggle Logic ---

	// Core driver for effects like fadeIn and slideDown
	const genericToggleAnimation = ( srInstance, type, duration, callback, config ) => {
		const animationOptions = resolveAnimationArguments(duration, config.easing, callback);

		return srInstance.each(function() {
			const element = this;
			$._internal.enqueueAnimation(element, () => {
				if( !element.isConnected ) {
					return $._internal.dequeueAnimation(element);
				}

				const computedStyle = window.getComputedStyle(element);
				if( config.skipInline && computedStyle.display === 'inline' ) {
					if( typeof animationOptions.callback === 'function' ) animationOptions.callback.call(element);
					return $._internal.dequeueAnimation(element);
				}

				const isHidden = computedStyle.display === 'none';
				const isShowAction = (type === 'toggle') ? isHidden : (type === 'show');

				// Skip if already in the desired state
				if( (isShowAction && !isHidden) || (!isShowAction && isHidden) ) {
					if( typeof animationOptions.callback === 'function' ) animationOptions.callback.call(element);
					return $._internal.dequeueAnimation(element);
				}

				// --- Animation Lifecycle ---
				// 1. Prepare: Set initial styles for measurement (e.g., display: block)
				config.prepare(element, isShowAction);
				// 2. Reflow: Force browser to apply preparation
				forceReflow(element);
				// 3. Measure: Read computed dimensions for the "to" state
				const animationValues = config.measure(element, isShowAction, window.getComputedStyle(element));
				// 4. Set Start State: Apply initial animation state (e.g., height: 0)
				Object.assign(element.style, animationValues.from);
				// 5. Reflow (CRITICAL): Force browser to render the 'from' state before transition
				forceReflow(element);
				// 6. Animate: In the next frame, apply 'to' styles and transition
				requestAnimationFrame(() => {
					runAnimation(element, animationValues.to, animationOptions.duration, animationOptions.easing, function() {
						config.cleanup(this, isShowAction);
						if( animationOptions.callback ) animationOptions.callback.call(this);
					});
				});
			});
		});
	};

	// --- Effect Configurations ---

	const fadeConfig = {
		easing: 'linear',
		skipInline: false,
		prepare: ( element, isShowAction ) => {
			if( isShowAction ) {
				element.style.opacity = '0';
				element.style.display = $._internal.resolveDisplayValue(element);
			}
		},
		measure: ( element, isShowAction, computedStyle ) => {
			const from = { opacity: computedStyle.opacity };
			const to = { opacity: isShowAction ? '1' : '0' };
			return { from, to };
		},
		cleanup: ( element, isShowAction ) => {
			element.style.removeProperty('opacity');
			if( !isShowAction ) element.style.display = 'none';
		}
	};

	const slideConfig = {
		easing: 'swing',
		skipInline: true, // `display: inline` elements have no height
		prepare: ( element, isShowAction ) => {
			if( isShowAction ) {
				element.style.display = $._internal.resolveDisplayValue(element);
			}
			element.style.overflow = 'hidden'; // Clip content
		},
		measure: ( element, isShowAction, computedStyle ) => {
			const from = {};
			const to = {};

			if( isShowAction ) { // slideDown
				SLIDE_PROPERTIES.forEach(property => {
					const value = computedStyle[property];
					if( property === 'maxHeight' && value === 'none' ) return;
					to[property] = value;
					from[property] = '0px';
				});
			} else { // slideUp
				SLIDE_PROPERTIES.forEach(property => {
					const value = computedStyle[property];
					if( property === 'maxHeight' && value === 'none' ) return;
					from[property] = value;
					to[property] = '0px';
				});
			}

			return { from, to };
		},
		cleanup: ( element, isShowAction ) => {
			SLIDE_PROPERTIES.forEach(prop => element.style.removeProperty($._internal.camelToKebab(prop)));
			element.style.removeProperty('overflow');
			if( !isShowAction ) element.style.display = 'none';
		}
	};

	// --- Public Effect Methods ---

	$.extend('fadeIn', function( duration, callback ) { return genericToggleAnimation(this, 'show', duration, callback, fadeConfig); });
	$.extend('fadeOut', function( duration, callback ) { return genericToggleAnimation(this, 'hide', duration, callback, fadeConfig); });
	$.extend('fadeToggle', function( duration, callback ) { return genericToggleAnimation(this, 'toggle', duration, callback, fadeConfig); });

	$.extend('slideDown', function( duration, callback ) { return genericToggleAnimation(this, 'show', duration, callback, slideConfig); });
	$.extend('slideUp', function( duration, callback ) { return genericToggleAnimation(this, 'hide', duration, callback, slideConfig); });
	$.extend('slideToggle', function( duration, callback ) { return genericToggleAnimation(this, 'toggle', duration, callback, slideConfig); });

})();
/*
	@ SeoRomin Library Plugin: .append()
	@ Inserts content to the end of each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('append', function( content ) {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Native .append() handles the move or insertion safely
			targetEl.append(...nodesToInsert);
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .appendTo()
	@ Appends each element in the set to the target.
	@ If multiple targets, clones are created for all but the last target.
	@ Returns a new SR object containing all inserted elements (clones + originals).
*/
(function() {

	$.extend('appendTo', function( target ) {
		const $target = $(target);
		const finalInsertedElements = [];

		if( !$target.length || !this.length ) {
			return $([]);
		}

		$target.each((targetIndex, targetElement) => {
			// Check if this is the last container we are inserting into
			const isLastTarget = (targetIndex === $target.length - 1);
			const nodesToInsert = [];

			this.each((index, sourceElement) => {
				// Use original for the last target (moves it), clone for others
				const node = isLastTarget
					? sourceElement
					: $._internal.cloneNode(sourceElement, true, true);
				nodesToInsert.push(node);
			});

			targetElement.append(...nodesToInsert);
			finalInsertedElements.push(...nodesToInsert);
		});

		return $(finalInsertedElements);
	});

})();
/*
	@ SeoRomin Library Plugin: $.assign()
	@ A lightweight, static utility for merging objects.
	@ Supports both shallow and deep merging, and handles circular references.
*/
(function() {

	// Private recursive helper for deep merge
	// It uses a cache (WeakMap) to track already copied objects and handle cycles
	function _recursiveMerge( target, source, cache ) {
		Reflect.ownKeys(source).forEach(key => {
			const srcVal = source[key];
			const targetVal = target[key];

			// Prevent self-assignment
			if( srcVal === target ) return;

			// Deep copy plain objects and arrays
			if( srcVal !== null && typeof srcVal === 'object' ) {
				// Handle circular references by checking the cache
				if( cache.has(srcVal) ) {
					target[key] = cache.get(srcVal);
					return;
				}

				let clone;
				if( Array.isArray(srcVal) ) {
					// Arrays are always replaced, not merged. The clone is populated by recursion
					clone = [];
				} else {
					// For objects, merge into the existing target if it's a compatible object, otherwise create a new one
					clone = (targetVal !== null && typeof targetVal === 'object' && !Array.isArray(targetVal)) ? targetVal : {};
				}

				// Store the newly created clone in the cache *before* recursing
				// This ensures self-references within the source object point to the new clone
				cache.set(srcVal, clone);

				// Recurse to populate the clone
				target[key] = _recursiveMerge(clone, srcVal, cache);
			}
			// For primitive values, just assign (ignoring undefined)
			else if( srcVal !== undefined ) {
				target[key] = srcVal;
			}
		});

		return target;
	}

	$.assign = function() {
		const args = Array.from(arguments);
		let deep = false;
		let i = 1;
		let target;

		// Handle argument parsing for the `deep` flag
		if( typeof args[0] === 'boolean' ) {
			deep = args[0];
			target = args[1] || {};
			i = 2;
		} else {
			target = args[0] || {};
		}

		if( deep ) {
			// Safeguard: Ensure target is an object for deep merge to prevent errors
			if( typeof target !== 'object' || target === null ) {
				target = {};
			}
			// Initialize cache once for the entire deep merge operation
			const cache = new WeakMap();
			for( ; i < args.length; i++ ) {
				const source = args[i];
				if( source && typeof source === 'object' ) {
					_recursiveMerge(target, source, cache);
				}
			}
		} else {
			// Simple shallow merge (no recursion, no cache needed)
			for( ; i < args.length; i++ ) {
				const source = args[i];
				if( source && typeof source === 'object' ) {
					Reflect.ownKeys(source).forEach(key => {
						const val = source[key];
						if( val !== undefined ) {
							target[key] = val;
						}
					});
				}
			}
		}

		return target;
	};

})();
/*
	@ SeoRomin Library Plugin: .attr()
	@ Gets an attribute value for the first element or sets attributes for every element.
	@ A value of null or undefined will remove the attribute.
	@ Returns the original SR object for chaining.
*/
(function() {

	// A set of HTML attributes that are treated as boolean (true/false)
	const booleanAttrs = new Set([
		'async', 'autofocus', 'autoplay', 'checked', 'controls', 'defer', 'disabled',
		'hidden', 'ismap', 'loop', 'multiple', 'muted', 'open', 'readonly', 'required', 'selected'
	]);

	$.extend('attr', function( name, value ) {
		// Getter: .attr('attributeName')
		if( typeof name === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) {
				return undefined;
			}

			// Boolean attributes: return name if present, otherwise undefined
			if( booleanAttrs.has(name) ) {
				return firstEl.hasAttribute(name) ? name : undefined;
			}

			const attrValue = firstEl.getAttribute(name);
			// getAttribute returns null when missing, return undefined instead
			return attrValue === null ? undefined : attrValue;
		}

		// --- SETTER ---

		// Case 1: .attr({ 'attr1': 'val1', ... })
		if( typeof name === 'object' ) {
			this.each(function() {
				const element = this;
				for( const key in name ) {
					if( Object.hasOwn(name, key) ) {
						const val = name[key];
						if( val === null || val === undefined ) {
							$._internal.removeAttribute(element, key);
						} else {
							// setAttribute expects a string value
							element.setAttribute(key, String(val));
						}
					}
				}
			});
		}
		// Case 2: .attr('attrName', 'value' | function)
		else if( typeof name === 'string' ) {
			const isFunction = typeof value === 'function';

			this.each(function( index ) {
				const element = this;
				let finalValue = value;

				if( isFunction ) {
					// Determine the "old value" based on the same logic as our getter for consistency
					let oldValForCallback;
					if( booleanAttrs.has(name) ) {
						oldValForCallback = element.hasAttribute(name) ? name : undefined;
					} else {
						const oldAttr = element.getAttribute(name);
						oldValForCallback = oldAttr === null ? undefined : oldAttr;
					}
					finalValue = value.call(element, index, oldValForCallback);
				}

				if( finalValue === null || finalValue === undefined ) {
					$._internal.removeAttribute(element, name);
				} else {
					// setAttribute expects a string value
					element.setAttribute(name, String(finalValue));
				}
			});
		}

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .before()
	@ Inserts content before each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('before', function( content ) {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Use the native DOM method to insert the nodes
			targetEl.before(...nodesToInsert);
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .children()
	@ Gets children of each element, optionally filtered by a selector.
	@ Returns a new SR object with the found child elements.
*/
(function() {

	$.extend('children', function( selector ) {
		if( selector && typeof selector !== 'string' ) {
			return $();
		}

		const childrenElements = new Set();

		this.each(function() {
			// Ensure the context element has children (e.g., not a window or text node)
			if( this.children ) {
				// Iterate directly over the live HTMLCollection for efficiency
				for( const child of this.children ) {
					if( !selector || $._internal.matches(child, selector) ) {
						childrenElements.add(child);
					}
				}
			}
		});

		return $(childrenElements);
	});

})();
/*
	@ SeoRomin Library Plugin: .clone()
	@ Creates a deep copy of the set of matched elements.
	@ Optional arguments control whether data and event handlers are copied.
	@ Returns a new SR object with the cloned elements.
*/
(function() {

	$.extend('clone', function( withDataAndEvents = false, deepWithDataAndEvents = withDataAndEvents ) {
		const clonedElements = this['_sr_elements'].map(el => {
			return $._internal.cloneNode(el, withDataAndEvents, deepWithDataAndEvents);
		});

		return $(clonedElements);
	});

})();
/*
	@ SeoRomin Library Plugin: .closest()
	@ Gets the first element that matches the selector by testing the element itself and traversing up through its ancestors.
	@ The selector can be a string, a DOM element, or an SR object.
	@ Returns a new SR object with the unique matched ancestors, in document order.
*/
(function() {

	$.extend('closest', function( selector ) {
		if( !selector ) {
			return $();
		}

		const closestElements = new Set();

		// Case 1: Selector is a string (fast path using native method)
		if( typeof selector === 'string' ) {
			this.each(function() {
				// Ensure the element supports .closest() (e.g., not window or text node)
				if( typeof this.closest === 'function' ) {
					const found = this.closest(selector);
					if( found ) {
						closestElements.add(found);
					}
				}
			});
		}
		// Case 2: Selector is an element, SR object, or other iterable
		else {
			let elementsToMatch;

			if( selector instanceof $ ) {
				elementsToMatch = selector['_sr_elements'];
			} else if( selector.nodeType === 1 ) {
				elementsToMatch = [selector];
			} else if( typeof selector[Symbol.iterator] === 'function' ) {
				// Filter to ensure we only have valid Element nodes to match against
				elementsToMatch = Array.from(selector).filter(el => el && el.nodeType === 1);
			} else {
				return $(); // Invalid selector type
			}

			if( !elementsToMatch.length ) {
				return $();
			}

			const matchSet = new Set(elementsToMatch);

			this.each(function() {
				let current = this;
				while( current ) {
					if( matchSet.has(current) ) {
						closestElements.add(current);
						break; // Found the closest for this element, stop traversing up
					}
					current = current.parentElement;
				}
			});
		}

		if( closestElements.size === 0 ) {
			return $();
		}

		// Sort the final unique elements in document order for consistency
		const sortedElements = Array.from(closestElements).sort((a, b) => {
			if( a === b ) return 0;
			// Use compareDocumentPosition for a robust, cross-browser sort
			if( a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ) {
				return -1; // a comes before b
			}
			return 1; // b comes before a
		});

		return $(sortedElements);
	});

})();
/*
	@ SeoRomin Library Plugin: .css()
	@ Gets a computed style property or sets CSS properties for every element.
	@ Setting a property value to `null` or `undefined` removes it.
	@ Returns the original SR object for chaining.
*/
(function() {

	// Helper to normalize CSS values: trims strings and appends 'px' to numbers where appropriate
	const normalizeValue = ( prop, value ) => {
		// Pass through non-string/number values (like null/undefined)
		if( value == null || (typeof value !== 'string' && typeof value !== 'number') ) {
			return value;
		}

		const strValue = String(value).trim();

		// Do not auto-append 'px' to custom properties
		if( prop.startsWith('--') ) {
			return strValue;
		}

		// Check if it's a plain number (integer or float)
		if( /^-?\d+(\.\d+)?$/.test(strValue) ) {
			const camelProp = $._internal.camelCase(prop);
			// Add 'px' if it's a numeric value for a property that requires units
			if( !$._internal.unitlessCssProps.has(camelProp) ) {
				return strValue + 'px';
			}
		}

		return strValue; // Always return the trimmed string
	};

	// Helper to set or remove a single style property on a given element
	const setStyle = ( element, key, val ) => {
		const finalVal = normalizeValue(key, val);

		// If final value is null or undefined, remove the property
		if( finalVal === null || finalVal === undefined ) {
			const propToRemove = key.startsWith('--') ? key : $._internal.camelToKebab(key);
			element.style.removeProperty(propToRemove);
		} else {
			if( key.startsWith('--') ) {
				element.style.setProperty(key, finalVal);
			} else {
				element.style[$._internal.camelCase(key)] = finalVal;
			}
		}
	};

	$.extend('css', function( prop, value ) {
		// --- GETTER ---
		// .css('property-name')
		if( typeof prop === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) return undefined;

			// Handle both standard (kebab-case) and custom properties
			const propName = prop.startsWith('--') ? prop : $._internal.camelToKebab(prop);
			const styleValue = window.getComputedStyle(firstEl).getPropertyValue(propName).trim();

			// Return undefined for non-existent/invalid properties for API consistency
			return styleValue === '' ? undefined : styleValue;
		}

		// --- SETTER ---
		this.each(function() {
			// .css({ 'prop': 'value', ... })
			if( typeof prop === 'object' ) {
				for( const [key, val] of Object.entries(prop) ) {
					setStyle(this, key, val);
				}
			}
			// .css('prop', 'value')
			else if( typeof prop === 'string' ) {
				setStyle(this, prop, value);
			}
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .data()
	@ Stores or retrieves data from an element's internal cache.
	@ Reads from `data-*` attributes on first access, then uses the cache.
*/
(function() {

	// Helper to parse a value from a data attribute (string) into its likely type
	const parseValue = value => {
		if( typeof value !== 'string' ) return value;
		try {
			// Intentionally converts 'true', 'null', '123' etc. to their respective types
			return JSON.parse(value);
		} catch( e ) {
			return value; // Fallback to plain string
		}
	};

	// Internal helper to get a single data value from an element (cache-first)
	const getData = ( element, key ) => {
		const cache = $._internal.dataCache;
		const camelKey = $._internal.camelCase(key);

		// 1. Check cache first
		let elementData = cache.get(element);
		if( elementData && Object.hasOwn(elementData, camelKey) ) {
			return elementData[camelKey];
		}

		// 2. Fallback to dataset, then prime the cache
		// Guard: element.dataset is only available on HTMLElements
		const datasetValue = element.dataset ? element.dataset[camelKey] : undefined;
		if( datasetValue !== undefined ) {
			const parsedValue = parseValue(datasetValue);

			if( !elementData ) {
				elementData = {}; // Create cache if it doesn't exist
				cache.set(element, elementData);
			}
			elementData[camelKey] = parsedValue; // Prime the cache

			return parsedValue;
		}

		return undefined;
	};

	$.extend('data', function( name, value ) {
		const cache = $._internal.dataCache;

		// --- GETTER ---

		// .data(): Get all data for the first element
		if( name === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) return undefined;

			const allData = {};

			// 1. Prime cache from all dataset attributes. getData handles cache-first logic
			// Use Object.keys for safe iteration over own properties
			if( firstEl.dataset ) {
				for( const key of Object.keys(firstEl.dataset) ) {
					// This call ensures that any dataset attribute not yet in cache is read, parsed, and cached
					allData[key] = getData(firstEl, key);
				}
			}

			// 2. Merge in any data that was set programmatically and isn't in the dataset
			const cachedData = cache.get(firstEl);
			if( cachedData ) {
				Object.assign(allData, cachedData);
			}

			return allData;
		}

		// .data('key'): Get a single data value
		if( typeof name === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			return firstEl ? getData(firstEl, name) : undefined;
		}

		// --- SETTER ---
		this.each(function() {
			const element = this;
			let elementData = cache.get(element);
			if( !elementData ) {
				elementData = {};
				cache.set(element, elementData);
			}

			const setData = ( key, val ) => {
				const camelKey = $._internal.camelCase(key);
				// A value of undefined removes the data, null is a valid value
				if( val === undefined ) {
					delete elementData[camelKey];
				} else {
					elementData[camelKey] = val;
				}
			};

			// .data({ key: val, ... })
			if( typeof name === 'object' && name !== null ) {
				// Use Object.entries for safe iteration over own properties
				for( const [key, val] of Object.entries(name) ) {
					setData(key, val);
				}
			}
			// .data('key', val)
			else if( typeof name === 'string' ) {
				setData(name, value);
			}
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .each()
	@ Iterates over the collection, calling a function for each element.
	@ `this` is the current DOM element. Returning `false` from the callback stops the loop.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('each', function( callback ) {
		if( typeof callback !== 'function' ) {
			return this;
		}

		// Use a for...of loop to allow breaking out of it
		for( const [index, el] of this['_sr_elements'].entries() ) {
			// If the callback returns exactly false, stop the iteration
			if( callback.call(el, index, el) === false ) {
				break;
			}
		}

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .empty()
	@ Removes all child nodes from the set of matched elements.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('empty', function() {
		return this.each(function() {
			// Proactively clean up all descendant elements in a single, efficient pass before removing them from the DOM
			// `cleanRoot` is false to preserve the parent's data/events
			$._internal.cleanupNodeTree(this, false);

			// Setting textContent to an empty string is the fastest way to remove all children
			this.textContent = '';
		});
	});

})();
/*
	@ SeoRomin Library Plugin: .eq()
	@ Reduces the set to the element at the specified index.
	@ Accepts a positive index (from start) or a negative index (from end).
	@ Returns a new SR object with only the element at the given index.
*/
(function() {

	$.extend('eq', function( index ) {
		// Explicitly check for non-numbers and NaN to ensure a valid index
		if( typeof index !== 'number' || Number.isNaN(index) ) {
			return $();
		}

		const finalIndex = index < 0 ? this.length + index : index;

		// Return an empty SR object if the calculated index is out of bounds
		if( finalIndex < 0 || finalIndex >= this.length ) {
			return $();
		}

		return $(this['_sr_elements'][finalIndex]);
	});

})();
/*
	@ SeoRomin Library Plugin: .filter()
	@ Reduces the set of matched elements to those that match the selector, element, or pass the function's test.
	@ Returns a new SR object with the filtered elements.
*/
(function() {

	$.extend('filter', function( selector ) {
		// For null/undefined selectors, return an empty set for compatibility
		if( selector == null ) {
			return $();
		}

		const elements = this['_sr_elements'];
		let result = [];

		// Case 1: Function
		if( typeof selector === 'function' ) {
			result = elements.filter((el, index) => selector.call(el, index, el));
		}
		// Case 2: String Selector
		else if( typeof selector === 'string' ) {
			// An empty string is not a valid selector and should result in an empty set
			if( !selector.trim() ) {
				return $();
			}

			result = elements.filter(el => {
				// Use the safe internal helper which handles nodeType checks and invalid selectors
				return $._internal.matches(el, selector);
			});
		}
		// Case 3: SR Instance
		else if( selector instanceof $ ) {
			const validSet = new Set(selector['_sr_elements']);
			result = elements.filter(el => validSet.has(el));
		}
		// Case 4: Element Node
		else if( selector.nodeType === 1 ) {
			result = elements.filter(el => el === selector);
		}
		// Case 5: NodeList, Array, or other iterables
		else if( typeof selector[Symbol.iterator] === 'function' ) {
			// Create a set directly from the iterable for faster lookups,
			// avoiding intermediate arrays for better performance
			const validSet = new Set();
			for( const node of selector ) {
				if( node && node.nodeType === 1 ) {
					validSet.add(node);
				}
			}
			result = elements.filter(el => validSet.has(el));
		}
		// Other falsy values like 0 or false will fall through and return an empty set

		return $(result);
	});

})();
/*
	@ SeoRomin Library Plugin: .find()
	@ Gets descendants of each element, filtered by a selector.
	@ Returns a new SR object with the unique found elements.
*/
(function() {

	$.extend('find', function( selector ) {
		if( typeof selector !== 'string' || !selector ) {
			return $();
		}

		const foundElements = new Set();

		this.each(function() {
			// Use the safe, context-aware query helper which handles document context correctly
			const found = $._internal.scopedQuerySelectorAll(this, selector);
			found.forEach(el => foundElements.add(el));
		});

		return $(foundElements);
	});

})();
/*
	@ SeoRomin Library Plugin: .first()
	@ Reduces the set of matched elements to the first in the set.
	@ Returns a new SR object containing only the first element.
*/
(function() {

	$.extend('first', function() {
		const { _sr_elements: elements } = this;
		// If the set is empty, return an empty SR object
		return elements.length ? $(elements[0]) : $();
	});

})();
/*
	@ SeoRomin Library Plugin: .formData()
	@ Creates a FormData object from the first form in the matched set, or serializes the form data into a plain object.
	@ Pass `true` to serialize the form data.
	@ Returns a native FormData object, or an object for serialization.
*/
(function() {

	$.extend('formData', function( serialize = false ) {
		// Find the first <form> element in the collection
		const form = this['_sr_elements'].find(el => el.tagName && el.tagName.toUpperCase() === 'FORM');

		// --- Default Behavior: Return FormData object ---
		if( !serialize ) {
			return form ? new FormData(form) : new FormData();
		}

		// --- Serialize Behavior: Return a plain object ---
		if( !form ) {
			return {}; // Return empty object if no form is found
		}

		const result = {};

		// Helper to add values to the result object
		const addValue = ( name, value, isMultiValueField ) => {
			if( Object.hasOwn(result, name) ) {
				// If the key already exists, ensure it's an array and push the new value
				if( !Array.isArray(result[name]) ) {
					result[name] = [result[name]];
				}
				result[name].push(value);
			} else {
				// For new keys, initialize as an array if it's a known multi-value field,
				// otherwise, set it as a single value
				result[name] = isMultiValueField ? [value] : value;
			}
		};

		// Iterate over all form controls in a single pass
		for( const el of form.elements ) {
			// 1. Element must have a `name` and not be disabled to be successful
			if( !el.name || el.disabled ) {
				continue;
			}

			const type = el.type ? el.type.toLowerCase() : '';
			const tagName = el.tagName;
			const isMultiSelect = tagName === 'SELECT' && el.multiple;
			const isCheckbox = type === 'checkbox';

			// 2. Skip buttons and file inputs for serialization consistency
			if( ['file', 'submit', 'reset', 'button'].includes(type) ) {
				continue;
			}

			// 3. Skip unchecked radio/checkbox inputs
			if( (isCheckbox || type === 'radio') && !el.checked ) {
				continue;
			}

			// 4. Handle <select multiple> by adding an entry for each selected option
			if( isMultiSelect ) {
				for( const option of el.options ) {
					if( option.selected ) {
						// The third argument `true` ensures this field is treated as a multi-value field from the start
						addValue(el.name, option.value, true);
					}
				}
			}
			// 5. Handle all other successful controls
			else {
				let value = el.value;
				// For checkboxes, treat default 'on', explicitly set 'on', or empty (`value=""`) as boolean `true`
				// This ensures consistent behavior for checkboxes without a specific value attribute
				if( isCheckbox && (el.getAttribute('value') === '' || value === 'on') ) {
					value = true;
				}
				// Pass `isCheckbox` to ensure even a single checkbox value is stored in an array
				// This creates a consistent data structure for fields that can have multiple values
				addValue(el.name, value, isCheckbox);
			}
		}

		return result;
	});

})();
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
/*
	@ SeoRomin Library Plugin: .hide()
	@ Hides the matched elements.
	@ Saves the previous 'display' value so .show() can restore it correctly.
	@ Distinguishes between HTML 'display' style and SVG 'display' attribute.
*/
(function() {

	$.extend('hide', function() {
		return this.each(function() {
			const el = this;

			// Get computed styles once for efficiency
			const computedStyle = window.getComputedStyle(el);

			// Optimization: do nothing if the element is already hidden
			if( computedStyle.display === 'none' ) {
				return;
			}

			const isSVG = el instanceof SVGElement;
			let originalDisplay;

			if( isSVG ) {
				// For SVG, we must store the `display` attribute value, which can be null if not set
				originalDisplay = el.getAttribute('display');
			} else {
				// For HTML, check if it's in the DOM. If not, getComputedStyle is unreliable
				if( el.isConnected ) {
					// Use the already fetched computed display style
					originalDisplay = computedStyle.display;
				} else {
					// Store undefined so .show() knows to calculate the display value later
					originalDisplay = undefined;
				}
			}

			// Use the internal cache directly for better performance, avoiding new SR object creation
			const data = $._internal.dataCache.get(el) || {};
			data['_srOldDisplay'] = originalDisplay;
			$._internal.dataCache.set(el, data);

			// Hide the element using the correct mechanism
			if( isSVG ) {
				el.setAttribute('display', 'none');
			} else {
				el.style.display = 'none';
			}
		});
	});

})();
/*
	@ SeoRomin Library Plugin: .html()
	@ Gets the innerHTML of the first element or sets the innerHTML of every element.
	@ Returns the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('html', function( content ) {
		// Getter: .html()
		if( content === undefined ) {
			const firstEl = this['_sr_elements'][0];
			// Safe check: innerHTML is only valid for Element nodes (nodeType 1)
			return (firstEl && firstEl.nodeType === 1) ? firstEl.innerHTML : '';
		}

		// Setter: .html( newContent | function )
		const isFunction = typeof content === 'function';

		this.each(function( index ) {
			// Safe check: Ensure valid Element node before accessing innerHTML
			if( !this || this.nodeType !== 1 ) return;

			// Proactively clean up data and events for all descendant elements before removing them
			// `cleanRoot` is false to preserve the parent's data/events
			$._internal.cleanupNodeTree(this, false);

			const newContent = isFunction
				? content.call(this, index, this.innerHTML)
				: content;

			this.innerHTML = newContent;
		});

		return this;
	});

})();
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

			return this['_sr_elements'].some(el => {
				// Check against the standard CSS part first for performance
				if( baseSelector ) {
					// Use the safe internal helper, which handles nodeType and invalid selectors
					if( !$._internal.matches(el, baseSelector) ) {
						return false;
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
/*
	@ SeoRomin Library Plugin: .join()
	@ Creates a string by concatenating the text content of each element, separated by a separator.
	@ Mimics Array.prototype.join().
*/
(function() {

	$.extend('join', function( separator = ',' ) {
		const textContents = this['_sr_elements'].map(el => el.textContent);
		return textContents.join(separator);
	});

})();
/*
	@ SeoRomin Library Plugin: .last()
	@ Reduces the set of matched elements to the last in the set.
	@ Returns a new SR object containing only the last element.
*/
(function() {

	$.extend('last', function() {
		const { _sr_elements: elements } = this;
		const { length } = elements;
		// If the set is empty, return an empty SR object
		return length ? $(elements[length - 1]) : $();
	});

})();
/*
	@ SeoRomin Library Plugin: .next()
	@ Gets the immediately following sibling of each element.
	@ Optionally filtered by a selector.
	@ Returns a new SR object with the found siblings.
*/
(function() {

	$.extend('next', function( selector ) {
		const nextSiblings = new Set();

		this.each(function() {
			const nextEl = this.nextElementSibling;

			// Check if the next sibling exists
			if( nextEl ) {
				// If no selector is provided, or if the sibling matches the selector, add it
				if( !selector || $._internal.matches(nextEl, selector) ) {
					nextSiblings.add(nextEl);
				}
			}
		});

		return $(nextSiblings);
	});

})();
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
/*
	@ SeoRomin Library Plugin: .parent()
	@ Gets the parent of each element, optionally filtered by a selector.
	@ Returns a new SR object with the unique parent elements.
*/
(function() {

	$.extend('parent', function( selector ) {
		const parents = new Set();

		this.each(function() {
			const parent = this.parentElement;
			if( parent ) {
				if( !selector || $._internal.matches(parent, selector) ) {
					parents.add(parent);
				}
			}
		});

		return $(parents);
	});

})();
/*
	@ SeoRomin Library Plugin: .prepend()
	@ Inserts content at the beginning of each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('prepend', function( content ) {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Native .prepend() inserts nodes before the first child of the element
			targetEl.prepend(...nodesToInsert);
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .prependTo()
	@ Prepends each element in the set to the target.
	@ If multiple targets, clones are created for all but the last target.
	@ Returns a new SR object containing all inserted elements (clones + originals).
*/
(function() {

	$.extend('prependTo', function( target ) {
		const $target = $(target);
		const finalInsertedElements = [];

		if( !$target.length || !this.length ) {
			return $([]);
		}

		$target.each((targetIndex, targetElement) => {
			// Check if this is the last container we are inserting into
			const isLastTarget = (targetIndex === $target.length - 1);
			const nodesToInsert = [];

			this.each((index, sourceElement) => {
				// Use original for the last target (moves it), clone for others
				const node = isLastTarget
					? sourceElement
					: $._internal.cloneNode(sourceElement, true, true);
				nodesToInsert.push(node);
			});

			targetElement.prepend(...nodesToInsert);
			finalInsertedElements.push(...nodesToInsert);
		});

		return $(finalInsertedElements);
	});

})();
/*
	@ SeoRomin Library Plugin: .prev()
	@ Gets the immediately preceding sibling of each element.
	@ Optionally filtered by a selector.
	@ Returns a new SR object with the found siblings.
*/
(function() {

	$.extend('prev', function( selector ) {
		const prevSiblings = new Set();

		this.each(function() {
			const prevEl = this.previousElementSibling;

			// Check if the previous sibling exists
			if( prevEl ) {
				// If no selector is provided, or if the sibling matches the selector, add it
				if( !selector || $._internal.matches(prevEl, selector) ) {
					prevSiblings.add(prevEl);
				}
			}
		});

		return $(prevSiblings);
	});

})();
/*
	@ SeoRomin Library Plugin: .prop()
	@ Gets a DOM property value for the first element or sets properties for every element.
	@ Use this for properties like `checked`, `disabled`, `value`.
	@ Returns the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('prop', function( name, value ) {
		// Getter: .prop('propertyName')
		if( typeof name === 'string' && value === undefined ) {
			const propName = name.trim();
			if( !propName ) return undefined;

			const firstEl = this['_sr_elements'][0];
			return firstEl ? firstEl[propName] : undefined;
		}

		// --- SETTER ---

		// Case 1: .prop({ 'prop1': 'val1', ... })
		if( typeof name === 'object' ) {
			this.each(function() {
				const element = this;
				for( const key in name ) {
					if( Object.hasOwn(name, key) ) {
						const propName = key.trim();
						if( propName ) {
							element[propName] = name[key];
						}
					}
				}
			});
		}
		// Case 2: .prop('propName', 'value' | function)
		else if( typeof name === 'string' ) {
			const propName = name.trim();
			if( !propName ) return this;

			const isFunction = typeof value === 'function';
			this.each(function( index ) {
				const element = this;
				const finalValue = isFunction
					? value.call(element, index, element[propName])
					: value;

				element[propName] = finalValue;
			});
		}

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .remove()
	@ Removes the set of matched elements from the DOM.
	@ Returns the SR object (now empty) for chaining.
*/
(function() {

	$.extend('remove', function() {
		this.each(function() {
			// Clean up the element itself and all its descendants before DOM removal
			// to ensure immediate and predictable memory reclamation
			$._internal.cleanupNodeTree(this);

			// Remove the element from the DOM
			this.remove();
		});

		// Clear the SR object's internal list of elements
		this['_sr_elements'] = [];

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .removeAttr()
	@ Removes one or more attributes from each element in the set.
	@ Supports a space-separated string, an array, or a function.
	@ Optimized to handle namespaced SVG attributes correctly and efficiently.
	@ Returns the original SR object for chaining.
*/
(function() {

	// Helper to normalize input (string or array) into an array of names
	const normalizeAttrNames = ( input ) => {
		if( typeof input === 'string' ) {
			return $._internal.splitByWhitespace(input);
		}

		if( Array.isArray(input) ) {
			// Filter out non-string/empty values to be safe
			return input.filter(item => typeof item === 'string' && item.trim());
		}

		return [];
	};

	$.extend('removeAttr', function( name ) {
		if( !name ) {
			return this;
		}

		// Case 1: Function argument. Must be evaluated for each element
		// The callback receives the element's index and the element itself
		// It should return a space-separated string or an array of attribute names to remove
		if( typeof name === 'function' ) {
			return this.each(function(index) {
				const el = this;
				const result = name.call(el, index, el);

				const attributesToRemove = normalizeAttrNames(result);
				// Use a for...of loop for potential performance gain over forEach on very large sets
				for( const attr of attributesToRemove ) {
					$._internal.removeAttribute(el, attr);
				}
			});
		}
		// Case 2: String or Array argument. Normalize once for efficiency
		const staticAttributesToRemove = normalizeAttrNames(name);
		if( !staticAttributesToRemove.length ) {
			return this;
		}

		return this.each(function() {
			const el = this;
			// Use a for...of loop for potential performance gain over forEach on very large sets
			for( const attr of staticAttributesToRemove ) {
				$._internal.removeAttribute(el, attr);
			}
		});
	});

})();
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
/*
	@ SeoRomin Library Plugin: .removeData()
	@ Removes previously-stored data from the internal cache.
	@ Does not affect `data-*` attributes in the DOM.
*/
(function() {

	$.extend('removeData', function( name ) {
		const cache = $._internal.dataCache;

		// Case 1: .removeData() with no arguments removes all data for each element
		if( name === undefined ) {
			return this.each(function() {
				cache.delete(this);
			});
		}

		// Determine which keys to remove based on the 'name' argument
		let keysToRemove;
		if( typeof name === 'string' ) {
			keysToRemove = $._internal.splitByWhitespace(name);
		} else if( Array.isArray(name) ) {
			// Filter out any non-string values for robustness
			keysToRemove = name.filter(item => typeof item === 'string' && item.trim());
		} else {
			// For any other type of 'name' argument, do nothing
			return this;
		}

		// If no valid keys were provided (e.g., empty string or empty array), there's nothing to do
		if( !keysToRemove.length ) {
			return this;
		}

		return this.each(function() {
			const elementData = cache.get(this);
			if( !elementData ) return;

			// Remove only the specified keys from the element's data cache
			keysToRemove.forEach(key => {
				delete elementData[$._internal.camelCase(key)];
			});
		});
	});

})();
/*
	@ SeoRomin Library Plugin: .replaceWith()
	@ Replaces each element in the set of matched elements with the provided new content.
	@ Returns the original SR object (containing the removed elements) for chaining.
*/
(function() {

	$.extend('replaceWith', function( newContent ) {
		// Do nothing if content is null/undefined or there are no elements to replace
		if( newContent == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(newContent)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot, not a live collection
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Proactively clean up the element being replaced to prevent memory leaks
			$._internal.cleanupNodeTree(targetEl);

			// Use the native DOM method to replace the target element
			targetEl.replaceWith(...nodesToInsert);
		});

		return this;
	});

})();
/*
	@ SeoRomin Library Plugin: .show()
	@ Displays the matched elements.
	@ Restores display using CSS for HTML, and the `display` attribute for SVG.
*/
(function() {

	$.extend('show', function() {
		return this.each(function() {
			const el = this;

			// Optimization: Ignore if already visible
			if( window.getComputedStyle(el).display !== 'none' ) {
				return;
			}

			const isSVG = el instanceof SVGElement;

			if( isSVG ) {
				const data = $._internal.dataCache.get(el);
				const storedDisplay = data ? data['_srOldDisplay'] : undefined;

				// If the stored value was null, the attribute was not present
				// Removing it restores the default rendering behavior
				if( storedDisplay === null ) {
					el.removeAttribute('display');
				}
				// If a value was stored (even an empty string), restore it
				else if( typeof storedDisplay === 'string' ) {
					el.setAttribute('display', storedDisplay);
				}
				// Fallback if no data was found: just remove the 'none' set by .hide()
				else {
					el.removeAttribute('display');
				}
			} else {
				// For HTML elements, use the existing helper to resolve the correct display value
				el.style.display = $._internal.resolveDisplayValue(el);
			}
		});
	});

})();
/*
	@ SeoRomin Library Plugin: $.t()
	@ Static element creator: $.t('<div>', { class: 'foo' })
	@ Creates elements with attributes, props, and events in one go.
*/
(function() {

	$.t = function( html, props ) {
		if( typeof html !== 'string' ) {
			return $();
		}

		// Create element from HTML or a text node
		const $el = $._internal.isHtmlString(html) ? $(html) : $([document.createTextNode(html)]);

		if( !$el.length || !props || typeof props !== 'object' ) {
			return $el;
		}

		// A Set of common properties for faster direct assignment
		const commonProps = new Set([
			'id', 'value', 'textContent', 'innerHTML', 'checked', 'selected', 'disabled', 'title', 'href', 'src'
		]);

		for( const key in props ) {
			if( !Object.hasOwn(props, key) ) continue;
			const value = props[key];

			// Route properties to appropriate methods or set directly
			if( typeof value === 'function' ) {
				$el.on(key, value); // Events
			}
			else if( key === 'text' ) {
				$el.each(function() { this.textContent = value; });
			}
			else if( key === 'html' ) {
				$el.each(function() { this.innerHTML = value; });
			}
			else if( key === 'class' ) {
				$el.addClass(String(value));
			}
			else if( key === 'css' && typeof value === 'object' && value !== null ) {
				$el.css(value);
			}
			else if( key === 'data' && typeof value === 'object' && value !== null ) {
				$el.data(value);
			}
			else if( commonProps.has(key) ) {
				$el.each(function() { this[key] = value; }); // Common direct properties
			}
			else {
				$el.attr(key, value); // Fallback to attributes
			}
		}

		return $el;
	};

})();
/*
	@ SeoRomin Library Plugin: .text()
	@ Gets the combined text content of each element in the set, or sets the text content of every matched element.
	@ Returns the string value for getter, or the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('text', function( content ) {
		// Getter: .text()
		if( content === undefined ) {
			return this['_sr_elements'].map(el => {
				// Safe check: Ensure el exists and is a Node to avoid runtime errors
				return (el && el.nodeType) ? el.textContent : '';
			}).join('');
		}

		// Setter: .text( value | function )
		const isFunction = typeof content === 'function';

		this.each(function( index ) {
			const el = this;
			// Safe check: Ensure valid node before attempting to write
			if( !el || !el.nodeType ) return;

			const newContent = isFunction
				? content.call(el, index, el.textContent)
				: content;

			// Coerce the new content to a string, treating null/undefined as empty for comparison
			const finalContent = (newContent === null || newContent === undefined) ? '' : String(newContent);

			// Optimization: Only update the DOM if the content has actually changed
			if( el.textContent !== finalContent ) {
				// Proactively clean up data and events for all descendant elements before removing them
				// `cleanRoot` is false to preserve the parent's data/events
				$._internal.cleanupNodeTree(el, false);

				el.textContent = finalContent;
			}
		});

		return this;
	});

})();
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
/*
	@ SeoRomin Library Plugin: .val()
	@ Gets the current value of the first element or sets the value of every element.
	@ Handles <input>, <select>, <textarea>, including <select multiple>.
	@ Returns the value for getter, or the original SR object for chaining in setter mode.
*/
(function() {

	// Helper to get the value of a single raw element
	const getElValue = (el) => {
		const nodeName = el.nodeName.toUpperCase();
		if( nodeName === 'SELECT' && el.multiple ) {
			if( !el.options ) {
				return [];
			}

			return Array.from(el.options)
				.filter(option => option.selected)
				.map(option => option.value);
		}

		return el.value;
	};

	// Helper to create a Set of string values from an input
	const createValueSet = (value) => {
		if( value === null || value === undefined ) {
			return new Set();
		}

		const values = Array.isArray(value) ? value : [value];
		return new Set(values.map(String));
	};

	// Coerces null or undefined to an empty string, otherwise returns the value
	const coerceToString = (val) => (val === null || val === undefined) ? '' : val;

	$.extend('val', function( value ) {
		// GETTER
		if( value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			return firstEl ? getElValue(firstEl) : undefined;
		}

		// SETTER
		const isFunction = typeof value === 'function';
		// For static values, create the Set once for performance
		const staticValueSet = isFunction ? null : createValueSet(value);

		this.each(function( index ) {
			const el = this;
			const finalValue = isFunction ? value.call(el, index, getElValue(el)) : value;
			const nodeName = el.nodeName.toUpperCase();

			if( nodeName === 'SELECT' ) {
				if( el.multiple ) {
					if( el.options ) {
						const values = isFunction ? createValueSet(finalValue) : staticValueSet;
						for( const option of el.options ) {
							option.selected = values.has(option.value);
						}
					}
				} else {
					el.value = coerceToString(finalValue);
				}
			}
			else if( el.type === 'checkbox' || el.type === 'radio' ) {
				const values = isFunction ? createValueSet(finalValue) : staticValueSet;
				el.checked = values.has(el.value);
			}
			else {
				el.value = coerceToString(finalValue);
			}
		});

		return this;
	});

})();