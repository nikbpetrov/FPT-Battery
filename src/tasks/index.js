import AdmcDecisionRules from './admc_decision_rules_task.js';
import AdmcFraming from './admc_framing_task.js';
import AdmcRiskPerception from './admc_risk_perception_task.js';
import BayesianUpdate from './bayesian_update_task.js';
import CognitiveReflection from './cognitive_reflection_task.js';
import CoherenceForecasting from './coherence_forecasting_task.js';
import DenominatorNeglect from './denominator_neglect_task.js';
import ForecastingQuestions from './forecasting_questions.js';
import GraphLiteracy from './graph_literacy_task.js';
import ImpossibleQuestion from './impossible_question_task.js';
import Leapfrog from './leapfrog_task.js';
import NumberSeries from './number_series_task.js';
import RavenMatrix from './raven_matrix_task.js';
import TimeSeries from './time_series_task.js';

export const task_registry = {
	number_series: NumberSeries,
	leapfrog: Leapfrog,
	cognitive_reflection: CognitiveReflection,
	admc_framing: AdmcFraming,
	admc_decision_rules: AdmcDecisionRules,
	admc_risk_perception: AdmcRiskPerception,
	bayesian_update: BayesianUpdate,
	coherence_forecasting: CoherenceForecasting,
	denominator_neglect: DenominatorNeglect,
	graph_literacy: GraphLiteracy,
	impossible_question: ImpossibleQuestion,
	raven_matrix: RavenMatrix,
	time_series: TimeSeries,
	forecasting_questions: ForecastingQuestions,
};

export {
	AdmcDecisionRules,
	AdmcFraming,
	AdmcRiskPerception,
	BayesianUpdate,
	CognitiveReflection,
	CoherenceForecasting,
	DenominatorNeglect,
	ForecastingQuestions,
	GraphLiteracy,
	ImpossibleQuestion,
	Leapfrog,
	NumberSeries,
	RavenMatrix,
	TimeSeries
};

