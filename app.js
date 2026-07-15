/* Hallmark · component: pipeline-visualizer · genre: technical · theme: Steel & Code
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const btnSpawnJob = document.getElementById("btn-spawn-job");
  const statFibers = document.getElementById("stat-fibers");
  const statQueued = document.getElementById("stat-queued");
  const queuePool = document.getElementById("queue-pool");
  const schedulePool = document.getElementById("schedule-pool");
  const statEngine = document.getElementById("stat-engine");
  
  const btnModePaladin = document.getElementById("btn-mode-paladin");
  const btnModeEffect = document.getElementById("btn-mode-effect");
  
  // Headers to update when toggling modes
  const queueColTitle = document.querySelector("#col-queue .col-title");
  const workerColTitle = document.getElementById("worker-col-title");
  const scheduleColTitle = document.querySelector("#col-schedule .col-title");

  // Fiber/Worker elements
  const workers = [
    { el: document.getElementById("fiber-1"), status: "idle", jobId: null, jobType: "", label: "WORKER_01" },
    { el: document.getElementById("fiber-2"), status: "idle", jobId: null, jobType: "", label: "WORKER_02" },
    { el: document.getElementById("fiber-3"), status: "idle", jobId: null, jobType: "", label: "WORKER_03" }
  ];

  // --- State Variables ---
  let executionMode = "paladin"; // "paladin" | "effect"
  let jobQueue = [];
  let nextJobId = 101;
  let activeIntervals = [];

  const jobTypes = {
    paladin: [
      "VendorHub.ProcessMedia",
      "EasyRent.SpatialListing",
      "Cronforge.DailyDigest",
      "Auth.CleanSessions"
    ],
    effect: [
      "effectq.JobIngestion",
      "Chowdeck.DispatchFork",
      "EasyWorka.WorkflowStep",
      "EasyRent.RefreshTokens"
    ]
  };

  // --- Initialize ---
  setMode("paladin");
  setInterval(tick, 1000);

  // --- Mode Selection Controls ---
  btnModePaladin.addEventListener("click", () => {
    if (executionMode !== "paladin") setMode("paladin");
  });

  btnModeEffect.addEventListener("click", () => {
    if (executionMode !== "effect") setMode("effect");
  });

  btnSpawnJob.addEventListener("click", () => {
    const list = jobTypes[executionMode];
    const randomType = list[Math.floor(Math.random() * list.length)];
    enqueueJob(randomType);
  });

  // --- Set Mode ---
  function setMode(mode) {
    executionMode = mode;
    jobQueue = [];
    
    // Clear any active retry schedules
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];
    
    // Clear Pools UI
    queuePool.innerHTML = "";
    schedulePool.innerHTML = "";
    
    // Reset workers
    workers.forEach(w => {
      w.status = "idle";
      w.jobId = null;
      w.jobType = "";
      w.el.setAttribute("data-status", "idle");
      const labelEl = w.el.querySelector(".fiber-id");
      const payloadEl = w.el.querySelector(".fiber-payload");
      
      if (mode === "paladin") {
        w.label = w.el.id.replace("fiber-", "WORKER_0");
        labelEl.textContent = w.label;
        payloadEl.textContent = "State: IDLE";
      } else {
        w.label = w.el.id.replace("fiber-", "FIBER_0");
        labelEl.textContent = w.label;
        payloadEl.textContent = "State: IDLE";
      }
    });

    // Update Header Labels & Classes
    if (mode === "paladin") {
      btnModePaladin.classList.add("active");
      btnModeEffect.classList.remove("active");
      statEngine.textContent = "Paladin (SQL)";
      
      queueColTitle.textContent = "JOBS TABLE (SELECT SKIP LOCKED)";
      workerColTitle.textContent = "CONCURRENT WORKERS (Row Claims)";
      scheduleColTitle.textContent = "TRANSACTION RETRIES / TIMEOUTS";
      
      // Seed initial jobs
      enqueueJob("VendorHub.ProcessMedia");
      enqueueJob("EasyRent.SpatialListing");
    } else {
      btnModeEffect.classList.add("active");
      btnModePaladin.classList.remove("active");
      statEngine.textContent = "effectq (Fibers)";
      
      queueColTitle.textContent = "STREAM SOURCES (Effect Queue)";
      workerColTitle.textContent = "CONCURRENT FIBERS (Effect.fork)";
      scheduleColTitle.textContent = "SCHEDULE RETRIES (exponential backoff)";
      
      // Seed initial jobs
      enqueueJob("effectq.JobIngestion");
      enqueueJob("Chowdeck.DispatchFork");
    }
  }

  // --- Ingestion Logic ---
  function enqueueJob(type) {
    const id = `JOB-${nextJobId++}`;
    const job = {
      id,
      type,
      retryCount: 0,
      maxRetries: 2
    };
    jobQueue.push(job);
    renderQueue();
  }

  // --- Render Ingestion Column ---
  function renderQueue() {
    statQueued.textContent = jobQueue.length;
    
    const activeNodes = queuePool.querySelectorAll(".job-node:not(.fade-out)");
    if (jobQueue.length === 0 && activeNodes.length === 0) {
      queuePool.innerHTML = `<div class="empty-state">No jobs in ${executionMode === "paladin" ? "DB Table" : "Queue Stream"}. Click 'Enqueue Test Job' to populate.</div>`;
      return;
    }

    const emptyState = queuePool.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    const currentNodes = Array.from(queuePool.querySelectorAll(".job-node"));
    
    jobQueue.forEach((job) => {
      let node = currentNodes.find(n => n.dataset.jobId === job.id);
      
      if (!node) {
        node = document.createElement("div");
        node.className = "job-node";
        node.dataset.jobId = job.id;
        
        // Custom styling variables for modes
        if (executionMode === "paladin") {
          node.style.borderLeftColor = "var(--color-accent)";
        } else {
          node.style.borderLeftColor = "var(--color-success)";
        }

        node.innerHTML = `
          <span class="job-id">${job.id}</span>
          <span class="job-type">${job.type}</span>
          <span class="job-retries text-accent" style="font-size: 0.65rem;">
            ${job.retryCount > 0 ? `Attempts: ${job.retryCount}/${job.maxRetries}` : ""}
          </span>
        `;
        queuePool.appendChild(node);
      }
    });

    currentNodes.forEach(node => {
      const jobId = node.dataset.jobId;
      if (!jobQueue.some(j => j.id === jobId)) {
        if (!node.classList.contains("fade-out")) {
          node.classList.add("fade-out");
          setTimeout(() => {
            node.remove();
            if (queuePool.querySelectorAll(".job-node:not(.fade-out)").length === 0 && jobQueue.length === 0) {
              queuePool.innerHTML = `<div class="empty-state">No jobs in ${executionMode === "paladin" ? "DB Table" : "Queue Stream"}. Click 'Enqueue Test Job' to populate.</div>`;
            }
          }, 250);
        }
      }
    });
  }

  // --- Loop Step (Tick) ---
  function tick() {
    const idleWorkers = workers.filter(w => w.status === "idle");
    
    if (idleWorkers.length > 0 && jobQueue.length > 0) {
      const workerToUse = idleWorkers[0];
      const jobToProcess = jobQueue.shift(); // FIFO
      renderQueue();
      
      if (executionMode === "paladin") {
        claimJobWithSql(workerToUse, jobToProcess);
      } else {
        processJobWithFibers(workerToUse, jobToProcess);
      }
    }

    const activeCount = workers.filter(w => w.status === "processing").length;
    statFibers.textContent = activeCount;
  }

  // --- Paladin Mode SQL Claim Simulation ---
  function claimJobWithSql(worker, job) {
    worker.status = "claiming";
    worker.jobId = job.id;
    worker.jobType = job.type;
    worker.el.setAttribute("data-status", "processing");
    
    const payloadEl = worker.el.querySelector(".fiber-payload");
    payloadEl.innerHTML = `<span style="color: var(--color-accent);">SELECT FOR UPDATE...</span>`;

    // Database roundtrip simulated claim delay
    setTimeout(() => {
      if (worker.jobId !== job.id) return; // Guard if reset occurred
      
      worker.status = "processing";
      payloadEl.innerHTML = `Executing: ${job.type}`;
      
      // Work duration
      const runTime = 1200 + Math.random() * 1200;
      setTimeout(() => {
        if (worker.jobId !== job.id) return;

        // 75% success chance
        const isSuccess = Math.random() > 0.25;
        if (isSuccess) {
          completeWorker(worker);
        } else {
          failSqlWorker(worker, job);
        }
      }, runTime);

    }, 600);
  }

  // --- Effect Mode Fiber Stream Simulation ---
  function processJobWithFibers(fiber, job) {
    fiber.status = "processing";
    fiber.jobId = job.id;
    fiber.jobType = job.type;
    fiber.el.setAttribute("data-status", "processing");
    
    const payloadEl = fiber.el.querySelector(".fiber-payload");
    payloadEl.textContent = `Streaming: ${job.type}`;

    const runTime = 1500 + Math.random() * 1500;
    setTimeout(() => {
      if (fiber.jobId !== job.id) return;

      // 70% success chance
      const isSuccess = Math.random() > 0.3;
      if (isSuccess) {
        completeWorker(fiber);
      } else {
        failFiberStream(fiber, job);
      }
    }, runTime);
  }

  // --- Complete Worker / Fiber Task ---
  function completeWorker(worker) {
    worker.status = "idle";
    worker.jobId = null;
    worker.jobType = "";
    worker.el.setAttribute("data-status", "idle");
    const payloadEl = worker.el.querySelector(".fiber-payload");
    payloadEl.textContent = "State: IDLE";
  }

  // --- SQL Transaction Failure (Rollback) ---
  function failSqlWorker(worker, job) {
    completeWorker(worker); // Relinquish locking row
    
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      
      // Simulate transaction serialization rollback and lock retry backoff
      const retryNode = document.createElement("div");
      retryNode.className = "retry-node";
      retryNode.style.borderColor = "var(--color-accent)";
      retryNode.dataset.jobId = job.id;
      
      retryNode.innerHTML = `
        <span class="retry-title" style="color: var(--color-accent);">ERR_SERIALIZATION</span>
        <span class="retry-meta">${job.id} | Lock released</span>
        <span class="retry-countdown" style="font-size: 0.65rem; color: var(--color-text-muted);">Re-querying in 2s...</span>
      `;
      
      clearScheduleEmptyState();
      schedulePool.appendChild(retryNode);

      let countdown = 2;
      const interval = setInterval(() => {
        countdown--;
        const countdownEl = retryNode.querySelector(".retry-countdown");
        if (countdownEl) countdownEl.textContent = `Re-querying in ${countdown}s...`;
        
        if (countdown <= 0) {
          clearInterval(interval);
          retryNode.remove();
          
          jobQueue.push(job);
          renderQueue();
          checkScheduleEmptyState();
        }
      }, 1000);
      
      activeIntervals.push(interval);
    } else {
      triggerDiagnosticsAlert(`Paladin: ${job.id} transaction deadlocked after ${job.maxRetries} attempts.`);
    }
  }

  // --- Effect-TS Worker Stream Failure (Schedule.exponential) ---
  function failFiberStream(fiber, job) {
    completeWorker(fiber);
    
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      
      const errorName = Math.random() > 0.5 ? "DbError" : "WorkerError";
      const backoff = Math.pow(2, job.retryCount); // 2s, 4s backoff simulation
      
      const retryNode = document.createElement("div");
      retryNode.className = "retry-node";
      retryNode.style.borderColor = "var(--color-error)";
      retryNode.dataset.jobId = job.id;
      
      retryNode.innerHTML = `
        <span class="retry-title">${errorName}</span>
        <span class="retry-meta">${job.id} | Fiber scheduling</span>
        <span class="retry-countdown" style="font-size: 0.65rem; color: var(--color-text-muted);">Retrying in ${backoff}s...</span>
      `;
      
      clearScheduleEmptyState();
      schedulePool.appendChild(retryNode);

      let countdown = backoff;
      const interval = setInterval(() => {
        countdown--;
        const countdownEl = retryNode.querySelector(".retry-countdown");
        if (countdownEl) countdownEl.textContent = `Retrying in ${countdown}s...`;
        
        if (countdown <= 0) {
          clearInterval(interval);
          retryNode.remove();
          
          jobQueue.push(job);
          renderQueue();
          checkScheduleEmptyState();
        }
      }, 1000);
      
      activeIntervals.push(interval);
    } else {
      triggerDiagnosticsAlert(`effectq: Fiber pipeline failed on ${job.id} with permanent serialization bounds.`);
    }
  }

  // --- Schedule Column Helpers ---
  function clearScheduleEmptyState() {
    const emptyState = schedulePool.querySelector(".empty-state");
    if (emptyState) emptyState.remove();
  }

  function checkScheduleEmptyState() {
    if (schedulePool.children.length === 0) {
      schedulePool.innerHTML = `<div class="empty-state">${executionMode === "paladin" ? "No active locks or transactional rollbacks." : "No active retry schedules."}</div>`;
    }
  }

  // --- Diagnostics Alerts Output ---
  function triggerDiagnosticsAlert(msg) {
    const termBody = document.querySelector(".term-body");
    if (termBody) {
      const errLine = document.createElement("p");
      errLine.className = "term-line";
      errLine.style.color = "var(--color-error)";
      errLine.innerHTML = `<span class="term-prompt">!</span> [CRITICAL] ${msg}`;
      termBody.appendChild(errLine);
      
      // Scroll to bottom of terminal bio mock
      termBody.scrollTop = termBody.scrollHeight;
    }
  }

  // --- Mobile Navigation Toggle ---
  const navToggle = document.getElementById("nav-toggle");
  const sysNav = document.getElementById("sys-nav");

  if (navToggle && sysNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = sysNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-active", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close the mobile menu after a nav link is tapped
    sysNav.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        sysNav.classList.remove("is-open");
        navToggle.classList.remove("is-active");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    // Close the mobile menu if the viewport is resized back to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        sysNav.classList.remove("is-open");
        navToggle.classList.remove("is-active");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }
});