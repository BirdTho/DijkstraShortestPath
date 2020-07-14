/**
 *
 * @param {Array} arr - array to be reversed
 * @return {Array} in reverse order
 */
function arrayFlip(arr) {
    let length = arr.length;
    let out = new Array(length);
    --length;
    for (let i = 0; i <= length; ++i) out[i] = arr[length - i];
    return out;
}

/**
 * @param {Array} arr - original input array (and in recursion, subarrays)
 * @param {Array=} permutedArr - current higher-level permuted array (leave blank)
 * @return {Array<Array<(number|Array<number>)>>}
 */
function doPermute(arr, permutedArr) {
    permutedArr = permutedArr || [];
    let modifyArr;
    let length = arr.length;
    let output = [];

    if (length > 1) {
        for (let i = 0; i < length; ++i) {
            modifyArr = arr.slice(0);
            let thisEl = modifyArr.splice(i, 1)[0];
            output = output.concat(doPermute(modifyArr, permutedArr.concat([thisEl])));

            if (Array.isArray(thisEl) && thisEl.length > 1) {
                output = output.concat(doPermute(modifyArr, permutedArr.concat([arrayFlip(thisEl)])));
            }
        }
    } else if (length === 1) {
        output = [permutedArr.concat([arr[0]])];
        if (Array.isArray(arr[0])) {
            output.push(permutedArr.concat([arrayFlip(arr[0])]));
        }
    } else {
        output.push([]);
    }
    return output;
}