import { Subscribers } from "../src/stateSubscriptions";
import { expect } from "chai";

describe('stateSubscriptions', function() {
    it('should send updates to a subscriber', function() {
        const subscriptions = new Subscribers<string>();

        let val = '';
        function subscriber(newVal: string) {
            val = newVal;
        }

        subscriptions.subscribe(subscriber);
        subscriptions.trigger('foo');

        expect(val).to.equal('foo');
    });

    it('should not update state in a subscriber after it unsubscribes', function() {
        const subscriptions = new Subscribers<string>();

        let val = '';
        function subscriber(newVal: string) {
            val = newVal;
        }

        subscriptions.subscribe(subscriber);
        subscriptions.trigger('foo');
        expect(val).to.equal('foo');

        subscriptions.unsubscribe(subscriber);
        subscriptions.trigger('bar');
        expect(val, 'should not be updated after trigger').to.equal('foo');

    });
});