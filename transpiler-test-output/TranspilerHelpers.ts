import {
    FocusEventData,
    KeydownEventData,
    MouseEventData,
    RegisterElementMessage,
    ScrollEventData,
    UnregisterElementMessage,
    UpdateBoundsMessage,
    WorkerInputMessage,
} from './confidence-types';

// Namespace: Minimact.Workers

export class Map {
    private _dict: Map<TKey, TValue>;
    set(key: TKey, value: TValue): void {
        _dict[key] = value;
    }

    get(key: TKey): TValue {
        return _dict.get(key, /* TODO: DeclarationExpressionSyntax */) ? value : /* TODO: DefaultExpressionSyntax */;
    }

    has(key: TKey): boolean {
        return _dict.has(key);
    }

    delete(key: TKey): boolean {
        return _dict.delete(key);
    }

    clear(): void {
        _dict.clear();
    }

    getEnumerator(): IEnumerator<KeyValuePair<TKey, TValue>> {
        return _dict.getEnumerator();
    }

    getEnumerator(): IEnumerator {
        return this.getEnumerator();
    }

    entries(): IEnumerable<KeyValuePair<TKey, TValue>> {
        return _dict;
    }

}

export class MessageTypeSwitch {
    static handle(message: any, messageType: string, handleMouseMove: Action<MouseEventData>, handleScroll: Action<ScrollEventData>, handleFocus: Action<FocusEventData>, handleKeydown: Action<KeydownEventData>, handleRegisterElement: Action<RegisterElementMessage>, handleUpdateBounds: Action<UpdateBoundsMessage>, handleUnregisterElement: Action<UnregisterElementMessage>, handleUnknown: Action<any>): void {
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
        /* TODO: ConditionalAccessExpressionSyntax */;
        break;
    }

    private static castMessage(message: any): T {
        if (/* TODO: IsPatternExpressionSyntax */) {
            return typed;
        }
        const json = system.text.json.jsonSerializer.serialize(message);
        return system.text.json.jsonSerializer.deserialize(json);
    }

}

export class LoopHelpers {
    static shouldContinue(condition: boolean): boolean {
        return condition;
    }

    static shouldSkip(condition: boolean): boolean {
        return condition;
    }

}

