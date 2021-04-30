import { fireEvent, render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React from 'react';
import immerEnte from '../src/index';

chai.use(chaiDom);

describe('immerEnte - rerender test', function () {
    it('should create a new controller with useNewController', function () {
        const initialState = {
            age: 8,
            name: 'Oriana',
        };

        const { useNewController } = immerEnte(initialState, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        let ageRenderCount = 0;
        const ShowAge = () => {
            ageRenderCount++;
            const { state, actions } = useNewController();
            return (
                <div>
                    {state.age}
                    <button onClick={() => actions.incrementAge()}>Increase</button>
                </div>
            );
        };

        render(<ShowAge />);

        screen.getByText('8');

        const button = screen.getByText('Increase');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('9');
        expect(ageRenderCount, 'age render count').to.equal(2);
    });

    it('should use controller passed to provider', function () {
        const initialState = {
            age: 8,
            name: 'Oriana',
        };

        const { Provider, useNewController, useController } = immerEnte(
            initialState,
            (updateState) => ({
                incrementAge: () =>
                    updateState((state) => {
                        state.age++;
                    }),
            })
        );

        let ageRenderCount = 0;
        const ShowAge = () => {
            ageRenderCount++;
            const [state, actions] = useController();
            return (
                <div>
                    Inner Age: {state.age}
                    <button onClick={() => actions.incrementAge()}>Increase</button>
                </div>
            );
        };

        const Wrapper = () => {
            const controller = useNewController();
            return (
                <Provider controller={controller}>
                    <div>Wrapper Age: {controller.getState().age}</div>
                    <ShowAge />
                </Provider>
            );
        };

        render(<Wrapper />);

        screen.getByText('Inner Age: 8');
        screen.getByText('Wrapper Age: 8');

        const button = screen.getByText('Increase');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('Inner Age: 9');
        screen.getByText('Wrapper Age: 9');
        expect(ageRenderCount, 'age render count').to.equal(2);
    });

    it("should not rerender a component if the data referenced by the selector doesn't change", function () {
        const initialState = {
            age: 8,
            name: 'Oriana',
        };

        const { Provider, useController } = immerEnte(initialState, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        let ageRenderCount = 0;
        const ShowAge = () => {
            ageRenderCount++;
            const [age, actions] = useController((state) => state.age);
            return (
                <div>
                    {age}
                    <button onClick={() => actions.incrementAge()}>Increase</button>
                </div>
            );
        };

        let nameRenderCount = 0;
        const ShowName = () => {
            nameRenderCount++;
            const [name] = useController((state) => state.name);
            return <div>{name}</div>;
        };

        render(
            <Provider>
                <ShowAge />
                <ShowName />
            </Provider>
        );

        const button = screen.getByText('Increase');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('9');
        expect(ageRenderCount, 'age render count').to.equal(2);
        expect(nameRenderCount, 'name render count').to.equal(1);
    });

    it('should support array selectors', function () {
        const initialState = {
            age: 8,
            name: 'Oriana',
            height: 'not tall',
        };

        const { Provider, useController } = immerEnte(initialState, (updateState) => ({
            incrementAge: () =>
                updateState((state) => {
                    state.age++;
                }),
        }));

        let ageRenderCount = 0;
        const ShowAge = () => {
            ageRenderCount++;
            const [age, actions] = useController((state) => state.age);
            return (
                <div>
                    {age}
                    <button onClick={() => actions.incrementAge()}>Increase</button>
                </div>
            );
        };

        let detailsRenderCount = 0;
        const ShowDetails = () => {
            detailsRenderCount++;
            const [[name, height]] = useController((state) => [state.name, state.height]);
            return (
                <div>
                    {name} {height}
                </div>
            );
        };

        render(
            <Provider>
                <ShowAge />
                <ShowDetails />
            </Provider>
        );

        const button = screen.getByText('Increase');
        fireEvent(
            button,
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            })
        );

        screen.getByText('9');
        expect(ageRenderCount, 'age render count').to.equal(2);
        expect(detailsRenderCount, 'details render count').to.equal(1);
    });
});
