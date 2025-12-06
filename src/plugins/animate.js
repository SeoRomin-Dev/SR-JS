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