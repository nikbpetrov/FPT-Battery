import instructions from '@jspsych/plugin-instructions';
import surveyText from '@jspsych/plugin-survey-text';
import { deepMerge, format_ind_to_key, get_task_trials_timeline_with_interblock_text } from '../utils/helpers.js';

export default class Number_Series {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 4;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [];
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.task_data = this.get_task_data();
		this.define_trials();
	}

	get_default_settings() {
		let settings = {};
		settings.ns_items = this.get_ns_items();
		settings.ignore_validation = false;
		settings.general_instructions_time_limit = 120;
		settings.test_trial_time_limit = 30;
		return settings;
	}

	get_task_data() {
		const task_data = { pt_trials: {}, test_trials: {} };

		// ------------------------TEST TRIALS DATA
		for (
			let test_trial_ind = 0;
			test_trial_ind < this.settings.ns_items.length;
			test_trial_ind++
		) {
			const test_block_ind = 0;
			const test_block_key = format_ind_to_key(
				test_block_ind,
				'block'
			);
			let test_trial_key = format_ind_to_key(
				test_trial_ind,
				'trial'
			);

			if (!task_data['test_trials'][test_block_key]) {
				task_data['test_trials'][test_block_key] = {};
			}
			task_data['test_trials'][test_block_key][test_trial_key] = {
				pt_trial: false,
				block: test_block_ind,
				trial: test_trial_ind,
				id: this.settings.ns_items[test_trial_ind].id,
				prompt: this.settings.ns_items[test_trial_ind].prompt,
				simulation_range: this.settings.ns_items[test_trial_ind].simulation_range,
			};
		}
		return task_data;
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		self.general_instructions = {
			type: instructions,
			pages: [
				`<p class="instructions-title" style="text-align: center">Number series task</p>
                    <p>In this section, you will be presented with nine sequences of numbers. Your task is to find the number that should go in the blank to complete each sequence.</p>
                    <p>For example, consider the following series: 2, 4, 3, 9, 4, ____. For this series, the correct answer is 16, because the series presents a sequence of consecutive numbers (2, 3, 4), each of which is followed by the same number squared: 2 squared is 4, 3 squared is 9, and 4 squared is 16. This is just one example: The number sequences presented to you will involve various patterns or rules.</p>
                    <p>Note: Only the kinds of characters presented in the series (e.g., numbers, slashes, minus signs) may be typed in the text boxes.</p>
                    `,
			],
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'number_series_instructions';
			},
		};

		self.test_trial = {
			type: surveyText,
			preamble: `<p id="error_text" style="color: red; font-style: italic; visibility: hidden;">Please enter a valid number</p>`,
			questions: function () {
				return [
					{
						name: self.jsPsych.timelineVariable('id'),
						prompt: self.jsPsych.timelineVariable('prompt'),
						required: false,
						placeholder: "What's the missing number?",
					},
				];
			},
			on_load: function () {
				if (
					!self.settings.ignore_validation &&
					!self.settings.simulate
				) {
					let error_text = document.getElementById('error_text');
					let continue_button = document.getElementById('jspsych-survey-text-next');
					let numbers_input = document.getElementById('input-0');

					const regex = self.jsPsych.timelineVariable('prompt').includes('/')
						? /^-?\d+\/-?\d+$/
						: /^-?\d+$/;
					continue_button.disabled = true;
					numbers_input.addEventListener('input', function (e) {
						if (regex.test(e.target.value) || e.target.value == '') {
							error_text.style['visibility'] = 'hidden';
							continue_button.disabled = false;
						} else {
							error_text.style['visibility'] = 'visible';
							continue_button.disabled = true;
						}
					});
				}
			},
			css_classes: ['content-size'],
			timer: self.settings.test_trial_time_limit,
			on_finish: function (data) {
				data.trial_name = 'number_series_test_trial';
				data.ns_id = self.jsPsych.timelineVariable('id');
				data.ns_response = data.response ? parseInt(data.response[data.ns_id]) : undefined;
			},
			simulation_options: function () {
				let data = {
					response: {},
					rt: self.settings.simulate_trial_duration,
				};
				let simulation_range = self.jsPsych.timelineVariable('simulation_range');
				data.response[self.jsPsych.timelineVariable('id')] =
					`${self.jsPsych.randomization.randomInt(simulation_range[0], simulation_range[1])}`;
				return { data: data };
			},
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		const test_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial],
				1,
				null,
				this.task_data.test_trials,
				'test'
			);
		timeline.push(this.general_instructions);
		if (hide_progress_bar_trial_generator) {
			timeline.push(hide_progress_bar_trial_generator);
		}
		timeline.push(test_trials_timeline);
		return timeline;
	}

	get_ns_items() {
		return [
			{
				id: 'NS_1',
				prompt: '10, 4, ____, -8, -14, -20',
				simulation_range: [-20, 10],
			},
			{
				id: 'NS_2',
				prompt: '3, 6, 10, 15, 21, ____',
				simulation_range: [0, 25],
			},
			{
				id: 'NS_3',
				prompt: '121, 100, 81, ____, 49',
				simulation_range: [49, 121],
			},
			{
				id: 'NS_4',
				prompt: '3, 10, 16, 23, ____, 36',
				simulation_range: [3, 36],
			},
			{
				id: 'NS_5',
				prompt: '3/21, ____, 13/11, 18/6, 23/1, 28/-4',
				simulation_range: [-1, 20],
			},
			{
				id: 'NS_6',
				prompt: '200, 198, 192, 174, ____',
				simulation_range: [150, 250],
			},
			{
				id: 'NS_7',
				prompt: '3, 2, 10, 4, 19, 6, 30, 8, ____',
				simulation_range: [0, 40],
			},
			{
				id: 'NS_8',
				prompt: '10000, 9000, ____, 8890, 8889',
				simulation_range: [8000, 10000],
			},
			{
				id: 'NS_9',
				prompt: '3/4, 4/6, 6/8, 8/12, ____',
				simulation_range: [0, 10],
			},
		]
	}
}
