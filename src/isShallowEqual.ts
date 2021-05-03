// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isShallowEqual(a: any, b: any): boolean {
    if (a === b) {
        return true;
    }

    // Handle cases where a or b are undefined or null.
    if (!a || !b || typeof a !== typeof b) {
        return false;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i++) {
            if (i in a !== i in b || a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    }

    if (typeof a === 'object' && typeof b === 'object') {
        for (const k of Object.keys(a)) {
            if (!(k in b) || a[k] !== b[k]) {
                return false;
            }
        }

        for (const k of Object.keys(b)) {
            if (!(k in a) || a[k] !== b[k]) {
                return false;
            }
        }

        return true;
    }

    return false;
}
