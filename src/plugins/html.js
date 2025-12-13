/*
	@ SeoRomin Library Plugin: .html()
	@ Gets the innerHTML of the first element or sets the content of every element.
	@ If content is a string, it sets innerHTML.
	@ If content is a DOM element/SR object, it empties the element and appends the content.
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

		// Setter: .html( content | function )
		const isFunction = typeof content === 'function';
		const length = this.length;

		// Optimization: If content is a static object (SR/Element) and we have multiple targets,
		// we need to snapshot it to handle cloning correctly
		let sourceNodes = null;
		if( !isFunction && content !== null && typeof content !== 'string' && typeof content !== 'number' && typeof content !== 'boolean' ) {
			sourceNodes = $(content)['_sr_elements'];
		}

		this.each(function( index ) {
			// Safe check: Ensure valid Element node before attempting to write
			if( !this || this.nodeType !== 1 ) return;

			// Proactively clean up data and events for all descendant elements before removing them
			$._internal.cleanupNodeTree(this, false);

			const val = isFunction
				? content.call(this, index, this.innerHTML)
				: content;

			// Case 1: String / Number / Boolean / Null / Undefined -> treat as HTML string
			if( val === null || val === undefined || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' ) {
				const finalHtml = (val === null || val === undefined) ? '' : String(val);
				// Optimization: Only update DOM if changed
				if( this.innerHTML !== finalHtml ) {
					this.innerHTML = finalHtml;
				}
			}
			// Case 2: DOM Node / SR Object / Array -> treat as elements to append
			else {
				// Efficiently empty the element
				this.textContent = '';

				let nodesToInsert;
				if( sourceNodes ) {
					// Static content applied to potentially multiple elements
					// We must clone for all but the last target to avoid moving the original nodes
					const isLastTarget = (index === length - 1);
					nodesToInsert = [];
					for( const node of sourceNodes ) {
						nodesToInsert.push(isLastTarget ? node : $._internal.cloneNode(node, true, true));
					}
				} else {
					// Content from function (likely unique) or single target scenario logic fallback
					nodesToInsert = $(val)['_sr_elements'];
				}

				if( nodesToInsert.length ) {
					this.append(...nodesToInsert);
				}
			}
		});

		return this;
	});

})();