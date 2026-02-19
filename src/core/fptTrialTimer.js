import { IDS } from './FPTBattery.js';

export class fptTrialTimer {
	constructor() {
		this.selectors = {
			container: `#${IDS.timerContainer}`,
			value: `#${IDS.timerValue}`,
		};
	}

	formatTimeForDisplay(time_in_s) {
		let minutes = Math.floor(time_in_s / 60);
		let seconds = time_in_s % 60;
		if (seconds < 10) {
			seconds = `0${seconds}`;
		}
		return `${minutes}:${seconds}`;
	}

	parseTimeFromDisplay(html) {
		let minutes = parseInt(html.split(':')[0]);
		let seconds = parseInt(html.split(':')[1]);
		return minutes * 60 + seconds;
	}

	disableRequired(trial_name) {
		if (['survey-html-form', 'survey-multi-choice'].includes(trial_name)) {
			document.querySelectorAll('input').forEach((e) => {
				e.required = false;
			});
		}
	}

	getSubmitBtn(trial_name) {
		let selector = "input[type='submit']";
		if (trial_name === 'html-slider-response') {
			selector = '#jspsych-html-slider-response-next';
		} else if (trial_name === 'survey-multi-select') {
			selector = '#jspsych-survey-multi-select-next';
		}
		return document.querySelector(selector);
	}

	start(jsPsych, trial) {
		const current_trial = trial || jsPsych.getCurrentTrial();
		const container = document.querySelector(this.selectors.container);
		const timer_el = document.querySelector(this.selectors.value);

		if (!container || !timer_el) {
			console.warn('[FPT fptTrialTimer] Timer elements not found');
			return null;
		}

		container.style.visibility = 'visible';
		timer_el.innerHTML = this.formatTimeForDisplay(current_trial.timer);

		const increment_ms = 1000;
		const interval_id = setInterval(() => {
			let curr_time_remaining_s = this.parseTimeFromDisplay(timer_el.innerHTML);
			timer_el.innerHTML = this.formatTimeForDisplay(
				curr_time_remaining_s - increment_ms / 1000
			);

			if (curr_time_remaining_s < 1) {
				current_trial.data.fpt_custom_timer_ended_trial = true;
				clearInterval(interval_id);

				const special_trial_names = [
					'survey-html-form',
					'survey-multi-choice',
					'html-slider-response',
					'survey-multi-select',
					'survey-text',
				];

				let trial_name = current_trial.type.info.name;
				this.disableRequired(trial_name);

				if (special_trial_names.includes(trial_name)) {
					let submit_btn = this.getSubmitBtn(trial_name);
					if (submit_btn) {
						submit_btn.disabled = false;
						jsPsych.pluginAPI.clickTarget(submit_btn);
					}
				} else {
					jsPsych.pluginAPI.cancelAllKeyboardResponses();
					if (['html-button-response', 'html-keyboard-response'].includes(trial_name)) {
						jsPsych.finishTrial({ stimulus: current_trial.stimulus });
					} else {
						jsPsych.finishTrial();
					}
				}
			}
		}, increment_ms);

		return interval_id;
	}

	end(interval_id) {
		const container = document.querySelector(this.selectors.container);
		if (container) {
			container.style.visibility = 'hidden';
		}
		clearInterval(interval_id);
	}
}
