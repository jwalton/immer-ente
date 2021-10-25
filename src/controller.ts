import produce, { castDraft, castImmutable, Immutable } from 'immer';
import { Subscribers } from './stateSubscriptions';
import { resolveValue } from './utils';

export { isShallowEqual } from './isShallowEqual';
export { Immutable, castDraft, castImmutable, Subscribers };

export type StateMutateFn<T> = (recipe: (draft: T) => void) => void;

export type InitialState<T> = Immutable<T> | (() => Immutable<T>);

export interface Controller<T, A, C = void> {
    state: Immutable<T>;
    getState: () => Immutable<T>;
    actions: A;
    subscribers: Subscribers<Immutable<T>>;
    context: C;
}

type MakeControllerParams<T, A, C> = {
    initialState: InitialState<T>;
    actions: (
        updateState: StateMutateFn<T>,
        getState: () => Immutable<T>,
        getContext: () => C
    ) => A;
} & (C extends void ? { context?: undefined | (() => undefined) } : { context: C | (() => C) });
/**
 * Create a new controller.
 *
 * @param params.initialState - The initial state to use for the controller.
 * @param params.actions - A function used to create actions for the controller.
 * @param params.context - A context object which will be available to the controller,
 *   or a function to call to get the current context.  This can be updated by setting
 *   `context.controller`.
 */
export function makeControllerInstance<T, A, C = void>(
    params: MakeControllerParams<T, A, C>
): Controller<T, A, C> {
    const contextRef = { current: params?.context };

    let state: Immutable<T> = resolveValue(params.initialState);
    const subscribers = new Subscribers<Immutable<T>>();

    const updateState: StateMutateFn<T> = (recipe) => {
        state = produce(state, recipe);
        subscribers.trigger(state);
    };

    function getState(): Immutable<T> {
        return state;
    }

    debugger;

    const getContext = () => resolveValue(contextRef.current) as C;
    const actions: A = params.actions(updateState, getState, getContext);

    return {
        get state() {
            return state;
        },
        getState,
        actions,
        subscribers,
        get context(): C {
            return getContext();
        },
        set context(c: C) {
            contextRef.current = c;
        },
    };
}
