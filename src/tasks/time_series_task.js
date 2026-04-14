import Chart from 'chart.js/auto';
import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import instructions from '@jspsych/plugin-instructions';
import { deepMerge, construct_full_media_path, format_ind_to_key, get_task_trials_timeline_with_interblock_text, range } from '../utils/helpers.js';

export default class Time_Series {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 6;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [
			'instructions/time_series_instructions_1.png',
		].map((f) => construct_full_media_path(this.media_basepath, f));
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.task_data = this.get_task_data();
		this.define_trials();
	}

	get_default_settings() {
		let settings = {
			general_instructions_time_limit: 180,
			pt_trials_instructions_time_limit: 20,
			test_trials_instructions_time_limit: 30,
			test_trial_time_limit: 20,
			ignore_validation: false,

			SHOW_CONDITIONS_DURING_TRIAL: false,
			FUNCTIONS: ['linear', 'exponential'],
			DIRECTIONS: ['positive', 'negative'],
			datapoints: ['datapoints_10', 'datapoints_30'],
			// noise is defined as a % of the chart's height
			// if the graph's height is 650px, then the low noise is 12px and high is 40px (as per R&H, 2011)
			NOISE: { low: 1.9, high: 6.2 },
			graphs_per_condition: 1,
			pt_trials_n: 4,
			pt_trials_per_block: 4,
			pt_blocks: 1,
		};

		settings.test_trials_n =
			settings.FUNCTIONS.length *
			settings.DIRECTIONS.length *
			Object.keys(settings.NOISE).length *
			settings.datapoints.length *
			settings.graphs_per_condition;
		settings.test_trials_per_block = settings.test_trials_n;
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
				function: this.jsPsych.randomization.sampleWithoutReplacement(
					this.settings.FUNCTIONS,
					1
				)[0],
				direction: this.jsPsych.randomization.sampleWithoutReplacement(
					this.settings.DIRECTIONS,
					1
				)[0],
				noise_condition: this.jsPsych.randomization.sampleWithoutReplacement(
					Object.keys(this.settings.NOISE),
					1
				)[0],
				datapoints: this.jsPsych.randomization.sampleWithoutReplacement(
					this.settings.datapoints,
					1
				)[0],
			};
		}

		// ------------------------TEST TRIALS DATA
		let all_trials_data = [];
		for (let func of this.settings.FUNCTIONS) {
			for (let dir of this.settings.DIRECTIONS) {
				for (let noise_condition of Object.keys(this.settings.NOISE)) {
					for (let datapoints of this.settings.datapoints) {
						for (let i = 0; i < this.settings.graphs_per_condition; i++) {
							all_trials_data.push({
								function: func,
								direction: dir,
								noise_condition: noise_condition,
								datapoints: datapoints,
							});
						}
					}
				}
			}
		}
		for (let s = 0; s < 5; s++) {
			all_trials_data = this.jsPsych.randomization.shuffle(all_trials_data);
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
				function: all_trials_data[test_trial_ind].function,
				direction: all_trials_data[test_trial_ind].direction,
				noise_condition: all_trials_data[test_trial_ind].noise_condition,
				datapoints: all_trials_data[test_trial_ind].datapoints,
			};
		}
		return task_data;
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		function sample_linear_model(x_axis_values, chart_height, noise_condition, direction) {
			let final_x =
				x_axis_values.length % 10 == 0 ? x_axis_values.length + 6 : x_axis_values.length;
			let noise_sd = Object.keys(self.settings.NOISE).includes(noise_condition)
				? chart_height * (self.settings.NOISE[noise_condition] / 100)
				: 0;

			let constant = direction == 'positive' ? chart_height / 3 : (chart_height * 2) / 3;
			let limit_at_final_x =
				direction === 'positive' ? (chart_height * 2) / 3 : chart_height / 3;
			let slope =
				direction === 'positive'
					? (limit_at_final_x - constant) / final_x
					: -(constant - limit_at_final_x) / final_x;

			let y_axis_values = [];
			for (let x of x_axis_values) {
				let noise = self.jsPsych.randomization.sampleNormal(0, noise_sd);
				let y = constant + slope * x + noise;
				y_axis_values.push(y);
			}
			return y_axis_values;
		}

		function sample_expontential_model(
			x_axis_values,
			chart_height,
			noise_condition,
			direction
		) {
			let final_x =
				x_axis_values.length % 10 == 0 ? x_axis_values.length + 6 : x_axis_values.length;
			let noise_sd = Object.keys(self.settings.NOISE).includes(noise_condition)
				? chart_height * (self.settings.NOISE[noise_condition] / 100)
				: 0;

			let constant = direction === 'positive' ? chart_height / 6 : (chart_height * 5) / 6;
			let limit_at_final_x =
				direction === 'positive' ? (chart_height * 5) / 6 : chart_height / 6;

			let base =
				direction === 'positive'
					? (limit_at_final_x - constant) ** (1 / final_x)
					: (constant - limit_at_final_x) ** (1 / final_x);

			let y_axis_values = [];
			for (let x of x_axis_values) {
				let noise = self.jsPsych.randomization.sampleNormal(0, noise_sd);
				let y =
					direction == 'positive'
						? constant + base ** x + noise
						: constant - base ** x + noise;
				y_axis_values.push(y);
			}
			return y_axis_values;
		}

		function get_y_axis_values(
			chart_height,
			x_axis_values,
			func,
			direction,
			noise_condition
		) {
			let y_axis_values = [];
			if (func == 'linear') {
				y_axis_values = sample_linear_model(
					x_axis_values.slice(0, -6),
					chart_height,
					noise_condition,
					direction
				);
			} else if (func == 'exponential') {
				y_axis_values = sample_expontential_model(
					x_axis_values.slice(0, -6),
					chart_height,
					noise_condition,
					direction
				);
			}
			y_axis_values = y_axis_values.map((y) => {
				if (y > chart_height) {
					return chart_height;
				}
				if (y < 0) {
					return 0;
				}
				return y;
			});
			// console.log(y_axis_values)
			return y_axis_values;
		}

		function simulate_chart_click(xPoint, chartInstance, delay = 0) {
			self.jsPsych.pluginAPI.setTimeout(() => {
				const canvasRect = chartInstance.canvas.getBoundingClientRect();

				const xValue = Math.round(chartInstance.scales.x.getPixelForValue(xPoint));
				const yValue = Math.random() * chartInstance.chartArea.height;

				const clickEvent = new MouseEvent('click', {
					clientX: xValue + canvasRect.left,
					clientY: yValue + canvasRect.top,
					bubbles: true,
					cancelable: true,
					view: window,
				});

				chartInstance.canvas.dispatchEvent(clickEvent);
			}, delay);
		}

		self.general_instructions = {
			type: instructions,
			pages: [
				`<p class="instructions-title" style="text-align: center">Predict the next point on the graph</p>
                    <p>In this task, you will be in the role of a forecaster making predictions based on historical trends. However, we are not going to tell you the specific topic the prediction is about. We will show you past historical data.</p>
                    <p>In each case, the pattern is based on an underlying trend that can be inferred from the observed data points. The x-axis represents time and the y-axis the corresponding value.</p>
                    <p>Your task is to extrapolate from the existing trend and guess what the y-axis values should be for the missing 6 points. To do this, please click on the blue lines where the y-axis values are initially missing to fill them.</p>
                    <p>Proceed to the next page to see an example.</p>`,

				`<p class="instructions-title" style="text-align: center">Predict the next point on the graph</p>
                    <p>In the example below you can see 30 points of data. These are based on an underlying trend.</p>
                    <p>Your job during the test trials will be to predict the next six datapoints based on your interpretation of this trend. To do so, <b>you can click on the graph at the points where you predict the next six points will be</b>.</p>
                    <p>Your score for this task will be based on how close your predictions are to the actual underlying trend. Note that you will not receive immediate feedback on this part of the test, but we will tell you your score and its percentile rank in a follow-up score report.</p>
                    <div style="width: 90%; margin: auto;"><img style="width: 100%; border: 2px solid black;" src="${construct_full_media_path(self.media_basepath, 'instructions/time_series_instructions_1.png')}"/></div>`,
			],
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'time_series_general_instructions';
			},
		};

		self.pt_trials_instructions = {
			type: instructions,
			pages: [
				`<p class="instructions-title" style="text-align: center">Predict the next point on the graph</p>
                    <p>The previous example was only a demonstration. You will now complete ${self.settings.pt_trials_n} practice items. These will not count towards your score.</p>
                    <p>These items will vary in difficulty.</p>
                    <p>Please proceed to the next page to complete the practice items.</p>
                    `,
			],
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.pt_trials_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'time_series_pt_trials_instructions';
			},
		};

		self.test_trials_instructions = {
			type: instructions,
			pages: [
				`<p class="instructions-title" style="text-align: center">Predict the next point on the graph</p>
                    <p>You will now progress to the test items. There will be ${self.settings.test_trials_n} test items.</p>
                    <p>Remeber that <b>your task is</b> to figure out the trend based on the existing datapoints, and predict the next six datapoints.</p>
                    `,
			],
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.test_trials_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'time_series_test_trials_instructions';
			},
		};

		self.pt_trial = {};

		self.test_trial = {
			type: htmlButtonResponse,
			stimulus: function () {
				let html = `<canvas id="myChart"></canvas>`;
				if (self.settings.SHOW_CONDITIONS_DURING_TRIAL) {
					html += `<p style="position: absolute; top: -1%; left: 50%; transform: translate(-50%)">
                                <b>function</b>: ${self.jsPsych.timelineVariable('function')}; 
                                <b>direction</b>: ${self.jsPsych.timelineVariable('direction')}; 
                                <b>noise</b>: ${self.jsPsych.timelineVariable('noise_condition')} 
                            </p>`;
				}
				return html;
			},
			on_load: function () {
				let that = this;

				document.querySelector('#jspsych-html-button-response-stimulus').style.height =
					'100%';
				const continue_button = document.querySelector('.jspsych-btn');
				if (!self.settings.ignore_validation) {
					continue_button.style.visibility = 'hidden';
				}

				const canvas = document.getElementById('myChart');
				const ctx = canvas.getContext('2d');

				const x_axis_values = range(
					1,
					parseInt(self.jsPsych.timelineVariable('datapoints').split('_')[1]) + 6,
					1
				);

				const data = {
					labels: x_axis_values,
					datasets: [
						{
							data: [],
							borderColor: 'black',
							pointStyle: 'circle',
							pointRadius: 4,
							pointBackgroundColor: 'orange',
						},
					],
				};

				const config = {
					type: 'line',
					data: data,
					// plugins: [{
					// 	afterLayout: (chart) => {
					// 		// const chartHeight = chart.chartArea.bottom - chart.chartArea.top;
					// 		// chart.options.scales.y.max = chartHeight;
					// 		// can't call chart.update() here as otherwise after every update, the afterLayout executes again, leading to recursion
					// 		// chart.update();
					// 	}
					// }],
					options: {
						responsive: true,
						maintainAspectRatio: false,
						onClick: null,
						plugins: {
							legend: {
								display: false,
							},
							tooltip: {
								enabled: false,
							},
						},
						scales: {
							x: {
								grid: {
									color: (context) => {
										const xAxisIndicesToColor =
											range(
												data.labels.length - 6,
												data.labels.length,
												1
											);
										if (xAxisIndicesToColor.includes(context.tick.value)) {
											return 'blue';
										}
										return 'rgba(0, 0, 0, 0.1)';
									},
								},
							},
							y: {
								min: 0,
								ticks: {
									display: false,
									callback: function (value) {
										return Math.round(value) + 'px';
									},
								},
								grid: {
									display: false,
								},
							},
						},
					},
				};

				const chart = new Chart(ctx, config);
				that.data.chart_height = chart.chartArea.height;
				chart.options.scales.y.max = chart.chartArea.height;

				let y_axis_values = get_y_axis_values(
					chart.chartArea.height,
					x_axis_values,
					self.jsPsych.timelineVariable('function'),
					self.jsPsych.timelineVariable('direction'),
					self.jsPsych.timelineVariable('noise_condition')
				);

				// not sure why but this saves not only the pre-defined values but also the newly selected ones (though those are saved as strings via toFixed(2) below)
				that.data.y_axis_values = y_axis_values;

				data.datasets[0].data = y_axis_values;
				// use the next few lines to create images/gifs for the instructions
				// self.jsPsych.randomization.setSeed(124)
				// for (let i=0; i<x_axis_values.length-6; i++) {
				//     let random_noise = self.jsPsych.randomization.sampleNormal(0, 25)
				//     data.datasets[0].data.push(chart.chartArea.height/2+random_noise)
				// }
				// data.datasets.push({data: Array(x_axis_values.length).fill(chart.chartArea.height/2), borderColor: 'green', fill: false})
				chart.update();

				// Set the onClick function after creating the chart instance
				chart.options.onClick = (event) => {
					const x = event.x;
					const y = event.y;

					const xValue = Math.round(chart.scales.x.getValueForPixel(x));
					const yValue = chart.scales.y.getValueForPixel(y);

					if (
						!range(data.labels.length - 6, data.labels.length, 1)
							.includes(xValue)
					)
						return; // prevent adding points at certin x-axis values

					data.datasets[0].data[xValue] = yValue.toFixed(2);
					chart.update();

					let show_continue_button = true;
					for (let x of range(
						data.labels.length - 6,
						data.labels.length,
						1
					)) {
						if (data.datasets[0].data[x - 1] === undefined) {
							show_continue_button = false;
						}
					}
					if (show_continue_button) {
						continue_button.style.visibility = 'visible';
					}
				};
				if (self.settings.simulate) {
					continue_button.style.visibility = 'visible';
					let n_points_to_select =
						self.settings.simulation_options?.[this.simulation_options]?.data?.()
							?.n_points_to_select ?? 6;
					let x_axis_points_to_select =
						self.jsPsych.randomization.sampleWithoutReplacement(
							range(
								x_axis_values.length - 6,
								x_axis_values.length - 1,
								1
							),
							n_points_to_select
						);
					x_axis_points_to_select.sort();
					for (let i = 0; i < x_axis_points_to_select.length; i++) {
						simulate_chart_click(
							x_axis_points_to_select[i],
							chart,
							(i * (self.settings.simulate_trial_duration ?? 25)) / 6
						);
					}
				}
			},
			data: { y_axis_values: null, chart_height: null },
			choices: ['Continue'],
			// trial_duration: null,
			css_classes: ['chart_size'],
			timer: self.settings.test_trial_time_limit,
			on_finish: function (data) {
				data.trial_name = 'time_series_trial';
				data.pt_trial = self.jsPsych.timelineVariable('pt_trial');
				data.block = self.jsPsych.timelineVariable('block');
				data.trial = self.jsPsych.timelineVariable('trial');
				data.func = self.jsPsych.timelineVariable('function');
				data.direction = self.jsPsych.timelineVariable('direction');
				data.noise_condition = self.jsPsych.timelineVariable('noise_condition');
				data.datapoints = self.jsPsych.timelineVariable('datapoints');
			},
			simulation_options: 'time_series',
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];

		const pt_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial],
				this.settings.pt_blocks,
				null,
				this.task_data.pt_trials,
				'pt'
			);
		const test_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial],
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
