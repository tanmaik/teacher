# Vercel Sandbox pricing and limits

Vercel Sandbox is available in [Beta](/docs/release-phases#beta) on [all plans](/docs/plans)

## [Resource limits](#resource-limits)

- Each sandbox can use a maximum of 8 vCPUs with 2 GB of memory allocated per vCPU
- Sandboxes have a maximum runtime duration of 5 hours for Pro/Enterprise and 45 minutes for Hobby, with a default of 5 minutes. You can configure this using the `timeout` option of `Sandbox.create()`.
- You can run Node.js or Python runtimes. Review the [system specifications](/docs/vercel-sandbox#system-specifications).
- Sandboxes can have up to 4 open ports.

## [Pricing](#pricing)

Vercel tracks sandbox usage by:

- Active CPU: The amount of CPU time your code consumes, measured in milliseconds. Waiting for I/O (e.g. calling AI models, database queries) does not count towards Active CPU.
- Provisioned memory: The memory size of your sandbox instances (in GB), multiplied by the time they are running (measured in hours).
- Network bandwidth: The incoming and outgoing network traffic in and out of your sandbox for tasks such as installing packages and sandbox usage by external traffic through the sandbox listening port.
- Sandbox creations: The number of times you started a sandbox.

### [Included allotment](#included-allotment)

| Metric                     | Monthly amount included for Hobby |
| -------------------------- | --------------------------------- |
| CPU (hour)                 | 5                                 |
| Provisioned Memory (GB-hr) | 420                               |
| Network (GB)               | 20                                |
| Sandbox creations          | 5000                              |

You can use sandboxes under Pro and Enterprise plans based on the following regional pricing:

| Active CPU time (per hour) | Provisioned Memory (per GB-hr) | Network (per GB) | Sandbox creations (per 1M) |
| -------------------------- | ------------------------------ | ---------------- | -------------------------- |
| $0.128                     | $0.0106                        | $0.15            | $0.60                      |

Currently, Vercel Sandbox is only available in the `iad1` region.

### [Maximum runtime duration](#maximum-runtime-duration)

Sandboxes can run for up to several hours based on your plan. The default is 5 minutes.

| Plan       | Duration limit |
| ---------- | -------------- |
| Hobby      | 45 minutes     |
| Pro        | 5 hours        |
| Enterprise | 5 hours        |

You can configure the maximum runtime duration using the `timeout` option of `Sandbox.create()`:

```
const sandbox = await Sandbox.create({
  // 5 hours timeout
  timeout: 5 * 60 * 60 * 1000,
});
```

### [Concurrent sandboxes limit](#concurrent-sandboxes-limit)

At any time, based on your plan, you can run up to a maximum number of sandboxes at the same time. You can [upgrade](/docs/plans/hobby#upgrading-to-pro) if you're on Hobby. For Pro and Enterprise, this limit will only apply during the [Beta](/docs/release-phases#beta) period.

| Plan       | Concurrent sandboxes limit |
| ---------- | -------------------------- |
| Hobby      | 10                         |
| Pro        | 2000                       |
| Enterprise | 2000                       |

Please [get in touch with our sales team](/contact/sales) if you need more concurrent sandboxes.
