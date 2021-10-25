/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import immerEnte, { ControllerType } from '../src';

interface Context {
    num: number;
}

const api = { num: 9 };

// @ts-ignore
function controllerTypeTest() {
    const result = immerEnte({ age: 7 }, (updateState) => ({
        incrementAge: () =>
            updateState((state) => {
                state.age++;
            }),
    }));
    const { useController, useNewController, Consumer, Provider, makeController } = result;

    const DUMMY_CONTROLLER: any = {};

    const useControllerType: ControllerType<typeof useController> = DUMMY_CONTROLLER;
    const useNewControllerType: ControllerType<typeof useNewController> = useControllerType;
    const consumerType: ControllerType<typeof Consumer> = useNewControllerType;
    const providerType: ControllerType<typeof Provider> = consumerType;
    const makeControllerType: ControllerType<typeof makeController> = providerType;
    const resultControllerType: ControllerType<typeof result> = makeControllerType;

    console.log(resultControllerType);

    // @ts-expect-error
    makeController({ context: api });
    // @ts-expect-error
    makeController({ context: api, defaultState: { age: 10 } });
    makeController();
    makeController({});
    makeController({ defaultState: { age: 10 } });

    // @ts-expect-error
    useNewController({ context: api });
    // @ts-expect-error
    useNewController({ context: api, defaultState: { age: 10 } });
    useNewController();
    useNewController({});
    useNewController({ defaultState: { age: 10 } });

    <Provider />;
    <Provider defaultState={{ age: 10 }} />;
    // @ts-expect-error
    <Provider defaultState={{ age: 10 }} context={api} />;
    // @ts-expect-error
    <Provider context={api} />;
}

// @ts-ignore
function withContextTypeTest() {
    const result = immerEnte({ age: 7 }, (updateState, _getState, context: () => Context) => ({
        incrementAge: () =>
            updateState((state) => {
                state.age = context().num;
            }),
    }));
    const { useController, useNewController, Consumer, Provider, makeController } = result;

    const DUMMY_CONTROLLER: any = {};

    const useControllerType: ControllerType<typeof useController> = DUMMY_CONTROLLER;
    const useNewControllerType: ControllerType<typeof useNewController> = useControllerType;
    const consumerType: ControllerType<typeof Consumer> = useNewControllerType;
    const providerType: ControllerType<typeof Provider> = consumerType;
    const makeControllerType: ControllerType<typeof makeController> = providerType;
    const resultControllerType: ControllerType<typeof result> = makeControllerType;

    console.log(resultControllerType);

    makeController({ context: api });
    makeController({ context: api, defaultState: { age: 10 } });
    // @ts-expect-error
    makeController();
    // @ts-expect-error
    makeController({});
    // @ts-expect-error
    makeController({ defaultState: { age: 10 } });

    useNewController({ context: api });
    useNewController({ context: api, defaultState: { age: 10 } });
    // @ts-expect-error
    useNewController();
    // @ts-expect-error
    useNewController({});
    // @ts-expect-error
    useNewController({ defaultState: { age: 10 } });

    // @ts-expect-error
    <Provider />;
    // @ts-expect-error
    <Provider defaultState={{ age: 10 }} />;
    <Provider defaultState={{ age: 10 }} context={api} />;
    <Provider context={api} />;
}
