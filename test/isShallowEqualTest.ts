import { expect } from 'chai';
import { isShallowEqual } from '../src/isShallowEqual';

describe('isShallowEqual', () => {
    it('should determine if two objects are equal', () => {
        expect(isShallowEqual({ a: 1 }, { a: 1 })).to.be.true;
        expect(isShallowEqual({}, {})).to.be.true;
        expect(isShallowEqual({ a: 1 }, { a: 0 })).to.be.false;
        expect(isShallowEqual({ a: {} }, { a: {} })).to.be.false;
        expect(isShallowEqual({ a: 1 }, { b: 1 })).to.be.false;
        expect(isShallowEqual({ a: 1 }, {})).to.be.false;
        expect(isShallowEqual({ a: undefined }, {})).to.be.false;
        expect(isShallowEqual({}, { a: 1 })).to.be.false;

        const obj = {};
        expect(isShallowEqual({ a: obj }, { a: obj })).to.be.true;
    });

    it('should work for arrays', () => {
        expect(isShallowEqual([1], [1])).to.be.true;
        expect(isShallowEqual([undefined], [undefined])).to.be.true;
        expect(isShallowEqual([1], [0])).to.be.false;
        expect(isShallowEqual([1], [])).to.be.false;
        expect(isShallowEqual([], [1])).to.be.false;

        const a = [];
        a[1] = '1';
        const b = [undefined, '1'];
        // This should be false, because these arrays have different keys.
        // (Although, this is a WEIRD corner case.)
        expect(isShallowEqual(a, b)).to.be.false;
    });

    it('should work for strings', () => {
        expect(isShallowEqual('1', '1')).to.be.true;
        expect(isShallowEqual('1', '0')).to.be.false;
        expect(isShallowEqual('1', undefined)).to.be.false;
        expect(isShallowEqual(undefined, '1')).to.be.false;
    });

    it('should work for undefined and null', () => {
        expect(isShallowEqual(undefined, undefined)).to.be.true;
        expect(isShallowEqual(null, null)).to.be.true;
        expect(isShallowEqual(null, undefined)).to.be.false;
        expect(isShallowEqual(undefined, null)).to.be.false;
    });
});
