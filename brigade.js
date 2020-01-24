const { events, Job } = require("brigadier");

// GitHub Check events to watch for
//
// Note that a GitHub App will automatically generate these events
// from a `push` event, so we don't need an explicit push event handler any longer
events.on("check_suite:requested", checkRequested);
events.on("check_suite:rerequested", checkRequested);
events.on("check_run:rerequested", checkRequested);

// This runs our main test job, updating GitHub along the way
function checkRequested(e, p) {
  console.log("check requested");

  // This Check Run image handles updating GitHub
  const checkRunImage = "brigadecore/brigade-github-check-run:latest";

  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Brigade",
    CHECK_TITLE: "Run Tests",
  };

  // For convenience, we'll create three jobs: one for each GitHub Check
  // stage.
  const start = new Job("start-run", checkRunImage);
  start.imageForcePull = true;
  start.env = env;
  start.env.CHECK_SUMMARY = "Beginning test run";

  const end = new Job("end-run", checkRunImage);
  end.imageForcePull = true;
  end.env = env;

  // Now we run the jobs in order:
  // - Notify GitHub of start
  // - Run the tests
  // - Notify GitHub of completion
  //
  // On error, we catch the error and notify GitHub of a failure.
  start.run().then(() => {
    return 'successful test run'
  }).then( (result) => {
    end.env.CHECK_CONCLUSION = "success"
    end.env.CHECK_SUMMARY = "Build completed"
    end.env.CHECK_TEXT = result.toString()
    return end.run()
  }).catch( (err) => {
    // In this case, we mark the ending failed.
    end.env.CHECK_CONCLUSION = "failure"
    end.env.CHECK_SUMMARY = "Build failed"
    end.env.CHECK_TEXT = `Error: ${ err }`
    return end.run()
  });
}