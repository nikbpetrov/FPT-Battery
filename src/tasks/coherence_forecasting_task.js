import instructions from '@jspsych/plugin-instructions';
import surveyHtmlForm from '@jspsych/plugin-survey-html-form';
import { deepMerge } from '../utils/helpers.js';

export default class Coherence_Forecasting {
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
			cfs_items: this.get_cfs_items(),
			ignore_validation: false,
			general_instructions_time_limit: 60,
			block_timer_per_item: 20,
		};
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		function check_all_sliders_moved(all_sliders) {
			for (const slider in all_sliders) {
				if (!all_sliders[slider]) return false;
			}
			return true;
		}

		function handle_slider_change(trial_obj, slider_id, all_sliders, next_button) {
			all_sliders[slider_id] = true;
			if (!trial_obj.data.moved_sliders.includes(slider_id)) {
				trial_obj.data.moved_sliders += `${slider_id},`;
			}
			if (check_all_sliders_moved(all_sliders)) {
				document.querySelector('#slider_text').style.visibility = 'hidden';
				next_button.disabled = false;
			}
		}

		self.general_instructions = {
			type: instructions,
			pages: [
				`<p><u><b>Instructions</b></u></p>
                    <p>On the following pages, you will be asked to estimate the likelihood of different outcomes. They use the "probability" scale that you see below. To answer each question, please move the slider to the desired position.</p>
                    <p>If you think that something has no chance of happening, mark it as having a 0% chance. If you think that something is certain to happen, mark it as having a 100% chance.</p>
                    <div class="slider-labels-container">
                            <input name="instr" id="instr_slider" type="range" min="0" max="100" step="1" value="0" class="jspsych-slider" style="width: 100%">
                            <div class="labels-container">
                                <div style="left: calc(0% - (10%/2) - -7.5px);"><span>0%<br>no chance</span></div>
                                <div style="left: calc(10% - (10%/2) - -6px);"><span>10%</span></div>
                                <div style="left: calc(20% - (10%/2) - -4.5px);"><span>20%</span></div>
                                <div style="left: calc(30% - (10%/2) - -3px);"><span>30%</span></div>
                                <div style="left: calc(40% - (10%/2) - -1.5px);"><span>40%</span></div>
                                <div style="left: calc(50% - (10%/2) - 0px);"><span>50%</span></div>
                                <div style="left: calc(60% - (10%/2) - 1.5px);"><span>60%</span></div>
                                <div style="left: calc(70% - (10%/2) - 3px);"><span>70%</span></div>
                                <div style="left: calc(80% - (10%/2) - 4.5px);"><span>80%</span></div>
                                <div style="left: calc(90% - (10%/2) - 6px);"><span>90%</span></div>
                                <div style="left: calc(100% - (10%/2) - 7.5px);"><span>100%<br>certainty</span></div>
                            </div>
                        </div>
                    `,
			],
			show_clickable_nav: true,
			allow_backward: false,
			css_classes: ['instructions_width'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'cfs_general_instructions';
			},
		};

		self.create_trial = function (block) {
			return {
				type: surveyHtmlForm,
				// preamble: '<p><b>A. The following questions ask about events that may happen some time during the <i>next year</i></b></p>',
				html: function () {
					let html = '';
					self.settings.cfs_items
						.filter((e) => e.block === block)
						.forEach((e) => {
							html += `<div class="statement">${e.statement}</div>
                        <div style="margin-bottom: 1em">${e.id.includes('binary') || e.id.includes('trinary') ? 'How likely is that outcome?' : ''}</div>
                        <div class="slider-labels-container">
                            <input name="${e.id}" id="${e.id}_slider" type="range" min="0" max="100" step="1" value="0" class="jspsych-slider" style="width: 100%">
                            <div class="labels-container">
                                <div style="left: calc(0% - (10%/2) - -7.5px);"><span>0%<br>no chance</span></div>
                                <div style="left: calc(10% - (10%/2) - -6px);"><span>10%</span></div>
                                <div style="left: calc(20% - (10%/2) - -4.5px);"><span>20%</span></div>
                                <div style="left: calc(30% - (10%/2) - -3px);"><span>30%</span></div>
                                <div style="left: calc(40% - (10%/2) - -1.5px);"><span>40%</span></div>
                                <div style="left: calc(50% - (10%/2) - 0px);"><span>50%</span></div>
                                <div style="left: calc(60% - (10%/2) - 1.5px);"><span>60%</span></div>
                                <div style="left: calc(70% - (10%/2) - 3px);"><span>70%</span></div>
                                <div style="left: calc(80% - (10%/2) - 4.5px);"><span>80%</span></div>
                                <div style="left: calc(90% - (10%/2) - 6px);"><span>90%</span></div>
                                <div style="left: calc(100% - (10%/2) - 7.5px);"><span>100%<br>certainty</span></div>
                            </div>
                        </div>`;
						});
					html += `<p id="slider_text" style="text-align: center"><i>Move all sliders to continue.</i></p>`;
					return html;
				},
				on_load: function () {
					let that = this;

					let next_button = document.querySelector('#jspsych-survey-html-form-next');
					if (!(self.settings.ignore_validation === true)) {
						next_button.disabled = true;

						let sliders_moved = {};
						document.querySelectorAll(`input[type="range"]`).forEach((e) => {
							sliders_moved[e.id] = false;
							// these 3 event listeners might be replaced by a single 'input' one
							// but in this case we are just preserving the jsPsych style as per plugin-html-slider-response.js
							e.addEventListener('mousedown', () =>
								handle_slider_change(that, e.id, sliders_moved, next_button)
							);
							e.addEventListener('touchstart', () =>
								handle_slider_change(that, e.id, sliders_moved, next_button)
							);
							e.addEventListener('change', () =>
								handle_slider_change(that, e.id, sliders_moved, next_button)
							);
						});
					}

					if (self.settings.simulate) {
						next_button.disabled = false;
						// let n_sliders_to_move = self.Experiment.simulation_options[this.simulation_options].data.valid_responses_n
						// let sliders_to_move = self.jsPsych.randomization.sampleWithoutReplacement(Array.from(document.querySelectorAll(`input[type="range"]`)), n_sliders_to_move)
						let sliders_to_move = Array.from(
							document.querySelectorAll(`input[type="range"]`)
						);
						sliders_to_move.forEach(
							(e) => (e.value = self.jsPsych.randomization.randomInt(0, 100))
						);
					}
				},
				data: { moved_sliders: '' },
				timer: self.settings.cfs_items.filter((e) => e.block === block).length * self.settings.block_timer_per_item,
				css_classes: ['content-size'],
				on_finish: function (data) {
					data.trial_name = 'cfs_test_trial';
					data.cfs_id =
						typeof data.response !== 'undefined' ? Object.keys(data.response) : null;
					data.cfs_response =
						typeof data.response !== 'undefined' ? Object.values(data.response) : null;
				},
			};
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		timeline.push(this.general_instructions);
		if (hide_progress_bar_trial_generator) {
			timeline.push(hide_progress_bar_trial_generator);
		}
		for (let block of [...new Set(this.settings.cfs_items.map((item) => item.block))]) {
			timeline.push(this.create_trial(block));
		}
		return timeline;
	}

	get_cfs_items() {
		return [
			{
				id: 'trinary_A',
				block: 'trinary',
				statement:
					'In the past five years, the average gas price, in the United States was below $2.25 per gallon.',
			},
			{
				id: 'trinary_B',
				block: 'trinary',
				statement:
					'In the past five years, the average gas price, in the United States was between $2.25 and $2.50 per gallon.',
			},
			{
				id: 'trinary_C',
				block: 'trinary',
				statement:
					'In the past five years, the average gas price, in the United States was above $2.50 per gallon.',
			},
			{
				id: 'trinary_AB',
				block: 'trinary',
				statement:
					'In the past five years, the average gas price, in the United States was below $2.50 per gallon.',
			},
			{
				id: 'trinary_BC',
				block: 'trinary',
				statement:
					'In the past five years, the average gas price, in the United States was above $2.25 per gallon.',
			},
			{
				id: 'binary_statepop1',
				block: 'binary_1',
				statement: 'New Jersey has a higher population than Minnesota.',
			},
			{
				id: 'binary_statearea1',
				block: 'binary_1',
				statement: 'Arizona has a greater land mass than South Dakota.',
			},
			{
				id: 'binary_gdp1',
				block: 'binary_1',
				statement:
					'Over the past five years, Washington had an average higher Gross Domestic Product (GDP), or the total value of goods produced by an economy, than Utah.',
			},
			{
				id: 'binary_statepop2',
				block: 'binary_2',
				statement: 'Minnesota has a higher population than New Jersey.',
			},
			{
				id: 'binary_statearea2',
				block: 'binary_2',
				statement: 'South Dakota has a greater land mass than Arizona.',
			},
			{
				id: 'binary_gdp2',
				block: 'binary_2',
				statement:
					'Over the past five years, Utah had an average higher Gross Domestic Product (GDP), or the total value of goods produced by an economy, than Washington.',
			},
			{
				id: 'time1',
				block: 'time_1',
				statement:
					'What is the probability of Chicago, IL, reaching an all-time low temperature in the next year?',
			},
			{
				id: 'time2',
				block: 'time_1',
				statement:
					'What is the probability of Chicago, IL, reaching an all-time low temperature in the next three years?',
			},
			{
				id: 'time3',
				block: 'time_1',
				statement:
					'What is the probability of Chicago, IL, reaching an all-time low temperature in the next five years?',
			},
			{
				id: 'time4',
				block: 'time_2',
				statement:
					'What is the probability of an earthquake occurring in Seattle, WA, in the next year?',
			},
			{
				id: 'time5',
				block: 'time_2',
				statement:
					'What is the probability of an earthquake occurring in Seattle, WA, in the next three years?',
			},
			{
				id: 'time6',
				block: 'time_2',
				statement:
					'What is the probability of an earthquake occurring in Seattle, WA, in the next five years?',
			},
			{
				id: 'space1',
				block: 'space_1',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record-high temperature in the city of San Francisco, CA, over the past five years?',
			},
			{
				id: 'space2',
				block: 'space_1',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record-high temperature anywhere in the state of California over the past five years?',
			},
			{
				id: 'space3',
				block: 'space_1',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record-high temperature anywhere in the United States over the past five years?',
			},
			{
				id: 'space4',
				block: 'space_2',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record high snowfall in the city of Juneau, AK, over the past five years?',
			},
			{
				id: 'space5',
				block: 'space_2',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record high snowfall anywhere in Alaska over the past five years?',
			},
			{
				id: 'space6',
				block: 'space_2',
				statement:
					'What is the probability that the National Weather Service (NWS) reported a record high snowfall anywhere in the United States over the past five years?',
			},
			{
				id: 'confidence_interval1',
				block: 'confidence_interval',
				statement:
					'Consider the 20 longest rivers in the US. How likely is it that the length of one of them is between 2000 and 2600 miles?',
			},
			{
				id: 'confidence_interval2',
				block: 'confidence_interval',
				statement:
					'Consider the 20 longest rivers in the US. How likely is it that the length of one of them is between 1900 and 2700 miles?',
			},
			{
				id: 'confidence_interval3',
				block: 'confidence_interval',
				statement:
					'Consider the 20 longest rivers in the US. How likely is it that the length of one of them is between 1800 and 2800 miles?',
			},
		];
	}
}
