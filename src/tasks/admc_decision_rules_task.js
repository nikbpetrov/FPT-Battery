import instructions from '@jspsych/plugin-instructions';
import surveyMultiSelect from '@jspsych/plugin-survey-multi-select';
import { deepMerge, construct_full_media_path } from '../utils/helpers.js';

export default class ADMC_Decision_Rules {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;
		
		this.duration_mins = 3;
		this.browser_requirements = { min_width: 840, min_height: 500, mobile_allowed: false };
		this.media = ['instructions/DR_example_1.png', 'instructions/DR_example_2.png', 'instructions/DR_example_3.png'].map((f) => construct_full_media_path(this.media_basepath, f));
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.define_trials();
	}

	get_default_settings() {
		return {
			dr_items: this.get_dr_items(),
			ignore_validation: false,
			instructions_time_limit: 180,
			trial_time_limit: 45,
		};
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		this.dr_instructions = {
			type: instructions,
			pages: [
				`<u><b>Instructions</b></u><br>Please read the practice problems on this page carefully before going on to the problems on the next page.
                <p>Imagine Chris is going to buy a TV with the $369 he received for his birthday. He wants to find out how the TVs that are available for that price compare to each other. A magazine rated TVs on each of five features as follows, where higher is better:</p>
                <div class="admc-dr-numbers-desc-container">
                    <div>Very Low<br>1</div>
                    <div>Low<br>2</div>
                    <div>Medium<br>3</div>
                    <div>High<br>4</div>
                    <div>Very High<br>5</div>
                </div>
                <p>For example, two TVs and their ratings are listed in the table below:</p>
                <table>
                    <tr>
                        <th></th>
                        <th>Picture Quality</th>
                        <th>Sound Quality</th>
                        <th>Programming Options</th>
                        <th>Reliability of Brand</th>
                        <th>Price</th>
                    </tr>
                    <tr>
                        <td>A</td>
                        <td>2</td>
                        <td>2</td>
                        <td>5</td>
                        <td>4</td>
                        <td>$369</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td>B</td>
                        <td>2</td>
                        <td>3</td>
                        <td>3</td>
                        <td>3</td>
                        <td>$369</td>
                    </tr>
                </table>
                <p><b>The following examples use the table above. Please read each carefully.</b></p>
                <p><u>Example 1.</u> Chris selects the TV with the highest rating in Programming Options.</p>
                <p>Which <b><u>one</b></u> of the presented TVs would Chris prefer?</p>
                <div><img class="dr_instructions_img" src="${construct_full_media_path(this.media_basepath, 'instructions/DR_example_1.png')}"/></div>
                <p><u>Example 2.</u> Chris only wants a TV with a sound quality that is rated higher than 4.</p>
                <p>Which <b><u>one</b></u> of the presented TVs would Chris prefer?</p>
                <div><img class="dr_instructions_img" src="${construct_full_media_path(this.media_basepath, 'instructions/DR_example_2.png')}"/></div>
                <p><u>Example 3.</u> Chris only wants the best in Picture Quality.</p>
                <p>Which <b><u>two</b></u> of the presented TVs would Chris prefer?</p>
                <div><img class="dr_instructions_img" src="${construct_full_media_path(this.media_basepath, 'instructions/DR_example_3.png')}"/></div>`,

				`The following questions are about other people choosing between TVs, like the ones before. <b>Please read each question carefully, because they ask for different answers.</b> For each question, think about how each person makes their choice, then pick the TV they choose. But be careful, because the TVs will change from question to question.`,
			],
			show_clickable_nav: true,
			allow_backward: true,
			css_classes: ['instructions_width', 'instructions_left_align'],
			timer: self.settings.instructions_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_dr_instructions';
			},
		};

		self.dr_trial = {
			type: surveyMultiSelect,
			questions: function () {
				return [
					{
						prompt: `
                        <div class="admc-dr-numbers-desc-container">
                            <div>Very Low<br>1</div>
                            <div>Low<br>2</div>
                            <div>Medium<br>3</div>
                            <div>High<br>4</div>
                            <div>Very High<br>5</div>
                        </div>
                        <p style="text-align: left"><b>Question ${self.jsPsych.timelineVariable('id').slice(2)}:</b></p>
                        <table>
                            <tr>
                                <th></th>
                                <th>Picture Quality</th>
                                <th>Sound Quality</th>
                                <th>Programming Options</th>
                                <th>Reliability of Brand</th>
                                <th>Price</th>
                            </tr>
                            <tr>
                                <td>A</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[0][0]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[0][1]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[0][2]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[0][3]}</td>
                                <td>$369</td>
                            </tr>
                            <tr>
                                <td>B</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[1][0]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[1][1]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[1][2]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[1][3]}</td>
                                <td>$369</td>
                            </tr>
                            <tr>
                                <td>C</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[2][0]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[2][1]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[2][2]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[2][3]}</td>
                                <td>$369</td>
                            </tr>
                            <tr>
                                <td>D</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[3][0]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[3][1]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[3][2]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[3][3]}</td>
                                <td>$369</td>
                            </tr>
                            <tr>
                                <td>E</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[4][0]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[4][1]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[4][2]}</td>
                                <td>${self.jsPsych.timelineVariable('table_numbers')[4][3]}</td>
                                <td>$369</td>
                            </tr>
                        </table>
                        <p style="text-align: left">${self.jsPsych.timelineVariable('problem_description')}</p>
                        <p style="text-align: left">${self.jsPsych.timelineVariable('question')}</p>`,
						options: ['A', 'B', 'C', 'D', 'E', 'None'],
						horizontal: true,
						required: false,
						name: self.jsPsych.timelineVariable('id'),
					},
				];
			},
			on_load: function () {
				if (!(self.settings.ignore_validation === true)) {
					let next_button = document.querySelector('#jspsych-survey-multi-select-next');
					next_button.disabled = true;

					let all_checkboxes = document.querySelectorAll(
						`#jspsych-content input[type="checkbox"]`
					);

					const max_checked = self.jsPsych.timelineVariable('correct_answers').length;
					all_checkboxes.forEach((checkbox) => {
						checkbox.addEventListener('change', () => {
							const checked_checkboxes = document.querySelectorAll(
								'#jspsych-content input[type="checkbox"]:checked'
							);
							if (checked_checkboxes.length >= max_checked) {
								all_checkboxes.forEach((unchecked) => {
									if (!unchecked.checked) {
										unchecked.disabled = true;
									}
								});
								next_button.disabled = false;
							} else {
								all_checkboxes.forEach((unchecked) => {
									unchecked.disabled = false;
								});
								next_button.disabled = true;
							}
						});
					});
				}
			},
			timer: self.settings.trial_time_limit,
			on_finish: function (data) {
				data.trial_name = 'admc_dr_trial';
				data.admc_id = self.jsPsych.timelineVariable('id');
				data.admc_response =
					data.response == null
						? null
						: self.jsPsych
								.timelineVariable('correct_answers')
								.filter((e) => Object.values(data.response)[0].includes(e)).length;
			},
			simulation_options: 'admc_dr_trial',
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null) {
		let timeline = [];
		
		timeline.push(this.dr_instructions);
		timeline.push(hide_progress_bar_trial_generator);
		timeline.push({
			timeline: [this.dr_trial],
			timeline_variables: this.settings.dr_items,
		});

		return timeline
	}

	get_dr_items() {
		return [
			{
				id: 'dr1',
				correct_answers: ['C'],
				table_numbers: [
					[5, 4, 2, 1],
					[5, 5, 3, 3],
					[5, 2, 4, 4],
					[1, 5, 5, 3],
					[4, 5, 1, 1],
				],
				problem_description: `Brian selects the TV with the highest number of ratings greater than "Medium".`,
				question: `Which <b><u>one</u></b> of the presented TVs would Brian prefer?`,
			},
			{
				id: 'dr2',
				correct_answers: ['D'],
				table_numbers: [
					[2, 5, 5, 5],
					[5, 4, 4, 5],
					[5, 3, 2, 5],
					[3, 5, 2, 2],
					[4, 4, 4, 5],
				],
				problem_description: `Sally first selects the TVs with the best Sound Quality. From the selected TVs, she then selects the best on Picture Quality. Then, if there is still more than one left to choose from, she selects the one best on Programming Options.`,
				question: `Which <b><u>one</u></b> of the presented TVs would Sally prefer?`,
			},
			{
				id: 'dr3',
				correct_answers: ['C'],
				table_numbers: [
					[3, 1, 2, 5],
					[5, 5, 3, 2],
					[4, 3, 3, 3],
					[5, 5, 5, 4],
					[2, 5, 4, 4],
				],
				problem_description: `Pat doesn't want to read through the entire table. He decides to read the table row by row until he finds the very first TV that has no ratings below "Medium." He will just choose that TV.`,
				question: `Which <b><u>one</u></b> of the presented TVs would Pat prefer?`,
			},
			{
				id: 'dr4',
				correct_answers: ['None'],
				table_numbers: [
					[3, 5, 5, 1],
					[1, 2, 1, 2],
					[5, 5, 4, 4],
					[5, 3, 4, 2],
					[4, 5, 2, 2],
				],
				problem_description: `LaToya only wants a TV that got a "Very High" rating on Reliability of Brand.`,
				question: `Which <b><u>one</u></b> of the presented TVs would LaToya prefer?`,
			},
			{
				id: 'dr5',
				correct_answers: ['A'],
				table_numbers: [
					[5, 5, 5, 3],
					[3, 5, 4, 5],
					[5, 2, 2, 4],
					[5, 1, 2, 5],
					[4, 2, 4, 5],
				],
				problem_description: `From the TVs with the best available Picture Quality, Tricia selects the TVs with the lowest number of ratings below "Medium." If there is more than one TV left to choose from, she then picks the one that has the best rating on "Reliability of Brand."`,
				question: `Which <b><u>one</u></b> of the presented TVs would Tricia prefer?`,
			},
			{
				id: 'dr6',
				correct_answers: ['E'],
				table_numbers: [
					[3, 1, 5, 2],
					[1, 2, 1, 2],
					[5, 4, 3, 1],
					[4, 2, 3, 3],
					[4, 4, 2, 4],
				],
				problem_description: `Lisa wants the TV with the highest average rating across features.`,
				question: `Which <b><u>one</u></b> of the presented TVs would Lisa prefer?`,
			},
			{
				id: 'dr7',
				correct_answers: ['E'],
				table_numbers: [
					[5, 3, 5, 5],
					[2, 5, 4, 1],
					[4, 5, 2, 3],
					[3, 5, 3, 1],
					[3, 5, 3, 4],
				],
				problem_description: `Andy wants the TV with the highest average rating he can get while still making sure to keep the best rating on Sound Quality.`,
				question: `Which <b><u>one</u></b> of the presented TVs would Andy prefer?`,
			},
			{
				id: 'dr8',
				correct_answers: ['A', 'C'],
				table_numbers: [
					[5, 4, 5, 3],
					[5, 4, 1, 2],
					[3, 3, 5, 5],
					[5, 5, 1, 2],
					[3, 5, 1, 3],
				],
				problem_description: `Shane wants no TVs that score below "Medium" on Picture Quality, no TVs that score below "Medium" on Sound Quality, and no TVs that score "Very Low" on any other feature.`,
				question: `Which <b><u>two</u></b> of the presented TVs would Shane prefer?`,
			},
			{
				id: 'dr9',
				correct_answers: ['A', 'D', 'E'],
				table_numbers: [
					[2, 1, 5, 2],
					[1, 5, 4, 2],
					[5, 3, 1, 1],
					[5, 4, 5, 4],
					[3, 3, 3, 3],
				],
				problem_description: `Tyrone wants a TV that either has a "Very High" rating for Programming Options, or one that scores at least “Medium" on every feature.`,
				question: `Which <b><u>three</u></b> of the presented TVs would Tyrone prefer?`,
			},
			{
				id: 'dr10',
				correct_answers: ['C', 'D', 'E'],
				table_numbers: [
					[2, 1, 5, 4],
					[4, 5, 1, 3],
					[1, 3, 5, 5],
					[4, 2, 5, 4],
					[5, 5, 1, 3],
				],
				problem_description: `Julie wants the best Reliability of Brand, but is willing to give up one point on Reliability of Brand for each increase of at least two points in the rating of Picture Quality. She isn't concerned about the other features.`,
				question: `Which <b><u>three</u></b> of the presented TVs would Julie prefer?`,
			},
		];
	}
}
