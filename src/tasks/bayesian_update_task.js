import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import instructions from '@jspsych/plugin-instructions';
import { deepMerge, construct_full_media_path, expandArray, format_ind_to_key, get_task_trials_timeline_with_interblock_text } from '../utils/helpers.js';

export default class Bayesian_Update {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 7;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		if (this.settings.simulate) {
			this.settings.fade_in_animation_duration = this.settings.simulate_trial_duration;
			this.settings.ball_move_duration = this.settings.simulate_trial_duration / 5;
			this.settings.wait_after_box_opening_to_draw_balls = this.settings.simulate_trial_duration / 2;
		}

		this.media = [
			`instructions/bayesian_update_demo_${this.settings['task_version']}.mp4`,
			'instructions/bayesian_update_box_choice.png',
		].map((f) => construct_full_media_path(this.media_basepath, f));
		this.media_promises = [];

		this.task_data = this.get_task_data();
		this.define_trials();
	}

	get_default_settings() {
		let settings = {};
		settings.general_instructions_time_limit = 120;
		settings.pt_trials_instructions_time_limit = 30;
		settings.test_trials_instructions_time_limit = 60;
		settings.between_unique_trials_time_limit = 30;
		settings.test_trial_time_limit = 20;
		
		settings.task_version = 'easy';
		settings.draw_with_replacement = true;
		settings.unique_test_trials_n = 8; // this is per-version
		settings.draws_per_unique_trial = 5;
		settings.balls_per_draw = 1;

		settings.ball_splits = [
			[40, 60],
			[30, 70],
		];
		settings.task_version_parameters = {
			easy: {
				labels: [
					'Definitely left box',
					'Equally likely to be either left or right',
					'Definitely right box',
				],
				slider_initial_text: '50% left, 50% right',
				question: 'What is the probability that this draw was from the left vs right box?',
			},
			hard: {
				labels: [
					'Definitely NOT blue',
					'Equally likely to be blue as not blue',
					'Definitely blue',
				],
				slider_initial_text: '50% blue',
				question: 'What is the probability that the next drawn ball will be blue?',
			},
		};

		settings.fade_in_animation_duration = 1000; //change css too if this changes; ALSO: same as box opening animation speed
		settings.ball_move_duration = 200;
		settings.wait_after_box_opening_to_draw_balls = 500;

		settings.unique_pt_trials_n = 2;
		settings.pt_trials_n = 10; //2 trials 5 draws each
		settings.pt_trials_per_block = 10;
		settings.pt_block = settings.pt_trials_n / settings.pt_trials_per_block;

		settings.test_trials_n = 40;
		settings.test_trials_per_block = 40;
		settings.test_blocks = settings.test_trials_n / settings.test_trials_per_block;
		
		return settings;
	}

	get_task_data() {
		const slice_into_subarrays = (arr, subarray_length) =>
			Array.from({ length: Math.ceil(arr.length / subarray_length) }, (_, i) =>
				arr.slice(i * subarray_length, i * subarray_length + subarray_length)
			);

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
		let pt_curr_pp_ball_split = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					this.settings.ball_splits,
					this.settings.unique_pt_trials_n / this.settings.ball_splits.length
				)
			),
			this.settings.draws_per_unique_trial
		);
		let pt_curr_pp_left_box_majority_color = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					['red', 'blue'],
					this.settings.unique_pt_trials_n / 2
				)
			),
			this.settings.draws_per_unique_trial
		);
		let pt_curr_pp_selected_box_majority_color = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					['red', 'blue'],
					this.settings.unique_pt_trials_n / 2
				)
			),
			this.settings.draws_per_unique_trial
		);
		let pt_curr_pp_draws = [];
		for (let i = 0; i < this.settings.unique_pt_trials_n; i++) {
			// to simulate real sampling, we create the balls pool as they are in the selected box and sample from it
			let pt_trial_ind = i * this.settings.draws_per_unique_trial;
			let balls_to_sample = [];
			for (let j = 1; j <= 100; j++) {
				balls_to_sample.push(
					j < pt_curr_pp_ball_split[pt_trial_ind][1]
						? pt_curr_pp_selected_box_majority_color[pt_trial_ind]
						: pt_curr_pp_selected_box_majority_color[pt_trial_ind] == 'red'
							? 'blue'
							: 'red'
				);
			}
			let random_draw;
			if (this.settings.draw_with_replacement) {
				random_draw = slice_into_subarrays(
					this.jsPsych.randomization.sampleWithReplacement(
						balls_to_sample,
						this.settings.draws_per_unique_trial * this.settings.balls_per_draw
					),
					this.settings.balls_per_draw
				);
			} else {
				random_draw = slice_into_subarrays(
					this.jsPsych.randomization.sampleWithoutReplacement(
						balls_to_sample,
						this.settings.draws_per_unique_trial * this.settings.balls_per_draw
					),
					this.settings.balls_per_draw
				);
			}
			for (let i = 0; i < random_draw.length; i++) {
				pt_curr_pp_draws.push({ current: random_draw[i], past: random_draw.slice(0, i) });
			}
		}
		// console.log(pt_curr_pp_draws)
		for (let pt_trial_ind = 0; pt_trial_ind < this.settings.pt_trials_n; pt_trial_ind++) {
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
				unique_trial: parseInt(pt_trial_ind / this.settings.draws_per_unique_trial),
				unique_trial_draw_number: pt_trial_ind % this.settings.draws_per_unique_trial,
				ball_split: pt_curr_pp_ball_split[pt_trial_ind],
				left_box_majority_color: pt_curr_pp_left_box_majority_color[pt_trial_ind],
				right_box_majority_color:
					pt_curr_pp_left_box_majority_color[pt_trial_ind] === 'red' ? 'blue' : 'red',
				selected_box_majority_color: pt_curr_pp_selected_box_majority_color[pt_trial_ind],
				selected_box:
					pt_curr_pp_selected_box_majority_color[pt_trial_ind] ==
					pt_curr_pp_left_box_majority_color[pt_trial_ind]
						? 'left'
						: 'right',
				current_draw: pt_curr_pp_draws[pt_trial_ind]['current'],
				past_draws: pt_curr_pp_draws[pt_trial_ind]['past'],
				version: this.settings.task_version,
			};
		}

		// ------------------------TEST TRIALS DATA
		this.settings.test_trials_n =
			this.settings.unique_test_trials_n * this.settings.draws_per_unique_trial;

		// take the ball_splits, set a random ball split for each unique trial and then expand that array for each draw
		let curr_pp_ball_split = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					this.settings.ball_splits,
					this.settings.unique_test_trials_n / this.settings.ball_splits.length
				)
			),
			this.settings.draws_per_unique_trial
		);
		let curr_pp_left_box_majority_color = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					['red', 'blue'],
					this.settings.unique_test_trials_n / 2
				)
			),
			this.settings.draws_per_unique_trial
		);
		let curr_pp_selected_box_majority_color = expandArray(
			this.jsPsych.randomization.shuffle(
				expandArray(
					['red', 'blue'],
					this.settings.unique_test_trials_n / 2
				)
			),
			this.settings.draws_per_unique_trial
		);
		let curr_pp_draws = [];
		for (let i = 0; i < this.settings.unique_test_trials_n; i++) {
			// to simulate real sampling, we create the balls pool as they are in the selected box and sample from it
			let test_trial_ind = i * this.settings.draws_per_unique_trial;
			let balls_to_sample = [];
			for (let j = 1; j <= 100; j++) {
				balls_to_sample.push(
					j < curr_pp_ball_split[test_trial_ind][1]
						? curr_pp_selected_box_majority_color[test_trial_ind]
						: curr_pp_selected_box_majority_color[test_trial_ind] == 'red'
							? 'blue'
							: 'red'
				);
			}
			let random_draw;
			if (this.settings.draw_with_replacement) {
				random_draw = slice_into_subarrays(
					this.jsPsych.randomization.sampleWithReplacement(
						balls_to_sample,
						this.settings.draws_per_unique_trial * this.settings.balls_per_draw
					),
					this.settings.balls_per_draw
				);
			} else {
				random_draw = slice_into_subarrays(
					this.jsPsych.randomization.sampleWithoutReplacement(
						balls_to_sample,
						this.settings.draws_per_unique_trial * this.settings.balls_per_draw
					),
					this.settings.balls_per_draw
				);
			}
			for (let i = 0; i < random_draw.length; i++) {
				curr_pp_draws.push({ current: random_draw[i], past: random_draw.slice(0, i) });
			}
		}
		for (
			let test_trial_ind = 0;
			test_trial_ind < this.settings.test_trials_n;
			test_trial_ind++
		) {
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
				unique_trial: parseInt(test_trial_ind / this.settings.draws_per_unique_trial),
				unique_trial_draw_number: test_trial_ind % this.settings.draws_per_unique_trial,
				ball_split: curr_pp_ball_split[test_trial_ind],
				left_box_majority_color: curr_pp_left_box_majority_color[test_trial_ind],
				right_box_majority_color:
					curr_pp_left_box_majority_color[test_trial_ind] === 'red' ? 'blue' : 'red',
				selected_box_majority_color: curr_pp_selected_box_majority_color[test_trial_ind],
				selected_box:
					curr_pp_selected_box_majority_color[test_trial_ind] ==
					curr_pp_left_box_majority_color[test_trial_ind]
						? 'left'
						: 'right',
				current_draw: curr_pp_draws[test_trial_ind]['current'],
				past_draws: curr_pp_draws[test_trial_ind]['past'],
				version: this.settings.task_version,
			};
		}
		return task_data;
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		function fade_in_on_unique_trial() {
			if (self.jsPsych.timelineVariable('past_draws').length == 0) {
				document.querySelector('#jspsych-content').classList.add('fadeIn');
				self.jsPsych.pluginAPI.setTimeout(() => {
					document.querySelector('#jspsych-content').classList.remove('fadeIn');
				}, self.settings.fade_in_animation_duration);
			}
		}

		function draw_balls_left_right_black_boxes(ball_container_size, ball_size, ball_margin) {
			let black_box_balls_html = '';
			let left_box_balls_html = '';
			let blue_box_balls_html = '';
			for (let i = 0; i < 100; i++) {
				let row_offset = parseInt(i / 10);
				let col_offset = i - row_offset * 10;

				let left_box_color =
					i < self.jsPsych.timelineVariable('ball_split', true)[1]
						? self.jsPsych.timelineVariable('left_box_majority_color', true)
						: self.jsPsych.timelineVariable('right_box_majority_color', true);
				let blue_box_color =
					i < self.jsPsych.timelineVariable('ball_split', true)[1]
						? self.jsPsych.timelineVariable('right_box_majority_color', true)
						: self.jsPsych.timelineVariable('left_box_majority_color', true);

				let black_box_color = 'black';
				black_box_balls_html += `<div class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${ball_margin + row_offset * ball_container_size}px; left: ${ball_margin + col_offset * ball_container_size}px; background-color: ${black_box_color}"></div>`;
				left_box_balls_html += `<div class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${ball_margin + row_offset * ball_container_size}px; right: ${ball_margin + col_offset * ball_container_size}px; background-color: ${left_box_color}"></div>`;
				blue_box_balls_html += `<div class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${ball_margin + row_offset * ball_container_size}px; right: ${ball_margin + col_offset * ball_container_size}px; background-color: ${blue_box_color}"></div>`;
			}
			document.getElementById('black_box').innerHTML += black_box_balls_html;
			document.getElementById('left_box').innerHTML = left_box_balls_html;
			document.getElementById('right_box').innerHTML = blue_box_balls_html;

			document.getElementById('left_box').style['border-color'] =
				self.jsPsych.timelineVariable('left_box_majority_color', true);
			document.getElementById('right_box').style['border-color'] =
				self.jsPsych.timelineVariable('right_box_majority_color', true);
		}

		function draw_balls_current_draw(box_size, ball_container_size, ball_size, ball_margin) {
			let curr_draw_balls_rect = document
				.querySelector('#curr_draw_balls')
				.getBoundingClientRect();
			let additional_bottom_offset = (curr_draw_balls_rect.height - ball_container_size) / 2;
			let additional_left_offset =
				(curr_draw_balls_rect.width -
					(box_size / 10) * self.jsPsych.timelineVariable('current_draw', true).length) /
				2;
			let last_draw =
				self.jsPsych.timelineVariable('past_draws', true).length > 0
					? self.jsPsych.timelineVariable('past_draws', true).slice(-1).flat()
					: [];
			let current_draw_balls_html = '';
			for (let i = 0; i < self.jsPsych.timelineVariable('current_draw', true).length; i++) {
				let row_offset = parseInt(i / 10);
				let col_offset = i - row_offset * 10;
				let color = last_draw[i] !== undefined ? last_draw[i] : 'transparent';
				if (color != 'transparent') {
					current_draw_balls_html += `<div ball_type="last_draw" class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${additional_bottom_offset + ball_margin + row_offset * ball_container_size}px; left: ${additional_left_offset + ball_margin + col_offset * ball_container_size}px; background-color: ${color}"></div>`;
				}
				current_draw_balls_html += `<div ball_type="placeholder" class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${additional_bottom_offset + ball_margin + row_offset * ball_container_size}px; left: ${additional_left_offset + ball_margin + col_offset * ball_container_size}px; background-color: transparent"></div>`;
			}
			document.getElementById('curr_draw_balls').innerHTML = current_draw_balls_html;
		}

		function draw_balls_past_draw(box_size, ball_container_size, ball_size, ball_margin) {
			let past_draws_static =
				self.jsPsych.timelineVariable('past_draws', true).length > 1
					? self.jsPsych.timelineVariable('past_draws', true).slice(0, -1).flat()
					: [];
			let past_draw_balls_rect = document
				.querySelector('#past_draw_balls')
				.getBoundingClientRect();
			let additional_bottom_offset = (past_draw_balls_rect.height - ball_container_size) / 2;
			let additional_left_offset =
				(past_draw_balls_rect.width -
					(box_size / 10) *
						((self.settings.draws_per_unique_trial - 1) *
							self.jsPsych.timelineVariable('current_draw', true).length)) /
				2;
			let past_draw_balls_html = '';
			for (
				let i = 0;
				i <
				(self.settings.draws_per_unique_trial - 1) *
					self.jsPsych.timelineVariable('current_draw', true).length;
				i++
			) {
				let row_offset = parseInt(i / 10);
				let col_offset = i - row_offset * 10;
				let color =
					past_draws_static[i] !== undefined ? past_draws_static[i] : 'transparent';
				let ball_type =
					past_draws_static[i] !== undefined ? 'past_draw_moved' : 'placeholder';
				past_draw_balls_html += `<div ball_type="${ball_type}" class="ball" style="width: ${ball_size}px; height: ${ball_size}px; bottom: ${additional_bottom_offset + ball_margin + row_offset * ball_container_size}px; left: ${additional_left_offset + ball_margin + col_offset * ball_container_size}px; background-color: ${color}"></div>`;
			}
			document.getElementById('past_draw_balls').innerHTML = past_draw_balls_html;
		}

		function move_ball(
			ball_to_move,
			source_coords,
			destination_coords,
			moved_ball_attribute = null,
			ball_color = null
		) {
			ball_to_move.style.left = `${source_coords.left}px`;
			ball_to_move.style.top = `${source_coords.top}px`;
			document
				.querySelector('#jspsych-html-button-response-stimulus')
				.appendChild(ball_to_move);

			// animation does not work properly due to JS event loop stuff - double RAF call seems to solve this
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					ball_to_move.style.left = `${destination_coords.left}px`;
					ball_to_move.style.top = `${destination_coords.top}px`;
					if (ball_color !== null) {
						ball_to_move.style['background-color'] = ball_color;
					}
				});
			});

			if (moved_ball_attribute !== null) {
				ball_to_move.setAttribute('ball_type', moved_ball_attribute);
			}
		}

		function move_curr_draw_to_past_draw() {
			// let first_free_past_draw_static_index = 0//past_draws_static.length
			let curr_draw_balls_to_move = Array.from(
				document.querySelectorAll('#curr_draw_balls > div')
			).filter((e) => {
				let backgroundColor = window.getComputedStyle(e).backgroundColor;
				return backgroundColor === 'rgb(255, 0, 0)' || backgroundColor === 'rgb(0, 0, 255)'; // red and blue in RGB
			});
			let past_draws_placeholder_balls = Array.from(
				document.querySelectorAll('#past_draw_balls > div[ball_type="placeholder"]')
			);

			let ball_index = 0;
			while (ball_index < curr_draw_balls_to_move.length) {
				let ball_to_move = curr_draw_balls_to_move[ball_index];
				let source_coords = curr_draw_balls_to_move[ball_index].getBoundingClientRect();
				let destination_coords =
					past_draws_placeholder_balls[ball_index].getBoundingClientRect();
				self.jsPsych.pluginAPI.setTimeout(
					() =>
						move_ball(
							ball_to_move,
							source_coords,
							destination_coords,
							'past_draw_moved'
						),
					(ball_index + 1) * self.settings.ball_move_duration
				);
				ball_index++;
			}
		}

		function move_black_balls_to_curr_draw() {
			let current_black_balls = Array.from(document.getElementById('black_box').childNodes);
			let balls_to_move = self.jsPsych.randomization.sampleWithoutReplacement(
				current_black_balls,
				self.jsPsych.timelineVariable('current_draw', true).length
			);
			let balls_current_draw = Array.from(
				document.getElementById('curr_draw_balls').childNodes
			).filter((e) => {
				return e.getAttribute('ball_type') == 'placeholder';
			});

			let ball_index = 0;
			while (ball_index < balls_to_move.length) {
				let ball_to_move = self.settings.draw_with_replacement
					? balls_to_move[ball_index].cloneNode(true)
					: balls_to_move[ball_index];
				let source_coords = balls_to_move[ball_index].getBoundingClientRect();
				let destination_coords = balls_current_draw[ball_index].getBoundingClientRect();
				let ball_color = self.jsPsych.timelineVariable('current_draw', true)[ball_index];
				self.jsPsych.pluginAPI.setTimeout(
					() =>
						move_ball(
							ball_to_move,
							source_coords,
							destination_coords,
							'curr_draw_moved',
							ball_color
						),
					(ball_index + 1) * self.settings.ball_move_duration
				);
				ball_index++;
			}
		}

		function response_slider_listener(event, trial_obj) {
			let slider = event.target;
			let slider_value = parseInt(slider.value);

			document.querySelector('#slider_current_selection_text').style.left =
				`${slider_value}%`;
			document.querySelector('#slider_current_selection_text').innerHTML =
				self.jsPsych.timelineVariable('version', true) == 'easy'
					? `${100 - slider_value}% left, ${slider_value}% right`
					: `${slider_value}% blue`;

			if (self.jsPsych.timelineVariable('version', true) == 'hard') {
				// map value [0, 100] to lightness [85, 25] (inverse)
				let lightness = 85 - slider_value * 0.6;
				slider.style.setProperty('--track-color', `hsl(240, 100%, ${lightness}%)`);
			}

			if (document.querySelector('.jspsych-btn').disabled) {
				document.querySelector('.jspsych-btn').disabled = false;
			}

			trial_obj.data.response_slider = slider_value;
		}

		self.general_instructions = {
			type: instructions,
			pages: function () {
				if (self.settings.task_version == 'easy') {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Box</p>
                            <p>In this task, you will be presented with 2 boxes with 100 balls: one, in which the majority of the balls are blue (and the rest are red) and another, in which the majority of the balls are red (and the rest are blue). The proportions of balls in each box will be shown above the box.</p>
                            <p>One of the two boxes will be selected. The selected box will be shown in the middle of the screen, but you will not know which of the boxes it is, and all of the balls will be coloured black. A ball will be drawn from that box, at which point its colour will be revealed.</p>
                            <div style="width: 100%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/bayesian_update_box_choice.png')}"/></div>`,

						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Box</p>
                            <p><b>Your task is</b> to select how likely is it that the randomly selected box (the one with the black balls) is one of the two boxes (majority blue or majority red).</p>
                            <p>Remember:</p>
                            <ul>
                                <li>the black box can be either one of the two boxes</li>
                                <li>after every draw, the drawn ball is put back into the black box and a new draw occurs; for every draw, the same 100 balls are used</li>
                            </ul>
                            <p>Here's an example how the task looks like:</p>
                            <div style="width: 95%; margin: auto; margin-bottom: 3%; border: 2px solid black;"><video width="100%" height="100%" controls autoplay muted loop><source src="${construct_full_media_path(self.media_basepath,`instructions/bayesian_update_demo_${self.settings['task_version']}.mp4`)}" type="video/mp4">Your browser does not support displaying videos. No worries - this will not be needed.</video></div>
                            `,
					];
				} else {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Ball</p>
                            <p><b>In this task</b>, you will be presented with 2 boxes with 100 balls each: one, in which the majority of the balls are blue (and the rest are red) and another, in which the majority of the balls are red (and the rest are blue). The proportions of balls in each box will be shown above the box.</p>
                            <p>One of the two boxes will be selected. The selected box will be shown in the middle of the screen, but you will not know which of the boxes it is, and all of the balls will be coloured black. A ball will be drawn from that box, at which point its colour will be revealed.</p>
                            <div style="width: 100%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath,'instructions/bayesian_update_box_choice.png')}"/></div>`,

						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Ball</p>
                            <p><b>Your task is</b> to select how likely is it that the next ball drawn will be blue.</p>
                            <p>Remember:</p>
                            <ul>
                                <li>the black box can be either one of the two boxes</li>
                                <li>after every draw, the drawn ball is put back into the black box and a new draw occurs; for every draw, the same 100 balls are used</li>
                            </ul>
                            <p>Here's an example how the task looks like:</p>
                            <div style="width: 95%; margin: auto; margin-bottom: 3%; border: 2px solid black;"><video width="100%" height="100%" controls autoplay muted loop><source src="${construct_full_media_path(self.media_basepath,`instructions/bayesian_update_demo_${self.settings['task_version']}.mp4`)}" type="video/mp4">Your browser does not support displaying videos. No worries - this will not be needed.</video></div>
                            `,
					];
				}
			},
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'bayesian_update_general_instructions';
			},
		};

		self.pt_trials_instructions = {
			type: instructions,
			pages: function () {
				if (self.settings.task_version == 'easy') {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Box</p>
                            <p>You will now familiarise yourself with the rules. You will make a total of ${self.settings.pt_trials_n} practice decisions.</p>`,
					];
				} else {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Ball</p>
                            <p>You will now familiarise yourself with the rules. You will make a total of ${self.settings.pt_trials_n} practice decisions.</p>`,
					];
				}
			},
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.pt_trials_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'bayesian_update_pt_trials_instructions';
			},
		};

		self.test_trials_instructions = {
			type: instructions,
			pages: function () {
				if (self.settings.task_version == 'easy') {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Box</p>
                            <p>We will now progress to the test decisions. The task will be broken into ${self.settings.unique_test_trials_n} sets of ${self.settings.draws_per_unique_trial} decisions. After every set of ${self.settings.draws_per_unique_trial} decisions, the task will reset and you will start from the beginning, with no information about which of the two boxes is the one in the middle.</p>
                            <p>Remember that:</p>
                            <ul>
                                <li>the randomly selected box (represented by the one that has black balls) is one of the two boxes (majority red or majority blue boxes)</li>
                                <li>your task is to decide how likely it is that the randomly selected box is the one with majority blue balls or the one with majority red balls</li>
                                <li>after every draw, the drawn ball is put back into the black box and a new draw occurs; for every draw, the same 100 balls are used</li>
                            </ul>
                            <p>Continue to the test decisions whenever you are ready.</p>`,
					];
				} else {
					return [
						`<p class="instructions-title" style="text-align: center">The box and balls task - Predicting the Next Ball</p>
                            <p>We will now progress to the test decisions. The task will be broken into ${self.settings.unique_test_trials_n} sets of ${self.settings.draws_per_unique_trial} decisions. After every set of ${self.settings.draws_per_unique_trial} decisions, the task will reset and you will start from the beginning, with no information about which of the two boxes is the one in the middle.</p>
                            <p>Remember that:</p>
                            <ul>
                                <li>the randomly selected box (represented by the one that has black balls) is one of the two boxes (majority red or majority blue boxes)</li>
                                <li>your task is to predict the probability that the next ball drawn will be blue</li>
                                <li>after every draw, the drawn ball is put back into the black box and a new draw occurs; for every draw, the same 100 balls are used</li>
                            </ul>
                            <p>Continue to the test decisions whenever you are ready.</p>`,
					];
				}
			},
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.test_trials_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'bayesian_update_test_trials_instructions';
			},
		};

		self.between_unique_trials_trial = {
			type: instructions,
			pages: function () {
				let html = `<p>For this set, the selected box was the <b>${self.jsPsych.timelineVariable('selected_box', true)}</b> one, in which the majority color was <span style="color: ${self.jsPsych.timelineVariable('selected_box_majority_color', true)}"><b>${self.jsPsych.timelineVariable('selected_box_majority_color', true)}</b></span>.</p>`;
				html += `<p>We will now move on to the next set.</p>`;

				let data = self.jsPsych.data.get().last(1).values()[0];
				if (data.pt_trial && data.trial === self.settings.pt_trials_n - 1) {
					html += `<p>This is the end of the practice decisions. Please proceed to the next page.</p>`;
				} else if (!data.pt_trial && data.trial === self.settings.test_trials_n - 1) {
					html += `<p>This is the end of this task. Please proceed to the next page.</p>`;
				} else {
					html += `<p>Remember that the selected box can change and that <b>the proportion of red and blue balls can also change for the next set of draws</b>.</p>
                            <p>Continue to the next set of draws when you are ready.</p>`;
				}
				return [html];
			},
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.between_unique_trials_time_limit,
			on_finish: function (data) {
				data.trial_name = 'bayesian_update_between_unique_trials_trial';
			},
		};

		self.pt_trial = {};

		self.test_trial = {
			type: htmlButtonResponse,
			stimulus: function () {
				let left_box_label = `<span>${Math.max(...self.jsPsych.timelineVariable('ball_split'))} <span style="color: ${self.jsPsych.timelineVariable('left_box_majority_color')};">${self.jsPsych.timelineVariable('left_box_majority_color')}</span>, ${Math.min(...self.jsPsych.timelineVariable('ball_split'))} <span style="color: ${self.jsPsych.timelineVariable('right_box_majority_color')};">${self.jsPsych.timelineVariable('right_box_majority_color')}</span></span>`;
				let right_box_label = `<span>${Math.max(...self.jsPsych.timelineVariable('ball_split'))} <span style="color: ${self.jsPsych.timelineVariable('right_box_majority_color')};">${self.jsPsych.timelineVariable('right_box_majority_color')}</span>, ${Math.min(...self.jsPsych.timelineVariable('ball_split'))} <span style="color: ${self.jsPsych.timelineVariable('left_box_majority_color')};">${self.jsPsych.timelineVariable('left_box_majority_color')}</span></span>`;
				return `<div id="draws_container">
                            <div id="current_draw_container">
                                <div>CURRENT DRAW</div>
                                <div id="curr_draw_balls"></div>
                            </div>
                            <div id="past_draws_container">
                                <div>PAST DRAWS</div>
                                <div id="past_draw_balls"></div>
                            </div>
                        </div>
                        <div id="boxes_container">
                            <div id="left_box_label">Left box<br>${left_box_label}</div>
                            <div id="right_box_label">Right box<br>${right_box_label}</div>
                            <div id="left_box" class="box"></div>
                            <div id="black_box" class="box"><div id="black_box_top_border"></div></div>
                            <div id="right_box" class="box"></div>
                        </div>
                        <div id="question_container">${self.settings.task_version_parameters[self.jsPsych.timelineVariable('version', true)].question}</div>
                        <div id="slider_and_labels_container">
                            <div id="slider_current_selection_container">
                                <div id="slider_current_selection_text">${self.settings.task_version_parameters[self.jsPsych.timelineVariable('version', true)].slider_initial_text}</div>
                            </div>
                            <div id="slider_container">
                                <input name="response_slider" id="response_slider" type="range" min="0" max="100" step="1" value="50" class="jspsych-slider" style="width: 100%">
                            </div>	
                            <div id="slider_labels_container">
                                <div>${self.settings.task_version_parameters[self.jsPsych.timelineVariable('version', true)].labels[0]}</div>
                                <div>${self.settings.task_version_parameters[self.jsPsych.timelineVariable('version', true)].labels[1]}</div>
                                <div>${self.settings.task_version_parameters[self.jsPsych.timelineVariable('version', true)].labels[2]}</div>
                            </div>
                        </div>
                        `;
			},
			timer: self.settings.test_trial_time_limit,
			on_start: function (trial) {
				if (self.settings.simulate) {
					self.jsPsych.pluginAPI.setTimeout(
						() => {
							let slider_value = self.jsPsych.randomization.randomInt(0, 100);
							trial.data.response_slider = slider_value;
							document.querySelector('#response_slider').value = slider_value;
							document.querySelector('.jspsych-btn').disabled = false;
						},
						Math.max(
							self.jsPsych.timelineVariable('current_draw', true).length *
								self.settings.ball_move_duration +
								self.settings.ball_move_duration +
								50,
							self.settings.fade_in_animation_duration +
								self.settings.wait_after_box_opening_to_draw_balls
						) + self.settings.fade_in_animation_duration
					);
				} else {
					// we will not fade in in simulate mode
					fade_in_on_unique_trial();
				}
			},
			on_load: function () {
				document.querySelector('#response_slider').disabled = true;
				document.querySelector('.jspsych-btn').disabled = true;

				if (self.jsPsych.timelineVariable('version') == 'hard') {
					document
						.querySelector('#response_slider')
						.style.setProperty('--track-color', `hsl(240, 100%, 55%)`);
				} else {
					document
						.querySelector('#response_slider')
						.style.setProperty('--track-color', `hsl(0, 100%, 100%)`);
				}
				// all boxes have the same size and are squared
				// minus at the end for borders
				let box_size =
					document.getElementById('black_box').getBoundingClientRect()['width'] - 4;
				let ball_container_size = (box_size * 0.99) / 10;
				let ball_size = ball_container_size * 0.9;
				let ball_margin = ball_container_size * 0.1;

				document.querySelector('#left_box_label').style.width = `${box_size + 4}px`;
				document.querySelector('#right_box_label').style.width = `${box_size + 4}px`;

				draw_balls_left_right_black_boxes(ball_container_size, ball_size, ball_margin);

				draw_balls_current_draw(box_size, ball_container_size, ball_size, ball_margin);

				draw_balls_past_draw(box_size, ball_container_size, ball_size, ball_margin);

				if (self.settings.simulate) {
					document
						.querySelectorAll('.ball')
						.forEach(
							(e) =>
								(e.style.transitionDuration = `${self.settings.ball_move_duration}ms`)
						);
					document.querySelector('#black_box_top_border').style.transitionDuration =
						`${self.settings.fade_in_animation_duration}ms`;
				}

				move_curr_draw_to_past_draw();

				// Open the box
				// self.jsPsych.pluginAPI.setTimeout(() => {document.querySelector("#black_box_top_border").style.transform = "rotate(-130deg)"}, self.settings.fade_in_animation_duration)
				self.jsPsych.pluginAPI.setTimeout(() => {
					document.querySelector('#black_box_top_border').style.transform =
						'translateX(-100%)';
				}, self.settings.fade_in_animation_duration);

				self.jsPsych.pluginAPI.setTimeout(
					move_black_balls_to_curr_draw,
					self.settings.fade_in_animation_duration +
						self.settings.wait_after_box_opening_to_draw_balls
				);

				// Close the box and enable responding
				self.jsPsych.pluginAPI.setTimeout(
					() => {
						document.querySelector('#black_box_top_border').style.transform = '';
						document.querySelector('#slider_and_labels_container').style.opacity = '1';
						document.querySelector('#response_slider').disabled = false;
					},
					Math.max(
						self.jsPsych.timelineVariable('current_draw', true).length *
							self.settings.ball_move_duration +
							self.settings.ball_move_duration +
							50,
						self.settings.fade_in_animation_duration +
							self.settings.wait_after_box_opening_to_draw_balls
					) + self.settings.fade_in_animation_duration
				);

				let trial_obj = this;
				document.getElementById('response_slider').addEventListener('input', (event) => {
					response_slider_listener(event, trial_obj);
				});
				document.getElementById('response_slider').addEventListener('click', (event) => {
					response_slider_listener(event, trial_obj);
				});
			},
			css_classes: ['content-size'],
			choices: ['Continue'],
			data: { response_slider: null },
			on_finish: function (data) {
				data.trial_name = 'bayesian_update_test_trial';
				data.pt_trial = self.jsPsych.timelineVariable('pt_trial', true);
				data.block = self.jsPsych.timelineVariable('block', true);
				data.trial = self.jsPsych.timelineVariable('trial', true);
				data.unique_trial = self.jsPsych.timelineVariable('unique_trial', true);
				data.unique_trial_draw_number = self.jsPsych.timelineVariable(
					'unique_trial_draw_number',
					true
				);
				data.ball_split = self.jsPsych.timelineVariable('ball_split', true);
				data.left_box_majority_color = self.jsPsych.timelineVariable(
					'left_box_majority_color',
					true
				);
				data.right_box_majority_color = self.jsPsych.timelineVariable(
					'right_box_majority_color',
					true
				);
				data.selected_box_majority_color = self.jsPsych.timelineVariable(
					'selected_box_majority_color',
					true
				);
				data.current_draw = self.jsPsych.timelineVariable('current_draw', true);
				data.past_draws = self.jsPsych.timelineVariable('past_draws', true);
				data.version = self.jsPsych.timelineVariable('version', true);

				let draws = data.past_draws.flat();
				draws.push(data.current_draw[0]);
				let blue_balls = draws.filter((e) => e == 'blue').length;
				let red_balls = draws.filter((e) => e == 'red').length;
				let probability_blue_ball = data.ball_split[1] / 100;
				let probability_red_ball = data.ball_split[0] / 100;
				let true_odds_blue_urn =
					(probability_blue_ball / probability_red_ball) ** (blue_balls - red_balls);

				let reported_probability;
				let true_odds;
				if (data.version == 'easy') {
					reported_probability =
						(data.right_box_majority_color == 'blue'
							? data.response_slider
							: 100 - data.response_slider) / 100;
					true_odds = true_odds_blue_urn;
				} else if (data.version == 'hard') {
					reported_probability = data.response_slider / 100;
					let true_probability_blue_urn = true_odds_blue_urn / (1 + true_odds_blue_urn);
					let true_probability_blue_ball =
						true_probability_blue_urn * probability_blue_ball +
						(1 - true_probability_blue_urn) * (1 - probability_blue_ball);
					true_odds = true_probability_blue_ball / (1 + true_probability_blue_ball);
				}
				let reported_odds = reported_probability / (1 + reported_probability);
				let score = Math.abs(Math.log(reported_odds) - Math.log(true_odds));

				data.score = score;
				// console.log("Draws: ", draws)
				// console.log("Probability blue ball: ", probability_blue_ball)
				// console.log("Reported probability: ", reported_probability)
				// console.log("Score: ", score)
			},
			simulation_options: {
				data: {
					rt: () => {
						let delay_for_animation =
							Math.max(
								self.jsPsych.timelineVariable('current_draw', true).length *
									self.settings.ball_move_duration +
									self.settings.ball_move_duration,
								self.settings.fade_in_animation_duration +
									self.settings.wait_after_box_opening_to_draw_balls
							) + self.settings.fade_in_animation_duration;
						let rt =
							delay_for_animation + self.settings.simulate_trial_duration;
						return rt;
					},
				},
			},
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let that = this;

		let timeline = [];
		const timeline_between_unique_trials = {
			timeline: [this.between_unique_trials_trial],
			conditional_function: function () {
				return (
					that.jsPsych.data.get().last(1).values()[0]['unique_trial_draw_number'] ===
					that.settings.draws_per_unique_trial - 1
				);
			},
		};
		const pt_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial, timeline_between_unique_trials],
				this.settings.pt_block,
				null,
				this.task_data.pt_trials,
				'pt'
			);
		const test_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial, timeline_between_unique_trials],
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
		timeline.push(pt_trials_timeline);
		timeline.push(this.test_trials_instructions);
		timeline.push(test_trials_timeline);
		return timeline;
	}
}
