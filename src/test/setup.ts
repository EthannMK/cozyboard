import 'fake-indexeddb/auto';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 1;
      this.pointerType = params.pointerType || 'mouse';
    }
  }
  (window as any).PointerEvent = PointerEventPolyfill;
  (globalThis as any).PointerEvent = PointerEventPolyfill;
}
