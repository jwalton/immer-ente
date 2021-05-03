/* eslint-disable @typescript-eslint/ban-ts-comment */
import immerEnte, { ControllerType } from '../src';

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
}
