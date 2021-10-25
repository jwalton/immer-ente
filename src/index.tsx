import { castDraft, castImmutable, Immutable } from 'immer';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Controller, InitialState, makeControllerInstance } from './controller';
import { Subscribers, useSubscription } from './stateSubscriptions';
import useIsMounted from './useIsMounted';

export { isShallowEqual } from './isShallowEqual';
export { Immutable, castDraft, castImmutable, Subscribers, Controller };

export type StateMutateFn<T> = (recipe: (draft: T) => void) => void;

type WithContext<C> = C extends void ? unknown : { context: C };

type NewControllerParams<T, C> = C extends void
    ? { defaultState?: InitialState<T>; context?: void | (() => void) } | undefined
    : { defaultState?: InitialState<T>; context: C | (() => C) };

type NewControllerFunction<T, A, C> = C extends void
    ? (params?: NewControllerParams<T, C>) => Controller<T, A, C>
    : (params: NewControllerParams<T, C>) => Controller<T, A, C>;

export interface UseControllerFn<T, A, C = void> {
    (): [Immutable<T>, A, C];
    <S>(
        selectorFn: (state: Immutable<T>) => Immutable<S>,
        isEqual?: (a: Immutable<S>, b: Immutable<S>) => boolean
    ): [Immutable<S>, A, C];
}

export type ProviderProps<T, A, C = void> =
    | ({ defaultState?: Immutable<T> } & WithContext<C>)
    | { controller: Controller<T, A, C> };

export interface ImmerEnteResult<T, A, C = void> {
    Consumer: React.FC<{
        children: (value: { state: Immutable<T>; actions: A; context: C }) => JSX.Element;
    }>;
    Provider: React.FC<ProviderProps<T, A, C>>;
    useController: UseControllerFn<T, A, C>;
    useNewController: NewControllerFunction<T, A, C>;
    makeController: NewControllerFunction<T, A, C>;
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
export default function immerEnte<T, A, C = void>(
    initialState: Immutable<T>,
    generateActions: (
        updateState: StateMutateFn<T>,
        getState: () => Immutable<T>,
        getContext: () => C
    ) => A
): ImmerEnteResult<T, A, C> {
    const context = React.createContext<{ controller?: Controller<T, A, C> }>({});

    const makeController = (params: NewControllerParams<T, C>): Controller<T, A, C> => {
        return makeControllerInstance({
            initialState: params?.defaultState ?? initialState,
            context: params?.context,
            actions: generateActions,
        } as any);
    };

    const Provider: React.FC<ProviderProps<T, A, C>> = (props) => {
        const controllerRef = useRef<Controller<T, A, C> | undefined>(undefined);

        let controller: Controller<T, A, C>;
        if ('controller' in props) {
            controller = props.controller;
        } else {
            const controllerContext =
                'context' in props ? ((props as any).context as C) : ((undefined as any) as C);

            if (controllerRef.current === undefined) {
                const params: { defaultState: Immutable<T> | undefined; context?: C } = {
                    defaultState: props.defaultState,
                    context: controllerContext,
                };
                controllerRef.current = makeController(params as NewControllerParams<T, C>);
            }
            controller = controllerRef.current;
            controller.context = controllerContext;
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
    ): [Immutable<T> | Immutable<S>, A, C] {
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
        return [state, controller.actions, controller.context];
    }

    function useNewController(params: NewControllerParams<T, C>): Controller<T, A, C> {
        const controllerRef = useRef<Controller<T, A, C> | undefined>(undefined);

        if (controllerRef.current === undefined) {
            controllerRef.current = makeController(params);
        }

        controllerRef.current.context =
            params && 'context' in params ? params.context : (undefined as any);

        // Make sure we re-render when the state of the controller changes.
        const [, setState] = useState<Immutable<T>>(controllerRef.current.state);
        useSubscription(controllerRef.current.subscribers, setState);

        return controllerRef.current;
    }

    const Consumer: React.FC<{
        children: (value: { state: Immutable<T>; actions: A; context: C }) => JSX.Element;
    }> = (props) => {
        const [state, actions, context] = useController();
        return props.children({ state, actions, context });
    };

    return {
        Consumer,
        Provider,
        useController,
        useNewController: useNewController as NewControllerFunction<T, A, C>,
        makeController: makeController as NewControllerFunction<T, A, C>,
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

/**
 * Utility type for extracting the Typescript type of a controller/actions/state.
 */
export type ControllerType<Q> = Q extends React.FC<ProviderProps<infer T, infer A, infer C>> // Provider
    ? Controller<T, A, C>
    : Q extends (params: any) => Controller<infer T, infer A, infer C> // useNewController and makeController.
    ? Controller<T, A, C>
    : Q extends UseControllerFn<infer T, infer A, infer C> // useController
    ? Controller<T, A, C>
    : Q extends React.FC<{
          children: (value: {
              state: Immutable<infer T>;
              actions: infer A;
              context: infer C;
          }) => JSX.Element;
      }> // Consumer
    ? Controller<T, A, C>
    : Q extends ImmerEnteResult<infer T, infer A, infer C> // Whole ImmerEnteResult
    ? Controller<T, A, C>
    : never;
