import htmlSliderResponse from '@jspsych/plugin-html-slider-response';
import instructions from '@jspsych/plugin-instructions';
import { deepMerge } from '../utils/helpers.js';

export default class ADMC_Framing {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = [];
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);
		this.duration_mins = 3 * this.settings.subtasks_to_include.length;

		this.define_trials();
	}

	get_default_settings() {
		return {
			resistance_to_framing_items: this.get_resistance_to_framing_items(),
			subtasks_to_include: ['a1', 'a2', 'rc1', 'rc2'],
			ignore_validation: true,
			subtask_instructions_time_limit: 30,
			trial_time_limit: 60,
		};
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		self.a1_instructions = {
			type: instructions,
			pages: [
				'<u><b>Instructions</b></u><br>Each of the following problems ask you to rate your judgment of a product or a situation. Each problem is presented with a scale ranging from 1 (representing the worst rating) through 6 (representing the best rating). For each problem, please select the number on the scale that best reflects your judgment.',
			],
			show_clickable_nav: true,
			allow_backward: false,
			css_classes: ['instructions_width'],
			timer: self.settings.subtask_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_a1_instructions';
			},
		};

		self.a2_instructions = {
			type: instructions,
			pages: [
				'<u><b>Instructions</b></u><br>Each of the following problems ask you to rate your judgment of a product or a situation. Each problem is presented with a scale ranging from 1 (representing the worst rating) through 6 (representing the best rating). For each problem, please select the number on the scale that best reflects your judgment.',
			],
			show_clickable_nav: true,
			allow_backward: false,
			css_classes: ['instructions_width'],
			timer: self.settings.subtask_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_a2_instructions';
			},
		};

		self.rc1_instructions = {
			type: instructions,
			pages: [
				'<u><b>Instructions</b></u><br>Each of the following problems presents a choice between two options. Each problem is presented with a scale ranging from 1 (representing one option) through 6 (representing the other option). For each item, please select the number on the scale that best reflects your relative preference between the two options.',
			],
			show_clickable_nav: true,
			allow_backward: false,
			css_classes: ['instructions_width'],
			timer: self.settings.subtask_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_rc1_instructions';
			},
		};

		self.rc2_instructions = {
			type: instructions,
			pages: [
				'<u><b>Instructions</b></u><br>Each of the following problems presents a choice between two options. Each problem is presented with a scale ranging from 1 (representing one option) through 6 (representing the other option). For each item, please select the number on the scale that best reflects your relative preference between the two options.',
			],
			show_clickable_nav: true,
			allow_backward: false,
			css_classes: ['instructions_width'],
			timer: self.settings.subtask_instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_rc2_instructions';
			},
		};

		self.resistance_to_framing_trial = {
			type: htmlSliderResponse,
			stimulus: self.jsPsych.timelineVariable('stimulus_html'),
			require_movement: !(self.settings.ignore_validation === true),
			labels: function () {
				return [
					`1<br>${self.jsPsych.timelineVariable('label_min')}`,
					'2',
					'3',
					'4',
					'5',
					`6<br>${self.jsPsych.timelineVariable('label_max')}`,
				];
				// return [`0`, '10', '20', '30', '40', '50', '60', '70', '80', '90', '100']
			},
			min: 1,
			max: 6,
			slider_start: 1,
			step: 1,
			trial_duration: self.settings.simulate
				? self.settings.simulate_trial_duration * 1.2
				: null,
			timer: self.settings.trial_time_limit,
			data: { slider_moved: false },
			on_load: function () {
				let that = this;

				let slider = document.querySelector('#jspsych-html-slider-response-response');
				// these 3 event listeners might be replaced by a single 'input' one
				// but in this case we are just preserving the jsPsych style as per plugin-html-slider-response.js
				slider.addEventListener('mousedown', () => {
					that.data.slider_moved = true;
				});
				slider.addEventListener('touchstart', () => {
					that.data.slider_moved = true;
				});
				slider.addEventListener('change', () => {
					that.data.slider_moved = true;
				});
			},
			on_finish: function (data) {
				data.trial_name = 'resistance_to_framing_trial';
				data.admc_id = self.jsPsych.timelineVariable('id');
				data.admc_response = data.response;
			},
			simulation_options: 'admc_resistance_to_framing',
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];

		const subtasks_trials_lookup = {
			a1: {
				instructions: this.a1_instructions,
				trials_timeline: {
					timeline: [this.resistance_to_framing_trial],
					timeline_variables: this.settings.resistance_to_framing_items.filter((e) =>
						e.id.startsWith('a1_')
					),
				},
			},
			rc1: {
				instructions: this.rc1_instructions,
				trials_timeline: {
					timeline: [this.resistance_to_framing_trial],
					timeline_variables: this.settings.resistance_to_framing_items.filter((e) =>
						e.id.startsWith('rc1_')
					),
				},
			},
			a2: {
				instructions: this.a2_instructions,
				trials_timeline: {
					timeline: [this.resistance_to_framing_trial],
					timeline_variables: this.settings.resistance_to_framing_items.filter((e) =>
						e.id.startsWith('a2_')
					),
				},
			},
			rc2: {
				instructions: this.rc2_instructions,
				trials_timeline: {
					timeline: [this.resistance_to_framing_trial],
					timeline_variables: this.settings.resistance_to_framing_items.filter((e) =>
						e.id.startsWith('rc2_')
					),
				},
			},
		};

		this.settings.subtasks_to_include.forEach((subtask) => {
			timeline.push(subtasks_trials_lookup[subtask].instructions);
			if (hide_progress_bar_trial_generator) {
				timeline.push(hide_progress_bar_trial_generator);
			}
			timeline.push(subtasks_trials_lookup[subtask].trials_timeline);
		});

		return timeline;
	}

	get_resistance_to_framing_items() {
		return [
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that recent evidence has shown that a pesticide is threatening the lives of 1,200 endangered animals. Two response options have been suggested:</p>
                                <p style="margin-left: 30px">If Option A is used, 600 animals will be saved for sure.</p>
                                <p style="margin-left: 30px">If Option B is used, there is a 75% chance that 800 animals will be saved, and a 25% chance that no animals will be saved.</p>
                                <p>Which option do you recommend to use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_1',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Because of changes in tax laws, you may get back as much as $1200 in income tax. Your accountant has been exploring alternative ways to take advantage of this situation. He has developed two plans:</p>
                                <p style="margin-left: 30px">If Plan A is adopted, you will get back $400 of the possible $1200.</p>
                                <p style="margin-left: 30px">If Plan B is adopted, you have a 33% chance of getting back all $1200, and a 67% chance of getting back no money.</p>
                                <p>Which plan would you use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_2',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that in one particular state it is projected that 1000 students will drop out of school during the next year. Two programs have been proposed to address this problem, but only one can be implemented. Based on other states' experiences with the programs, estimates of the outcomes that can be expected from each program can be made. Assume for purposes of this decision that these estimates of the outcomes are accurate and are as follows:</p>
                                <p style="margin-left: 30px">If Program A is adopted, 400 of the 1000 students will stay in school.</p>
                                <p style="margin-left: 30px">If Program B is adopted, there is a 40% chance that all 1000 students will stay in school and 60% chance that none of the 1000 students will stay in school.</p>
                                <p>Which program would you favor for implementation?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_3',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that the U.S. is preparing for the outbreak of an unusual disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed. Assume that the exact scientific estimates of the consequences of the programs are as follows:</p>
                                <p style="margin-left: 30px">If Program A is adopted, 200 people will be saved.</p>
                                <p style="margin-left: 30px">If Program B is adopted, there is a 33% chance that 600 people will be saved, and a 67% chance that no people will be saved.</p>
                                <p>Which program do you recommend to use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_4',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that your doctor tells you that you have a cancer that must be treated. Your choices are as follows:</p>
                                <p style="margin-left: 30px">Surgery: Of 100 people having surgery, 90 live through the operation, and 34 are alive at the end of five years.</p>
                                <p style="margin-left: 30px">Radiation therapy: Of 100 people having radiation therapy, all live through the treatment, and 22 are alive at the end of five years.</p>
                                <p>Which treatment would you choose?</p>`,
				label_min: 'Definitely would choose surgery',
				label_max: 'Definitely would choose radiation',
				id: 'rc1_5',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that your client has $6,000 invested in the stock market. A downturn in the economy is occurring. You have two investment strategies that you can recommend under the existing circumstances to preserve your client's capital.</p>
                                <p style="margin-left: 30px">If strategy A is followed, $2,000 of your client's investment will be saved.</p>
                                <p style="margin-left: 30px">If strategy B is followed, there is a 33% chance that the entire $6,000 will be saved, and a 67% chance that none of the principal will be saved.</p>
                                <p>Which of these two strategies would you favor?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_6',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine a hospital is treating 32 injured soldiers, who are all expected to lose one leg. There are two doctors that can help the soldiers, but only one can be hired:</p>
                                <p style="margin-left: 30px">If Doctor A is hired, 20 soldiers will keep both legs.</p>
                                <p style="margin-left: 30px">If Doctor B is hired, there is a 63% chance that all soldiers keep both legs and a 37% chance that nobody will save both legs.</p>
                                <p>Which doctor do you recommend?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc1_7',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a type of condom has a 95% success rate. That is, if you have sex with someone who has the AIDS virus, there is a 95% chance that this type of condom will prevent you from being exposed to the AIDS virus.</p>
                                <p>Should the government allow this type of condom to be advertised as "an effective method for lowering the risk of AIDS"?</p>`,
				label_min: 'Definitely no',
				label_max: 'Definitely yes',
				id: 'a1_1',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine the following situation. You are entertaining a special friend by inviting them for dinner. You are making your favorite lasagna dish with ground beef. Your roommate goes to the grocery store and purchases a package of ground beef for you. The label says 80% lean ground beef.</p>
                                <p>What's your evaluation of the quality of this ground beef?</p>`,
				label_min: 'Very low',
				label_max: 'Very high',
				id: 'a1_2',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>In a recent confidential survey completed by graduating seniors, 35% of those completing the survey stated that they had never cheated during their college career.</p>
                                <p>Considering the results of the survey, how would you rate the incidence of cheating at your university?</p>`,
				label_min: 'Very low',
				label_max: 'Very high',
				id: 'a1_3',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>As R&D manager, one of your project teams has come to you requesting an additional $100,000 in funds for a project you instituted several months ago. The project is already behind schedule and over budget, but the team still believes it can be successfully completed. You currently have $500,000 remaining in your budget unallocated, but which must carry you for the rest of the fiscal year. Lowering the balance by an additional $100,000 might jeopardize flexibility to respond to other opportunities.</p>
                                <p>Evaluating the situation, you believe there is a fair chance the project will not succeed, in which case the additional funding would be lost; if successful, however, the money would be well spent. You also noticed that of the projects undertaken by this team, 30 of the last 50 have been successful.</p>
                                <p>What is the likelihood you would fund the request?</p>`,
				label_min: 'Very unlikely',
				label_max: 'Very likely',
				id: 'a1_4',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Suppose a student got 90% correct in the mid-term exam and 70% correct in the final-term exam, what would be your evaluations of this student's performance?</p>`,
				label_min: 'Very poor',
				label_max: 'Very good',
				id: 'a1_5',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a woman parked illegally. After talking to her, you believe that there is a 20% chance that she did not know she parked illegally.</p>
                                <p>With this in mind, how much of a fine do you believe this woman deserves?</p>`,
				label_min: 'Minimum fine',
				label_max: 'Maximum fine',
				id: 'a1_6',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a new technique has been developed to treat a particular kind of cancer. This technique has a 50% chance of success, and is available at the local hospital.</p>
                                <p>A member of your immediate family is a patient at the local hospital with this kind of cancer. Would you encourage him or her to undergo treatment using this technique?</p>`,
				label_min: 'Definitely no',
				label_max: 'Definitely yes',
				id: 'a1_7',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine a hospital is treating 32 injured soldiers, who are all expected to lose one leg. There are two doctors that can help the soldiers, but only one can be hired:</p>
                                <p style="margin-left: 30px">If Doctor A is hired, 12 soldiers will lose one leg.</p>
                                <p style="margin-left: 30px">If Doctor B is hired, there is a 63% chance that nobody loses a leg and a 37% chance that all lose a leg.</p>
                                <p>Which doctor do you recommend?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_1',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that the U.S. is preparing for the outbreak of an unusual disease, which is expected to kill 600 people. Two alternative programs to combat the disease have been proposed. Assume that the exact scientific estimates of the consequences of the programs are as follows:</p>
                                <p style="margin-left: 30px">If Program A is adopted, 400 people will die.</p>
                                <p style="margin-left: 30px">If Program B is adopted, there is a 33% chance that nobody will die, and a 67% chance that 600 people will die.</p>
                                <p>Which program do you recommend to use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_2',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that your client has $6,000 invested in the stock market. A downturn in the economy is occurring. You have two investment strategies that you can recommend under the existing circumstances to preserve your client's capital.</p>
                                <p style="margin-left: 30px">If strategy A is followed, $4,000 of your client's investment will be lost.</p>
                                <p style="margin-left: 30px">If strategy B is followed, there is a 33% chance that the nothing will be lost, and a 67% chance that $6,000 will be lost.</p>
                                <p>Which of these two strategies would you favor?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_3',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Because of changes in tax laws, you may get back as much as $1200 in income tax. Your accountant has been exploring alternative ways to take advantage of this situation. He has developed two plans:</p>
                                <p style="margin-left: 30px">If Plan A is adopted, you will lose $800 of the possible $1200.</p>
                                <p style="margin-left: 30px">If Plan B is adopted, you have a 33% chance of losing none of the money, and a 67% chance of losing all $1200.</p>
                                <p>Which plan would you use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_4',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that recent evidence has shown that a pesticide is threatening the lives of 1,200 endangered animals. Two response options have been suggested:</p>
                                <p style="margin-left: 30px">If Option A is used, 600 animals will be lost for sure.</p>
                                <p style="margin-left: 30px">If Option B is used, there is a 75% chance that 400 animals will be lost, and a 25% chance that 1,200 animals will be lost.</p>
                                <p>Which option do you recommend to use?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_5',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that your doctor tells you that you have a cancer that must be treated. Your choices are as follows:</p>
                                <p style="margin-left: 30px">Surgery: Of 100 people having surgery, 10 die because of the operation, and 66 die by the end of five years.</p>
                                <p style="margin-left: 30px">Radiation therapy: Of 100 people having radiation therapy, none die during the treatment, and 78 die by the end of five years.</p>
                                <p>Which treatment would you choose?</p>`,
				label_min: 'Definitely would choose surgery',
				label_max: 'Definitely would choose radiation',
				id: 'rc2_6',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that in one particular state it is projected that 1000 students will drop out of school during the next year. Two programs have been proposed to address this problem, but only one can be implemented. Based on other states' experiences with the programs, estimates of the outcomes that can be expected from each program can be made. Assume for purposes of this decision that these estimates of the outcomes are accurate and are as follows:</p>
                                <p style="margin-left: 30px">If Program A is adopted, 600 of the 1000 students will drop out of school.</p>
                                <p style="margin-left: 30px">If Program B is adopted, there is a 40% chance that none of the 1000 students will drop out of school and 60% chance that all 1000 students will drop out of school.</p>
                                <p>Which program would you favor for implementation?</p>`,
				label_min: 'Definitely would choose A',
				label_max: 'Definitely would choose B',
				id: 'rc2_7',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>As R&D manager, one of your project teams has come to you requesting an additional $100,000 in funds for a project you instituted several months ago. The project is already behind schedule and over budget, but the team still believes it can be successfully completed. You currently have $500,000 remaining in your budget unallocated, but which must carry you for the rest of the fiscal year. Lowering the balance by an additional $100,000 might jeopardize flexibility to respond to other opportunities.</p>
                                <p>Evaluating the situation, you believe there is a fair chance the project will not succeed, in which case the additional funding would be lost; if successful, however, the money would be well spent. You also noticed that of the projects undertaken by this team, 20 of the last 50 have been unsuccessful.</p>
                                <p>What is the likelihood you would fund the request?</p>`,
				label_min: 'Very unlikely',
				label_max: 'Very likely',
				id: 'a2_1',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a woman parked illegally. After talking to her, you believe that there is an 80% chance that she knew she parked illegally</p>
                                <p>With this in mind, how much of a fine do you believe this woman deserves?</p>`,
				label_min: 'Minimum fine',
				label_max: 'Maximum fine',
				id: 'a2_2',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>In a recent confidential survey completed by graduating seniors, 65% of those completing the survey stated that they had cheated during their college career.</p>
                                <p>Considering the results of the survey, how would you rate the incidence of cheating at your university?</p>`,
				label_min: 'Very low',
				label_max: 'Very high',
				id: 'a2_3',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a new technique has been developed to treat a particular kind of cancer. This technique has a 50% chance of failure, and is available at the local hospital.</p>
                                <p>A member of your immediate family is a patient at the local hospital with this kind of cancer. How likely are you to encourage him or her to undergo treatment using this technique?</p>`,
				label_min: 'Definitely no',
				label_max: 'Definitely yes',
				id: 'a2_4',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine the following situation. You are entertaining a special friend by inviting them for dinner. You are making your favorite lasagna dish with ground beef. Your roommate goes to the grocery store and purchases a package of ground beef for you. The label says 20% fat ground beef.</p>
                                <p>What's your evaluation of the quality of this ground beef?</p>`,
				label_min: 'Very low',
				label_max: 'Very high',
				id: 'a2_5',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Imagine that a type of condom has a 5% failure rate. That is, if you have sex with someone who has the AIDS virus, there is a 5% chance that this type of condom will fail to prevent you from being exposed to the AIDS virus.</p>
                                <p>Should the government allow this type of condom to be advertised as "an effective method for lowering the risk of AIDS"?</p>`,
				label_min: 'Definitely no',
				label_max: 'Definitely yes',
				id: 'a2_6',
			},
			{
				stimulus_html: `<p><b>Problem</b></p>
                                <p>Suppose a student got 10% incorrect in the mid-term exam and 30% incorrect in the final-term exam, what would be your evaluations of this student's performance?</p>`,
				label_min: 'Very poor',
				label_max: 'Very good',
				id: 'a2_7',
			},
		];
	}
}
