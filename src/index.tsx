import produce, { Immutable } from 'immer';
import React, { useContext, useState, useRef } from 'react';
import useIsMounted from './useIsMounted';

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
    const context = React.createContext<{ state: Immutable<T>; actions: A }>({
        state: initialState,
        actions: {} as any,
    });

    const Provider: React.FC<{ defaultState?: Immutable<T> }> = (props) => {
        const mounted = useIsMounted();
        const stateRef = useRef(props.defaultState || initialState);
        const [state, setState] = useState<Immutable<T>>(stateRef.current);

        const updateState: StateMutateFn<T> = (recipe) => {
            stateRef.current = produce(state, recipe);
            if (mounted.current) {
                setState(stateRef.current);
            }
        };

        function getState(): Immutable<T> {
            return stateRef.current;
        }

        const actions = generateActions(updateState, getState);

        return <context.Provider value={{ state, actions }}>{props.children}</context.Provider>;
    };

    function useController(): [Immutable<T>, A] {
        const { state, actions } = useContext(context);
        return [state, actions];
    }

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
        Consumer: context.Consumer,
        Provider,
        useController,
        makeTestController,
    };
}
