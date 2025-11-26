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