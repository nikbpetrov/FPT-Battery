# WIP

# Customize welcome/debrief trials

The FPTBattery class initializes trial generators, which are functions that return a `jsPsych` trial. The respective trial generators can be accessed and overridden in your code like so:

```{js}
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

Note that the definition of the `jsPsych`'s trial `type` param depends on your import method. See [jsPsych docs](https://www.jspsych.org/v7/tutorials/hello-world/) for more information.

**NB** If you're importing from a CDN/local, make sure your script tags import both `jsPsych` as well as the plugin you're going to be using.

# TODO

- [] fork jspsych, submodule it and apply patches
    - [] see/migrate apply_patches.js
    - [] also add "write_event_to_interaction_data"
    - [] apply patches to plugins where relevant, e.g. survey-html needs simulation methods
- [] after above, then test & commit simulation opts handling
- [] update trial naming to always start with `task.name`
- [] implement ability to override timer durations
- [] add a linter/formatter
- [] check if task durations could also be inferrable from the timer settings
