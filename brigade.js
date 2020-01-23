const { events, Job } = require('brigadier')

const registry = 'core.harbor.volgenic.com/ui'

const sendCheckStatus = (e, summary = 'Beginning test run', conclusion, text) => {
  // This Check Run image handles updating GitHub
  // const checkRunImage = 'brigadecore/brigade-github-check-run:latest'

  // This image was pulled from Docker Hub and added to the local private registry to avoid
  // network latency and to make tests run faster.
  const checkRunImage = `${registry}/report-check-status`

  const job = new Job('start-run', checkRunImage)
  job.env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: 'tests',
    CHECK_TITLE: 'Tests',
    CHECK_SUMMARY: summary,
    CHECK_CONCLUSION: conclusion,
    CHECK_TEXT: text,
  }
  job.streamLogs = false
  job.imagePullSecrets = ['regcred']
  job.imageForcePull = false
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

events.on('check_suite:requested', (e, project) => {
  // Webhook event received
  console.log(`Received check_suite for commit ${e.revision.commit}`)

  // Run unit tests
  console.log('About to run unit tests')
  sendCheckStatus(e)

  createJob('jest-runner', 'hello-service', ['yarn jest']).run()
    .then(result => sendCheckStatus(e, 'Tests passed', 'success', result.toString()))
    .catch(err => sendCheckStatus(e, 'Tests failed', 'failure', err))
})
