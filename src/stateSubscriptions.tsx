import { useEffect } from 'react';

// A function to call when state is updated.
export interface Subscriber<T> {
    (newState: T): void;
}

// A collection of subscribers.
export class Subscribers<T> {
    private subscribers: Subscriber<T>[] = [];

    public subscribe(subscriber: Subscriber<T>): void {
        this.subscribers.push(subscriber);
    }

    public unsubscribe(subscriber: Subscriber<T>): void {
        this.subscribers = this.subscribers.filter((sub) => sub !== subscriber);
    }

    public trigger(newState: T): void {
        for (const subscriber of this.subscribers) {
            subscriber(newState);
        }
    }
}

// A hook to create a subscription on a subscriber.
export function useSubscription<T>(subscribers: Subscribers<T>, subscriber: Subscriber<T>): void {
    useEffect(() => {
        subscribers.subscribe(subscriber);
        return () => subscribers.unsubscribe(subscriber);
    }, [subscribers, subscriber]);
}
