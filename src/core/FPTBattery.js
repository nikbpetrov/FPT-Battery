import browserCheck from '@jspsych/plugin-browser-check';
import callFunction from '@jspsych/plugin-call-function';
import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import htmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import instructions from '@jspsych/plugin-instructions';
import { initJsPsych } from 'jspsych';
import { applyJsPsychPatches } from '../jspsych_patches.js';
import { TASK_REGISTRY } from '../tasks/index.js';
import { deepMerge } from '../utils/helpers.js';
import { DataSaver } from './DataSaver.js';
import { fptProgressBar } from './fptProgressBar.js';
import { fptTrialTimer } from './fptTrialTimer.js';
// import { get_simulation_options } from '../utils/simulation.js';


let last_trial_index_inactivity_counter_triggered = 0;

export const IDS = {
	pointsCounterContainer: 'points_counter_container',
	pointsCounterValue: 'points_counter_value',
	timerContainer: 'global-instructions-timer-container',
	timerValue: 'global-timer-value',
	jspsychTarget: 'jspsych-target',
	progressContainer: 'progress-container',
	progressWrapper: 'progress-bar-wrapper',
	progressBar: 'progress-bar',
	progressLabel: 'progress-label',
	progressText: 'progress-text',
};

export class FPTBattery {
	constructor(userSettings) {
		// --- Set and Validate config
		this.settings = deepMerge(this.get_default_settings(), userSettings);
		this.session = {
			...this.settings.session,
			current_progress: {
				data_checkpoint_ind: this.settings.session.saved_progress.last_data_checkpoint_ind,
				time_elapsed_at_last_data_save: 0,
				time_elapsed_at_last_session_restart_info_save: 0,
				trials_completed_since_data_checkpoint_ind: 0,
				ms_since_data_checkpoint_ind: 0,
			},
		}
		// TODO: Switch to z probably
		this.validate_settings();

		// --- Custom FPT plugins 
		if (!this.settings.progressbar?.disable) {
			this.progressBar = new fptProgressBar();
		}
		this.trialTimer = new fptTrialTimer();
		this.dataSaver = new DataSaver(this.settings.data_saving);

		// --- init jsPsych
		// display element override
		if ('display_element' in this.settings.jsPsychOptions) {
			console.warning('display_element in jsPsychOptions will be overridden by FPTBattery');
		}
		this.settings.jsPsychOptions.display_element = IDS.jspsychTarget;

		// user-provided on_trial_start/on_trial_finish merged with our own
		const userOnTrialStart = this.settings.jsPsychOptions.on_trial_start;
		const userOnTrialFinish = this.settings.jsPsychOptions.on_trial_finish;

		this.settings.jsPsychOptions.on_trial_start = (trial) => {
			this.handleTrialStart(trial);
			userOnTrialStart?.(trial);
		};
		this.settings.jsPsychOptions.on_trial_finish = (data) => {
			this.handleTrialFinish(data);
			userOnTrialFinish?.(data);
		};
		
		// init and apply patches
		this.jsPsych = initJsPsych(this.settings.jsPsychOptions);
		applyJsPsychPatches(this.jsPsych);

		this.trial_generators = this.get_trial_generators();
	}

	get_default_settings() {
		return {
			root_element_id: null,
			jsPsychOptions: {},
			session: {
				saved_progress: {
					data_checkpoints: [],
					last_data_checkpoint_ind: 0,
				},
			},
			tasks: [],
			data_saving: {
				disable_chunking: false,
				maxChunkSize: 1000000,
				onSaveData: null,
				onError: null,
			},
			progressbar: {
				disable: true,
			},
			show_inactivity_warning: true,
			ask_for_task_feedback: false,
			media_basepath: 'https://fpt.quorumapp.com/static/fpt/img/',
			minutes_between_task_breaks: null,
			skip_intro_trials: false,
			custom_debrief_message_html: null,
			custom_debrief_btn_txt: 'Exit experiment',
			// simulate: false,
			// simulate_trial_duration: 25,
			// get_simulation_options_func: get_simulation_options,
			// callbacks: {},
		};
	}

