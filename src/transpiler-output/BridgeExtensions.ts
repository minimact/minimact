// Namespace: Minimact.Workers

export class BridgeExtensions {
    static toFixed(value: number, digits: number): string {
        return value.toString("F" + digits);
    }

    static toFixed(value: number, digits: number): string {
        return ((value as number)).toFixed(digits);
    }

    static slice_Array(array: T[], start: number): T[] {
        if (start >= array.length) {
            return new Array<T>(0);
        }
        const length = array.length - start;
        const result = new Array<T>(length);
        Array.copy(array, start, result, 0, length);
        return result;
    }

    static slice_Array(array: T[], start: number, end: number): T[] {
        if (start >= array.length || end <= start) {
            return new Array<T>(0);
        }
        const length = Math.min(end, array.length) - start;
        const result = new Array<T>(length);
        Array.copy(array, start, result, 0, length);
        return result;
    }

}

