window.common = window.common || {};

/* ============================================================
 * common.CommonHorizontalScrollbar
 * ------------------------------------------------------------
 * Tabulator grid holder와 viewport에 가로 스크롤바를 연결한다.
 * ============================================================ */
const HORIZONTAL_SCROLLBAR_INSTANCES = new WeakMap();
const HORIZONTAL_SCROLLBAR_EVENTS = [
  'columnWidth',
  'columnResized',
  'columnVisibilityChanged',
  'columnMoved',
  'columnsLoaded',
  'renderComplete',
];
const HORIZONTAL_SCROLLBAR_REQUEST_FRAME = window.requestAnimationFrame || function (callback) {
  return setTimeout(callback, 0);
};
const HORIZONTAL_SCROLLBAR_CANCEL_FRAME = window.cancelAnimationFrame || clearTimeout;

window.common.CommonHorizontalScrollbar = {

  /**
   * @param {object} table Tabulator table instance
   * @param {Element|string} root grid root element or selector
   * @param {object} options
   * @returns {{refresh: function, destroy: function}|null}
   */
  create(table, root, options = {}) {
    options = options || {};
    root = typeof root === 'string' ? document.querySelector(root) : root;

    if (!table || !root || HORIZONTAL_SCROLLBAR_INSTANCES.has(root)) {
      return HORIZONTAL_SCROLLBAR_INSTANCES.get(root) || null;
    }
    if (getComputedStyle(root).direction === 'rtl') {
      return { refresh: function () {}, destroy: function () {} };
    }

    const holder = root.querySelector('.tabulator-tableholder');
    if (!holder) {
      return { refresh: function () {}, destroy: function () {} };
    }

    const position = options.position === 'viewport' ? 'viewport' : 'grid';
    const excludeFrozen = options.excludeFrozen !== false;
    let bottomElement = options.bottomElement;
    if (typeof bottomElement === 'string') {
      try {
        bottomElement = document.querySelector(bottomElement);
      } catch (error) {
        bottomElement = null;
      }
    }
    if (!bottomElement || typeof bottomElement.getBoundingClientRect !== 'function') {
      bottomElement = null;
    }
    const originalStyles = {
      overflowX: holder.style.overflowX,
      borderBottom: holder.style.borderBottom,
      boxSizing: holder.style.boxSizing,
      rootPosition: root.style.position,
    };
    const rootWasPositioned = getComputedStyle(root).position !== 'static';
    if (!rootWasPositioned) {
      root.style.position = 'relative';
    }

    root.classList.add('common-horizontal-scrollbar-root');
    const scrollbar = document.createElement('div');
    const spacer = document.createElement('div');
    scrollbar.className = 'common-horizontal-scrollbar';
    scrollbar.setAttribute('role', 'scrollbar');
    scrollbar.setAttribute('aria-label', '가로 스크롤');
    scrollbar.tabIndex = 0;
    spacer.style.height = '1px';
    scrollbar.appendChild(spacer);
    (position === 'viewport' ? document.body : root).appendChild(scrollbar);
    holder.style.overflowX = 'hidden';
    holder.style.boxSizing = 'border-box';

    let previousGutter = 0;
    let frame = 0;
    let syncing = false;
    let destroyed = false;
    const removeListeners = [];

    function listen(target, type, handler, listenerOptions) {
      target.addEventListener(type, handler, listenerOptions);
      removeListeners.push(function () {
        target.removeEventListener(type, handler, listenerOptions);
      });
    }

    // ---- 내부 상태 ----
    function getFrozenBounds() {
      if (!excludeFrozen) {
        return { left: 0, right: 0 };
      }

      const holderRect = holder.getBoundingClientRect();
      const frozenColumns = root.querySelectorAll('.tabulator-col.tabulator-frozen');
      let left = holderRect.left;
      let right = holderRect.right;
      let hasLeft = false;
      let hasRight = false;
      frozenColumns.forEach(function (column) {
        const columnRect = column.getBoundingClientRect();
        const columnStyle = getComputedStyle(column);
        if (columnRect.width <= 0 || columnStyle.display === 'none') {
          return;
        }
        const isLeft = columnStyle.left !== 'auto' && column.classList.contains('tabulator-frozen-left');
        const isRight = columnStyle.right !== 'auto' && column.classList.contains('tabulator-frozen-right');
        if (isLeft || (!isRight && !hasLeft && columnRect.left <= holderRect.left + 1)) {
          left = Math.max(left, columnRect.right);
          hasLeft = true;
        }
        if (isRight || (!isLeft && !hasRight && columnRect.right >= holderRect.right - 1)) {
          right = Math.min(right, columnRect.left);
          hasRight = true;
        }
      });
      return {
        left: hasLeft ? Math.max(0, left - holderRect.left) : 0,
        right: hasRight ? Math.max(0, holderRect.right - right) : 0,
      };
    }

    function syncScrollbarScroll() {
      if (syncing) {
        return;
      }
      syncing = true;
      holder.scrollLeft = scrollbar.scrollLeft;
      syncing = false;
    }

    function syncHolderScroll() {
      if (syncing) {
        return;
      }
      syncing = true;
      scrollbar.scrollLeft = holder.scrollLeft;
      syncing = false;
    }

    // ---- 이벤트 ----
    function handleWheel(event) {
      if (event.ctrlKey) {
        return;
      }
      let node = event.target;
      while (node && node !== holder) {
        const nodeStyle = getComputedStyle(node);
        if (node.scrollWidth > node.clientWidth && nodeStyle.overflowX !== 'visible') {
          return;
        }
        node = node.parentElement;
      }
      let deltaX = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (!deltaX) {
        return;
      }
      if (event.deltaMode === 1) {
        deltaX *= 16;
      }
      const previousScrollLeft = holder.scrollLeft;
      holder.scrollLeft += deltaX;
      if (holder.scrollLeft !== previousScrollLeft) {
        event.preventDefault();
      }
      syncHolderScroll();
    }

    function layout() {
      frame = 0;
      if (destroyed) {
        return;
      }
      const holderRect = holder.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const frozenBounds = getFrozenBounds();
      const visibleWidth = Math.max(0, holder.clientWidth - frozenBounds.left - frozenBounds.right);
      const scrollRange = Math.max(0, holder.scrollWidth - holder.clientWidth);
      const scrollbarNeeded = scrollRange > 0 && visibleWidth > 0;
      const scrollbarHeight = scrollbarNeeded ? Math.max(1, scrollbar.offsetHeight || 16) : 0;
      const gutter = scrollbarNeeded ? Math.max(16, scrollbarHeight) : 0;
      if (gutter !== previousGutter) {
        const oldGutter = previousGutter;
        previousGutter = gutter;
        holder.style.borderBottom = gutter ? gutter + 'px solid transparent' : originalStyles.borderBottom;
        holder.style.setProperty('--common-scrollbar-space', gutter + 'px');
        if (oldGutter !== gutter && typeof table.redraw === 'function') {
          table.redraw();
        }
      }
      scrollbar.style.display = scrollbarNeeded ? 'block' : 'none';
      if (!scrollbarNeeded) {
        scrollbar.scrollLeft = 0;
        holder.scrollLeft = 0;
        return;
      }
      spacer.style.width = visibleWidth + scrollRange + 'px';
      scrollbar.style.width = visibleWidth + 'px';
      if (position === 'grid') {
        scrollbar.style.position = 'absolute';
        scrollbar.style.left = holderRect.left - rootRect.left + holder.clientLeft + frozenBounds.left + 'px';
        scrollbar.style.top = holderRect.bottom - rootRect.top - gutter + 'px';
      } else {
        scrollbar.style.position = 'fixed';
        const barHeight = scrollbar.offsetHeight || 16;
        const viewportBottom = window.innerHeight - (options.bottomOffset || 0);
        let availableBottom = viewportBottom;
        if (bottomElement) {
          const bottomRect = bottomElement.getBoundingClientRect();
          const bottomStyle = getComputedStyle(bottomElement);
          if (bottomRect.width > 0 && bottomRect.height > 0
            && bottomStyle.display !== 'none'
            && bottomRect.top < viewportBottom && bottomRect.bottom > 0) {
            availableBottom = Math.min(viewportBottom, bottomRect.top);
          }
        }
        const bottom = Math.min(
          holderRect.bottom - gutter,
          availableBottom - barHeight,
        );
        scrollbar.style.left = holderRect.left + holder.clientLeft + frozenBounds.left + 'px';
        scrollbar.style.top = Math.max(0, bottom) + 'px';
        scrollbar.style.visibility = holderRect.bottom > 0 && holderRect.top < window.innerHeight ? 'visible' : 'hidden';
      }
      scrollbar.scrollLeft = holder.scrollLeft;
    }

    function refresh() {
      if (!frame) {
        frame = HORIZONTAL_SCROLLBAR_REQUEST_FRAME(layout);
      }
    }

    listen(scrollbar, 'scroll', syncScrollbarScroll);
    listen(holder, 'scroll', syncHolderScroll);
    listen(holder, 'wheel', handleWheel, { passive: false });
    listen(window, 'resize', refresh);
    listen(window, 'scroll', refresh, { passive: true });
    HORIZONTAL_SCROLLBAR_EVENTS.forEach(function (eventName) {
      if (table.on) {
        table.on(eventName, refresh);
        removeListeners.push(function () {
          if (table.off) {
            table.off(eventName, refresh);
          }
        });
      }
    });

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    if (resizeObserver) {
      resizeObserver.observe(root);
      resizeObserver.observe(holder);
      resizeObserver.observe(table.element || root);
      if (bottomElement) {
        resizeObserver.observe(bottomElement);
      }
    }

    // ---- 외부 API ----
    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (frame) {
        HORIZONTAL_SCROLLBAR_CANCEL_FRAME(frame);
      }
      removeListeners.splice(0).forEach(function (removeListener) {
        removeListener();
      });
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      scrollbar.remove();
      holder.style.overflowX = originalStyles.overflowX;
      holder.style.borderBottom = originalStyles.borderBottom;
      holder.style.boxSizing = originalStyles.boxSizing;
      holder.style.removeProperty('--common-scrollbar-space');
      root.classList.remove('common-horizontal-scrollbar-root');
      if (!rootWasPositioned) {
        root.style.position = originalStyles.rootPosition;
      }
      HORIZONTAL_SCROLLBAR_INSTANCES.delete(root);
    }

    if (table.on) {
      table.on('tableDestroyed', destroy);
      removeListeners.push(function () {
        if (table.off) {
          table.off('tableDestroyed', destroy);
        }
      });
    }

    const api = { refresh, destroy };
    HORIZONTAL_SCROLLBAR_INSTANCES.set(root, api);
    refresh();
    return api;
  },

};
