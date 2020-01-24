const { events, Job } = require('brigadier')

const registry = 'core.harbor.volgenic.com/ui'

events.on('check_suite:requested', async (e, project) => {
  const sendCheckStatus = (stage, options = {}) => {
    console.log('Sending check status')
    // const checkRunImage = 'brigadecore/brigade-github-check-run:latest'
    // Local copy of image above to avoid network traffic and to speed up tests.
    const checkRunImage = `${registry}/report-check-status`

    const jobName = `${options.checkName}-${stage}`
    console.log(`job name: ${jobName}`)
    const job = new Job(jobName, checkRunImage)
    const env = {
      CHECK_PAYLOAD: e.payload,
      CHECK_NAME: options.checkName,
      CHECK_TITLE: options.title,
      CHECK_SUMMARY: options.summary,
    }
    const conclusionStages = ['success', 'failure']
    if (conclusionStages.includes(stage)) env.CHECK_CONCLUSION = stage
    if (options.text) env.CHECK_TEXT = options.text
    console.log(JSON.stringify(options, null, 4))
    job.imageForcePull = false
    job.env = env
    job.streamLogs = false
    job.imagePullSecrets = ['regcred']
    return job.run()
  }

  const createJob = (name, image, tasks = []) => {
    const fullImage = `${registry}/${image}`
    const job = new Job(name, fullImage, tasks, true)
    job.streamLogs = true
    job.imagePullSecrets = ['regcred']
    job.imageForcePull = true
    return job
  }
  // Webhook event received
  console.log(`Received check_suite for commit ${e.revision.commit}`)

  const runTest = async (checkName, title, job) => {
    const startMessage = `${title} test starting`
    const successMessage = `${title} test succeeded`
    const failMessage = `${title} test failed`
    sendCheckStatus('start', {
      checkName,
      title: startMessage,
      summary: startMessage
    })
    try {
      const results = await job.run()
      sendCheckStatus('success', {
        checkName,
        title: successMessage,
        summary: successMessage,
        text: results.toString(),
      })
    } catch (err) {
      sendCheckStatus('failure', {
        checkName,
        title: failMessage,
        summary: failMessage,
        text: err,
      })
    }
  } 

  const lintJob = createJob('lint-runner', 'hello-service', ['yarn jest'])
  const unitTestsJob = createJob('lint-runner', 'hello-service', ['yarn jest'])
  runTest('lint', 'Lint', lintJob)
  runTest('unit-tests', 'Unit', unitTestsJob)
})