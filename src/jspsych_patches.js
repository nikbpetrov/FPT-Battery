/**
 * Patches for jsPsych – custom preloadImages and preloadVideo from static/jspsych/7.0.
 * Apply after initJsPsych() to override the default implementations.
 *
 * These overrides support both local and remote media paths:
 * - Local: relative paths (e.g. ./img/instructions/example.png) or same-origin URLs
 * - Remote: absolute URLs (e.g. https://fpt-assets.example.com/instructions/example.png)
 * The browser's Image and XMLHttpRequest APIs handle both; remote URLs require CORS if cross-origin.
 */

function unique(arr) {
	return [...new Set(arr.flat())];
}

/**
 * Custom preloadImages – returns array of Promises (official returns void).
 */
function patchedPreloadImages(
	images,
	callback_complete = () => {},
	callback_load = () => {},
	callback_error = () => {}
) {
	images = unique(images.flat());
	const that = this;
	let n_loaded = 0;
	const finishfn = typeof callback_complete === 'undefined' ? () => {} : callback_complete;
	const loadfn = typeof callback_load === 'undefined' ? () => {} : callback_load;
	const errorfn = typeof callback_error === 'undefined' ? () => {} : callback_error;

	if (images.length === 0) {
		finishfn();
		return [];
	}

	function preload_image(source) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = function () {
				n_loaded++;
				loadfn(img.src);
				resolve(img.src);
				if (n_loaded === images.length) {
					finishfn();
				}
			};
			img.onerror = function (e) {
				errorfn({ source: img.src, error: e });
				reject(img.src);
			};
			img.src = source;
			that.img_cache[source] = img;
			that.preload_requests.push(img);
		});
	}

	return images.map(preload_image);
}

/**
 * Custom preloadVideo – returns array of Promises (official returns void).
 */
function patchedPreloadVideo(
	videos,
	callback_complete = () => {},
	callback_load = () => {},
	callback_error = () => {}
) {
	videos = unique(videos.flat());
	const that = this;
	let n_loaded = 0;
	const finishfn = typeof callback_complete === 'undefined' ? () => {} : callback_complete;
	const loadfn = typeof callback_load === 'undefined' ? () => {} : callback_load;
	const errorfn = typeof callback_error === 'undefined' ? () => {} : callback_error;

	if (videos.length === 0) {
		finishfn();
		return [];
	}

	function preload_video(src) {
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.open('GET', src, true);
			req.responseType = 'blob';
			req.onload = () => {
				if (req.status === 200 || req.status === 0) {
					const blob = req.response;
					that.video_buffers[src] = URL.createObjectURL(blob);
					n_loaded++;
					loadfn(src);
					resolve(src);
					if (n_loaded === videos.length) {
						finishfn();
					}
				} else {
					const err = req.status === 404 ? '404' : req.statusText;
					errorfn({ source: src, error: err });
					reject(src);
				}
			};
			req.onerror = (e) => {
				errorfn({ source: src, error: e });
				reject(src);
			};
			req.send();
			that.preload_requests.push(req);
		});
	}

	return videos.map(preload_video);
}

/**
 * Apply custom patches to jsPsych instance.
 * Call after initJsPsych().
 */
export function applyJsPsychPatches(jsPsych) {
	const api = jsPsych.pluginAPI;
	api.preloadImages = patchedPreloadImages.bind(api);
	api.preloadVideo = patchedPreloadVideo.bind(api);
}
