const { events, Job } = require('brigadier')

events.on('push', (e, project) => {
  // Webhook event received
  console.log(`Received push for commit ${e.revision.commit}`)

  // Run unit tests
  console.log('About to run unit tests')
  var jest = new Job('jest-runner')
  jest.image = "core.harbor.volgenic.com/ui/hello-service:latest"
  jest.tasks = ['yarn jest']
  jest.streamLogs = true
  jest.imagePullSecrets = ['regcred']
  jest.run()
})
