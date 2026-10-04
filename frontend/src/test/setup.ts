import '@testing-library/jest-dom'

// jsdom lacks matchMedia; react-hot-toast queries it for prefers-reduced-motion
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// jsdom lacks PointerEvent; Base UI dispatches one when a checkbox is clicked
window.PointerEvent ??= class PointerEvent extends MouseEvent {} as typeof window.PointerEvent
