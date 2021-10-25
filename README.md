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

You create a state object, and a set of actions. The `immerEnte()` function returns a `{ Provider, Consumer, useController, useNewController, makeController }` object you can use in your application. Here's a simple example that creates a controller:

```tsx
import immerEnte, { ControllerType } from 'immer-ente';

// This is the state...
const initialState = {
  age: 10,
};

const { makeController } = immerEnte(initialState, (updateState) => ({
  // And these are your actions...
  incrementAge() {
    updateState((state) => {
      state.age++;
    });
  },
}));

const { actions, getState } = makeController();

console.log(getState().age); // 9

actions.incrementAge();

console.log(getState().age); // 10

getState().age = 101; // This will throw an error, because state is immutable outside `updateState`.
```

Here's a slightly more complicated example, which creates a React Context:

```tsx
import immerEnte, { ControllerType } from 'immer-ente';

const initialState = {
  age: 10,
};

// Create our controller with immerEnte
const {
  // `Provider` will make the controller available to the whole render tree.
  Provider: MyStateProvider,
  // `useController` will get the controller from the Provider, or will
  // throw an error if no Provider exists.
  useController: useMyController,
  // `useNewController` will create a new controller and use it, instead of
  // finding one from the Provider.
  useNewController: useNewMyController,
} = immerEnte(
  // Default initial state - this can be overridden in the Provider
  // or in useNewController.
  initialState,

  // A function which returns an "actions" object.  Actions have access to the
  // current state via `getState()` and can update state with
  // `updateState(draft => ...)`.  See below for more details.
  (updateState, getState, getContext) => ({
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

// ControllerType<> is a Typescript helper to retrieve the type signature for
// a controller.
type MyControllerType = ControllerType<typeof Provider>;
type MyActionsType = MyControllerType['actions'];

// Now we have two options for how we can use the contoller - via a Provider
export function Screen() {
  // Somewhere higher up the render tree we need a `MyStateProvider`
  // for `useMyController()` to work.
  return (
    <MyStateProvider defaultState={initialState}>
      <MyComponent />
    </MyStateProvider>
  );
}

function MyComponent() {
  // `useController` returned by immerEnte gives you access to state and actions
  // in any component mounted under the `Provider` component.
  const [state, actions] = useMyController();

  return <button onClick={actions.incrementAge}>{state.age}</button>;
}

// Or we can create a controller via `useNewController()`
export function Screen2() {
  const { state, actions } = useNewController();

  return <button onClick={actions.incrementAge}>{state.age}</button>;
}

// Or we can do a combination of the two:
export function Screen3() {
  const controller = useNewController();

  return (
    <MyStateProvider controller={controller}>
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

`immerEnte()` returns a `{ Consumer, Provider, useController, makeController }`
object. If `Provider` is mounted somewhere in your react tree, then `Consumer`
and the `useController()` hook can be used to get access to get access to state
and actions from anywhere in that tree. `Provider` can be passed a `defaultState`
prop, which will let you pass in rehydrated state when doing server side rendering.

If you need access to the controller in the same top level component

`immerEnte()` also returns a `makeController()`, which can be used with class
based components, or can be used to test actions in isolation, without React
being involved. See below for more details.

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
you want to fetch, you can use an equality check when
calling `useController(selector, isEqual)`:

```tsx
import immerEnte, { isShallowEqual } from 'immer-ente';

function MyComponent() {
  // Only re-render this component if `state.age` changes.
  const [{age, name}] = useController(
    (state) => { age: state.age, name: state.name },
    isShallowEqual,
  );

  return (
    <div>
      My age is {age}, and my name is {name}.
    </div>
  );
}
```

This will not re-render in the case where `isEqual` returns
true (in this case when the two objects are shallow-equal).

## Dependency Injection

Sometimes you have some dependency you want to pass into your controller, like
a cache or an API that's different server side than client side. You can do this
with a `context`.

```ts
interface Api {
  getNewAge(): number;
}

const api = {
  getNewAge() {
    return 12;
  },
};

const { Provider, useController } = immerEnte(
  { age: 7 },
  (updateState, _getState, getContext: () => Api) => ({
    incrementAge: () =>
      updateState((state) => {
        state.age = getContext().getNewAge();
      }),
  })
);

export function Screen() {
  // Can pass `context` in to the Provider.
  return (
    <Provider context={api}>
      <MyComponent />
    </Provider>
  );
}
```

When using a context, the context must be provided when using `<Provider>`, unless
you pass in a `controller` prop. It also must be passed when calling
`useNewController({ context })` or `makeController({ context })`.

## Writing unit tests

When writing tests, ideally we'd like to set the initial state to different values,
and then call actions to update the state, and make sure the state gets updated
the way we'd like. In a perfect world, we could do all of this without bothering
with react. `immerEnte()` returns a `makeController()` function which makes
this easy to do:

```ts
// createController.ts
import immerEnte from 'immer-ente';

const initialState = {
  age: 10,
};

const { Provider, Consumer, useController, makeController } = immerEnte(
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
  makeController,
};
```

Then you can write tests that create a new `actions` and `getState()`, with a
new initial state for every test:

```ts
// createControllerTest.ts
import { makeController } from './createController';
import { expect } from 'chai';

describe('age controller tests', function () {
  it('should increment the age', function () {
    const { actions, getState } = makeController({ age: 1 });
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
