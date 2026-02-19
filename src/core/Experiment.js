import browserCheck from '@jspsych/plugin-browser-check';
import callFunction from '@jspsych/plugin-call-function';
import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import htmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import instructions from '@jspsych/plugin-instructions';
import { deepMerge } from '../utils/helpers.js';

export class Experiment {
	constructor(on_save_data_func, jsPsych, custom_settings, custom_session, progressBar = null) {
		this.jsPsych = jsPsych;
		this.on_save_data_func = on_save_data_func;

		this.settings = deepMerge(this.get_default_settings(), custom_settings);

		this.session = {
			...custom_session,
			current_progress: {
				data_checkpoint_ind: custom_session.saved_progress.last_data_checkpoint_ind,
				time_elapsed_at_last_data_save: 0,
				time_elapsed_at_last_session_restart_info_save: 0,
				trials_completed_since_data_checkpoint_ind: 0,
				ms_since_data_checkpoint_ind: 0,
			},
		}

		this.trial_generators = this.get_trial_generators();
		this.progressBar = progressBar;
	}


	preload_media(media) {
		let media_promises = [];
		for (let m of media) {
			if (m.endsWith('.mp4') || m.endsWith('.webm') || m.endsWith('.mkv')) {
				media_promises.push(...this.jsPsych.pluginAPI.preloadVideo([m]));
			} else {
				media_promises.push(...this.jsPsych.pluginAPI.preloadImages([m]));
			}
		}
		return media_promises;
	}	
}
