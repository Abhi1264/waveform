use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread::{self, JoinHandle};

use crate::{Library, LibraryError, Track};

/// One file the importer was asked to register.
#[derive(Debug, Clone)]
pub struct ImportJob {
    pub path: PathBuf,
}

enum Request {
    Import(ImportJob),
    Stop,
}

/// A single background importer. The track most recently submitted is the next
/// one run, so loading a track jumps the queue.
pub struct JobQueue {
    requests: Sender<Request>,
    worker: Option<JoinHandle<()>>,
}

impl JobQueue {
    /// Starts a worker that owns `library`.
    pub fn start(mut library: Library) -> Self {
        let (requests, incoming) = mpsc::channel();
        let worker = thread::spawn(move || worker(&mut library, incoming));
        Self {
            requests,
            worker: Some(worker),
        }
    }

    /// Asks the worker to import `path`.
    pub fn import(&self, path: impl AsRef<Path>) -> Result<(), LibraryError> {
        self.requests
            .send(Request::Import(ImportJob {
                path: path.as_ref().to_path_buf(),
            }))
            .map_err(|_| LibraryError::Missing("import worker stopped".into()))
    }
}

impl Drop for JobQueue {
    fn drop(&mut self) {
        let _ = self.requests.send(Request::Stop);
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

fn worker(library: &mut Library, incoming: Receiver<Request>) {
    let mut pending: Vec<ImportJob> = Vec::new();
    loop {
        if pending.is_empty() {
            match incoming.recv() {
                Ok(Request::Import(job)) => pending.push(job),
                Ok(Request::Stop) | Err(_) => break,
            }
        }
        while let Ok(request) = incoming.try_recv() {
            match request {
                Request::Import(job) => pending.push(job),
                Request::Stop => {
                    finish(library, &mut pending);
                    return;
                }
            }
        }
        if let Some(job) = pending.pop() {
            let _ = import_catching(library, &job);
        }
    }
}

fn finish(library: &mut Library, pending: &mut Vec<ImportJob>) {
    while let Some(job) = pending.pop() {
        let _ = import_catching(library, &job);
    }
}

fn import_catching(library: &mut Library, job: &ImportJob) -> Result<Track, LibraryError> {
    library.import_file(&job.path)
}
