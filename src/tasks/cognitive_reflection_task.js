import surveyMultiChoice from '@jspsych/plugin-survey-multi-choice';
import { deepMerge } from '../utils/helpers.js';

export default class Cognitive_Reflection {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 5;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [];
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.define_trials();
	}

	get_default_settings() {
		return {
			crt_items: this.get_crt_items(),
			ignore_validation: false,
			test_trial_time_limit: 280,
		};
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		self.test_trial = {
			type: surveyMultiChoice,
			preamble:
				'<b>Instructions</b>: You will see on this page several items that vary in difficulty. Answer to the best of your ability.<hr>',
			questions: function () {
				return self.settings.crt_items.map((d) => {
					return {
						name: d.id,
						prompt: d.prompt,
						options: d.options,
						horizontal: true,
						required: !self.settings.ignore_validation,
					};
				});
			},
			on_load: function () {},
			timer: self.settings.test_trial_time_limit,
			css_classes: ['content-size'],
			on_finish: function (data) {
				data.trial_name = 'cognitive_reflection_test_trial';
				for (const [k, v] of Object.entries(data.response)) {
					data[k] = v === undefined ? '' : v;
				}
			}, //,
			// simulation_options: 'cognitive_reflection_test_trial'
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		if (hide_progress_bar_trial_generator) {
			timeline.push(hide_progress_bar_trial_generator);
		}
		timeline.push(this.test_trial);
		return timeline;
	}

	get_crt_items() {
		return [
			{
				id: 'crt_1',
				prompt: '<b>Q1</b>. A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?',
				options: ['5 cents', '10 cents', '9 cents', '1 cent'],
			},
			{
				id: 'crt_2',
				prompt: '<b>Q2</b>. If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
				options: ['5 minutes', '100 minutes', '20 minutes', '500 minutes'],
			},
			{
				id: 'crt_3',
				prompt: '<b>Q3</b>. In a lake, there is a patch of lily pads. Every day, the patch doubles in size. If it takes 48 days for the patch to cover the entire lake, how long would it take for the patch to cover half of the lake?',
				options: ['47 days', '24 days', '12 days', '36 days'],
			},
			{
				id: 'crt_4',
				prompt: '<b>Q4</b>. If John can drink one barrel of water in 6 days, and Mary can drink one barrel of water in 12 days, how long would it take them to drink one barrel of water together?',
				options: ['4 days', '9 days', '12 days', '3 days'],
			},
			{
				id: 'crt_5',
				prompt: '<b>Q5</b>. Jerry received both the 15th highest and the 15th lowest mark in the class. How many students are in the class?',
				options: ['29 students', '30 students', '1 student', '15 students'],
			},
			{
				id: 'crt_6',
				prompt: '<b>Q6</b>. A man buys a pig for $60, sells it for $70, buys it back for $80, and sells it finally for $90. How much has he made?',
				options: ['20 dollars', '10 dollars', '0 dollars', '30 dollars'],
			},
			{
				id: 'crt_7',
				prompt: '<b>Q7</b>. Simon decided to invest $8,000 in the stock market one day early in 2008. Six months after he invested, on July 17, the stocks he had purchased were down 50%. Fortunately for Simon, from July 17 to October 17, the stocks he had purchased went up 75%. At this point, Simon:',
				options: [
					'has lost money.',
					'is ahead of where he began.',
					'has broken even in the stock market.',
					'it cannot be determined.',
				],
			},
		];
	}
}