	validate_settings() {
		if (!this.settings.tasks || this.settings.tasks.length === 0) {
			throw new Error('FPTBattery: No tasks configured');
		}
	
		const root = this.settings.root_element_id;
		if (!root) {
			throw new Error(
				'FPTBattery: root_element_id is required (query selector string or HTMLElement, e.g. "#fpt-root")'
			);
		}
	}

	setup_dom() {
		const root = document.querySelector(`#${this.settings.root_element_id}`);
		if (!root) {
			throw new Error(
				`FPTBattery: Cannot find root element with id "${this.settings.root_element_id}"`
			);
		}
	
		if (!this.settings.progressbar.disable) {
			const progressContainer = document.createElement('div');
			progressContainer.id = IDS.progressContainer;
			progressContainer.style.visibility = 'visible';
			progressContainer.innerHTML = `
				<div id="${IDS.progressWrapper}">
					<div id="${IDS.progressBar}"></div>
				</div>
				<div id="${IDS.progressLabel}">PROGRESS</div>
				<div id="${IDS.progressText}">0%</div>
			`;
			root.appendChild(progressContainer);
		}
	
		// will always add it as it defaults to display: none but this sucks
		const pointsCounter = document.createElement('div');
		pointsCounter.id = IDS.pointsCounterContainer;
		pointsCounter.innerHTML = "&#128176; "
		const pointsValue = document.createElement('div');
		pointsValue.id = IDS.pointsCounterValue;
		pointsValue.textContent = '0';
		pointsCounter.appendChild(pointsValue);
		root.appendChild(pointsCounter);
	
		const timerContainer = document.createElement('div');
		timerContainer.id = IDS.timerContainer;
		timerContainer.innerHTML = `<p>&#8987;<span id="${IDS.timerValue}"></span></p>`;
		root.appendChild(timerContainer);
	
		const jspsychTarget = document.createElement('div');
		jspsychTarget.id = IDS.jspsychTarget;
		root.appendChild(jspsychTarget);
	}

