import produce, { Immutable } from 'immer';
import React, { useContext, useRef, useState } from 'react';
import { Subscribers, useSubscription } from './stateSubscriptions';
import useIsMounted from './useIsMounted';

export { Immutable };

// Don't allow thousands of elements in an array selector.  If this
// happens, someone is probably trying to just select the array itself,
// and we don't want to spend forever checking elements in the array for
// equality to "save time".
const MAX_ARRAY_SELECTOR_LENGTH = 100;

export type StateMutateFn<T> = (recipe: (draft: T) => void) => void;

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
) {
    const context = React.createContext<{
        stateRef: React.MutableRefObject<Immutable<T>>;
        subscribersRef: React.MutableRefObject<Subscribers<Immutable<T>>>;
        actions: A;
    }>({
        stateRef: { current: initialState },
        subscribersRef: { current: new Subscribers<Immutable<T>>() },
        actions: {} as any,
    });

    const Provider: React.FC<{ defaultState?: Immutable<T> }> = (props) => {
        const mounted = useIsMounted();
        const subscribersRef = useRef(new Subscribers<Immutable<T>>());
        const stateRef = useRef(props.defaultState || initialState);

        const updateState: StateMutateFn<T> = (recipe) => {
            stateRef.current = produce(stateRef.current, recipe);
            if (mounted.current) {
                subscribersRef.current.trigger(stateRef.current);
            }
        };

        function getState(): Immutable<T> {
            return stateRef.current;
        }

        const actions = generateActions(updateState, getState);

        return (
            <context.Provider
                value={{
                    stateRef,
                    subscribersRef,
                    actions,
                }}
            >
                {props.children}
            </context.Provider>
        );
    };

    function useController(): [Immutable<T>, A];
    function useController<S>(selectorFn: (state: Immutable<T>) => Immutable<S>): [Immutable<S>, A];
    function useController<S = T>(
        selectorFn?: (state: Immutable<T>) => Immutable<S>
    ): [Immutable<T> | Immutable<S>, A] {
        const { stateRef, subscribersRef, actions } = useContext(context);
        const [state, setState] = useState<Immutable<S>>(
            selectorFn ? selectorFn(stateRef.current) : ((stateRef.current as any) as Immutable<S>)
        );
        useSubscription(subscribersRef.current, (newState: Immutable<T>) => {
            const nextState = selectorFn ? selectorFn(newState) : newState;
            if (selectorResultChanged(state, nextState)) {
                setState((nextState as any) as Immutable<S>);
            }
        });

        // TODO: Optimize this to not rerender as much.
        return [state, actions];
    }

    const Consumer: React.FC<{
        children: (value: { state: Immutable<T>; actions: A }) => JSX.Element;
    }> = (props) => {
        const [state, actions] = useController();
        return props.children({ state, actions });
    };

    function makeTestController(defaultState?: Immutable<T>) {
        let state: Immutable<T> = defaultState || initialState;

        const updateState: StateMutateFn<T> = (recipe) => {
            state = produce(state, recipe);
        };

        function getState(): Immutable<T> {
            return state;
        }

        const actions = generateActions(updateState, getState);

        return { getState, actions };
    }

    return {
        Consumer,
        Provider,
        useController,
        makeTestController,
    };
}

function selectorResultChanged(old: any, newState: any) {
    if (old === newState) {
        return false;
    } else if (
        Array.isArray(old) &&
        Array.isArray(newState) &&
        old.length === newState.length &&
        old.length < MAX_ARRAY_SELECTOR_LENGTH &&
        old.every((val, index) => newState[index] === val)
    ) {
        return false;
    } else {
        return true;
    }
}
