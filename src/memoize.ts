import { deepEqual } from './util.js';


const arrayEqual = (a, b) => {
	if (a.length != b.length) return false;
	return a.every((a,index) => a === b[index]);
};

//Like memoize, except the first argument is expected to be a thing that changes
//often, and the rest of the arguments are assumed to change rarely.
export const memoizeFirstArg = (fn) => {
	const resultMap = new WeakMap();
	return (...args) => {
		if (!args.length) return fn();
		const firstArg = args[0];
		const restArgs = args.slice(1);
		const record = resultMap.get(firstArg);
		if (record && arrayEqual(record.restArgs, restArgs)) return record.result;
		const result = fn(...args);
		resultMap.set(firstArg, {restArgs, result});
		return result;
	};
};

//deepEqualReturnSame is designed to wrap functions. If the result of the
//function is deepEqual to the last result, then it will return literally the
//last result. This is very useful in cases where there are values that have
//tons of expensive downstream calculations driven off of them, and where a
//small change to their inputs but no change in output is common. But note that
//deepEqual is expensive, so don't use it unless you know that the output is
//upstream of a LOT of calculations.
export const deepEqualReturnSame = (fn) => {
	//The precise, equality key of the last result to check to see if they're exactly the same
	let resultKey;
	//The value to return if they're deep equal.
	let resultValue;
	return (...args) => {
		resultKey = fn(...args);
		if (deepEqual(resultKey, resultValue)) {
			return resultValue;
		}
		resultValue = resultKey;
		return resultValue;
	};
};

//memoize will retain up to entries number of past arguments and if any match,
//return that result instead of recalculating.
export const memoize = (fn, entries = 3) => {

	//Objects with args, result
	const memoizedRecords = [];

	return (...args) => {
		for (const record of memoizedRecords) {
			if (arrayEqual(record.args, args)) return record.result;
		}
		const result = fn(...args);
		memoizedRecords.unshift({args, result});
		if (memoizedRecords.length > entries) {
			const itemsToRemove = memoizedRecords.length - entries;
			memoizedRecords.splice(-1 * itemsToRemove, itemsToRemove);
		}
		return result;
	};
};
