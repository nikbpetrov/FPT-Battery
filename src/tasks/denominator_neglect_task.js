import { IDS } from '../core/FPTBattery.js';
import htmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import instructions from '@jspsych/plugin-instructions';
import { deepMerge, construct_full_media_path, format_ind_to_key, expandArray, get_task_trials_timeline_with_interblock_text } from '../utils/helpers.js';

export default class Denominator_Neglect {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 4;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [
			'instructions/DN_VersionA_example_text.png',
			'instructions/DN_VersionA_example_array.png',
			'instructions/DN_VersionA_demo.gif',
			'instructions/DN_VersionB_demo.gif',
		].map((f) => construct_full_media_path(this.media_basepath, f));
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.task_data = this.get_task_data();
		this.define_trials();
	}

	get_default_settings() {
		let settings = {};

		settings.general_instructions_time_limit = 120;
		settings.pt_trials_instructions_time_limit = 60;
		settings.test_trials_instructions_time_limit = 45;
		settings.main_trial_time_limit = 15;

		settings.task_version = 'A';
		settings.trial_choice_types = ['conflict', 'harmony'];
		settings.small_lottery_gold_coin_props = [0.1, 0.2, 0.3];
		settings.large_lottery_gold_coin_prop_range_diff = [
			0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08,
		];
		settings.denominator_display_types = {
			task_version_A: [
				{ small: 'text', large: 'text' },
				{ small: 'array', large: 'array' },
				{ small: 'text', large: 'array' },
				{ small: 'array', large: 'text' },
			],
			task_version_B: [{ small: 'both', large: 'both' }],
		};
		settings.lottery_total_coins = { small: 10, large: 400 };
		settings.trial_time_limit = 5000;
		settings.gold_coins_counter = 0;
		
		settings.pt_trials_n = 8;
		settings.pt_trials_per_block = 8;
		settings.pt_blocks = settings.pt_trials_n / settings.pt_trials_per_block;
		settings.test_trials_n = 48;
		settings.test_trials_per_block = 48;
		settings.test_blocks = settings.test_trials_n / settings.test_trials_per_block;

		return settings;
	}

	get_task_data() {
		// each value for pt_trials and test_trials is an object, whose keys are the trial key (trial_001)
		// and values are objects with key-value pairs representing curr trial variable name-curr trial variable value
		// e.g. {'test_trials':
		//			 {'trial_001': {
		//			 	'pt_trial': true,
		//			 	'block': 0,
		//			 	'trial': 5,
		//			 	'myvar': 'myval'
		//			 }, 'trial_002': {...}}}
		const task_data = { pt_trials: {}, test_trials: {} };

		// ------------------------PRACTICE TRIALS DATA
		let pt_left_lottery_types = this.jsPsych.randomization.shuffle(
expandArray(
				['small', 'large'],
				this.settings.pt_trials_n / 2
			)
		);
		let pt_denominator_display_types = {
			conflict:
				this.settings.task_version === 'A'
					? this.jsPsych.randomization.shuffle(
expandArray(
								this.settings.denominator_display_types.task_version_A,
								this.settings.pt_trials_n / 8
							)
						)
					: expandArray(
							this.settings.denominator_display_types.task_version_B,
							this.settings.pt_trials_n / 2
						),
			harmony:
				this.settings.task_version === 'A'
					? this.jsPsych.randomization.shuffle(
expandArray(
								this.settings.denominator_display_types.task_version_A,
								this.settings.pt_trials_n / 8
							)
						)
					: expandArray(
							this.settings.denominator_display_types.task_version_B,
							this.settings.pt_trials_n / 2
						),
		};
		const pt_choice_types = this.jsPsych.randomization.shuffle(
expandArray(
				['conflict', 'harmony'],
				this.settings.pt_trials_n / 2
			)
		);
		const pt_choice_type_counters = {
			conflict: 0,
			harmony: 0,
		};
		for (let pt_trial_ind = 0; pt_trial_ind < this.settings.pt_trials_n; pt_trial_ind++) {
			const choice_type = pt_choice_types[pt_trial_ind];
			// we first use the last index of the counters to index the denominator_display_types[choice_type] and then the ++ increments it for the next iteration
			const current_denominator_display_types =
				pt_denominator_display_types[choice_type][pt_choice_type_counters[choice_type]++];
			const small_lottery_gold_coin_prop =
				this.jsPsych.randomization.sampleWithoutReplacement(
					this.settings.small_lottery_gold_coin_props,
					1
				)[0];
			const curr_trial_diff = this.jsPsych.randomization.sampleWithoutReplacement(
				this.settings.large_lottery_gold_coin_prop_range_diff,
				1
			)[0];
			const large_lottery_gold_coin_prop =
				choice_type === 'harmony'
					? small_lottery_gold_coin_prop + curr_trial_diff
					: small_lottery_gold_coin_prop - curr_trial_diff;
			const gold_coin_prop = {
				small: small_lottery_gold_coin_prop,
				large: large_lottery_gold_coin_prop,
			};

			const left_lottery_type = pt_left_lottery_types[pt_trial_ind];
			const right_lottery_type = left_lottery_type == 'small' ? 'large' : 'small';
			const left_lottery_gold_prop = gold_coin_prop[left_lottery_type];
			const right_lottery_gold_prop = gold_coin_prop[right_lottery_type];
			const left_lottery_total_coins = this.settings.lottery_total_coins[left_lottery_type];
			const right_lottery_total_coins = this.settings.lottery_total_coins[right_lottery_type];

			const pt_block_ind = Math.floor(pt_trial_ind / this.settings.pt_trials_per_block);
			const pt_block_key = format_ind_to_key(
				pt_block_ind,
				'block'
			);
			let pt_trial_key = format_ind_to_key(
				pt_trial_ind,
				'trial'
			);

			// only create block if it does not exist; see https://stackoverflow.com/q/66564488/13078832
			if (!task_data['pt_trials'][pt_block_key]) {
				task_data['pt_trials'][pt_block_key] = {};
			}
			task_data['pt_trials'][pt_block_key][pt_trial_key] = {
				pt_trial: true,
				block: pt_block_ind,
				trial: pt_trial_ind,
				choice_type: choice_type,
				left_lottery_display_type: current_denominator_display_types[left_lottery_type],
				right_lottery_display_type: current_denominator_display_types[right_lottery_type],
				left_lottery_type: left_lottery_type,
				right_lottery_type: right_lottery_type,
				left_lottery_gold_prop: left_lottery_gold_prop,
				right_lottery_gold_prop: right_lottery_gold_prop,
				left_lottery_total_coins: left_lottery_total_coins,
				right_lottery_total_coins: right_lottery_total_coins,
				left_lottery_gold_coins: Math.round(
					left_lottery_gold_prop * left_lottery_total_coins
				),
				right_lottery_gold_coins: Math.round(
					right_lottery_gold_prop * right_lottery_total_coins
				),
				left_lottery_silver_coins:
					left_lottery_total_coins -
					Math.round(left_lottery_gold_prop * left_lottery_total_coins),
				right_lottery_silver_coins:
					right_lottery_total_coins -
					Math.round(right_lottery_gold_prop * right_lottery_total_coins),
			};
		}

		// ------------------------TEST TRIALS DATA
		let left_lottery_types = this.jsPsych.randomization.shuffle(
expandArray(
				['small', 'large'],
				this.settings.test_trials_n / 2
			)
		);
		let denominator_display_types = {
			conflict:
				this.settings.task_version === 'A'
					? this.jsPsych.randomization.shuffle(
expandArray(
								this.settings.denominator_display_types.task_version_A,
								this.settings.test_trials_n / 8
							)
						)
					: expandArray(
							this.settings.denominator_display_types.task_version_B,
							this.settings.test_trials_n / 2
						),
			harmony:
				this.settings.task_version === 'A'
					? this.jsPsych.randomization.shuffle(
expandArray(
								this.settings.denominator_display_types.task_version_A,
								this.settings.test_trials_n / 8
							)
						)
					: expandArray(
							this.settings.denominator_display_types.task_version_B,
							this.settings.test_trials_n / 2
						),
		};
		let test_trials_data = [];
		for (let choice_type of this.settings.trial_choice_types) {
			for (let small_lottery_gold_coin_prop of this.settings.small_lottery_gold_coin_props) {
				for (let large_lottery_gold_coin_prop_diff of this.settings
					.large_lottery_gold_coin_prop_range_diff) {
					test_trials_data.push({
						trial_choice_type: choice_type,
						gold_coin_prop: {
							small: small_lottery_gold_coin_prop,
							large:
								choice_type === 'harmony'
									? small_lottery_gold_coin_prop +
										large_lottery_gold_coin_prop_diff
									: small_lottery_gold_coin_prop -
										large_lottery_gold_coin_prop_diff,
						},
					});
				}
			}
		}
		for (let s = 0; s < 5; s++) {
			test_trials_data = this.jsPsych.randomization.shuffle(test_trials_data);
		}
		const choice_type_counters = {
			conflict: 0,
			harmony: 0,
		};
		// let left_lottery_gold_prop_arr = []
		// let right_lottery_gold_prop_arr = []
		// let left_lottery_total_coins_arr = []
		// let right_lottery_total_coins_arr = []
		for (
			let test_trial_ind = 0;
			test_trial_ind < this.settings.test_trials_n;
			test_trial_ind++
		) {
			const left_lottery_type = left_lottery_types[test_trial_ind];
			const right_lottery_type = left_lottery_type == 'small' ? 'large' : 'small';

			let left_lottery_gold_prop =
				test_trials_data[test_trial_ind]['gold_coin_prop'][left_lottery_type];
			let right_lottery_gold_prop =
				test_trials_data[test_trial_ind]['gold_coin_prop'][right_lottery_type];
			let left_lottery_total_coins = this.settings.lottery_total_coins[left_lottery_type];
			let right_lottery_total_coins = this.settings.lottery_total_coins[right_lottery_type];
			// left_lottery_gold_prop_arr.push(left_lottery_gold_prop)
			// right_lottery_gold_prop_arr.push(right_lottery_gold_prop)
			// left_lottery_total_coins_arr.push(left_lottery_total_coins)
			// right_lottery_total_coins_arr.push(right_lottery_total_coins)

			// we'll just re-calculate the choice_type properly here
			const choice_type =
				(left_lottery_type == 'small') &
					(left_lottery_gold_prop < right_lottery_gold_prop) ||
				(right_lottery_type == 'small') & (right_lottery_gold_prop < left_lottery_gold_prop)
					? 'harmony'
					: 'conflict';
			// we first use the last index of the counters to index the denominator_display_types[choice_type] and then the ++ increments it for the next iteration
			const current_denominator_display_types =
				denominator_display_types[choice_type][choice_type_counters[choice_type]++];

			const test_block_ind = Math.floor(test_trial_ind / this.settings.test_trials_per_block);
			const test_block_key = format_ind_to_key(
				test_block_ind,
				'block'
			);
			let test_trial_key = format_ind_to_key(
				test_trial_ind,
				'trial'
			);

			// only create block if it does not exist; see https://stackoverflow.com/q/66564488/13078832
			if (!task_data['test_trials'][test_block_key]) {
				task_data['test_trials'][test_block_key] = {};
			}
			task_data['test_trials'][test_block_key][test_trial_key] = {
				pt_trial: false,
				block: test_block_ind,
				trial: test_trial_ind,
				choice_type: choice_type,
				left_lottery_display_type: current_denominator_display_types[left_lottery_type],
				right_lottery_display_type: current_denominator_display_types[right_lottery_type],
				left_lottery_type: left_lottery_type,
				right_lottery_type: right_lottery_type,
				left_lottery_gold_prop: left_lottery_gold_prop,
				right_lottery_gold_prop: right_lottery_gold_prop,
				left_lottery_total_coins: left_lottery_total_coins,
				right_lottery_total_coins: right_lottery_total_coins,
				left_lottery_gold_coins: Math.round(
					left_lottery_gold_prop * left_lottery_total_coins
				),
				right_lottery_gold_coins: Math.round(
					right_lottery_gold_prop * right_lottery_total_coins
				),
				left_lottery_silver_coins:
					left_lottery_total_coins -
					Math.round(left_lottery_gold_prop * left_lottery_total_coins),
				right_lottery_silver_coins:
					right_lottery_total_coins -
					Math.round(right_lottery_gold_prop * right_lottery_total_coins),
			};
		}
		// console.log(`Left lottery types: `, left_lottery_types)
		// console.log(`Denominatory display types: `, denominator_display_types)
		// console.log(`Left lottery gold prop arr: `, left_lottery_gold_prop_arr)
		// console.log(`Right lottery gold prop arr: `, right_lottery_gold_prop_arr)
		// console.log(`Left lottery total coins arr: `, left_lottery_total_coins_arr)
		// console.log(`Right lottery total coins arr: `, right_lottery_total_coins_arr)

		return task_data;
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		function update_reward_points(animate) {
			let accumulated_points_text = document.querySelector(`#${IDS.pointsCounterValue}`);
			if (!accumulated_points_text) return;
			if (animate) {
				let time_to_update_text = 400;
				let ms_per_increment = 10;

				let curr_points_on_screen = parseInt(accumulated_points_text.innerHTML);
				let points_increment_per_ms =
					((self.settings.gold_coins_counter - curr_points_on_screen) /
						time_to_update_text) *
					ms_per_increment;
				let curr_points_tracker = parseInt(accumulated_points_text.innerHTML);

				let interval_id = setInterval(function () {
					curr_points_tracker += points_increment_per_ms;
					if (curr_points_tracker >= self.settings.gold_coins_counter) {
						accumulated_points_text.innerHTML = String(
							self.settings.gold_coins_counter
						);
						clearInterval(interval_id);
					} else {
						if (curr_points_tracker >= curr_points_on_screen) {
							curr_points_on_screen = Math.floor(curr_points_tracker);
							accumulated_points_text.innerHTML = String(curr_points_on_screen);
						}
					}
				}, ms_per_increment);
				return interval_id;
			} else {
				accumulated_points_text.innerHTML = String(self.settings.gold_coins_counter);
			}
		}
		
		self.fixation_cross = {
			type: htmlKeyboardResponse,
			stimulus: '<div class="fixation-cross">+</div>',
			trial_duration: 300,
			// trial_duration: self.settings.simulate ? 0 : duration,
			choices: 'NO_KEYS',
			on_finish: function (data) {
				data.trial_name = 'fixation_cross';
			},
		};

		self.general_instructions = {
			type: instructions,
			// <img style="border: 2px solid black; width: 80%" src="/static/fpt/img/instructions/DN_v${self.settings.task_version}_demo.png"/>
			// <img style="border: 2px solid black; width: 80%" src="/static/fpt/img/instructions/DN_v${self.settings.task_version}_demo.gif"/>
			pages:
				// [`<p class="instructions-title" style="text-align: center">Lottery draw task</p>
				//         <p>In this task, there will be two lotteries that contain varying amounts of gold and silver coins.</p>
				//         <p>On each trial, you will be able to see the distribution of gold and silver coins for each lottery as shown below.</p>
				//         <p><b>Your task is</b> to maximise the number of gold coins you draw by selecting which lottery you would like the computer to draw a coin from.</p>`,

				//         `<p class="instructions-title" style="text-align: center">Lottery draw task</p>
				//         <p>After each decision, you will see feedback about your draw which will tell you if you got a gold coin or a silver one. If you did not make a deicision in time, you will see a "too slow" message. See below for a few sample trials.</p>
				//         <p>You will have <b>15 seconds to make a decision</b> by pressing either the left or the right arrow key.</p>`
				// ]
				function () {
					if (self.settings.task_version === 'A') {
						return [
							`<p class="instructions-title" style="text-align: center">Lottery draw task</p>
                            <p><b>In this task</b>, you will need to make a series of choices between two lotteries.</p>
                            <p><b>Each lottery</b> is represented by a combination of gold and silver coins.</p>
                            <p>Lotteries will be either represented verbally, as in</p>
                            <div style="width: 50%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/DN_VersionA_example_text.png')}"/></div>
                            <p style="text-align: center; font-weight: bold; font-size: 2em">OR</p>
                            <p>they will be represented visually, like so (also 1 gold coin out of 10):</p>
                            <div style="width: 90%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/DN_VersionA_example_array.png')}"/></div>`,

							`<p class="instructions-title" style="text-align: center">Lottery draw task</p>
                            <p>After each decision, you will see whether you drew a gold or silver coin.</p>
                            <p>Remember, your goal is to maximize the chance you draw a gold coin.</p>
                            <p>Press the left or right arrow key to select the option you prefer.</p>
                            <p>Here is an example of what a trial might look like:</p>
                            <div style="width: 90%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/DN_VersionA_demo.gif')}"/></div>`,
						];
					} else if (self.settings.task_version === 'B') {
						return [
							`<p class="instructions-title" style="text-align: center">Combined lottery draw task</p>
                            <p><b>In this task</b>, you will make a series of choices between two lotteries, each represented by a combination of gold and silver coins. After each decision, you will see whether you drew a gold or silver coin.</p>
                            <p><b>Both lotteries</b> will be represented by a combination of a verbal description and a visual array.</p>
                            <p><b>In each lottery</b>, your goal is to maximize the chance you draw a gold coin.</p>
                            <p>Here is an example of what a trial might look like:</p>
                            <div style="width: 90%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/DN_VersionB_demo.gif')}"/></div>`,
						];
					}
				},
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'dn_general_instructions';
			},
		};

		self.pt_trials_instructions = {
			type: instructions,
			pages: [
				`<p class="instructions-title" style="text-align: center">Practice Trials</p>
                    <p>You will now familiarise yourself with the task. You will complete ${self.settings.pt_trials_n} practice trials.</p>
                    <p>These trials do not count towards your final score - they are designed to help you get used to the task.</p>
                    <p>Now, please <b>place your right hand on the left and right arrow keys</b>.</p>
                    <p><i>Press the <b>spacebar</b> with your left hand whenever you are ready to start!</i></p>
                    `,
			],
			show_clickable_nav: false,
			key_forward: ' ',
			allow_backward: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.pt_trials_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'dn_pt_trials_instructions';
			},
		};

		self.test_trials_instructions = {
			type: instructions,
			pages: function () {
				return [
					`<p class="instructions-title" style="text-align: center">Test Trials</p>
                        <p>Thank you for completing the practice trials. You managed to collect ${self.settings.gold_coins_counter} gold coins - these will not count towards your final score.</p>
                        <p>We will now progress to the test trials. The gold coins you now collect will count towards your final score.</p>
                        <p>Remeber that <b>your task is</b> to maximize the number of gold coins you draw.</p>
                        <p>Now, please <b>place your right hand on the left and right arrow keys</b>.</p>
                        <p><i>Press the <b>spacebar</b> with your left hand whenever you are ready to start!</i></p>
                        `,
				];
			},
			show_clickable_nav: false,
			key_forward: ' ',
			allow_backward: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.test_trials_instructions_time_limit,
			on_start: function () {
				const pcVal = document.querySelector(`#${IDS.pointsCounterValue}`);
				const pcCont = document.querySelector(`#${IDS.pointsCounterContainer}`);
				if (pcVal) pcVal.innerHTML = '0';
				if (pcCont) pcCont.style.display = 'none';
			},
			on_finish: function (data) {
				self.settings.gold_coins_counter = 0;
				data.trial_name = 'dn_test_trials_instructions';
			},
		};

		self.pt_trial = {};

		function get_lottery_dimensions() {
			const container = document.querySelector('#lotteries_container');
			const size = Math.min(container.clientWidth * 0.5, container.clientHeight);
			return { width: size, height: size };
		}

		function set_content_size() {
			const size = get_lottery_dimensions().width;

			document.querySelectorAll('.lottery_parent').forEach((e) => {
				e.style.width = `${size}px`;
				e.style.height = `${size}px`;
				e.style['padding-bottom'] = `${size}px`;
			});
			document.querySelectorAll('.lottery_text').forEach((e) => {
				e.style.width = `${size}px`;
			});
			document.querySelectorAll('#lottery_labels_container div').forEach((e) => {
				e.style.width = `${size}px`;
			});
			document.querySelectorAll('.lottery_choice').forEach((e) => {
				e.style.width = `${size}px`;
			});
		}

		function draw_coins() {
			const lottery_dimensions = get_lottery_dimensions();

			const coins_distribution_lottery_left =
				self.jsPsych.timelineVariable('left_lottery_type', true) == 'large'
					? { rows: 20, cols: 20 }
					: { rows: 10, cols: 1 };
			const coins_distribution_lottery_right =
				self.jsPsych.timelineVariable('right_lottery_type', true) == 'large'
					? { rows: 20, cols: 20 }
					: { rows: 10, cols: 1 };
			let lottery_left_coins_colors = [
				...expandArray(
					['gold'],
					self.jsPsych.timelineVariable('left_lottery_gold_coins', true)
				),
				...expandArray(
					['silver'],
					self.jsPsych.timelineVariable('left_lottery_silver_coins', true)
				),
			];
			let lottery_right_coins_colors = [
				...expandArray(
					['gold'],
					self.jsPsych.timelineVariable('right_lottery_gold_coins', true)
				),
				...expandArray(
					['silver'],
					self.jsPsych.timelineVariable('right_lottery_silver_coins', true)
				),
			];

			let max_coins = {
				row: Math.max(
					coins_distribution_lottery_left.rows,
					coins_distribution_lottery_right.rows
				),
				col: Math.max(
					coins_distribution_lottery_left.cols,
					coins_distribution_lottery_right.cols
				),
			};
			let coin_container_size = {
				width: (lottery_dimensions['width'] * 0.99) / max_coins.row,
				height: (lottery_dimensions['height'] * 0.99) / max_coins.col,
			};
			let coin_size = {
				width: coin_container_size['width'] * 0.9,
				height: coin_container_size['height'] * 0.9,
			};
			let coin_margin = {
				width: coin_container_size['width'] * 0.1,
				height: coin_container_size['height'] * 0.1,
			};

			if (self.jsPsych.timelineVariable('left_lottery_display_type', true) !== 'text') {
				let lottery_left_coins_html = '';
				for (let i = 0; i < lottery_left_coins_colors.length; i++) {
					let row_offset = parseInt(i / max_coins.row);
					let col_offset = i - row_offset * max_coins.row;

					let lottery_left_color = lottery_left_coins_colors[i];
					lottery_left_coins_html += `<div class="coin" style="width: ${coin_size['width']}px; height: ${coin_size['height']}px; bottom: ${coin_margin['height'] + row_offset * coin_container_size['height']}px; left: ${coin_margin['width'] + col_offset * coin_container_size['width']}px; background-color: ${lottery_left_color}"></div>`;
				}
				document.getElementById('lottery_left').innerHTML += lottery_left_coins_html;
			}

			if (self.jsPsych.timelineVariable('right_lottery_display_type', true) !== 'text') {
				let lottery_right_coins_html = '';
				for (let i = 0; i < lottery_right_coins_colors.length; i++) {
					let row_offset = parseInt(i / coins_distribution_lottery_right.rows);
					let col_offset = i - row_offset * coins_distribution_lottery_right.rows;

					let lottery_right_color = lottery_right_coins_colors[i];
					lottery_right_coins_html += `<div class="coin" style="width: ${coin_size['width']}px; height: ${coin_size['height']}px; bottom: ${coin_margin['height'] + row_offset * coin_container_size['height']}px; left: ${coin_margin['width'] + col_offset * coin_container_size['width']}px; background-color: ${lottery_right_color}"></div>`;
				}
				document.getElementById('lottery_right').innerHTML += lottery_right_coins_html;
			}

			let small_lottery =
				self.jsPsych.timelineVariable('left_lottery_type', true) == 'small'
					? 'left'
					: 'right';
			let small_lottery_width = coin_container_size['width'] * 10 + 4;
			document.querySelector(`#lottery_${small_lottery}`).style.width =
				`${small_lottery_width}px`;
			document.querySelector(`#lottery_${small_lottery}`).style.height =
				`${coin_container_size['height'] + 2}px`;
			document.querySelector(`#lottery_${small_lottery}`).style['margin-top'] =
				`${(lottery_dimensions['height'] - (coin_container_size['height'] + 2) - 2 * 2) / 2}px`;
			document.querySelector(`#lottery_${small_lottery}`).style['left'] =
				`${(lottery_dimensions['width'] - small_lottery_width) / 2}px`;
		}

		function set_lottery_text() {
			let coins = {
				left_gold: self.jsPsych.timelineVariable('left_lottery_gold_coins', true),
				left_total: self.jsPsych.timelineVariable('left_lottery_total_coins', true),
				right_gold: self.jsPsych.timelineVariable('right_lottery_gold_coins', true),
				right_total: self.jsPsych.timelineVariable('right_lottery_total_coins', true),
			};
			let plurals = {
				left_gold:
					self.jsPsych.timelineVariable('left_lottery_gold_coins', true) > 1 ? 's' : '',
				// 'left_total': self.jsPsych.timelineVariable('left_lottery_total_coins', true)  > 1 ? 's' : '',
				right_gold:
					self.jsPsych.timelineVariable('right_lottery_gold_coins', true) > 1 ? 's' : '',
				// 'right_total': self.jsPsych.timelineVariable('right_lottery_total_coins', true)  > 1 ? 's' : ''
			};

			if (self.jsPsych.timelineVariable('left_lottery_display_type', true) !== 'array') {
				document.querySelector('#lottery_left_text').innerHTML =
					`${coins['left_gold']} gold coin${plurals['left_gold']} out of ${coins['left_total']}`;
			}
			if (self.jsPsych.timelineVariable('right_lottery_display_type', true) !== 'array') {
				document.querySelector('#lottery_right_text').innerHTML =
					`${coins['right_gold']} gold coin${plurals['right_gold']} out of ${coins['right_total']}`;
			}
		}

		self.test_trial = {
			type: htmlKeyboardResponse,
			stimulus: function () {
				return `<div id="lottery_labels_container">
                            <div>Lottery 1</div>
                            <div>Lottery 2</div>
                        </div>
                        <div id="lottery_text_desc_container">
                            <div id="lottery_left_text" class="lottery_text"></div>
                            <div id="lottery_right_text" class="lottery_text"></div>
                        </div>
                        <div id="lotteries_container">
                            <div id="lottery_left_parent" class="lottery_parent" ${self.jsPsych.timelineVariable('left_lottery_display_type', true) === 'text' ? "style='visibility: hidden'" : ''}">
                                <div id="lottery_left" class="lottery"></div>
                            </div>
                            <div id="lottery_right_parent" class="lottery_parent" ${self.jsPsych.timelineVariable('right_lottery_display_type', true) === 'text' ? "style='visibility: hidden'" : ''}">
                                <div id="lottery_right" class="lottery"></div>
                            </div>
                        </div>
                        <div id="lottery_choices">
                            <div class="lottery_choice"><span>Draw from Lottery 1</span><br><span><i>left arrow</i></span></div>
                            <div class="lottery_choice"><span>Draw from Lottery 2</span><br><span><i>right arrow</i></span></div>
                        </div>
                `;
			},
			on_load: function () {
				function render_dynamic_content() {
					set_content_size();
					draw_coins();
				}
				set_lottery_text();
				render_dynamic_content();
				window.addEventListener('resize', render_dynamic_content);

				if (self.jsPsych.timelineVariable('trial') === 0) {
					const pcCont = document.querySelector(`#${IDS.pointsCounterContainer}`);
					if (pcCont) pcCont.style.display = 'flex';
				}
			},
			css_classes: ['content-size'],
			choices: ['arrowleft', 'arrowright'],
			trial_duration: null, //self.settings.simulate ? self.settings.simulate_trial_duration*2 : self.settings.trial_time_limit,
			timer: self.settings.main_trial_time_limit,
			on_finish: function (data) {
				data.trial_name = 'dn_main_trial_version_A';
				data.pt_trial = self.jsPsych.timelineVariable('pt_trial');
				data.block = self.jsPsych.timelineVariable('block');
				data.trial = self.jsPsych.timelineVariable('trial');
				data.task_version = self.settings.task_version;
				data.choice_type = self.jsPsych.timelineVariable('choice_type');
				data.left_lottery_display_type = self.jsPsych.timelineVariable(
					'left_lottery_display_type'
				);
				data.right_lottery_display_type = self.jsPsych.timelineVariable(
					'right_lottery_display_type'
				);
				data.left_lottery_type = self.jsPsych.timelineVariable('left_lottery_type');
				data.right_lottery_type = self.jsPsych.timelineVariable('right_lottery_type');
				data.left_lottery_gold_prop =
					self.jsPsych.timelineVariable('left_lottery_gold_prop');
				data.right_lottery_gold_prop =
					self.jsPsych.timelineVariable('right_lottery_gold_prop');
				data.left_lottery_total_coins = self.jsPsych.timelineVariable(
					'left_lottery_total_coins'
				);
				data.right_lottery_total_coins = self.jsPsych.timelineVariable(
					'right_lottery_total_coins'
				);
				data.left_lottery_gold_coins =
					self.jsPsych.timelineVariable('left_lottery_gold_coins');
				data.right_lottery_gold_coins = self.jsPsych.timelineVariable(
					'right_lottery_gold_coins'
				);
				data.left_lottery_silver_coins = self.jsPsych.timelineVariable(
					'left_lottery_silver_coins'
				);
				data.right_lottery_silver_coins = self.jsPsych.timelineVariable(
					'right_lottery_silver_coins'
				);

				data.selected_lottery =
					data.response === 'arrowleft'
						? 'left'
						: data.response === 'arrowright'
							? 'right'
							: null;
				if (data.selected_lottery !== null) {
					let selected_prop = self.jsPsych.timelineVariable(
						`${data.selected_lottery}_lottery_gold_prop`
					);
					data.coin_drawn = self.jsPsych.randomization.sampleBernoulli(selected_prop)
						? 'gold'
						: 'silver';
				} else {
					data.coin_drawn = null;
				}
			},
			simulation_options: 'denominator_neglect',
		};

		self.test_trial_feedback = {
			type: htmlKeyboardResponse,
			stimulus: function () {
				// if (self.jsPsych.data.get().last(1).values()[0]['rt'] === null) {
				if (typeof self.jsPsych.data.get().last(1).values()[0]['rt'] === 'undefined') {
					return '<p style="font-size: 3em; color: red;">X<br><br>TOO SLOW</p>';
				} else {
					let coin_drawn = self.jsPsych.data.get().last(1).values()[0]['coin_drawn'];
					if (coin_drawn === 'gold') {
						self.settings.gold_coins_counter += 1;
						update_reward_points(!self.settings.simulate);
						return `<p style="font-size: 3em; color: gold; line-height: 2em;">You drew a <b>gold coin</b>.</p>`;
					} else if (coin_drawn === 'silver') {
						return `<p style="font-size: 3em; color: white; line-height: 2em;">You drew a <b>silver coin</b>.</p>`;
					}
				}
			},
			choices: 'NO_KEYS',
			trial_duration:
				self.settings.simulate === true
					? self.settings.simulate_trial_duration
					: 1000,
			on_finish: function (data) {
				data.trial_name = 'dn_trial_feedback';

				if (
					!self.jsPsych.timelineVariable('pt_trial') &&
					self.jsPsych.timelineVariable('trial') === self.settings.test_trials_n - 1
				) {
					const pcVal = document.querySelector(`#${IDS.pointsCounterValue}`);
					const pcCont = document.querySelector(`#${IDS.pointsCounterContainer}`);
					if (pcVal) pcVal.innerHTML = '0';
					if (pcCont) pcCont.style.display = 'none';
				}
			},
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		const pt_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[
					this.fixation_cross,
					this.test_trial,
					this.test_trial_feedback,
				],
				this.settings.pt_blocks,
				null,
				this.task_data.pt_trials,
				'pt'
			);
		const test_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[
					this.fixation_cross,
					this.test_trial,
					this.test_trial_feedback,
				],
				this.settings.test_blocks,
				null,
				this.task_data.test_trials,
				'test'
			);
		timeline.push(this.general_instructions);
		if (hide_progress_bar_trial_generator) {
			timeline.push(hide_progress_bar_trial_generator);
		}
		timeline.push(this.pt_trials_instructions);
		timeline.push(...pt_trials_timeline.timeline);
		timeline.push(this.test_trials_instructions);
		timeline.push(...test_trials_timeline.timeline);
		return timeline;
	}
}
