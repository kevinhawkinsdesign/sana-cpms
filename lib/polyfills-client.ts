export async function loadPolyfills() {
  const polyfills: Promise<void>[] = [];

  // IntersectionObserver polyfill
  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    // Simple IntersectionObserver polyfill for older browsers
    (window as any).IntersectionObserver = class IntersectionObserver {
      private callback: IntersectionObserverCallback;
      private elements: Set<Element> = new Set();

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe(element: Element) {
        this.elements.add(element);
        // Simple implementation - always reports as intersecting
        // This is a basic fallback for very old browsers
        setTimeout(() => {
          this.callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: element.getBoundingClientRect(),
            intersectionRect: element.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now()
          }], this as any);
        }, 0);
      }

      unobserve(element: Element) {
        this.elements.delete(element);
      }

      disconnect() {
        this.elements.clear();
      }
    };
  }

  // ResizeObserver polyfill
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    polyfills.push(
      import('@juggle/resize-observer').then(({ ResizeObserver }) => {
        window.ResizeObserver = ResizeObserver;
      })
    );
  }

  // Array.at polyfill
  if (typeof window !== 'undefined' && !Array.prototype.at) {
    polyfills.push(
      import('core-js/features/array/at').then(() => {
        // Array.at polyfill is automatically registered
      })
    );
  }

  // String.replaceAll polyfill
  if (typeof window !== 'undefined' && !String.prototype.replaceAll) {
    polyfills.push(
      import('core-js/features/string/replace-all').then(() => {
        // String.replaceAll polyfill is automatically registered
      })
    );
  }

  // Wait for all polyfills to load
  if (polyfills.length > 0) {
    await Promise.all(polyfills);
  }
}