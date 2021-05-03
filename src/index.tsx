import produce, { castDraft, castImmutable, Immutable } from 'immer';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Subscribers, useSubscription } from './stateSubscriptions';
import useIsMounted from './useIsMounted';

export { isShallowEqual } from './isShallowEqual';
export { Immutable, castDraft, castImmutable, Subscribers };

export type StateMutateFn<T> = (recipe: (draft: T) => void) => void;

export interface UseControllerFn<T, A> {
    (): [Immutable<T>, A];
    <S>(
        selectorFn: (state: Immutable<T>) => Immutable<S>,
        isEqual?: (a: Immutable<S>, b: Immutable<S>) => boolean
    ): [Immutable<S>, A];
}

export interface Controller<T, A> {
    state: Immutable<T>;
    getState: () => Immutable<T>;
    actions: A;
    subscribers: Subscribers<Immutable<T>>;
}

export type ProviderProps<T, A> =
    | { defaultState?: Immutable<T> }
    | { controller: Controller<T, A> };

export interface ImmerEnteResult<T, A> {
    Consumer: React.FC<{
        children: (value: { state: Immutable<T>; actions: A }) => JSX.Element;
    }>;
    Provider: React.FC<ProviderProps<T, A>>;
    useController: UseControllerFn<T, A>;
    useNewController(defaultState?: Immutable<T>): Controller<T, A>;
    makeController(defaultState?: Immutable<T>): Controller<T, A>;
}

/**
 * This is a lightweight alternative to Redux, built using immer, heavily
 * influenced by immer-wieder. It provides a "reducer" framework with actions,
 * but zero boilerplate.
 *
 * @param initialState - The default initial state.
 * @param generateActions - A function that takes a `updateState()` function as the first
 *   parameter.  Call `updateState(draft => update draft here)` to make changes to
 *   the state.  The function passed to `updateState()` should either update the
 *   draft and return void, or return a new object used to replace the current
 *   state.
 */
export default function immerEnte<T, A>(
    initialState: Immutable<T>,
    generateActions: (updateState: StateMutateFn<T>, getState: () => Immutable<T>) => A
): ImmerEnteResult<T, A> {
    const context = React.createContext<{ controller?: Controller<T, A> }>({});

    function makeController(defaultState?: Immutable<T>): Controller<T, A> {
        let state: Immutable<T> = defaultState || initialState;

        const subscribers = new Subscribers<Immutable<T>>();

        const updateState: StateMutateFn<T> = (recipe) => {
            state = produce(state, recipe);
            subscribers.trigger(state);
        };

        function getState(): Immutable<T> {
            return state;
        }

        const actions = generateActions(updateState, getState);

        return {
            get state() {
                return state;
            },
            getState,
            actions,
            subscribers,
        };
    }

    const Provider: React.FC<ProviderProps<T, A>> = (props) => {
        const controllerRef = useRef<Controller<T, A> | undefined>(undefined);

        let controller: Controller<T, A>;
        if ('controller' in props) {
            controller = props.controller;
        } else {
            if (controllerRef.current === undefined) {
                controllerRef.current = makeController(props.defaultState);
            }
            controller = controllerRef.current;
        }

        // When we unmount, or if the controller ever changes, unsubscribe
        // all controllers.
        useEffect(() => {
            return () => controller.subscribers.close();
        }, [controller]);

        return <context.Provider value={{ controller }}>{props.children}</context.Provider>;
    };

    function useController<S = T>(
        selectorFn?: (state: Immutable<T>) => Immutable<S>,
        isEqual?: (a: Immutable<S>, b: Immutable<S>) => boolean
    ): [Immutable<T> | Immutable<S>, A] {
        const { controller } = useContext(context);
        const mounted = useIsMounted();

        if (!controller) {
            throw new Error(`Missing immer-ente provider.`);
        }

        const [state, setState] = useState<Immutable<S>>(
            selectorFn ? selectorFn(controller.state) : ((controller.state as any) as Immutable<S>)
        );

        // TODO: If the subscriber changes because the selectorFn changes, we
        // should call the subscriber immediately, not on the next state update.
        const subscriber = useCallback(
            (newState: Immutable<T>) => {
                // Verify the current component is mounted.  Sometimes we see cases
                // where the current component unmounts, and we trigger an update,
                // and then unsubscribe in that order, which ends up trying to
                // update the unmounted component.
                if (mounted.current) {
                    const nextState = selectorFn ? selectorFn(newState) : newState;
                    if (selectorResultChanged(state, nextState as Immutable<S>, isEqual)) {
                        setState((nextState as any) as Immutable<S>);
                    }
                }
            },
            [setState, selectorFn]
        );

        useSubscription(controller.subscribers, subscriber);

        // TODO: Optimize this to not rerender as much.
        return [state, controller.actions];
    }

    function useNewController(
        defaultState?: Immutable<T> | (() => Immutable<T>)
    ): Controller<T, A> {
        const controllerRef = useRef<Controller<T, A> | undefined>(undefined);

        if (controllerRef.current === undefined) {
            let state: Immutable<T>;
            if (typeof defaultState === 'function') {
                const stateFn = defaultState as () => Immutable<T>;
                state = stateFn();
            } else {
                state = defaultState || initialState;
            }
            controllerRef.current = makeController(state);
        }

        // Make sure we re-render when the state of the controller changes.
        const [, setState] = useState<Immutable<T>>(controllerRef.current.state);
        useSubscription(controllerRef.current.subscribers, setState);

        return controllerRef.current;
    }

    const Consumer: React.FC<{
        children: (value: { state: Immutable<T>; actions: A }) => JSX.Element;
    }> = (props) => {
        const [state, actions] = useController();
        return props.children({ state, actions });
    };

    return {
        Consumer,
        Provider,
        useController,
        useNewController,
        makeController,
    };
}

function selectorResultChanged<S>(
    old: Immutable<S>,
    newState: Immutable<S>,
    isEqual?: (a: Immutable<S>, b: Immutable<S>) => boolean
) {
    if (old === newState) {
        return false;
    } else if (isEqual) {
        return !isEqual(old, newState);
    } else {
        return true;
    }
}
