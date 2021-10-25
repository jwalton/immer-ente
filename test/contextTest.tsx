import { fireEvent, render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React, { useState } from 'react';
import sinon, { SinonFakeTimers } from 'sinon';
import immerEnte from '../src/index';

chai.use(chaiDom);

interface Api {
    getNewAge(): number;
}

describe('immerEnte - with context', function () {
    let clock: SinonFakeTimers;

    before(function () {
        clock = sinon.useFakeTimers();
    });

    after(function () {
        clock.restore();
    });

    it('should call into context to update state', function () {
        const { Provider, useController } = immerEnte(
            { age: 10 },
            (updateState, _getState, getApi: () => Api) => ({
                updateAge: () =>
                    updateState((state) => {
                        state.age = getApi().getNewAge();
                    }),
            })
        );

        const ShowAge = () => {
            const [state, actions] = useController();
            return (
                <>
                    <button onClick={() => actions.updateAge()}>Update</button>
                    <div>Age: {state.age}</div>
                </>
            );
        };

        const api = {
            getNewAge: () => 7,
        };

        render(
            <Provider context={api}>
                <ShowAge />
            </Provider>
        );

        const button = screen.getByText('Update');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('Age: 7');
    });

    it('should update context if context passed to provider changes', function () {
        const { Provider, useController } = immerEnte(
            { age: 3 },
            (updateState, _getState, getApi: () => Api) => ({
                updateAge: () =>
                    updateState((state) => {
                        state.age = getApi().getNewAge();
                    }),
            })
        );

        const ShowAge = () => {
            const [state, actions] = useController();
            return (
                <>
                    <button onClick={() => actions.updateAge()}>Update</button>
                    <div>Age: {state.age}</div>
                </>
            );
        };

        const Wrapper = () => {
            const api1 = { getNewAge: () => 1 };
            const api2 = { getNewAge: () => 2 };
            const [apiChoice, setApiChoice] = useState(1);

            return (
                <div>
                    <button onClick={() => setApiChoice(2)}>Change API ({apiChoice})</button>
                    <Provider context={apiChoice === 1 ? api1 : api2}>
                        <ShowAge />
                    </Provider>
                </div>
            );
        };

        render(<Wrapper />);

        screen.getByText('Age: 3');

        const button = screen.getByText('Update');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('Age: 1');

        const changeApiButton = screen.getByText('Change API (1)');
        fireEvent(
            changeApiButton,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('Change API (2)');

        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('Age: 2');
    });

    it('should create a new controller with useNewController', function () {
        const initialState = { age: 8 };

        const { useNewController } = immerEnte(
            initialState,
            (updateState, _getState, getApi: () => Api) => ({
                incrementAge: () =>
                    updateState((state) => {
                        state.age = getApi().getNewAge();
                    }),
            })
        );

        const api = {
            getNewAge: () => 7,
        };

        let ageRenderCount = 0;
        const ShowAge = () => {
            ageRenderCount++;
            const { state, actions } = useNewController({ context: api });
            return (
                <div>
                    {state.age}
                    <button onClick={() => actions.incrementAge()}>Update</button>
                </div>
            );
        };

        render(<ShowAge />);

        screen.getByText('8');

        const button = screen.getByText('Update');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('7');
        expect(ageRenderCount, 'age render count').to.equal(2);
    });

    it('should allow testing the actions, like a reducer', function () {
        const { makeController } = immerEnte(
            { age: 9 },
            (updateState, _getState, context: () => Api) => ({
                setAge() {
                    updateState(() => ({ age: context().getNewAge() }));
                },
            })
        );

        const api = {
            getNewAge: () => 7,
        };

        const { actions, getState } = makeController({ context: api });

        const state1 = getState();
        expect(state1.age).to.equal(9);

        actions.setAge();

        const state2 = getState();
        expect(state2.age).to.equal(7);

        // state1 and state2 should be different objects.
        expect(state1).to.not.equal(state2);
    });
});
