import { fireEvent, render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React from 'react';
import immerEnte from '../src/index';

chai.use(chaiDom);

describe('immerEnte - rerender test', function () {
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
});