	build_timeline() {
		this.timeline = [];

		// --- Load all active tasks
		// we also load the completed ones, but just so we can update the progress bar
		let active_task_instances = [];
		for (const [task_order_index, taskConfig] of this.settings.tasks.entries()) {
			const task_name = taskConfig.task_name;
			const custom_task_settings = taskConfig.custom_task_settings || {};
			if (task_name === 'forecasting_questions') {
				custom_task_settings.task_order_index = task_order_index;
				custom_task_settings.completed_checkpoints = this.session.saved_progress.data_checkpoints;
			}

			const TaskClass = TASK_REGISTRY[task_name];
			if (!TaskClass) {
				console.warn(`Task "${task_name}" not found in registry - skipping.`);
				continue;
			}
	
			try {
				const instance = new TaskClass(
					task_name,
					this.settings.media_basepath,
					this.jsPsych,
					custom_task_settings
				);

				const isCompleted = this.session.saved_progress.data_checkpoints.includes(
					`task_${task_order_index}_${instance.name}__completed`
				);
				if (isCompleted) {
					this.progressBar?.update(instance.duration_mins, false);
				} else {
					active_task_instances.push({ task_order_index, instance });
				}
				// update progress bar total duration in all cases
				if (this.progressBar) {
					this.progressBar.progress.total_duration_mins += instance.duration_mins;
				}
			} catch (error) {
				console.error(`Error loading task "${task_name}":`, error);
			}
		}

		
		// --- Build the timeline
		// should be already sorted but just in case
		active_task_instances.sort((a, b) => a.task_order_index - b.task_order_index);
		// queue all active tasks' media for preloading
		this.timeline.push(this.trial_generators.media_preloading(active_task_instances.map(t => t.instance)));

		// save session params
		if (
			!this.session.saved_progress.data_checkpoints.includes(
				'experiment__save_session_params'
			)
		) {
			this.timeline.push(this.trial_generators.save_session_parameters(active_task_instances));
			this.timeline.push(this.trial_generators.async_data_save('experiment__save_session_params'));
		}

		// Welcome/Intro trials
		if (!this.session.saved_progress.data_checkpoints.includes('experiment__welcome')) {
			if (!this.settings.skip_intro_trials) {
				this.timeline.push(this.trial_generators.browser_check(active_task_instances.map(t => t.instance)));
				this.timeline.push(this.trial_generators.welcome(!this.settings.progressbar.disable));
				if (!this.settings.progressbar.disable) {
					this.timeline.push(this.trial_generators.update_progress_bar(2));
				}
			}
			this.timeline.push(this.trial_generators.async_data_save('experiment__welcome'));
			
		} else {
			if (!this.settings.skip_intro_trials) {
				this.timeline.push(this.trial_generators.browser_check(active_task_instances.map(t => t.instance)));
			}
		}
		// increment the progress bar's total duration based on whether skip intro trials were meant to be included
		// regardless of whether they were completed now or on the previous session
		if (!this.settings.skip_intro_trials && this.progressBar) {
			this.progressBar.progress.total_duration_mins += 2;
		}

		// Build active tasks' timelines and add to main timeline
		// const max_task_order_index = Math.max(...active_task_instances.map(t => t.task_order_index));
		for (const { task_order_index, instance } of active_task_instances) {
			let task_class_name
			if (['admc_decision_rules', 'admc_framing', 'admc_risk_perception'].includes(instance.name)) {
				task_class_name = 'admc';
			} else {
				task_class_name = instance.name;
			}
			this.timeline.push(this.trial_generators.set_task_class(task_class_name));

			this.timeline.push(this.trial_generators.wait_for_media_load(instance));

			// could pass hooks here if needed so users can modify trials etc
			// re hide progress bar: maybe move to hooks?!
			// re async data save: forecasting Qs need it;
			// could be nice to pass all trial generators but many of them depend on task order index etc
			const task_timeline = instance.get_timeline(this.trial_generators.hide_progress_bar(), this.trial_generators.async_data_save);
			this.timeline.push( { timeline: task_timeline });

			if (this.settings.ask_for_task_feedback) {
				this.timeline.push(this.trial_generators.get_task_feedback(instance.name));
			}

			this.timeline.push(this.trial_generators.remove_task_class());

			this.timeline.push(this.trial_generators.async_data_save(`task_${task_order_index}_${instance.name}__completed`));

			this.timeline.push(this.trial_generators.update_progress_bar(instance.duration_mins));

			if (task_order_index !== Math.max(...active_task_instances.map(t => t.task_order_index))) {
				this.timeline.push(this.trial_generators.break_between_tasks());
			}
		}

		this.timeline.push(this.trial_generators.hide_progress_bar());
		this.timeline.push(this.trial_generators.async_data_save('experiment__completed'));
		// this.timeline.push(this.trial_generators.wait_for_data_save());
		this.timeline.push(this.trial_generators.debrief())


	}
	
	handleTrialStart(trial) {
		const last_trials_data = this.jsPsych.data
			.get()
			.filterCustom((t) => t.trial_index > last_trial_index_inactivity_counter_triggered)
			.last(5)
			.values();
	
		const n_last_trials_timer_ended_trial = last_trials_data.filter(
			(e) => 'fpt_custom_timer_ended_trial' in e && e['fpt_custom_timer_ended_trial']
		).length;
	
		if (n_last_trials_timer_ended_trial >= 5) {
			last_trial_index_inactivity_counter_triggered =
				last_trials_data[last_trials_data.length - 1].trial_index;
			if (this.settings.show_inactivity_warning) {
				alert(
					"You have been inactive for some time so the experiment was paused.\n\nPlease click OK when you're ready to continue."
				);
			}
		}
	
		if (trial.timer && Number.isInteger(trial.timer)) {
			trial.data = trial.data || {};
			trial.data.fpt_custom_timer_ended_trial = false;
			trial.data.fpt_custom_timer_interval_id = this.trialTimer.start(this.jsPsych, trial);
		}
	}
	
