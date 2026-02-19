import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import instructions from '@jspsych/plugin-instructions';
import surveyHtmlForm from '@jspsych/plugin-survey-html-form';
import { deepMerge, format_ind_to_key, get_task_trials_timeline_with_interblock_text } from '../utils/helpers.js';

export default class Impossible_Question {
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
		return {
			general_instructions_time_limit: 60,
			test_trial_time_limit: 20,
			test_trial_feedback_time_limit: 10,
			
			use_anchor_version: false,
			gk_forms: this.get_gk_forms(),
			iq_forms: this.get_iq_forms(),
			general_knowledge_questions: this.get_general_knowledge_questions(),
			impossible_questions: this.get_impossible_questions(),
			test_trials_n: 30,
			test_trials_per_block: 30,
			test_blocks: 1,
			ignore_validation: false,
		};
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

		// ------------------------TEST TRIALS DATA
		let curr_pp_aig_version = this.settings.use_anchor_version
			? 'anchor'
			: this.jsPsych.randomization.sampleWithoutReplacement(
					Object.keys(this.settings.gk_forms).filter((e) => e != 'anchor'),
					1
				)[0];
		let curr_pp_gk_qs = this.settings.general_knowledge_questions.filter((e) =>
			this.settings.gk_forms[curr_pp_aig_version].includes(e.id)
		);
		let curr_pp_iq_qs = this.settings.impossible_questions.filter((e) =>
			this.settings.iq_forms[curr_pp_aig_version].includes(e.id)
		);
		let curr_pp_qs = this.jsPsych.randomization.shuffle([...curr_pp_gk_qs, ...curr_pp_iq_qs]);
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
				id: curr_pp_qs[test_trial_ind]['id'],
				question_text: curr_pp_qs[test_trial_ind]['question_text'],
				answer_1: curr_pp_qs[test_trial_ind]['answer_1'],
				answer_2: curr_pp_qs[test_trial_ind]['answer_2'],
				correct_answer: curr_pp_qs[test_trial_ind]['correct_answer'],
				aig_version: curr_pp_aig_version,
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
				`<p class="instructions-title" style="text-align: center">General knowledge questions</p>
                    <p>In this task, you will answer ${self.settings.test_trials_n} questions, each with two possible answers. After every question, you will receive feedback based on your performance. Below is an example question.</p>
                    <p>You can also opt-out (skip) if you are not confident enough in either answer. In that case, you won't be scored based on that answer.</p>
                    <p>After answering each question, you will will be asked to judge how likely it is that you answered that question correctly.</p>

                    <div id="iqc_question_container" style="border: 2px solid black; text-align: center">
                        <div id="iqc_question">1 + 1 = 2</div>
                        <div id="iqc_radio_opts_container" style="margin: 1% 0">
                            <div><input type="radio" name="example" value="1" id="example_1"/><label for="example_1">True</label></div>
                            <div><input type="radio" name="example" value="2" id="example_2"/><label for="example_2">False</label></div>
                            <div><input type="radio" name="example" value="3" id="example_3"/><label for="example_3">Opt-out</label></div>
                        </div>
                        <p id="confidence_question" style="opacity: 1; margin-bottom: 1%;">What is the probability that you answered the above question correctly?</p>
                        <div id="iqc_slider_labels_container" style="opacity: 1; margin-bottom: 5%;">
                            <input name="example_slider" id="example_slider" type="range" min="50" max="100" step="1" value="50" class="jspsych-slider" style="width: 100%">
                            <div id="iqc_labels_container">
                                <div style="left: calc(0% - (20%/2) - -7.5px);">
                                    <span>50%</span>
                                </div>
                                <div style="left: calc(20% - (20%/2) - -4.5px);">
                                    <span>60%</span>
                                </div>
                                <div style="left: calc(40% - (20%/2) - -1.5px);">
                                    <span>70%</span>
                                </div>
                                <div style="left: calc(60% - (20%/2) - 1.5px);">
                                    <span>80%</span>
                                </div>
                                <div style="left: calc(80% - (20%/2) - 4.5px);">
                                    <span>90%</span>
                                </div>
                                <div style="left: calc(100% - (20%/2) - 7.5px);">
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p>You will have 20 seconds to complete each question.</p>
                    <p><b>Please answer the question based on your knowledge without reference to any external materials.</b></p>
                    `,
			],
			show_clickable_nav: true,
			allow_backward: false,
			allow_keys: false,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.general_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'iqc_general_instructions';
			},
		};

		self.test_trial = {
			type: surveyHtmlForm,
			html: function () {
				let html = `<div id="iqc_question_container">
                                <div id="iqc_question">${self.jsPsych.timelineVariable('question_text', true)}</div>
                                <div id="iqc_radio_opts_container">
                                    <div><input type="radio" name="${self.jsPsych.timelineVariable('id', true)}" value="1" id="${self.jsPsych.timelineVariable('id', true)}_1"/><label for="${self.jsPsych.timelineVariable('id', true)}_1">${self.jsPsych.timelineVariable('answer_1', true)}</label></div>
                                    <div><input type="radio" name="${self.jsPsych.timelineVariable('id', true)}" value="2" id="${self.jsPsych.timelineVariable('id', true)}_2"/><label for="${self.jsPsych.timelineVariable('id', true)}_2">${self.jsPsych.timelineVariable('answer_2', true)}</label></div>
                                    <div><input type="radio" name="${self.jsPsych.timelineVariable('id', true)}" value="3" id="${self.jsPsych.timelineVariable('id', true)}_3"/><label for="${self.jsPsych.timelineVariable('id', true)}_3">Opt-out</label></div>
                                </div>
                                <p id="confidence_question">What is the probability that you answered the above question correctly?</p>
                                <div id="iqc_slider_labels_container">
                                    <input name="${self.jsPsych.timelineVariable('id', true)}_slider" id="${self.jsPsych.timelineVariable('id', true)}_slider" type="range" min="50" max="100" step="1" value="50" class="jspsych-slider" style="width: 100%">
                                    <div id="iqc_labels_container">
                                        <div style="left: calc(0% - (20%/2) - -7.5px);">
                                            <span>50%</span>
                                        </div>
                                        <div style="left: calc(20% - (20%/2) - -4.5px);">
                                            <span>60%</span>
                                        </div>
                                        <div style="left: calc(40% - (20%/2) - -1.5px);">
                                            <span>70%</span>
                                        </div>
                                        <div style="left: calc(60% - (20%/2) - 1.5px);">
                                            <span>80%</span>
                                        </div>
                                        <div style="left: calc(80% - (20%/2) - 4.5px);">
                                            <span>90%</span>
                                        </div>
                                        <div style="left: calc(100% - (20%/2) - 7.5px);">
                                            <span>100%</span>
                                        </div>
                                    </div>
                                </div>
                                <p id="iqc_slider_text" style="text-align: center">Select a response.</p>
                            </div>`;
				return html;
			},
			timer: self.settings.test_trial_time_limit,
			on_load: function () {
				let that = this;

				let next_button = document.querySelector('#jspsych-survey-html-form-next');
				let confidence_question = document.querySelector('#confidence_question');
				let slider_container = document.querySelector('#iqc_slider_labels_container');
				let slider_input = document.querySelector(`input[type="range"]`);
				let slider_text = document.querySelector('#iqc_slider_text');

				function slider_event_listener() {
					next_button.disabled = false;
					slider_text.style.opacity = '0';
					that.data.response_slider = slider_input.value;
					that.data.slider_moved = true;
				}

				if (!(self.settings.ignore_validation === true)) {
					next_button.disabled = true;
					slider_input.disabled = true;
					document.querySelectorAll(`input[type="radio"]`).forEach((el) => {
						el.addEventListener('change', (ev) => {
							that.data.response_choice = ev.target.value;
							if (ev.target.value == 3) {
								slider_text.style.opacity = '0';

								confidence_question.style.opacity = '0.3';
								slider_container.style.opacity = '0.3';

								slider_input.disabled = true;

								next_button.disabled = false;
							} else {
								slider_text.style.opacity = '1';
								slider_text.innerHTML = 'Select your confidence';

								confidence_question.style.opacity = '1';
								slider_container.style.opacity = '1';

								slider_input.disabled = false;
								slider_input.addEventListener('mousedown', slider_event_listener);
								slider_input.addEventListener('touchstart', slider_event_listener);
								slider_input.addEventListener('change', slider_event_listener);

								next_button.disabled = true;
							}
						});
					});
				}

				if (self.settings.simulate) {
					next_button.disabled = false;
					let valid_responses_prop =
						self.settings.simulation_options?.[this.simulation_options]?.data
							?.valid_responses_prop ?? 0.5;
					if (self.jsPsych.randomization.sampleBernoulli(valid_responses_prop)) {
						const radios = document.querySelectorAll(`input[type="radio"]`);
						const radio_opt = self.jsPsych.randomization.randomInt(
							0,
							radios.length - 1
						);
						if (radio_opt != 2) {
							slider_input.disabled = false;
							let slider_value = self.jsPsych.randomization.randomInt(
								parseInt(slider_input.min),
								parseInt(slider_input.max)
							);
							slider_input.value = slider_value;
							that.data.response_slider = slider_value.toString();
						}
						that.data.response_choice = (radio_opt + 1).toString();
					}
				}
			},
			data: { response_choice: null, response_slider: null, slider_moved: false },
			css_classes: ['content-size', 'noSelect'],
			on_finish: function (data) {
				data.trial_name = 'iqc_test_trial';
				data.pt_trial = self.jsPsych.timelineVariable('pt_trial');
				data.block = self.jsPsych.timelineVariable('block');
				data.trial = self.jsPsych.timelineVariable('trial');
				data.id = self.jsPsych.timelineVariable('id');
				data.question_text = self.jsPsych.timelineVariable('question_text');
				data.answer_1 = self.jsPsych.timelineVariable('answer_1');
				data.answer_2 = self.jsPsych.timelineVariable('answer_2');
				data.correct_answer = self.jsPsych.timelineVariable('correct_answer');
				data.aig_version = self.jsPsych.timelineVariable('aig_version');

				data.correct =
					data.response_choice !== null
						? data.response_choice === data.correct_answer
						: null;
			},
			simulation_options: 'impossible_question',
		};

		self.test_trial_feedback = {
			type: htmlButtonResponse,
			stimulus: function () {
				let html = '';

				let last_trial_data = self.jsPsych.data
					.get()
					.last(1)
					.filterCustom(function (trial) {
						return trial.response_choice === '1' || trial.response_choice === '2';
					})
					.values();
				if (last_trial_data.length === 1) {
					if (last_trial_data[0].correct) {
						html += `<p>Your answer was <span style="color: green"><b>correct</b></span>.</p>`;
					} else {
						html += `<p>Your answer was <span style="color: red"><b>incorrect</b></span>.</p>`;
					}
				}

				let n_completed_trials = self.jsPsych.data
					.get()
					.filter({ trial_name: 'iqc_test_trial' })
					.count();
				let prop_correct_responses = self.jsPsych.data
					.get()
					.filterCustom(function (trial) {
						return (
							trial.trial_name == 'iqc_test_trial' &&
							(trial.response_choice === '1' || trial.response_choice === '2')
						);
					})
					.select('correct')
					.mean();
				let percent_correct_responses = isNaN(prop_correct_responses)
					? 0
					: Math.round(prop_correct_responses * 100);
				html += `<p>Progress: ${n_completed_trials}/${self.settings.test_trials_n} questions completed. ${percent_correct_responses}% correct.</p>`;
				return html;
			},
			choices: ['Continue'],
			timer: self.settings.test_trial_feedback_time_limit,
			on_finish: function (data) {
				data.trial_name = 'iqc_test_trial_feedback';
			},
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		const test_trials_timeline =
			get_task_trials_timeline_with_interblock_text(
				[this.test_trial, this.test_trial_feedback],
				this.settings.test_blocks,
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

	get_gk_forms() {
		return {
			anchor: [
				'GK_86',
				'GK_75',
				'GK_90',
				'GK_80',
				'GK_70',
				'GK_79',
				'GK_64',
				'GK_72',
				'GK_63',
				'GK_42',
				'GK_61',
				'GK_69',
				'GK_36',
				'GK_53',
				'GK_14',
				'GK_55',
				'GK_6',
				'GK_84',
				'GK_23',
				'GK_22',
				'GK_2',
				'GK_3',
				'GK_21',
				'GK_4',
			],
			aig_A: [
				'GK_89',
				'GK_91',
				'GK_94',
				'GK_85',
				'GK_49',
				'GK_20',
				'GK_74',
				'GK_38',
				'GK_25',
				'GK_54',
				'GK_43',
				'GK_76',
				'GK_39',
				'GK_32',
				'GK_71',
				'GK_35',
				'GK_28',
				'GK_77',
				'GK_48',
				'GK_31',
				'GK_27',
				'GK_7',
				'GK_17',
				'GK_11',
			],
			aig_B: [
				'GK_87',
				'GK_82',
				'GK_93',
				'GK_83',
				'GK_26',
				'GK_62',
				'GK_88',
				'GK_66',
				'GK_44',
				'GK_29',
				'GK_81',
				'GK_57',
				'GK_58',
				'GK_41',
				'GK_47',
				'GK_37',
				'GK_13',
				'GK_60',
				'GK_24',
				'GK_12',
				'GK_9',
				'GK_16',
				'GK_15',
				'GK_33',
			],
		};
	}

	get_iq_forms() {
		return {
			anchor: ['IQ_1', 'IQ_2', 'IQ_3', 'IQ_4', 'IQ_5', 'IQ_6'],
			aig_A: ['IQ_7', 'IQ_8', 'IQ_9', 'IQ_10', 'IQ_11', 'IQ_12'],
			aig_B: ['IQ_13', 'IQ_14', 'IQ_15', 'IQ_16', 'IQ_17', 'IQ_18'],
		};
	}

	get_general_knowledge_questions() {
		return [
			{
				id: 'GK_1',
				question_text:
					'Carbon dioxide produced by burning fossil fuels contributes to global warming.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_2',
				question_text: 'The radius of the Earth is approximately...',
				answer_1: '4000 miles',
				answer_2: '200 miles',
				correct_answer: '1',
			},
			{
				id: 'GK_3',
				question_text: 'Apples are classified as:',
				answer_1: 'Fruits',
				answer_2: 'Vegetables',
				correct_answer: '1',
			},
			{
				id: 'GK_4',
				question_text: 'Which comes closest in meaning to the following word? Easy',
				answer_1: 'Complex',
				answer_2: 'Simple',
				correct_answer: '2',
			},
			{
				id: 'GK_5',
				question_text: '5 + 5 + 5 = ',
				answer_1: '15',
				answer_2: '50',
				correct_answer: '1',
			},
			{
				id: 'GK_6',
				question_text:
					'Which of the following is found in plant cells but not animal cells?',
				answer_1: 'Chloroplasts',
				answer_2: 'Ribosome',
				correct_answer: '1',
			},
			{
				id: 'GK_7',
				question_text: 'How many points is a touchdown in American Football?',
				answer_1: '6',
				answer_2: '8',
				correct_answer: '1',
			},
			{
				id: 'GK_8',
				question_text:
					'A bat-and-ball game played between two teams of nine players each who take turns batting and fielding is',
				answer_1: 'Tennis',
				answer_2: 'Baseball',
				correct_answer: '2',
			},
			{
				id: 'GK_9',
				question_text: 'In which continent does Germany lie?',
				answer_1: 'Asia',
				answer_2: 'Europe',
				correct_answer: '2',
			},
			{
				id: 'GK_10',
				question_text:
					'A conical mountain having a crater or vent through which lava and gases erupt is called:',
				answer_1: 'Volcano',
				answer_2: 'Electric storm',
				correct_answer: '1',
			},
			{
				id: 'GK_11',
				question_text: 'The world population is approximately:',
				answer_1: '7 million',
				answer_2: '7 billion',
				correct_answer: '2',
			},
			{
				id: 'GK_12',
				question_text: 'Psychology is used to study the life cycle of animals and plants',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_13',
				question_text: 'Melting point is the temperature at which solids:',
				answer_1: 'Melt in liquids',
				answer_2: 'Evaporate into gases',
				correct_answer: '1',
			},
			{
				id: 'GK_14',
				question_text:
					"Methane, Carbon Dioxide and Water vapor in the atmosphere are all good at trapping heat from the Earth's surface",
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_15',
				question_text: 'Which comes closest in meaning to the following word: Quick',
				answer_1: 'Fast',
				answer_2: 'Slow',
				correct_answer: '1',
			},
			{
				id: 'GK_16',
				question_text: 'Which happened earlier in history?',
				answer_1: 'World War 1',
				answer_2: 'Construction of the Egyptian pyramids',
				correct_answer: '2',
			},
			{
				id: 'GK_17',
				question_text: 'Which happened earlier in history?',
				answer_1: 'Abraham Lincoln became President of USA',
				answer_2: 'George Bush became President of USA',
				correct_answer: '1',
			},
			{
				id: 'GK_18',
				question_text: 'The number of stars in the Milky Way is:',
				answer_1: 'Greater than 100 billion ',
				answer_2: 'Less than 1 billion',
				correct_answer: '1',
			},
			{
				id: 'GK_19',
				question_text: 'Which is Earths largest continent by surface size?',
				answer_1: 'North America',
				answer_2: 'Asia',
				correct_answer: '2',
			},
			{
				id: 'GK_20',
				question_text:
					'Moderate earthquakes (5.0 - 5.9 on the Richter Scale) happen approximately twice a day.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_21',
				question_text: 'The number of weeks in a year is approximately:',
				answer_1: '500',
				answer_2: '52',
				correct_answer: '2',
			},
			{
				id: 'GK_22',
				question_text: 'China has over 1 billion mobile cellular connections',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_23',
				question_text: 'Not all metals are attracted to magnets',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_24',
				question_text: 'Which comes closest in meaning to the following word: Antediluvian',
				answer_1: 'Ancient',
				answer_2: 'Liberal',
				correct_answer: '1',
			},
			{
				id: 'GK_25',
				question_text:
					'Given: Some hair is red. No red is green. Logical conclusion: Anything green cannot be hair.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_26',
				question_text:
					'Given: Any glass requires cups to exist but cups can exist without glass. One cup can support only one glass. Logical conclusion: There are more cups existing than glasses.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_27',
				question_text: 'Budapest is the capital of which county?',
				answer_1: 'Hungary',
				answer_2: 'Austria',
				correct_answer: '1',
			},
			{
				id: 'GK_28',
				question_text: 'Greenhouse effect refers to:',
				answer_1: 'Gases in the atmosphere that trap heat',
				answer_2: "Impact to the Earth's ozone layer",
				correct_answer: '1',
			},
			{
				id: 'GK_29',
				question_text: 'Who has a higher NBA career playoff points per game?',
				answer_1: 'Kobe Bryant',
				answer_2: 'Michael Jordan',
				correct_answer: '2',
			},
			{
				id: 'GK_30',
				question_text: '4 is a prime number.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_31',
				question_text:
					'Stretchiness, or the ability of an object or material to resume its normal shape after being stretched or compressed is?',
				answer_1: 'Electricity',
				answer_2: 'Elasticity',
				correct_answer: '2',
			},
			{
				id: 'GK_32',
				question_text: 'Which element is found in greater quantity in the Sun?',
				answer_1: 'Hydrogen',
				answer_2: 'Helium',
				correct_answer: '1',
			},
			{
				id: 'GK_33',
				question_text: 'Which planet in our solar system is closest to the Sun?',
				answer_1: 'Pluto',
				answer_2: 'Mercury',
				correct_answer: '2',
			},
			{
				id: 'GK_34',
				question_text:
					'Scientists estimate global sea levels have increased by approximately how much in the last 100 odd years',
				answer_1: 'Less than 1 foot',
				answer_2: '3-4 feet',
				correct_answer: '1',
			},
			{
				id: 'GK_35',
				question_text:
					'Global warming is a humanitarian initiative to slow down freezing in the North Pole.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_36',
				question_text:
					'Ocean currents carry heat from the equator toward the north and south poles.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_37',
				question_text: 'Which champion boxer had the birth name Cassius Clay?',
				answer_1: 'Mike Tyson',
				answer_2: 'Muhammed Ali',
				correct_answer: '2',
			},
			{
				id: 'GK_38',
				question_text: 'Phnom penh is the capital of which country?',
				answer_1: 'Vietnam',
				answer_2: 'Cambodia',
				correct_answer: '2',
			},
			{
				id: 'GK_39',
				question_text:
					"The Pacific Ocean's area is larger than all the earth's masses combined.",
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_40',
				question_text: 'Which comes closest in meaning to the following word? Ersatz',
				answer_1: 'Fake',
				answer_2: 'Elite',
				correct_answer: '1',
			},
			{
				id: 'GK_41',
				question_text: 'Which comes closest in meaning to the following word? Zephyr',
				answer_1: 'Breeze',
				answer_2: 'Tide',
				correct_answer: '1',
			},
			{
				id: 'GK_42',
				question_text: 'Which happened earlier in history?',
				answer_1: 'Chinese issue the first paper money',
				answer_2: 'European sailors begin to use the magnetic compass',
				correct_answer: '1',
			},
			{
				id: 'GK_43',
				question_text: 'Which happened earlier in history?',
				answer_1: 'Alexander Graham Bell patents the telephone',
				answer_2: "Charles Darwin publishes 'The Origin of Species'",
				correct_answer: '2',
			},
			{
				id: 'GK_44',
				question_text: 'Which happened earlier in history?',
				answer_1: 'Julius Caesar getting assassinated',
				answer_2: 'Alexander the Great conquering Egypt',
				correct_answer: '2',
			},
			{
				id: 'GK_45',
				question_text:
					'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? _____ minutes',
				answer_1: '5 minutes',
				answer_2: '100 minutes',
				correct_answer: '1',
			},
			{
				id: 'GK_46',
				question_text:
					'In a lake, there is a patch of lily pads. Every day, the patch doubles in size. If it takes 48 days for the patch to cover the entire lake, how long would it take for the patch to cover half of the lake? _____ days',
				answer_1: '24 days',
				answer_2: '47 days',
				correct_answer: '2',
			},
			{
				id: 'GK_47',
				question_text: 'Radioactive milk cannot be made safe by boiling it',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_48',
				question_text: 'All radioactivity is man-made.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_49',
				question_text: 'What is the length of an Olympic swimming pool?',
				answer_1: '80 meters',
				answer_2: '50 meters',
				correct_answer: '2',
			},
			{
				id: 'GK_50',
				question_text:
					'The highest natural surface temperature recorded on Earth has been:',
				answer_1: 'less than 55?øC',
				answer_2: 'greater than 55?øC',
				correct_answer: '2',
			},
			{
				id: 'GK_51',
				question_text:
					'Global temperatures have been rising by about 10 degress every year over the last 10 years',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_52',
				question_text: 'There are approximately how many airports in the World?',
				answer_1: '10000',
				answer_2: '40000',
				correct_answer: '2',
			},
			{
				id: 'GK_53',
				question_text:
					'The top 10 car manufacturing countries produced approximately how many new cars in 2014?',
				answer_1: '50 milion',
				answer_2: '10 million',
				correct_answer: '1',
			},
			{
				id: 'GK_54',
				question_text: 'What was the beta (early) version of the Internet called?',
				answer_1: 'ARPAnet',
				answer_2: 'Intranet',
				correct_answer: '1',
			},
			{
				id: 'GK_55',
				question_text: 'Autism has become an epidemic.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_56',
				question_text: 'Lasers work by focusing sound waves.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_57',
				question_text: 'Positive charges cannot flow in any conductor.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_58',
				question_text: 'What light-sensitive cells in the eye detect colors?',
				answer_1: 'Cones',
				answer_2: 'Rods',
				correct_answer: '1',
			},
			{
				id: 'GK_59',
				question_text: 'Who was the first human in space?',
				answer_1: 'Neil Armstrong',
				answer_2: 'Yuri Gagarin',
				correct_answer: '2',
			},
			{
				id: 'GK_60',
				question_text:
					'Which is the only country to qualify for every FIFA World Cup (soccer) since inception in 1930?',
				answer_1: 'Argentina',
				answer_2: 'Brazil',
				correct_answer: '2',
			},
			{
				id: 'GK_61',
				question_text: 'Which comes closest in meaning to the following word? Intransigent',
				answer_1: 'Transitory',
				answer_2: 'Inflexible',
				correct_answer: '2',
			},
			{
				id: 'GK_62',
				question_text: 'Which comes closest in meaning to the following word? Soporific',
				answer_1: "Pertaining to one's self",
				answer_2: 'Sleep inducing',
				correct_answer: '2',
			},
			{
				id: 'GK_63',
				question_text: 'Bats are not blind.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_64',
				question_text: 'Human children have more bones than adults.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_65',
				question_text:
					'The land area of Canada is approximately how many times the land area of India?',
				answer_1: 'Half',
				answer_2: '3 times',
				correct_answer: '2',
			},
			{
				id: 'GK_66',
				question_text:
					'The number of tourist arrivals per year in China (as of 2018) were approximately:',
				answer_1: '141 million',
				answer_2: '31 million',
				correct_answer: '1',
			},
			{
				id: 'GK_67',
				question_text: 'People use approximately only 10% of their brains',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_68',
				question_text: 'People with schizophrenia have multiple personalities.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_69',
				question_text: 'Which is the smallest independent country?',
				answer_1: 'Monaco',
				answer_2: 'Vatican City',
				correct_answer: '2',
			},
			{
				id: 'GK_70',
				question_text:
					'A man bought a car for $10,000. He sold the car once the price fell by 17%, and invested the money so that he then got back $10,000. His profit on the invested amount is approximately:',
				answer_1: '0.17',
				answer_2: '0.2',
				correct_answer: '2',
			},
			{
				id: 'GK_71',
				question_text: 'Ocean acidification is caused by:',
				answer_1: 'Chemical spills in the ocean',
				answer_2: 'Absorption of carbon dioxide by the ocean',
				correct_answer: '2',
			},
			{
				id: 'GK_72',
				question_text:
					'The total number of cinema visits in USA in 2018 were approximately how much?',
				answer_1: '130 million',
				answer_2: '1.3 billion',
				correct_answer: '2',
			},
			{
				id: 'GK_73',
				question_text:
					'ESP (extra sensory perception) is not a scientifically well-established phenomenon',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_74',
				question_text:
					'It is possible for water to exist in liquid form below 0 degrees C (32 degrees F)',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_75',
				question_text:
					"In 2006, the status of the then planet Pluto was reduced to 'dwarf Planet' so that it was no longer officially the ninth planet in our Solar system. The reason for this was because its' gravitational force was not enough to",
				answer_1: 'Maintain its regular orbit around the sun',
				answer_2: 'Clear its neighbouring region of planetesimals and asteroids etc.',
				correct_answer: '2',
			},
			{
				id: 'GK_76',
				question_text:
					'Which two sports both have 11 members of each team playing on the field (under normal circumstances)?',
				answer_1: 'Field hockey and American Football',
				answer_2: 'Ice hockey & Soccer',
				correct_answer: '1',
			},
			{
				id: 'GK_77',
				question_text: 'Which happened earlier in history?',
				answer_1: 'Genghis Khan leads the Mongol army',
				answer_2: 'Oxford University is founded in England',
				correct_answer: '2',
			},
			{
				id: 'GK_78',
				question_text:
					'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? _____ cents',
				answer_1: '10 cents',
				answer_2: '5 cents',
				correct_answer: '2',
			},
			{
				id: 'GK_79',
				question_text:
					'Which one of the below is not a correct possible solution for x. | x - 9 | <  10.',
				answer_1: '-4',
				answer_2: '4',
				correct_answer: '1',
			},
			{
				id: 'GK_80',
				question_text: 'Most diamonds are not formed from coal.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_81',
				question_text:
					'If you are standing on the Equator, your approximate rotational speed is:',
				answer_1: 'Less than 1,000 km/h',
				answer_2: 'Greater than 1000 km/h',
				correct_answer: '2',
			},
			{
				id: 'GK_82',
				question_text: 'Plants use oxygen.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_83',
				question_text:
					"Jupiter's largest moon Ganymede is smaller (in diameter) than the planet Mercury.",
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_84',
				question_text:
					'How many gold medals did Michael Phelps win at the Beijing Olympics?',
				answer_1: '4',
				answer_2: '8',
				correct_answer: '2',
			},
			{
				id: 'GK_85',
				question_text: 'Most psychiatric therapies are based on Freud.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_86',
				question_text:
					'The velocity of a radio wave and a visible light wave in a vacuum are the same.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
			{
				id: 'GK_87',
				question_text: 'House flies have an average life span of less than 2 days.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_88',
				question_text: 'People with amnesia forget all details of their earlier life.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_89',
				question_text: 'Humans have evolved from monkeys.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_90',
				question_text:
					'The reason we experience seasons is because the distance between the earth and sun changes.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_91',
				question_text:
					'A ball made of solid steel will not float on water. However, when steel is used to make a boat it floats because the steel is made less dense.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '2',
			},
			{
				id: 'GK_92',
				question_text: 'Which happened earlier in history? ',
				answer_1: 'Sputnik I becomes the first man-made satellite',
				answer_2: 'Nautilus,  the first nuclear powered submarine,  is launched',
				correct_answer: '2',
			},
			{
				id: 'GK_93',
				question_text: 'Which country remained neutral throughout World War II?',
				answer_1: 'Turkey',
				answer_2: 'Afghanistan',
				correct_answer: '2',
			},
			{
				id: 'GK_94',
				question_text:
					'If A is neccessary for B to occur and C is sufficient for B to occur, then it follows that if C has occured, it implies that A has also occured.',
				answer_1: 'True',
				answer_2: 'False',
				correct_answer: '1',
			},
		];
	}

	get_impossible_questions() {
		return [
			{
				id: 'IQ_1',
				question_text: 'When did the battle of Kavkav take place?',
				answer_1: 'Before 1647',
				answer_2: 'After 1647',
				correct_answer: '3',
			},
			{
				id: 'IQ_2',
				question_text: 'How many sides does a Detseroid have?',
				answer_1: 'More than 20',
				answer_2: 'Less than 20',
				correct_answer: '3',
			},
			{
				id: 'IQ_3',
				question_text: 'What is the population of Synomle?',
				answer_1: 'More than 10,000',
				answer_2: 'Less than 10,000',
				correct_answer: '3',
			},
			{
				id: 'IQ_4',
				question_text: "What is the most prominent symptom of Seradot's disease?",
				answer_1: 'A fever',
				answer_2: 'A rash',
				correct_answer: '3',
			},
			{
				id: 'IQ_5',
				question_text: 'What is the Parlichev method?',
				answer_1: 'A way of extracting minerals from soil',
				answer_2: 'A way of determining the distance to a star',
				correct_answer: '3',
			},
			{
				id: 'IQ_6',
				question_text:
					'Resistance Configuration Theory is a psychological theory that explains:',
				answer_1:
					'How people avoid blame and why they do not recognize when something is their fault',
				answer_2: 'Why certain people do not try new experiences',
				correct_answer: '3',
			},
			{
				id: 'IQ_7',
				question_text: 'When did the Laikrev Uprising occur?',
				answer_1: 'During the Renaissance',
				answer_2: 'During the Industrial Revolution',
				correct_answer: '3',
			},
			{
				id: 'IQ_8',
				question_text: 'What is the nutritional value of a Golgrest Fruit?',
				answer_1: 'High in Protein',
				answer_2: 'Low in Carbohydrates',
				correct_answer: '3',
			},
			{
				id: 'IQ_9',
				question_text: 'What is the speed of a Blargan Horse?',
				answer_1: 'Faster than a Cheetah',
				answer_2: 'Slower than a Snail',
				correct_answer: '3',
			},
			{
				id: 'IQ_10',
				question_text: "What is the cure for Zolbrod's syndrome?",
				answer_1: 'Immunotherapy',
				answer_2: 'Radiation Therapy',
				correct_answer: '3',
			},
			{
				id: 'IQ_11',
				question_text: 'What does the Veklin Procedure involve?',
				answer_1: 'A sequence of precise surgical incisions',
				answer_2: 'A complex mathematical equation',
				correct_answer: '3',
			},
			{
				id: 'IQ_12',
				question_text:
					'How does Binoxelation Impact Theory explain the growth of crystals?',
				answer_1: 'Through thermodynamics',
				answer_2: 'Through quantum mechanics',
				correct_answer: '3',
			},
			{
				id: 'IQ_13',
				question_text: 'What are the ingredients of a traditional Zibrune stew?',
				answer_1: 'Magical herbs and spices',
				answer_2: 'Alien sea creatures',
				correct_answer: '3',
			},
			{
				id: 'IQ_14',
				question_text: "What's the main purpose of a Tantrigon device?",
				answer_1: 'To communicate with other dimensions',
				answer_2: 'To teleport through space',
				correct_answer: '3',
			},
			{
				id: 'IQ_15',
				question_text: "What's the habitat of a Rojixon bird?",
				answer_1: 'Deserts',
				answer_2: 'Tropical rainforests',
				correct_answer: '3',
			},
			{
				id: 'IQ_16',
				question_text: "What's the side effect of Grilpax's disease?",
				answer_1: 'Change in hair color',
				answer_2: 'Ability to sing beautifully',
				correct_answer: '3',
			},
			{
				id: 'IQ_17',
				question_text: 'What is the Kraghold method used for?',
				answer_1: 'Predicting stock market trends',
				answer_2: 'Improving memory recall',
				correct_answer: '3',
			},
			{
				id: 'IQ_18',
				question_text: 'The Diflective Assumption Theory helps us understand:',
				answer_1: 'How memories are stored in the brain',
				answer_2: 'How emotions impact our decision making',
				correct_answer: '3',
			},
		];
	}
}
