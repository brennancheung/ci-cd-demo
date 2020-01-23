const { events, Job } = require('brigadier')

const registry = 'core.harbor.volgenic.com/ui'

const runJob = (name, image, tasks = []) => {
  const fullImage = `${registry}/${image}`
  const job = new Job(name, fullImage, tasks, true)
  job.streamLogs = true
  job.imagePullSecrets = ['regcred']
  job.run()
  return job
}

events.on('push', (e, project) => {
  // Webhook event received
  console.log(`Received push for commit ${e.revision.commit}`)

  // Run unit tests
  console.log('About to run unit tests')

  // Try to run in parallel
  runJob('jest-runner', 'hello-service', ['yarn jest'])
  runJob('jest-runner2', 'hello-service', ['yarn jest'])
})
