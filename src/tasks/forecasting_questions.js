import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import surveyHtmlForm from '@jspsych/plugin-survey-html-form';
import { deepMerge, format_ind_to_key } from '../utils/helpers.js';

export default class Forecasting_Questions {
	constructor(name, media_basepath, jsPsych, custom_task_settings) {
		this.name = name;
		this.media_basepath = media_basepath;
		this.jsPsych = jsPsych;

		this.browser_requirements = { min_width: 840, min_height: 600, mobile_allowed: false };
		this.media = [];
		this.media_promises = [];

		this.settings = deepMerge(this.get_default_settings(), custom_task_settings);

		this.task_data = this.get_task_data();
		this.duration_mins =
			3 +
			3 *
				Object.values(
					this.task_data.test_trials[
						format_ind_to_key(0, 'block')
					] || {}
				).length;
		this.define_trials();
	}

	get_default_settings() {
		return {
			skip_instructions: false,
			question_ids_to_show: [],
			date_start: '01 June 2025',
			date_end: '30 June 2025',
			// below are also passed from the FPTBattery class
			// but are not user-controlled
			completed_checkpoints: [],
			task_order_index: 0,
		};
	}

	get_task_data() {
		const task_data = { pt_trials: {}, test_trials: {} };

		const questions = this.get_all_questions();
		let curr_pp_questions = [];
		for (let question_id of this.settings.question_ids_to_show) {
			if (
				!this.settings.completed_checkpoints.includes(
					`task_${this.settings.task_order_index}_${this.name}_question_${question_id}_completed`
				)
			) {
				curr_pp_questions.push(questions.find((q) => `${q.question_id}` === question_id));
			}
		}

		for (let test_trial_ind = 0; test_trial_ind < curr_pp_questions.length; test_trial_ind++) {
			const test_block_ind = 0; //Math.floor(test_trial_ind / this.settings.TEST_TRIALS_PER_BLOCK)
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
				question_info: curr_pp_questions[test_trial_ind],
			};
		}
		return task_data;
	}

	define_trials() {
		// it's quite common to refer to both the current trial context so this causes context conflict for the this keyword
		// therefore, for this method we will use self to refer to the class and this will be for whatever the current context is
		let self = this;

		self.instructions_confirmation = {
			type: htmlButtonResponse,
			stimulus: function () {
				let last_trial_responses = self.jsPsych.data
					.get()
					.filter({ trial_name: 'forecasting_question' })
					.last(1)
					.values()[0]['response'];
				let html = `
                <p>Based on your answer, you believe:</p>
                <p style="text-align: left;">A. There is a <b>5%</b> chance the average temperature in New York City will be <b>less than or equal to ${last_trial_responses['input_5']} degrees (Fahrenheit)</b> in July 2025, which means you believe there is a <b>95%</b> chance the average temperature in New York City will be <b>greater than ${last_trial_responses['input_5']} degrees (Fahrenheit)</b> in July 2025.</p>
                <p style="text-align: left;">B. There is a <b>25%</b> chance the average temperature in New York City will be <b>less than or equal to ${last_trial_responses['input_25']} degrees (Fahrenheit)</b> in July 2025, which means you believe there is a <b>75%</b> chance the average temperature in New York City will be <b>greater than ${last_trial_responses['input_25']} degrees (Fahrenheit)</b> in July 2025.</p>
                <p style="text-align: left;">C. There is a <b>50%</b> chance the average temperature in New York City will be <b>less than or equal to ${last_trial_responses['input_50']} degrees (Fahrenheit)</b> in July 2025, which means you believe there is a <b>50%</b> chance the average temperature in New York City will be <b>greater than ${last_trial_responses['input_50']} degrees (Fahrenheit)</b> in July 2025.</p>
                <p style="text-align: left;">D. There is a <b>75%</b> chance the average temperature in New York City will be <b>less than or equal to ${last_trial_responses['input_75']} degrees (Fahrenheit)</b> in July 2025, which means you believe there is a <b>25%</b> chance the average temperature in New York City will be <b>greater than ${last_trial_responses['input_75']} degrees (Fahrenheit)</b> in July 2025.</p>
                <p style="text-align: left;">E. There is a <b>95%</b> chance the average temperature in New York City will be <b>less than or equal to ${last_trial_responses['input_95']} degrees (Fahrenheit)</b> in July 2025, which means you believe there is a <b>5%</b> chance the average temperature in New York City will be <b>greater than ${last_trial_responses['input_95']} degrees (Fahrenheit)</b> in July 2025.</p>
                <p>Is that correct? If not, you may press the back button below to return to the previous screen. If yes, continue to the next page.</p>
                `;
				return html;
			},
			choices: ['Go Back', 'Continue'],
		};

		const QUANTILES = [5, 25, 50, 75, 95];
		self.test_trial = {
			type: surveyHtmlForm,
			html: function () {
				let html = `<div id="question_container">
                                ${self.jsPsych.timelineVariable('question_info').question_text}
                                <p>For each percentage listed below, your answer should indicate you believe there is that percent chance the outcome will be ___ or less.</p>
                            </div>
                            <div id="text_inputs_parent_container">`;
				for (let i = 0; i < QUANTILES.length; i++) {
					html += `<div class="text_input_container">
                                    <span class="text_input_label">${QUANTILES[i]}%</span>
                                    <div class="text_input_inside_container">
                                        <input type="text" name="input_${QUANTILES[i]}" required="true">
                                    </div>
                                </div>`;
				}
				html += `</div>`;
				return html;
			},
			choices: ['Continue'],
			trial_duration: self.settings.simulate
				? self.settings.simulate_trial_duration * 1.2
				: null,
			css_classes: ['question_box'],
			on_load: function () {

				let input_validation_timeout_handlers = [];
				function show_invalid_input_message() {
					for (const handler of input_validation_timeout_handlers) {
						clearTimeout(handler);
					}
					input_validation_timeout_handlers = [];
					if (document.querySelector('#text_invalid_input') !== null)
						document.querySelector('#text_invalid_input').remove();

					// Create the error message div
					const errorMessage = document.createElement('div');
					errorMessage.id = 'text_invalid_input';
					errorMessage.textContent =
						'Invalid input. Only positive/negative integers with up to 2 decimals, e.g. 5 or -5.25.';

					// Append to the body
					document.body.appendChild(errorMessage);

					// Trigger fade-in effect
					const fade_in_handle = self.jsPsych.pluginAPI.setTimeout(() => {
						errorMessage.classList.add('show');
					}, 10); // Delay to ensure the element is rendered before adding the class
					input_validation_timeout_handlers.push(fade_in_handle);

					// Set a timeout to remove the message after 5 seconds
					const opacity_handle = self.jsPsych.pluginAPI.setTimeout(() => {
						errorMessage.style.opacity = '0';
						const remove_message_handle = self.jsPsych.pluginAPI.setTimeout(() => {
							errorMessage.remove();
						}, 500); // wait for the fade-out transition to complete
						input_validation_timeout_handlers.push(remove_message_handle);
					}, 5000);
					input_validation_timeout_handlers.push(opacity_handle);
				}

				function bind_input_events() {
					document.querySelectorAll("input[type='text']").forEach((input) => {
						input.addEventListener('input', (event) => {
							let value = event.target.value;
							// Regular expression to match valid inputs: integers, decimals with up to 2 places
							const validPattern = /^-?(\d+(\.\d{0,2})?)?$/;
							if (!validPattern.test(value)) {
								// If not, remove the last character (invalid input)
								if (event.inputType == 'insertFromPaste') {
									event.target.value = '';
									show_invalid_input_message();
									return;
								} else {
									event.target.value = value.slice(0, -1);
									show_invalid_input_message();
								}
							}
						});
					});
				}
				bind_input_events();

				if (self.jsPsych.timelineVariable('pt_trial')) {
					let last_trial_data = self.jsPsych.data
						.get()
						.filter({ trial_name: 'forecasting_question' })
						.last(1)
						.values();
					if (last_trial_data.length > 0) {
						let last_trial_responses = last_trial_data[0]['response'];
						document.querySelectorAll("input[type='text']").forEach((input) => {
							input.value = last_trial_responses[input.name];
						});
					}
				}
			},
			on_finish: function (data) {
				delete data.stimulus;

				data.trial_name = 'forecasting_question';
				data.pt_trial = self.jsPsych.timelineVariable('pt_trial');
				data.block = self.jsPsych.timelineVariable('block');
				data.trial = self.jsPsych.timelineVariable('trial');

				data.question_ind = self.jsPsych.timelineVariable('question_info').question_ind;
				data.question_id = self.jsPsych.timelineVariable('question_info').question_id;
			},
		};
	}

	get_timeline(hide_progress_bar_trial_generator = null, async_data_save_trial_generator = null) {
		let timeline = [];

		if (!this.settings.completed_checkpoints.includes(`task_${this.settings.task_order_index}_${this.name}_start`) &&
			async_data_save_trial_generator) 
		{
            timeline.push(
                async_data_save_trial_generator(`task_${this.settings.task_order_index}_${this.name}_start`)
            );
		}

		if (hide_progress_bar_trial_generator) {
			timeline.push(hide_progress_bar_trial_generator);
		}

		// Instructions
		if (
			!this.settings.skip_instructions &&
			!this.settings.completed_checkpoints.includes(`task_${this.settings.task_order_index}_${this.name}_instructions_completed`)
		) {
			const instructions_timeline = {
				timeline: [this.test_trial, this.instructions_confirmation],
				timeline_variables: [this.get_instructions_question()],
				loop_function: function (data) {
					return data.values()[1].response === 0;
				},
			};
			timeline.push(instructions_timeline);
			if (async_data_save_trial_generator) {
				timeline.push(async_data_save_trial_generator(`task_${this.settings.task_order_index}_${this.name}_instructions_completed`));
			}
		}

		// Test trials
		let test_trials_timeline = { timeline: [] };
		console.log(this.task_data.test_trials);
		for (let test_trial of Object.values(this.task_data.test_trials[format_ind_to_key(0, 'block')])) {
			test_trials_timeline.timeline.push({
				timeline: [
					this.test_trial,
					async_data_save_trial_generator(
						`task_${this.settings.task_order_index}_${this.name}_question_${test_trial.question_info.question_id}_completed`
					),
				],
				timeline_variables: [test_trial],
			});
		}
		timeline.push(test_trials_timeline);

		return timeline;
	}

	get_all_questions() {
		const date_start = `<b>${this.settings.date_start}</b>`;
		const date_end = `<b>${this.settings.date_end}</b>`;

		const questions = [
			{
				question_ind: 0,
				question_id: 'G1189',
				question_text: `<p>What will be the closing value for the Dow Jones Transportation Average on ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://finance.yahoo.com/quote/%5EDJT/" target="_blank"> Yahoo Finance website</a>. You can view the current Dow Jones Transportation Average index value and its historical data by clicking the link.</p>`,
			},
			{
				question_ind: 1,
				question_id: 'M5680',
				question_text: `<p>How much will carbon dioxide emissions from ground transportation globally change (in percent) from the previous year for the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href=" https://carbonmonitor.org/" target="_blan"">Carbon Monitor database</a>. You can view the latest records of CO2 emissions by clicking the link. You can compare emissions from different years by selecting the "Variation" tab above the graph and using the "expand filters" on the left to select a specific section of interest and a date range.</p>`,
			},
			{
				question_ind: 2,
				question_id: 'G2063',
				question_text: `<p>How many New York City eviction filings will be reported in the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://evictionlab.org/eviction-tracking/new-york-ny/" target="_blank"> Eviction Lab database</a>. You can view the filing counts by month by clicking the link and scrolling down to the "Trends in eviction filings" dashboard. Click on "Filing counts" below the chart and look at the "Filings This Year" numbers.</p>`,
			},
			{
				question_ind: 3,
				question_id: 'G410',
				question_text: `<p>How many refugees and migrants will arrive in Europe by sea in the Mediterranean between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://data.unhcr.org/en/situations/mediterranean" target="_blank"> UNHCR data portal</a>. You can view the latest updates and historical data on the "Mediterranean Situation" by clicking the link. The numbers arriving by sea in the past years are indicated by the "Sea arrivals monthly" chart.</p>`,
			},
			{
				question_ind: 4,
				question_id: 'G1631',
				question_text: `<p>What will be the value of the Total Assets of the Federal Reserve (in millions of dollars) on ${date_end} or the most recent date prior to ${date_end} when the data is published?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm" target="_blank"> Federal Reserve website</a>. Data updates are published at weekly intervals. You can view the historical data by clicking the link.</p>`,
			},
			{
				question_ind: 5,
				question_id: 'C1039',
				question_text: `<p>What percentage of the Continental U.S. will be facing severe drought or worse on ${date_end} or the most recent date prior to ${date_end} when the data is released?</p><p>This question will be resolved using the <a id="resource_link" href="https://droughtmonitor.unl.edu/DmData/TimeSeries.aspx" target="_blank"> U.S. Drought Monitor database</a>. You can view the historical data by clicking the link and selecting the level of drought using the checkbox. Severe drought is indicated as "D2," with larger values indicating higher drought severity. You can base yourself on the D2-D4 data (in orange on the chart). To zoom in on the chart, click and drag the cursor. To return to the time series, double-click anywhere in the chart.</p>`,
			},
			{
				question_ind: 6,
				question_id: 'M1571',
				question_text: `<p>What will Bitcoin's network hash rate per second be (in TH/s) according to the performance rates posted by blockchain.com on ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.blockchain.com/charts/hash-rate" target="_blank">Blockchain website</a>. You can view the latest data of the Bitcoin network total hash rate by clicking the link.</p>`,
			},
			{
				question_ind: 7,
				question_id: 'G1210',
				question_text: `<p> What will be the closing value for the U.S. Dollar against the Russian Ruble (converting 1 USD to RUB) on ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://finance.yahoo.com/quote/RUB=X/" target="_blank"> Yahoo Finance website</a>. You can view the current exchange rate and its historical data by clicking the link.</p>`,
			},
			{
				question_ind: 8,
				question_id: 'M7949',
				question_text: `<p>What will be the Arctic sea ice extent (in million km2) on ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://nsidc.org/arcticseaicenews/charctic-interactive-sea-ice-graph/" target="_blank">National Snow & Ice Data Center database</a>. You can view the historical data by clicking the link.</p>`,
			},
			{
				question_ind: 9,
				question_id: 'G2352',
				question_text: `<p>How many travelers will the U.S. Transportation Security Administration (TSA) screen between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.tsa.gov/travel/passenger-volumes" target="_blank">TSA checkpoint travel numbers database</a>. You can view the daily number of the current year and prior year(s) by clicking the link.</p>`,
			},
			{
				question_ind: 10,
				question_id: 'M811',
				question_text: `<p>How many earthquakes of magnitude 5 or stronger will occur worldwide between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.emsc-csem.org/#2w" target="_blank">EMSC database</a>. You can view a full list of recent earthquakes by clicking the link, and under the "Earthquakes" menu selecting "Latest earthquakes." You can perform searches based on magnitude and time period at the top of the page. The total number of earthquakes meeting your criteria is displayed in red above the table on the left.</p>`,
			},
			{
				question_ind: 11,
				question_id: 'C47',
				question_text: `<p>How many O1 visas will go to Chinese nationals in the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-statistics/nonimmigrant-visa-statistics/monthly-nonimmigrant-visa-issuances.html" target="_blank">U.S. Department of State database</a>. You can find the historical data from the "NIV Issuances by Nationality and Visa Class" files for each month by clicking the link. Refer to the number for "China-mainland".</p>`,
			},
			{
				question_ind: 12,
				question_id: 'M8907',
				question_text: `<p>How many commercial flights will be in operation globally on ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.flightradar24.com" target="_blank">Flightradar24 database</a>. You can view the latest flight tracking statistics by clicking the link, and under the menu at the top right corner selecting "Aviation Data" and then "Flight tracking statistics." Refer to the "Number of commercial flights tracked by Flightradar24, per day (UTC time)" graph.</p>`,
			},
			{
				question_ind: 13,
				question_id: 'M5839',
				question_text: `<p>How many New Drug Applications (NDAs) and Biologics License Applications (BLAs) will be approved by the FDA between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.accessdata.fda.gov/scripts/cder/daf/" target="_blank">FDA drug database</a>. You can view the latest approved drugs by clicking the link, selecting "Original NDA and Original BLA Approvals by Month" under the "Drug Approval Reports By Month," and then specifying a month and a year.</p>`,
			},
			{
				question_ind: 14,
				question_id: 'C1084',
				question_text: `<p>How many autonomous vehicle collisions will the California DMV record between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.dmv.ca.gov/portal/vehicle-industry-services/autonomous-vehicles/autonomous-vehicle-collision-reports/#:~:text=Manufacturers%20who%20are%20testing%20autonomous,519%20Autonomous%20Vehicle%20Collision%20Reports." target="_blank">Autonomous Vehicle Collision Reports database</a>. You can view a list of the latest collision reports (mostly ordered by date) by clicking the link and selecting a year.</p>`,
			},
			{
				question_ind: 15,
				question_id: 'G584',
				question_text: `<p>What will be the approval rating for the Russian government in the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.levada.ru/en/ratings/" target="_blank">Levada Analytical Center database</a>. You can view recent approval ratings and historical data by clicking the link and scrolling down to the "Approval of the Government" section.</p>`,
			},
			{
				question_ind: 16,
				question_id: 'G1948',
				question_text: `<p>How many federal firearm background checks will be initiated in the U.S. from ${date_start} to ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.fbi.gov/file-repository/nics_firearm_checks_-_month_year.pdf/view" target="_blank">NICS Firearm Checks database</a>. You can view the latest firearm background check numbers by clicking the link.</p>`,
			},
			{
				question_ind: 17,
				question_id: 'G1190',
				question_text: `<p>What will be the price of regular gasoline in the U.S. (dollars per gallon) on ${date_end} or the most recent date prior to ${date_end} when the price is recorded?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMM_EPMR_PTE_NUS_DPG&f=W" target="_blank">U.S. Energy Information Administration database</a>. You can view the latest gasoline prices in the U.S. and historical data by clicking the link.</p>`,
			},
			{
				question_ind: 18,
				question_id: 'M9971',
				question_text: `<p>What will be the average level of AQI for PM2.5 in Beijing, China during the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://aqicn.org/historical/#!city:beijing" target="_blank">World Air Quality database</a>. You can view past daily mean AQI for PM2.5 values in Beijing by clicking the link and scrolling down to the daily air quality graphs. You can hover your mouse over the graphs to view the AQI value for each day.</p>`,
			},
			{
				question_ind: 19,
				question_id: 'G2268',
				question_text: `<p>How many Southwest Land Border Encounters will be reported in the U.S. between ${date_start} and ${date_end} by U.S. Customs and Border Protection (CBP)?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.cbp.gov/newsroom/stats/southwest-land-border-encounters" target="_blank">CBP database</a>. You can view the count of Southwest Land Border Encounters in recent months by clicking the link.</p>`,
			},
			{
				question_ind: 20,
				question_id: 'G938',
				question_text: `<p>What will be the count of pro-Kremlin disinformation cases identified by the European External Action Service's East StratCom Task Force between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://euvsdisinfo.eu/disinformation-cases/" target="_blank">EUvsDisinfo database</a>. You can view a list of pro-Kremlin disinformation cases by clicking the link. You can use the filter on the left to search cases within a specific date range.</p>`,
			},
			{
				question_ind: 21,
				question_id: 'G1588',
				question_text: `<p>What will be the U.S. civilian unemployment rate (in percent) for the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.bls.gov/charts/employment-situation/civilian-unemployment-rate.htm" target="_blank">Bureau of Labor Statistics database</a>. You can view the latest civilian unemployment rate data by clicking the link.</p>`,
			},
			{
				question_ind: 22,
				question_id: 'G1799',
				question_text: `<p>What will be the number of new privately-owned housing units started in the U.S. (in thousands of units) for the month between ${date_start} and ${date_end}?</p><p>This question will be resolved using seasonally adjusted annual units reported in the <a id="resource_link" href="https://fred.stlouisfed.org/series/HOUST" target="_blank">FRED Economic Data</a>. You can view recent and historical trends in the number of housing units started by clicking the link.</p>`,
			},
			{
				question_ind: 23,
				question_id: 'G1920',
				question_text: `<p>What will be the total U.S. domestic theater box office gross (in USD) between ${date_start} and ${date_end}?</p><p>This question will be resolved using the <a id="resource_link" href="https://www.boxofficemojo.com/?ref_=bo_nb_di_mojologo" target="_blank">Box Office Mojo database</a>. You can view past monthly U.S. box office gross totals by clicking the link, under the "Domestic" menu selecting "Monthly," and then choosing the month you wish to view.</p>`,
			},
		];
		return questions;
	}

	get_instructions_question() {
		// should look like get_task_data setup
		const question = {
			question_ind: -1,
			pt_trial: true,
			block: 0,
			trial: 0,
			question_info: {
				question_id: '',
				question_text: `
                    <p>The forecasts you make in this survey will be in a <span style="color: blue; font-weight: bold">continuous format</span>. An example of such a question might be:</p>
                    <p style="color: blue; font-weight: bold">What will be the average temperature (Fahrenheit) in New York City in <i>July 2025</i>?</p>
                    <p>In this example, we want you to predict the average temperature (Fahrenheit) in New York City in July 2025.</p>
                    <p>You will then see a series of percentage values, and for each one, your answer should indicate you believe there is that percent chance the outcome will be ___ or less. For example, if you put the number 50 for 25%, that would indicate you believe:</p>
                    <p>There is a <b>25% chance</b> that the average temperature in New York City will be <b>less than or equal to 50 degrees (Fahrenheit)</b> in July 2025.</p>
                    <p>Put another way, you would be saying that there is a <b>75% chance</b> that the average temperature in New York City will be <b>greater than 50 degrees (Fahrenheit)</b> in July 2025.</p>
                    <p>For each question, we will provide you with a link. This link will tell you both how the outcome of the question will be determined, and can also help you research your answer by learning about recent and historical trends for this question.</p>
                    <p>For example, we might tell you that we will determine the actual average temperature in New York City in July 2025 by using the <a target="_blank" rel="noopener" href="https://www.weather.gov/media/okx/Climate/CentralPark/monthlyannualtemp.pdf">weather.gov monthly average temperature table</a> for Central Park (New York City). This link also provides historical temperature averages for every month going back to 1869.</p>
                    <hr>
                    <p>Now it's your turn to try:</p>
                    <p style="color: blue; font-weight: bold">What will be the average temperature (Fahrenheit) in New York City in <i>July 2025</i>?</p>
                `,
			},
		};

		return question;
	}
}
