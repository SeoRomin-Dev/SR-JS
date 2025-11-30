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
			let isMatch = true;

			// 1. Check type (if specified)
			if( typeToRemove && e.type !== typeToRemove ) {
				isMatch = false;
			}

			// 2. Check namespaces (if specified)
			if( isMatch && namespacesToRemove.length > 0 ) {
				const storedNamespaces = e.namespace ? e.namespace.split('.') : [];
				// The stored event must contain ALL of the specified namespaces
				if( !namespacesToRemove.every(ns => storedNamespaces.includes(ns)) ) {
					isMatch = false;
				}
			}

			// 3. Check selector (undefined = wildcard, null = direct)
			if( isMatch && selector !== undefined && e.selector !== selector ) {
				isMatch = false;
			}

			// 4. Check handler (if specified)
			if( isMatch && handler && e.handler !== handler ) {
				isMatch = false;
			}

			// Return true to KEEP the element if it's NOT a match for removal
			return !isMatch;
		});

		element.__sr_events = remainingEvents;

		// Cleanup: Remove dispatchers if no corresponding handlers are left
		typesBeforeRemoval.forEach(type => {
			if( !element.__sr_dispatchers ) return;
			const remainingForType = remainingEvents.filter(e => e.type === type);

			// Check and remove active (non-passive) dispatcher
			if( !remainingForType.some(e => !e.passive) ) {
				const key = `${type}_active`;
				if( element.__sr_dispatchers[key] ) {
					element.removeEventListener(type, $._internal.eventDispatcher, { passive: false });
					delete element.__sr_dispatchers[key];
				}
			}

			// Check and remove passive dispatcher
			if( !remainingForType.some(e => e.passive) ) {
				const key = `${type}_passive`;
				if( element.__sr_dispatchers[key] ) {
					element.removeEventListener(type, $._internal.eventDispatcher, { passive: true });
					delete element.__sr_dispatchers[key];
				}
			}
		});
	};

	// Centralized event handler for direct and delegated events
	$._internal.eventDispatcher = function( event ) {
		const container = this; // The element the listener is attached to
		const allHandlers = container.__sr_events || [];
		if( !allHandlers.length ) return;

		// Check if the event was triggered by our .trigger() and has namespaces
		const triggeredNamespaces = event.isTrigger ? (event.detail?._sr_namespaces || []) : null;

		const handlersToRun = allHandlers.filter(h => {
			// 1. Must match the event type (e.g., 'click')
			if( h.type !== event.type ) {
				return false;
			}

			// 2. If triggered with namespaces, handler must match
			if( triggeredNamespaces ) {
				const handlerNamespaces = h.namespace ? h.namespace.split('.') : [];
				// A handler with no namespace will run for any namespaced trigger of the same type
				if( handlerNamespaces.length === 0 ) {
					return true;
				}
				// A handler with namespaces will only run if all its namespaces are present in the trigger
				return handlerNamespaces.every(ns => triggeredNamespaces.includes(ns));
			}

			// 3. For organic events or triggers without namespaces, run all handlers for the type
			return true;
		});

		if( !handlersToRun.length ) return;

		// Iterate over a copy in case a handler modifies the array
		[...handlersToRun].forEach(storedEvent => {
			const { handler, selector } = storedEvent;

			if( selector ) { // Delegated event
				let matchingTarget = null;

				// Use a specialized path for selectors starting with a combinator (>, +, ~) or :scope,
				// as they are not supported by .closest() but are valid for .querySelectorAll() from a context
				if( /^\s*(:scope|[>+~])/.test(selector) ) {
					// Slow path: Find all potential targets relative to the container
					const potentialTargets = new Set(container.querySelectorAll(selector));
					if( potentialTargets.size > 0 ) {
						let current = event.target;
						// Traverse from the event target up to the container
						while( current && current !== container.parentElement ) {
							if( potentialTargets.has(current) ) {
								matchingTarget = current;
								break;
							}
							if( current === container ) break; // Stop if we reach the container
							current = current.parentElement;
						}
					}
				} else {
					// Fast path: Use .closest() for standard selectors
					try {
						const closest = event.target.closest(selector);
						if( closest && container.contains(closest) ) {
							matchingTarget = closest;
						}
					} catch( e ) {
						// This will catch truly invalid selectors that our regex missed
						// Silently fail, as matchingTarget will remain null
					}
				}

				if( matchingTarget ) {
					handler.call(matchingTarget, event);
					if( storedEvent.once ) {
						$._internal.removeEvent(container, storedEvent.originalType, storedEvent.selector, storedEvent.handler);
					}
				}
			} else { // Direct event
				handler.call(container, event);
				if( storedEvent.once ) {
					$._internal.removeEvent(container, storedEvent.originalType, storedEvent.selector, storedEvent.handler);
				}
			}
		});
	};

	// Recursively cleans up SR data and events from a node and its descendants
	// This is crucial for preventing memory leaks when removing elements from the DOM
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

		const copyProps = (source, dest) => {
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

	// Helper to determine the default 'display' for an element's tag
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
	// Tries to recover the original display (e.g. flex, grid) before defaulting
	$._internal.resolveDisplayValue = (el) => {
		// 1. Check cache for a *defined* and non-null previous value
		const data = $._internal.dataCache.get(el);
		// _srOldDisplay can be: a string (e.g. 'block'), null (for SVG), or undefined (for disconnected HTML)
		const storedDisplay = (data && Object.hasOwn(data, '_srOldDisplay')) ? data['_srOldDisplay'] : undefined;

		// A specifically stored string value takes highest priority
		if( typeof storedDisplay === 'string' ) {
			return storedDisplay;
		}

		// If storedDisplay is undefined, it means el was hidden while disconnected
		// We must calculate the display value now. The rest of the function handles this

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
		// For SVG, check for namespaces (e.g., 'xlink:href')
		// getAttributeNode is the most reliable way to handle this
		if( el instanceof SVGElement ) {
			const attrNode = el.getAttributeNode(name);
			// If a namespace is found, use the NS-aware removal method
			if( attrNode && attrNode.namespaceURI ) {
				el.removeAttributeNS(attrNode.namespaceURI, attrNode.localName);
				return; // Done
			}
		}

		// For standard HTML or non-namespaced SVG attributes
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
	// If the queue is empty, it executes the function immediately
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