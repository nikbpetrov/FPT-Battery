import 'jspsych/css/jspsych.css';

import './styles/admc_task.css';
import './styles/base.css';
import './styles/bayesian_update_task.css';
import './styles/cognitive_reflection_task.css';
import './styles/coherence_forecasting_task.css';
import './styles/denominator_neglect_task.css';
import './styles/forecasting_questions.css';
import './styles/graph_literacy_task.css';
import './styles/impossible_question_task.css';
import './styles/leapfrog_task.css';
import './styles/number_series_task.css';
import './styles/raven_matrix_task.css';
import './styles/time_series_task.css';

import { FPTBattery, initFPTBattery } from './core/FPTBattery.js';
import { DataSaver } from './core/DataSaver.js';
import { Experiment } from './core/Experiment.js';
import { fptProgressBar } from './core/fptProgressBar.js';
import { fptTrialTimer } from './core/fptTrialTimer.js';
import * as tasks from './tasks/index.js';
import { TASK_REGISTRY } from './tasks/index.js';
// import { get_simulation_options } from './utils/simulation.js';

export {
	initFPTBattery,
	FPTBattery,
	DataSaver,
	Experiment,
	// get_simulation_options,
	fptProgressBar,
	fptTrialTimer,
	TASK_REGISTRY,
	tasks,
};