	handleTrialFinish(data) {
		if (data.fpt_custom_timer_interval_id) {
			this.trialTimer.end(data.fpt_custom_timer_interval_id);
		}
	
		this.session.current_progress.trials_completed_since_data_checkpoint_ind += 1;
	
		if (data.trial_name === 'async_data_save') {
			this.session.current_progress.trials_completed_since_data_checkpoint_ind = 0;
			this.session.current_progress.time_elapsed_at_last_data_save = data.time_elapsed;
		}
	
		this.session.current_progress.ms_since_data_checkpoint_ind =
			data.time_elapsed - this.session.current_progress.time_elapsed_at_last_data_save;
	
		if (
			data.time_elapsed -
				this.session.current_progress.time_elapsed_at_last_session_restart_info_save >
			5000
		) {
			this.session.current_progress.time_elapsed_at_last_session_restart_info_save =
				data.time_elapsed;
		}
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

	get_trial_generators() {
		let self = this;

		let trial_generators = {};

		trial_generators.media_preloading = function (tasks) {
			return {
				type: callFunction,
				func: () => {
					for (let task of tasks) {
						task.media_promises = self.preload_media(task.media);
					}
				},
			};
		};

		trial_generators.wait_for_media_load = function (task) {
			let trial = {
				type: htmlKeyboardResponse,
				stimulus: 'Please wait until the next task loads...',
				choices: 'NO_KEYS',
				on_load: function () {
					function end_trial() {
						clearTimeout(timeout_id);
						let trial_end = new Date();
						let seconds_since_trial_start =
							(trial_end.getTime() - trial_start.getTime()) / 1000;
						if (seconds_since_trial_start < 2) {
							self.jsPsych.finishTrial();
						} else {
							document.getElementById(
								'jspsych-html-keyboard-response-stimulus'
							).innerHTML = 'Starting in 2 seconds...';
							self.jsPsych.pluginAPI.setTimeout(function () {
								self.jsPsych.finishTrial();
							}, 2000);
						}
					}

					let trial_start = new Date();
					let timeout_id = setTimeout(function () {
						document.getElementById(
							'jspsych-html-keyboard-response-stimulus'
						).innerHTML =
							'<p>The task is taking too long to load...</p><p>Try refreshing the page by using Ctrl + F5 on Windows or Cmd + F5 on Mac. Alternatively, you can try using the same link but in incognito/private mode or in a different browser.</p>';
					}, 15000);

					Promise.all(task.media_promises)
						.then(() => {
							end_trial();
						})
						.catch(() => {
							let new_media_promises = self.preload_media(task.media);
							Promise.all(new_media_promises).then(() => {
								end_trial();
							});
						});
				},
			};

			let conditional_timeline = {
				timeline: [trial],
				conditional_function: function () {
					return task.media.length !== 0;
				},
			};
			return conditional_timeline;
		};

		trial_generators.save_session_parameters = function (task_instances) {
			return {
				type: callFunction,
				func: function () {},
				on_finish: function (data) {
					data.trial_name = 'session_parameters';
					data.experiment_parameters = self.settings;
					for (let [task_order_index, task_instance] of task_instances.entries()) {
						data[`task_${task_order_index}_${task_instance.name}`] = task_instance.settings;
					}
				},
			};
		};

		trial_generators.set_task_class = function (taskClassName) {
			return {
				type: callFunction,
				func: () => {
					const target = document.querySelector(`#${IDS.jspsychTarget}`);
					if (target) {
						target.className = target.className
							.split(' ')
							.filter((c) => !c.startsWith('fpt--'))
							.join(' ');
						target.classList.add(`fpt--${taskClassName}`);
					}
				},
			};
		};

		trial_generators.remove_task_class = function () {
			return {
				type: callFunction,
				func: () => {
					const target = document.querySelector(`#${self.settings.display_element}`);
					if (target) {
						target.className = target.className
							.split(' ')
							.filter((c) => !c.startsWith('fpt--'))
							.join(' ');
					}
				},
			};
		};

		trial_generators.welcome = function () {
			return {
				type: instructions,
				pages: function () {
					let html = [
						`<p class="instructions-title" style="text-align: center">Welcome to the study!</p>`,
					];
					if (
						Number.isInteger(self.settings.minutes_between_task_breaks) &&
						self.settings.minutes_between_task_breaks > 0
					) {
						html[0] += `<p>Every <b>${self.settings.minutes_between_task_breaks}</b> minutes or so, as you move from one task to the next, you will have the option to take a <b>break</b>. This break won't be timed and you can take as much time as you want. You will NOT be compensated for that time.</p>`;
					}
					if (!self.settings.progressbar?.disable) {
						html[0] += `<p>Every time a new tasks starts, you will see a <b>progress bar</b> on the left that indicates how far you've got.</p>`;
					}
					html[0] += `<p style="text-align: center; font-weight: bold;">Let's get started!</p>`;
					return html;
				},
				allow_backward: false,
				show_clickable_nav: true,
				css_classes: ['instructions_width', 'instructions_left_align'],
				simulate: false,
			};
		};

		trial_generators.browser_check = function (tasks) {
			let min_width = 840;
			let min_height = 500;
			let mobile_allowed = true;
			for (let task of tasks) {
				min_width = Math.min(task.browser_requirements.min_width, min_width);
				min_height = Math.min(task.browser_requirements.min_height, min_height);
				if (!task.browser_requirements.mobile_allowed) {
					mobile_allowed = false;
				}
			}
			return {
				type: browserCheck,
				minimum_width: min_width,
				minimum_height: min_height,
				allow_window_resize: true,
				css_classes: ['instructions_width'],
				inclusion_function: (data) => {
					if (!mobile_allowed) {
						return data.mobile === false;
					}
				},
				exclusion_message: (data) => {
					self.dataSaver.save('browser_exclusion', -1, [
						data,
						{
							minimum_width: min_width,
							minimum_height: min_height,
							mobile_allowed: mobile_allowed,
						},
					]);

					let exclusion_message =
						'<p>Your browser did not meet the necessary checks to continue with this experiment.</p>';

					if (!mobile_allowed) {
						if (data.mobile) {
							exclusion_message =
								'<p>You must use a desktop/laptop computer to participate in this experiment.</p>';
						}
					}

					return exclusion_message;
				},
				on_finish: function (data) {
					data.trial_name = 'browser_check';
				},
			};
		};

		trial_generators.break_between_tasks = function () {
			let break_trial = {
				type: instructions,
				pages: function () {
					return [
						`<p class="instructions-title" style="text-align: center">TIME FOR A BREAK</p>
            <p>You can take a break now and come back to the survey anytime to do the next tasks.</p>
            <p>Whenever you are ready to continue, just press the "Continue" button below.</p>`,
					];
				},
				button_label_next: 'Continue',
				css_classes: ['instructions_width', 'instructions_left_align'],
				allow_backward: false,
				show_clickable_nav: true,
				on_finish: function (data) {
					data.trial_name = 'break_trial';
				},
			};
			let break_timeline = {
				timeline: [break_trial],
				conditional_function: function () {
					if (!Number.isInteger(self.settings.minutes_between_task_breaks)) {
						return false;
					}
					const ms_between_breaks = self.settings.minutes_between_task_breaks * 60 * 1000;
					let last_break_trial = self.jsPsych.data
						.get()
						.filter({ trial_name: 'break_trial' })
						.last(1)
						.values();
					let last_trial = self.jsPsych.data.get().last(1).values()[0];
					if (last_break_trial.length == 0) {
						return last_trial.time_elapsed > ms_between_breaks;
					} else {
						return (
							last_trial.time_elapsed - last_break_trial[0].time_elapsed >
							ms_between_breaks
						);
					}
				},
			};
			return break_timeline;
		};

		trial_generators.get_task_feedback = function (task_name) {
			return {
				type: htmlButtonResponse,
				stimulus: `
          <p class="instructions-title">Feedback?</p>
          <p>If something went wrong during the last task or you think we can improve it, please leave any and all comments you have here.</p>
          <div style="margin-bottom: 3vh">
            <textarea id="task_feedback" style="width: 50vw; height: 15vh;"></textarea>
          </div>
        `,
				choices: ['Continue >>'],
				data: { trial_name: `feedback_${task_name}`, response: '' },
				on_load: function () {
					let that = this;
					let text_area = document.querySelector('textarea#task_feedback');
					text_area.addEventListener('input', (event) => {
						that.data.response = event.target.value;
					});
				},
				css_classes: ['content-size'],
			};
		};

		trial_generators.async_data_save = function (data_checkpoint) {
			return {
				type: htmlKeyboardResponse,
				stimulus: '',
				choices: 'NO_KEYS',
				on_load: function () {
					self.jsPsych.finishTrial();
				},
				on_finish: function (data) {
					data.trial_name = 'async_data_save';
					data.data_checkpoint = data_checkpoint;
					data.data_checkpoint_ind =
						self.session.saved_progress.last_data_checkpoint_ind +
						self.jsPsych.data.get().filter({ trial_name: 'async_data_save' }).count() -
						1;
					if (self.session.saved_progress.last_data_checkpoint_ind !== 0) {
						data.data_checkpoint_ind += 1;
					}
					self.session.current_progress.data_checkpoint_ind = data.data_checkpoint_ind;

					const last_async_data_save = self.jsPsych.data
						.get()
						.filter({ trial_name: 'async_data_save' })
						.values();
					let data_to_save;
					if (last_async_data_save.length == 1) {
						data_to_save = self.jsPsych.data.get().values();
					} else {
						const last_async_data_save_trial_index =
							last_async_data_save.slice(-2)[0].trial_index;
						data_to_save = self.jsPsych.data
							.get()
							.filterCustom(function (trial) {
								return trial.trial_index > last_async_data_save_trial_index;
							})
							.values();
					}

					self.dataSaver.save(
						data_checkpoint,
						data.data_checkpoint_ind,
						data_to_save
					);
				},
			};
		};

		// trial_generators.wait_for_data_save = function () {
		// 	return {
		// 		type: htmlKeyboardResponse,
		// 		stimulus:
		// 			"<p>Please wait until your data are saved.</p><p style='font-size: 2em; color: red'>Do NOT close this window!</p><p>The experiment will automatically continue once the data are saved.</p>",
		// 		choices: 'NO_KEYS',
		// 		on_load: function () {
		// 			self.jsPsych.finishTrial();
		// 		},
		// 	};
		// };

		trial_generators.debrief = function () {
			let debrief_html = `<p class="instructions-title">Thank you for completing this study.</p>
        <p><b>Please click on the button below to register your response.</b></p>`;
			let btn_txt = 'Exit experiment';

			if (self.settings.custom_debrief_message_html) {
				debrief_html = self.settings.custom_debrief_message_html;
			}
			if (self.settings.custom_debrief_btn_txt) {
				btn_txt = self.settings.custom_debrief_btn_txt;
			}

			return {
				type: instructions,
				pages: function () {
					let html = debrief_html;

					if (self.settings.callbacks && self.settings.callbacks.onRedirect) {
						html += `<button class="jspsych-btn" id="fpt-debrief-btn" style="font-size: 2em;">${btn_txt}</button>`;
					} else if (self.session.redirect_url) {
						html += `<a target="_self" href="${self.session.redirect_url}"><button class="jspsych-btn" style="font-size: 2em;">${btn_txt}</button></a>`;
					}

					return [html];
				},
				on_load: function () {
					if (self.settings.callbacks && self.settings.callbacks.onRedirect) {
						const btn = document.getElementById('fpt-debrief-btn');
						if (btn) {
							btn.addEventListener('click', () => {
								self.settings.callbacks.onRedirect();
							});
						}
					}
				},
				allow_keys: false,
				show_clickable_nav: false,
				allow_backward: false,
				simulation_options: {
					simulate: false,
				},
				css_classes: ['instructions_width'],
				on_finish: function () {},
			};
		};

		trial_generators.update_progress_bar = function (mins) {
			return {
				type: callFunction,
				func: () => {
					self.progressBar?.update(mins);
				}
			};
		};
	
		trial_generators.hide_progress_bar = function () {
			return {
				type: callFunction,
				func: () => {
					self.progressBar?.hide();
				},
			};
		};

		return trial_generators;
	}

	run() {
		this.setup_dom();
		this.build_timeline();

		// if (this.settings.simulate) {
		// 	const simulation_options = this.settings.get_simulation_options_func(
		// 		this.jsPsych,
		// 		this.settings.simulate_trial_duration
		// 	);
		// 	console.log('simulation options', simulation_options)
		// 	this.jsPsych.simulate(this.timeline, 'visual', simulation_options);
		// } else {
		this.jsPsych.run(this.timeline);
	}
}















export function initFPTBattery(userConfig = {}) {
	const battery = new FPTBattery(userConfig);
	return battery;
}




