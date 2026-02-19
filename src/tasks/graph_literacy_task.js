import surveyHtmlForm from '@jspsych/plugin-survey-html-form';
import { deepMerge, construct_full_media_path } from '../utils/helpers.js';

export default class Graph_Literacy {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.duration_mins = 5;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [];
		for (let i = 1; i <= 8; i++) {
			this.media.push(construct_full_media_path(this.media_basepath, `stimuli/gl_img_${i}.png`));
		}
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.define_trials();
	}

	get_default_settings() {
		return {
			gl_content: this.get_gl_content(),
			ignore_validation: false,
			test_trial_time_limit: 300,
		};
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		self.test_trial = {
			type: surveyHtmlForm,
			preamble:
				'<div style="margin: 5% 0;"><b>Instructions</b>: In this task, you will be asked to answer some questions based on information presented in various graphs.</div>',
			html: function () {
				let html = '';
				for (let gl_c of self.settings.gl_content) {
					if (gl_c['content'] == 'info') {
						html += `<hr class="hr"/>`;
						html += `<div>${gl_c['html']}</div>`;
					} else if (gl_c['content'] == 'question') {
						html += `<div class="question_container">
                                    <div class="question"><b>${gl_c['question_index']}</b>. ${gl_c['question_text']}</div>`;
						if (gl_c['response_type'] == 'text') {
							html += `<div>
                                        <input style="width: 10%" type="text" required="true" name="${gl_c['question_index']}" placeholder="${gl_c['response_placeholder']}"/> ${gl_c['response_scale']}
                                    </div>`;
						} else if (gl_c['response_type'] == 'radio') {
							html += `<div class="radio_opts_container">`;
							for (let response of gl_c['response_opts']) {
								html += `<div><input type="radio" required="true" name="${response['name']}" value="${response['value']}" id="${response['id']}"/><label for="${response['id']}">${response['label']}</label></div>`;
							}
							html += `</div>`;
						}
						html += `</div>`;
					}
				}
				return html;
			},
			css_classes: ['content-size'],
			timer: self.settings.test_trial_time_limit,
			on_load: function () {
				if (self.settings.ignore_validation) {
					document.querySelectorAll('input').forEach((e) => (e.required = false));
				}

				if (self.settings.simulate) {
					document.querySelectorAll('input').forEach((e) => (e.required = false));

					let valid_text_responses =
						self.settings.simulation_options?.[this.simulation_options]?.data
							?.valid_text_responses_n ?? 1;
					let valid_radio_responses =
						self.settings.simulation_options?.[this.simulation_options]?.data
							?.valid_radio_responses_n ?? 1;

					let text_responses = self.jsPsych.randomization.sampleWithoutReplacement(
						Array.from(document.querySelectorAll(`input[type="text"]`)),
						valid_text_responses
					);
					text_responses.forEach(
						(e) => (e.value = self.jsPsych.randomization.randomInt(0, 100))
					);

					let radio_responses = self.jsPsych.randomization.sampleWithoutReplacement(
						Array.from(document.querySelectorAll('.radio_opts_container')),
						valid_radio_responses
					);
					radio_responses.forEach((container) => {
						const radios = container.querySelectorAll('input[type="radio"]');
						radios[self.jsPsych.randomization.randomInt(0, radios.length - 1)].checked =
							true;
					});
				}
			},
			on_finish: function (data) {
				data.trial_name = 'gl_main_trial';
				Object.assign(data, data.response);
			},
			simulation_options: 'graph_literacy',
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

	get_gl_content() {
		return [
			{
				content: 'info',
				html: `Here's some information about cancer therapies.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_1.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q1',
				question_text: 'What percentage of patients recovered after chemotherapy?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'question',
				question_index: 'Q2',
				question_text:
					'What is the difference between the percentage of patients who recovered after a surgery and the percentage of patients who recovered after radiation therapy?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'info',
				html: `Here's some information about different forms of cancer.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_2.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q3',
				question_text:
					'Of all the people who die from cancer, approximately what percentage dies from lung cancer?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'question',
				question_index: 'Q4',
				question_text:
					'Approximately what percentage of people who die from cancer die from colon cancer, breast cancer, and prostate cancer taken together?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'info',
				html: `Here's some information about an imaginary disease called Adeolitis.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_3.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q5',
				question_text:
					'Approximately what percentage of people had Adeolitis in the year 2000?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'question',
				question_index: 'Q6',
				question_text:
					'When was the increase in the percentage of people with Adeolitis higher?',
				response_type: 'radio',
				response_opts: [
					{ name: 'Q6', value: '1', id: 'Q6_1', label: 'From 1975 to 1980' },
					{ name: 'Q6', value: '2', id: 'Q6_2', label: 'From 2000 to 2005' },
					{
						name: 'Q6',
						value: '3',
						id: 'Q6_3',
						label: 'Increase was the same in both intervals',
					},
					{ name: 'Q6', value: '4', id: 'Q6_4', label: "Don't know" },
				],
			},
			{
				content: 'question',
				question_index: 'Q7',
				question_text:
					'According to your best guess, what will the percentage of people with Adeolitis be in the year 2010?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
			{
				content: 'info',
				html: `The following figure shows the number of men and women among patients with disease X. The total number of circles is 100.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_4.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q8',
				question_text: 'Of 100 patients with disease X, how many are women?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: 'women',
			},
			{
				content: 'question',
				question_index: 'Q9',
				question_text:
					'How many more men than women are there among 100 patients with disease X?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: 'men',
			},
			{
				content: 'info',
				html: `In a magazine you see two advertisements, one on page 5 and another on page 12. Each is for a different drug for treating heart disease, and each includes a graph showing the effectiveness of the drug compared to a placebo (sugar pill).<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_5.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q10',
				question_text:
					'Compared to the placebo, which treatment leads to a larger decrease in the percentage of patients who die?',
				response_type: 'radio',
				response_opts: [
					{ name: 'Q10', value: '1', id: 'Q10_1', label: 'Crosicol' },
					{ name: 'Q10', value: '2', id: 'Q10_2', label: 'Hertinol' },
					{ name: 'Q10', value: '3', id: 'Q10_3', label: 'They are equal' },
					{ name: 'Q10', value: '4', id: 'Q10_4', label: "Can't say" },
				],
			},
			{
				content: 'info',
				html: `In the newspaper you see two advertisements, one on page 15 and another on page 17. Each is for a different treatment of psoriasis, and each includes a graph showing the effectiveness of the treatment over time.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_6.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q11',
				question_text:
					'Which of the treatments contributes to a larger decrease in the percentage of sick patients?',
				response_type: 'radio',
				response_opts: [
					{ name: 'Q11', value: '1', id: 'Q11_1', label: 'Apsoriatin' },
					{ name: 'Q11', value: '2', id: 'Q11_2', label: 'Nopsorian' },
					{ name: 'Q11', value: '3', id: 'Q11_3', label: 'They are equal' },
					{ name: 'Q11', value: '4', id: 'Q11_4', label: "Can't say" },
				],
			},
			{
				content: 'info',
				html: `Here is some information about the imaginary diseases Coliosis and Tiosis.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_7.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q12',
				question_text:
					'Between 1980 and 1990, which disease had a higher increase in the percentage of people affected?',
				response_type: 'radio',
				response_opts: [
					{ name: 'Q12', value: '1', id: 'Q12_1', label: 'Coliosis' },
					{ name: 'Q12', value: '2', id: 'Q12_2', label: 'Tiosis' },
					{ name: 'Q12', value: '3', id: 'Q12_3', label: 'The increase was equal' },
					{ name: 'Q12', value: '4', id: 'Q12_4', label: "Can't say" },
				],
			},
			{
				content: 'info',
				html: `Here's some information about cancer therapies.<br><br><img src="${construct_full_media_path(this.media_basepath, 'stimuli/gl_img_8.png')}">`,
			},
			{
				content: 'question',
				question_index: 'Q13',
				question_text:
					'What is the percentage of cancer patients who die after chemotherapy?',
				response_type: 'text',
				response_placeholder: '0-100',
				response_scale: '%',
			},
		];
	}
}
