import { inspectAudio } from "./inspect"

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  void inspectAudio(new Blob([event.data])).then((inspection) => {
    self.postMessage(inspection)
  })
}
