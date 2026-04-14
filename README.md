This repository is a direct consequence of the massive [Forecasting Proficiency Test](https://github.com/forecastingresearch/fpt) project, ran by the [Forecasting Research Institute](https://forecastingresearch.org/).

One of the central goals of the project was to find the cognitive skills that underpin forecasting ability. In that effort, we implemented a bunch of cognitive task, using [jsPsych](https://www.jspsych.org/latest/) (v7). With this repository, we share these tasks in a ready-to-use form so others can reuse them in a plug-and-play manner.

# Quick start

This package and its API are inspired by [jsPsych](https://www.jspsych.org/latest/). [Their documentation](https://www.jspsych.org/v7/tutorials/hello-world/) provides a helpful starting place.

## Option 1: CDN

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>My Experiment</title>
        <script src="https://unpkg.com/fpt-battery@latest"></script>
        <link rel="stylesheet" href="https://unpkg.com/fpt-battery@latest/dist/fpt-battery.css" />
    </head>
    <body></body>
    <script>
        const config = {
            tasks: [{ task_name: 'number_series', custom_task_settings: {} }]
        };
        const fpt_battery = initFPTBattery(config);
        fpt_battery.run();
    </script>
</html>
```

## Option 2: NPM

Run `npm install fpt-battery`.

Similar to jsPsych, the marup required is a body element in the HTML document. For the CSS either `import 'fpt-battery/css'` or a link tag in the HTML document's head, `<link rel="stylesheet" href="https://unpkg.com/fpt-battery@latest/dist/fpt-battery.css" />`

```js
import initFPTBattery from 'fpt-battery';
import 'fpt-battery/css'; // or a <script> tag in your preceding HTML

const config = {
    tasks: [{ task_name: 'number_series', custom_task_settings: {} }]
};
const fpt_battery = initFPTBattery(config);
fpt_battery.run();
```

# Configuration/Customization

## Core battery settings

| Setting | Type | Description |
|---------|------|-------------|
| `root_element` | `string` | DOM element ID for rendering; defaults to `<body>` |
| `jsPsychOptions` | `object` | Passed to jsPsych's initJsPsych |
| `session` | `object` | Allows session restarts if you persist data. Documentation is WIP. |
| `tasks` | `array` | See below |
| `data_saving` | `object` | See below |
| `disable_progressbar` | `boolean` | whether to disable the custom FPT progress bar |
| `show_inactivity_warning` | `boolean` | Show inactivity warning. Happens if the custom FPT timer we have ended more than 5 trials sequentially |
| `ask_for_task_feedback` | `boolean` | Ask for feedback after each task |
| `media_basepath` | `string` | Base URL for media assets. Defaults to using one we host (https://fpt.quorumapp.com/static/fpt/img/), though for performance reasons, we encourage you to host the assets yourself. You can download all assets from the `assets` folder |
| `minutes_between_task_breaks` | `number \| null` | Number of minutes that must have passed before offering a break (only between tasks) |
| `skip_intro_trials` | `boolean` | Skip browser check and welcome message |

## Tasks

You can define a series of a task by specifying the task's name and any custom settings. A full list of all available task names is:

```js
[
  { task_name: 'number_series', custom_task_settings: {} },
  { task_name: 'leapfrog', custom_task_settings: {} },
  { task_name: 'cognitive_reflection', custom_task_settings: {} },
  { task_name: 'admc_framing', custom_task_settings: {} },
  { task_name: 'admc_decision_rules', custom_task_settings: {} },
  { task_name: 'admc_risk_perception', custom_task_settings: {} },
  { task_name: 'bayesian_update', custom_task_settings: {} },
  { task_name: 'coherence_forecasting', custom_task_settings: {} },
  { task_name: 'denominator_neglect', custom_task_settings: {} },
  { task_name: 'graph_literacy', custom_task_settings: {} },
  { task_name: 'impossible_question', custom_task_settings: {} },
  { task_name: 'raven_matrix', custom_task_settings: {} },
  { task_name: 'time_series', custom_task_settings: {} },
  { task_name: 'forecasting_questions', custom_task_settings: {} },
]
```

Full documentation  of each task's custom settings is a WIP. For the time being, you can view each task's settings in its own task file under [src/tasks](./src/tasks). You are free to specify any custom setting, but not all are readily modifiable (i.e. may not work as expected in various configurations). Use cautiously.

## Data saving

Provide your own `onSaveData` in `data_saving` config to persist trial data. It runs asynchronously in the background at checkpoints (e.g. after welcome, after each task).

```js
data_saving: {
  disable_chunking: false,   // if true, data is passed as a single chunk
  maxChunkSize: 1000000,     // max bytes per chunk when chunking (default 1MB)
  onSaveData: async (chunks, checkpoint, checkpointIndex) => {
    // chunks: array of trial-data arrays (chunked by maxChunkSize)
    // checkpoint: string (e.g. 'experiment__welcome', 'task_name__block_0')
    // checkpointIndex: number
    for (const chunk of chunks) {
      await fetch('/your-save-endpoint', {
        method: 'POST',
        body: JSON.stringify({ checkpoint, checkpointIndex, data: chunk }),
      });
    }
  },
  onError: (err) => console.error('Save failed:', err),
}
```

## Customize welcome/debrief trials (as well as other trial generators)

The FPTBattery class initializes trial generators, which are functions that return a `jsPsych` trial. The respective trial generators can be accessed and overridden in your code like so:

```js
const config = {...};
const fpt_battery = initFPTBattery(config);
fpt_battery.trial_generators.welcome = function() {
    return {
        // jspsych trial
    }
}
fpt_battery.trial_generators.debrief = function() {
    return {
        // jspsych trial
    }
}
// whenever you are ready:
fpt_battery.run()
```

Note that the definition of the `jsPsych`'s trial `type` param depends on your import method. See [jsPsych docs](https://www.jspsych.org/v7/tutorials/hello-world/) for more information. **NB** If you're importing from a CDN/local, make sure your script tags import both `jsPsych` as well as the plugin you're going to be using.

You can also modify other trial generators. You are welcome to inspect [the class source code](./src/core/FPTBattery.js) - it has a `get_trial_generators` method that initializes all of those

# Development

## Local dev

1. `npm install`
2. Create a `demo/` directory with an `index.html` and `index.js`:

**demo/index.html**
```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>FPT Battery Demo</title>
    </head>
    <body></body>
    <script type="module" src="index.js"></script>
</html>
```

**demo/index.js**
```js
import initFPTBattery from '../src/index.js';

const config = {
    tasks: [
        { task_name: 'number_series', custom_task_settings: {} },
    ],
    media_basepath: './assets/',
    skip_intro_trials: true,
};

const fpt_battery = initFPTBattery(config);
fpt_battery.run();
```

3. `npm run dev` — symlinks assets into `demo/` and starts a Vite dev server on `localhost:3001` with hot reload
4. Edit `demo/index.js` to test different tasks and configurations

## Publishing a new version

1. Run `npm run build` locally and verify it succeeds
2. Bump `version` in [package.json](./package.json)
3. Commit: `git commit -am "v0.3.0"`
4. Tag: `git tag v0.3.0`
5. Push: `git push origin main --tags`

Pushing a `v*` tag triggers the [GitHub Actions workflow](./.github/workflows/publish.yml), which builds and publishes to npm automatically.

## Assets

If a new asset is added, must add it to the hosted path - see `media_basepath` config.

# TODO

- [] fork jspsych, submodule it and apply patches
    - [] see/migrate apply_patches.js
    - [] also add "write_event_to_interaction_data"
    - [] apply patches to plugins where relevant, e.g. survey-html needs simulation methods
- [] after above, then test & commit simulation opts handling
- [] update trial naming to always start with `task.name`
- [] add a linter/formatter
- [] check if task durations could also be inferrable from the timer settings
- [] Add better assets management - autopublish/link on the hosted path or create a new server.
- [] add docs on advanced usage
    - [] add data saving examples?
    - [] add session restart config
    - [] modifying jspsych trials
        <!-- This options in case you want to modify stuff and are using CDN-hosted files -->
        <!-- Note that this version of jsPsych is not the one packaged or used w/ the FPT battery -->
        <!-- <script src="https://unpkg.com/jspsych@7.3.4"></script>
        <script src="https://unpkg.com/@jspsych/plugin-instructions@1.1.4"></script> -->
    - [] modifying FPT battery instance classes
