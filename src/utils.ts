/**
 * Given a value, or a function that returns a value, get the resolved value.
 */
export function resolveValue<T>(val: T | (() => T)): T {
    if (typeof val === 'function') {
        return (val as () => T)();
    } else {
        return val;
    }
}
