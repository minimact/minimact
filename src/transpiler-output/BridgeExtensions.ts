// Namespace: Minimact.Workers

export class BridgeExtensions {
    static toFixed(value: number, digits: number): string {
        return value.toString("F" + digits);
    }

    static toFixed(value: number, digits: number): string {
        return ((value as number)).toFixed(digits);
    }

}

