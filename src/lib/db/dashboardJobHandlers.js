// Handlers for the server-side dashboard operations (lib/db/dashboardJobs).
//
// Registering is what makes `kind` a valid operation: the route imports this
// module so a POST can only name something that exists here.
//
// Both handlers call the existing API route's own handler function directly
// instead of going back out over HTTP. The route is where the behaviour already
// lives - the proxy tester, the relay source code, the provider polling - and
// a second copy here would drift apart from it. A route handler is an ordinary
// async function over a plain Request, so it can be invoked in-process with an
// object standing in for the params Next would otherwise resolve.
import { registerDashboardJobHandler } from "@/lib/db/dashboardJobs";

const CONCURRENCY = 8;

/** Build the stand-in request a route handler expects. */
function routeRequest(path, body) {
  return new Request(`http://dashboard.internal${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/**
 * Test every listed proxy pool. One call per pool, fanned out with a small
 * concurrency cap, exactly as the page used to do it - except the loop lives
 * here, so an operator can close the browser and come back to a finished run.
 */
registerDashboardJobHandler("health-check", async (job, { report }) => {
  const ids = Array.isArray(job.payload?.poolIds) ? job.payload.poolIds : [];
  const total = ids.length;
  if (total === 0) {
    job.status = "done";
    job.result = { alive: 0, dead: 0, deadIds: [], total: 0 };
    job.message = "Nothing to test";
    return;
  }

  const { POST: testOne } = await import("@/app/api/proxy-pools/[id]/test/route");

  let alive = 0;
  let done = 0;
  const deadIds = [];
  const queue = [...ids];

  const worker = async () => {
    for (;;) {
      const id = queue.shift();
      if (!id) break;
      if (job.cancelRequested) return;

      try {
        const res = await testOne(routeRequest(`/api/proxy-pools/${id}/test`), {
          params: { id },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) alive += 1;
        else deadIds.push(id);
      } catch {
        deadIds.push(id);
      }

      done += 1;
      report({
        progress: Math.round((done / total) * 100),
        message: `${done}/${total} proxies tested`,
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));

  if (job.cancelRequested) {
    job.status = "cancelled";
    job.message = `Stopped after ${done}/${total}`;
    job.result = { alive, dead: deadIds.length, deadIds, total };
    return;
  }

  job.status = "done";
  job.progress = 100;
  job.message = `Alive: ${alive}, Dead: ${deadIds.length}`;
  job.result = { alive, dead: deadIds.length, deadIds, total };
});

/**
 * Deploy a relay. Each provider deploy is one long request (the provider
 * builds, uploads, and reports ready), so the whole thing is a single call
 * whose failure becomes the job's error instead of a toast nobody sees because
 * the page that raised it is gone.
 */
const DEPLOY_IMPORTERS = {
  vercel: () => import("@/app/api/proxy-pools/vercel-deploy/route"),
  cloudflare: () => import("@/app/api/proxy-pools/cloudflare-deploy/route"),
  deno: () => import("@/app/api/proxy-pools/deno-deploy/route"),
};

registerDashboardJobHandler("deploy-relay", async (job, { report }) => {
  const provider = String(job.payload?.provider || "");
  const importer = DEPLOY_IMPORTERS[provider];
  if (!importer) {
    job.status = "error";
    job.message = "Unknown relay provider";
    return;
  }

  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  report({ progress: 10, message: `Deploying ${label} relay` });

  const form = { ...(job.payload?.form || {}) };
  delete form.provider;

  const { POST: deploy } = await importer();
  const res = await deploy(routeRequest(`/api/proxy-pools/${provider}-deploy`, form));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `${label} deploy failed`);

  report({ progress: 90, message: `Finishing ${label} deploy` });
  job.result = { deployUrl: data.deployUrl || null, proxyPool: data.proxyPool || null };
  job.status = "done";
  job.progress = 100;
  job.message = data.deployUrl ? `Deployed: ${data.deployUrl}` : `Deployed ${label} relay`;
});