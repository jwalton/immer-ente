import { fireEvent, render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React from 'react';
import immerEnte from '../src/index';
import promiseTools from 'promise-tools';
import sinon, { SinonFakeTimers } from 'sinon';

chai.use(chaiDom);

describe('immerEnte', function () {
    let clock: SinonFakeTimers;

    before(function () {
        clock = sinon.useFakeTimers();
    });

    after(function () {
        clock.restore();
    });

    it('should generate some state', function () {
        const { Provider, useController } = immerEnte({ age: 10 }, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        const ShowAge = () => {
            const [state] = useController();
            return <div>{state.age}</div>;
        };

        render(
            <Provider>
                <ShowAge />
            </Provider>
        );

        screen.getByText('10');
    });

    it('should override default state at provider', function () {
        const { Provider, useController } = immerEnte({ age: 10 }, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        const ShowAge = () => {
            const [state] = useController();
            return <div>{state.age}</div>;
        };

        render(
            <Provider defaultState={{ age: 12 }}>
                <ShowAge />
            </Provider>
        );

        screen.getByText('12');
    });

    it('should work with a Consumer', function () {
        const { Provider, Consumer } = immerEnte({ age: 10 }, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        const ShowAge = (props: { age: number }) => {
            return <div>{props.age}</div>;
        };

        render(
            <Provider>
                <Consumer>{(props) => <ShowAge age={props.state.age} />}</Consumer>
            </Provider>
        );

        screen.getByText('10');
    });

    it('should update some state', function () {
        const { Provider, useController } = immerEnte({ age: 10 }, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        const ShowAge = () => {
            const [state, actions] = useController();
            return <button onClick={() => actions.incrementAge()}>{state.age}</button>;
        };

        render(
            <Provider>
                <ShowAge />
            </Provider>
        );

        const button = screen.getByText('10');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('11');
    });

    it('should not update state after Provider has been unmounted', function () {
        const { Provider, useController } = immerEnte({ age: 10 }, (updateState) => ({
            incrementAge: async () => {
                updateState((state) => {
                    state.age++;
                });
                await promiseTools.delay(10);
                updateState((state) => {
                    state.age++;
                });
            },
        }));

        const ShowAge = () => {
            const [state, actions] = useController();
            return <button onClick={() => actions.incrementAge()}>{state.age}</button>;
        };

        const { unmount } = render(
            <Provider>
                <ShowAge />
            </Provider>
        );

        const button = screen.getByText('10');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );
        unmount();

        clock.tick(100);
    });

    it('should replace state entirely by returning new state', function () {
        const { Provider, useController } = immerEnte({ age: 9 }, (updateState) => ({
            zeroAge: () =>
                updateState(() => {
                    return { age: 0 };
                }),
        }));

        const ShowAge = () => {
            const [state, actions] = useController();
            return <button onClick={() => actions.zeroAge()}>{state.age}</button>;
        };

        render(
            <Provider>
                <ShowAge />
            </Provider>
        );

        const button = screen.getByText('9');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('0');
    });

    it('should fetch latest state via getState()', function () {
        let updatedAge = 9;

        const { Provider, useController } = immerEnte({ age: 9 }, (updateState, getState) => ({
            setAndGetAge() {
                updateState(() => ({ age: 97 }));
                updatedAge = getState().age;
            },
        }));

        const ShowAge = () => {
            const [state, actions] = useController();
            return <button onClick={actions.setAndGetAge}>{state.age}</button>;
        };

        render(
            <Provider>
                <ShowAge />
            </Provider>
        );

        const button = screen.getByText('9');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(updatedAge).to.equal(97);
    });

    it('should allow testing the actions, like a reducer', function () {
        const { makeTestController } = immerEnte({ age: 9 }, (updateState) => ({
            setAge() {
                updateState(() => ({ age: 97 }));
            },
        }));

        const { actions, getState } = makeTestController();

        const state1 = getState();
        expect(state1.age).to.equal(9);

        actions.setAge();

        const state2 = getState();
        expect(state2.age).to.equal(97);
    });
});
