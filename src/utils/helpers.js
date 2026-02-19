export function deepMerge(target, source) {
	const output = Object.assign({}, target);
	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isObject(source[key])) {
				if (!(key in target)) {
					Object.assign(output, { [key]: source[key] });
				} else {
					output[key] = deepMerge(target[key], source[key]);
				}
			} else {
				Object.assign(output, { [key]: source[key] });
			}
		});
	}
	return output;
}

function isObject(item) {
	return item && typeof item === 'object' && !Array.isArray(item);
}

Object.defineProperty(Array.prototype, 'flat', {
	value: function (depth = 1) {
		return this.reduce(function (flat, toFlatten) {
			return flat.concat(
				Array.isArray(toFlatten) && depth > 1 ? toFlatten.flat(depth - 1) : toFlatten
			);
		}, []);
	},
	configurable: true,
	writable: true,
});

export function format_ind_to_key(ind, type) {
	let key;
	if (ind < 10) {
		key = `${type}_00${ind}`;
	} else if (ind >= 10 && ind < 100) {
		key = `${type}_0${ind}`;
	} else {
		key = `${type}_${ind}`;
	}
	return key;
};

export function get_task_trials_timeline_with_interblock_text(
	single_trial_order,
	blocks,
	interblock_text_trial = null,
	task_data,
	pt_or_test_timeline
) {
	const trials_timeline = [];
	for (let block_ind = 0; block_ind < blocks; block_ind++) {
		const curr_block_timeline = {
			timeline: single_trial_order,
			timeline_variables: Object.values(
				task_data[format_ind_to_key(block_ind, 'block')]
			),
		};
		trials_timeline.push(curr_block_timeline);
		if (block_ind + 1 !== blocks && interblock_text_trial !== null) {
			trials_timeline.push({
				timeline: [interblock_text_trial],
				timeline_variables: [
					{
						curr_block_ind: block_ind + 1,
						pavlovia_save_checkpoint: `main ${pt_or_test_timeline} trials -- finished block ${block_ind}`,
					},
				],
			});
		}
	}
	return { timeline: trials_timeline };
};

export function expandArray(arr, times) {
	return arr.map((x) => Array(times).fill(x)).flat();
}

export function range(start, stop, step) {
	return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
}

export function construct_full_media_path(basepath, relative_path) {
	return `${basepath.replace(/\/?$/, '/')}${relative_path}`;
}
