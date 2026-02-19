import { IDS } from './FPTBattery.js';

export class fptProgressBar {
	constructor() {
		this.selectors = {
			container: `#${IDS.progressContainer}`,
			wrapper: `#${IDS.progressWrapper}`,
			bar: `#${IDS.progressBar}`,
			label: `#${IDS.progressLabel}`,
			text: `#${IDS.progressText}`,
		};
		this.progress = { current_duration_mins: 0, total_duration_mins: 0 };
	}

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
