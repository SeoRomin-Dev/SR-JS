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

	// --- DOM Manipulation Helpers ---

	// Helper to sort unique elements in document order
	$._internal.uniqueSort = ( elements ) => {
		return Array.from(elements).sort((a, b) => {
			if( a === b ) return 0;
			// Use compareDocumentPosition for a robust, cross-browser sort
			if( a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ) {
				return -1; // a comes before b
			}
			return 1; // b comes before a
		});
	};

	// Centralized helper for inserting content (append, prepend, after, before, replaceWith, etc.)
	// Handles content processing, stable snapshots, and cloning logic for multiple targets
	$._internal.domManip = ( collection, content, callback ) => {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !collection.length ) {
			return collection;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return collection;
		}

		collection.each((index, targetEl) => {
			const isLastTarget = index === collection.length - 1;

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

			// Pass the target and the prepared nodes to the specific insertion callback
			callback.call(targetEl, targetEl, nodesToInsert);
		});

		return collection;
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