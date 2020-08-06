# immer-ente

[![NPM version](https://badge.fury.io/js/immer-ente.svg)](https://npmjs.org/package/immer-ente)
![Build Status](https://github.com/jwalton/immer-ente/workflows/GitHub%20CI/badge.svg)

## What is it?

This is a lightweight alternative to Redux, built using immer. It is heavily
influenced by immer-wieder. It provides a "controller" framework with actions
and state, but with minimal boilerplate.

Immer-ente is built on top of "immer", German for "always". "Ente" is German
for "ducks", because this is meant to be a replacement for reDUX (see what I
did there!?)

The biggest advantages over immer-wieder:

- React hooks support.
- State and actions are separate, making it easier to rehydrate state from the
  server.
- Easy unit testing for actions, without any React.
- Native typescript support.

## How to use it

The basic idea is, you create a state object, and a set of actions. The
`immerEnte()` function returns a `{ Provider, Consumer, useController }` object
you can use in your application:

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

    // A simple action.
    incrementAge() {
      updateState((state) => {
        state.age++;
      });
    },

    // Return a new state object in updateState() to replace
    // the current state entirely.
    setAge(age) {
      updateState((state) => {
        return { age, loading: false };
      });
    },

  })
);

function MyComponent() {
  // `useController` returned by immerEnte gives you access to state and actions
  // in any component mounted under the `Provider` component.
  const [state, actions] = useMyController();

  return (
      <button onClick={actions.incrementAge}>{state.age}</button>
  );
}

export function Screen() {
    // Somewhere higher up the render tree we need a `MyStateProvider`
    // for `useMyController()` to work.
    return (
        <MyStateProvider defaultState={initialState}>
            <MyComponent />
        </MyStateProvider>
    );
}
```

The `immerEnte()` function takes two arguments; your initial state object,
and then a `makeActions(updateState, getState)` function. `updateState` is used
to update the current state. Actions can be synchronous or async:

```ts
const makeActions = (updateState) => ({
  async myAction() {
    updateState((draft) => void (draft.loading = true));

    try {
      await doAsyncThing();
    } finally {
      updateState((draft) => void (draft.loading = false));
    }
  },
});
```

`updateState(fn)` is based on `immer`, and can either update the state
directly as in the example above, or can return an entirely new state object:

```ts
const makeActions = (updateState) => ({
  myAction() {
    updateState((draft) => {
      // Return a whole new state object
      return { loading: false };
    });
  },
});
```

This does mean you need to be a little careful when using arrow functions:

```ts
const makeActions = (updateState) => ({
  async myVeryBadAction() {
    // Watch out!  This is going to replace your whole state with 'true'.
    updateState((draft) => (draft.loading = true));
  },

  async myGoodAction() {
    // `void` is your friend, and will fix this for you.
    updateState((draft) => void (draft.loading = true));
  },

  async myOtherGoodAction() {
    // Or, use squiggly braces
    updateState((draft) => {
      draft.loading = true;
    });
  },
});
```

`immerEnte()` returns a `{ Consumer, Provider, useController }`
object. If `Provider` is mounted somewhere in your react tree, then `Consumer`
and the `useController()` hook can be used to get access to get access to state
and actions from anywhere in that tree. `Provider` can be passed a `defaultState`
prop, which will let you pass in rehydrated state when doing server side rendering.

`immerEnte()` also returns a `makeTestController()`, which can be used to test
actions in isolation, without React being involved. See below for more details.

## Preventing unnecessary re-renders

If you're using the `useController()` hook, you can provide a selector function
that will limit what data is returned, and prevent unnecessary re-renders:

```tsx
function MyComponent() {
  // Only re-render this component if `state.age` changes.
  const [age] = useController((state) => state.age);

  return <div>My age is {age}</div>;
}
```

If your selector returns an object, then it must return exactly the same object
on each invocation in order to avoid a re-render. If you have multiple values
you want to fetch, you can use an array selector:

```tsx
function MyComponent() {
  // Only re-render this component if `state.age` changes.
  const [[age, name]] = useController((state) => [state.age, state.name]);

  return (
    <div>
      My age is {age}, and my name is {name}.
    </div>
  );
}
```

This will not re-render in the case where the length of the array doesn't change,
and all elements in the array are identical.

## Writing unit tests

When writing tests, ideally we'd like to set the initial state to different values,
and then call actions to update the state, and make sure the state gets updated
the way we'd like. In a perfect world, we could do all of this without bothering
with react. `immerEnte()` returns a `makeTestController()` function which makes
this easy to do:

```ts
// createController.ts
import immerEnte from 'immer-ente';

const initialState = {
  age: 10,
};

const { Provider, Consumer, useController, makeTestController } = immerEnte(
  initialState,
  (updateState, getState) => ({
    incrementAge() {
      updateState((state) => void state.age++);
    },
  })
);

export {
  Provider as AgeProvider,
  Consumer as AgeConsumer,
  useController as useAgeController,
  makeTestController,
};
```

Then you can write tests that create a new `actions` and `getState()`, with a
new initial state for every test:

```ts
// createControllerTest.ts
import { makeTestController } from './createController';
import { expect } from 'chai';

describe('age controller tests', function () {
  it('should increment the age', function () {
    const { actions, getState } = makeTestController({ age: 1 });
    actions.incrementAge();
    expect(getState().age).to.equal(2);
  });
});
```

## FAQ

### Is this SSR safe?

Yes, you can use immer-ente with server-side rendering. When you create a controller,
you pass in a "default state", however the actual state for a subtree is stored
as a ref in the Provider, so creating two different instances of the Provider
will effectively create two copies of the state.
