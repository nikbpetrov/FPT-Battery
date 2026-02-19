import { IDS } from './FPTBattery.js';

export class fptProgressBar {
	constructor() {
		// this.disable = config.disable || false;
		this.selectors = {
			container: `#${IDS.progressContainer}`,
			wrapper: `#${IDS.progressWrapper}`,
			bar: `#${IDS.progressBar}`,
			label: `#${IDS.progressLabel}`,
			text: `#${IDS.progressText}`,
		};
		this.progress = { current_duration_mins: 0, total_duration_mins: 0 };
	}

	// initialize(allTasks, savedProgress, skip_intro_trials) {
	// 	if (this.disable) {
	// 		return;
	// 	}

	// 	const container = document.querySelector(this.selectors.container);
	// 	if (!container) {
	// 		return;
	// 	}

	// 	this.calculateTotalDuration(allTasks, skip_intro_trials);
	// 	this.restoreProgress(allTasks, savedProgress, skip_intro_trials);
	// 	this.updateDisplay();
	// }

	// calculateTotalDuration(allTasks, skip_intro_trials) {
	// 	this.progress.total_duration_mins = skip_intro_trials ? 0 : 2;
	// 	for (let task of allTasks) {
	// 		this.progress.total_duration_mins += task.duration_mins;
	// 	}
	// }

	// restoreProgress(allTasks, savedProgress, skip_intro_trials) {
	// 	if (
	// 		!skip_intro_trials &&
	// 		savedProgress.data_checkpoints.includes('experiment__welcome')
	// 	) {
	// 		this.progress.current_duration_mins += 2;
	// 	}

	// 	for (let task of allTasks) {
	// 		if (
	// 			savedProgress.data_checkpoints.includes(
	// 				`task_${task.task_order_index}_${task.prettyname}__completed`
	// 			)
	// 		) {
	// 			this.progress.current_duration_mins += task.duration_mins;
	// 		}
	// 	}
	// }

	updateDisplay() {
		const container = document.querySelector(this.selectors.container);
		if (!container) {
			return;
		}

		let percent = Math.round(
			(this.progress.current_duration_mins / this.progress.total_duration_mins) * 100
		);

		if (percent > 100) {
			percent = 100;
		}

		container.style.visibility = 'visible';
		const bar = document.querySelector(this.selectors.bar);
		const text = document.querySelector(this.selectors.text);

		if (bar) bar.style.height = `${percent}%`;
		if (text) text.innerHTML = `${percent}%`;
	}

	update(mins, update_display = true) {
		this.progress.current_duration_mins += mins;
		if (update_display) {
			this.updateDisplay();
		}
	}

	hide() {
		const container = document.querySelector(this.selectors.container);
		if (container) {
			container.style.visibility = 'hidden';
		}
	}
}
