# immer-ente

[![NPM version](https://badge.fury.io/js/immer-ente.svg)](https://npmjs.org/package/immer-ente)
[![Build Status](https://travis-ci.org/jwalton/immer-ente.svg)](https://travis-ci.org/jwalton/immer-ente)
[![Coverage Status](https://coveralls.io/repos/jwalton/immer-ente/badge.svg)](https://coveralls.io/r/jwalton/immer-ente)

## What is it?

This is a lightweight alternative to Redux, built using immer, heavily
influenced by immer-wieder. It provides a "controller" framework with actions
and state, but zero boilerplate.

immer-ente is built on top of "immer", German for "always". "Ente" is German
for "ducks", because this is meant to be a replacement for reDUX (see what I
did there!?)

The biggest advantages over immer-wieder:

- Native typescript support.
- State and actions are separate, making it easier to rehydrate state from the
  server.
- React hooks support.
- Easy testing for actions, without any React.

## How to use it

The basic idea is, you create a state object, and a set of actions.
The `immerEnte()` function returns a `{ Provider, Consumer, useController }`
object you can use in your application:

```tsx
import immerEnte from 'immer-ente';

const initialState = {
    age: 10,
};

// Create our controller with immerEnte
const { Provider: MyStateProvider, useController: useMyController } = immerEnte(
    // Our initial state.
    initialState,
    // A function which returns an "actions" object.  Actions have access to the
    // current state via `getState()` and can update state with
    // `updateState(draft => ...)`.  See below for more details.
    (updateState, getState) => ({
        incrementAge() {
            updateState(state => { state.age++; });
        },
        setAge(age) {
            // Return a new state object
            updateState(state => { return { age, loading: false }; });
        },
        async loadAge() {
            updateState(state => { state.loading = true; });
            const response = await fetch('/age');
            const body = await response.json();
            updateState(state => {
                state.loading = false;
                state.age = body.age;
            });
        }
    })
);

export function MyComponent() {
    // `useController` returned by immerEnte gives you access to state and actions
    // in any component mounted under the `Provider` component.
    const [ state, actions ] = useMyController();

    return (<MyStateProvider>
        <button onClick={actions.incrementAge}>{ state.age }</button>
    </MyStateProvider>);
}
```

The `immerEnte()` function takes two arguments; your initial state object,
and then a `makeActions(updateState, getState)` function. `updateState` is used
to update the current state.  Actions can be synchronous or async:

```ts
    async myAction() {
        updateState(draft => {draft.loading = true;});
        try {
            await doAsyncThing();
        } finally {
            updateState(draft => {draft.loading = false;});
        }
    }
```

`updateState(draft)` is based on `immer`, and can either update the state
directly as in the example above, or can return an entirely new state object:

```ts
    myAction() {
        updateState(draft => {
            // Return a whole new state object
            return { loading: false; }
        });
    }
```

`immerEnte()` returns a `{ Consumer, Provider, useController, getState, actions }`
object. If `Provider` is mounted somewhere in your react tree, then `Consumer`
and the `useController()` hook can be used to get access to get access to state
and actions.

`immerEnte()` also returns `getState()` and `actions`, which can be used to test
actions in isolation, without React being involved.

## Preventing unnecessary re-renders

If you're using the `useController()` hook, note that it relies on `useContext()`,
so every time your state changes, your component will re-render.  You can get
around this the
[same way you can for `useContext()`](https://github.com/facebook/react/issues/15156#issuecomment-474590693):

```tsx
    function MyComponent() {
        const [state] = useController();
        const { age } = state;

        // Only re-render this bit if `age` changes.
        return useMemo(() =>
            <div>My age is {age}</div>,
            [age]
        );
   }
```

## Writing unit tests

Every time you call `immerEnte()`, you get back a provider and action set that
operate on some state, stored in a closure created by the immerEnte function.
When writing tests, ideally we'd like to set that initial state to different values,
and then call actions to update the state. The recommended way to do this is to
create a `createActions()` function which will set up a new provider and actions
instance which you can call from your tests, and then call that function to
create the "default" provider and actions you'll use in your application.

```ts
// createController.ts
import immerEnte from 'immer-ente';

const DEFAULT_STATE = {
    age: 10,
};

export function createController(initialState) {
    return immerEnte(initialState, (updateState, getState) => {
        incrementAge() { updateState(state => { state.age++ }); }
    });
}

const { Provider, Consumer, useController } = createActions(DEFAULT_STATE);
export {
    Provider as AgeProvider,
    Consumer as AgeConsumer,
    useController as useAgeController
};
```

Then you can write tests that create a new `actions` and `getState()`, with a
new initial state for every test:

```ts
// createControllerTest.ts
import { createController } from './createController';
import { expect } from 'chai';

describe('age controller tests', function () {
  it('should increment the age', function () {
    const { actions, getState } = createController({ age: 1 });
    actions.incrementAge();
    expect(getState().age).to.equal(2);
  });
});
```

## FAQ

### Is this SSR safe?

Yes, you can use immer-ente with server-side rendering.  When you create a controller,
you pass in a "default state", however the actual state for a subtree is stored
in the Provider.