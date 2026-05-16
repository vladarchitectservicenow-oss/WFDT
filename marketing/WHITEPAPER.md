# Workflow Data Fabric Tracker — Technical Whitepaper

## Executive Summary

Modern enterprises adopting ServiceNow's Workflow Data Fabric face a critical but often overlooked challenge: orphaned data products. As integration pipelines evolve, data sources are reconfigured, import sets are refactored, and flow outputs are renamed, the lineage connections that bind these assets together silently break. Without an automated scanner to detect and score these lineage gaps, organizations accumulate invisible technical debt that undermines governance, compliance, and operational efficiency.

**WFDT (Workflow Data Fabric Tracker)** is an open-source scoped application for the ServiceNow Platform that provides self-service data discovery and lineage gap detection. It scans four primary data product tables, scores orphaned assets by data volume and business criticality, and renders exportable HTML/CSV reports. This whitepaper outlines the problem, the architecture of WFDT, and recommended deployment patterns.

---

## The Problem: Invisible Technical Debt in Data Fabric

Workflow Data Fabric enables organizations to build reusable data products — logical abstractions over raw tables, integration sources, and flow outputs. However, the platform does not provide a native lineage audit tool that continuously validates whether every data product still has a valid upstream or downstream reference.

Over a typical 12-month lifecycle, we observe the following orphaning patterns:

1. **Scheduled Import Deletion** — a `sys_data_source` is removed during a migration, but its associated `sys_import_set` rows remain.
2. **Flow Refactoring** — an IntegrationHub flow is cloned and the original deleted, leaving `sys_hub_flow_output` records pointing to a non-existent parent.
3. **Metadata Link Rot** — cross-reference links (`sys_metadata_link`) target tables or records that have been retired or re-scoped.

The cost of these orphans is multi-dimensional: storage bloat, potential GDPR/CCPA compliance exposure, failed ETL dependencies, and inaccurate reporting.

---

## The Solution: WFDT Architecture

WFDT is implemented entirely within the Now Platform as a scoped application (`x_wfdt`). It consists of three tightly coupled script includes that form a pipeline:

### Stage 1: Lineage Scanning

The `WFDTLineageScanner` class queries the four data product tables and evaluates whether each row has a valid parent reference. The heuristic is table-specific:

- `sys_data_source` checks `sys_source_sys_id` and `source`.
- `sys_import_set` checks `source` and `data_source`.
- `sys_hub_flow_output` checks `flow` and `parent_flow`.
- `sys_metadata_link` checks `url` or the tuple (`table`, `document_key`).

### Stage 2: Risk Scoring

The `WFDTRiskEngine` class ingests the list of orphaned assets and scores each on a 0–10 scale. The scoring formula is:

```
Risk Score = (Criticality × 0.6) + (Volume × 0.4)
```

- **Criticality** is a baseline derived from the table name (e.g., security-related tables score 10, import sets score 5).
- **Volume** is estimated by counting related execution/run records via `GlideAggregate`.

This composite score ensures that a high-volume, low-criticality orphan is not ignored, while a security-related orphan receives immediate attention regardless of volume.

### Stage 3: Report Rendering

The `WFDTReportRenderer` class supports two modes: `html` and `csv`. HTML reports include inline CSS for standalone use or email embedding. CSV output uses standard escaping for direct import into spreadsheet and BI tools.

---

## Deployment Patterns

### Self-Service Portal

Expose WFDT through a Scripted REST API and consume the JSON payload in a custom Service Portal widget. Administrators can trigger scans on-demand without elevation to `admin`.

### Continuous Monitoring

Deploy a Scheduled Job that runs weekly. Persist scan summaries to a custom `x_wfdt_scan_log` table and wire the table to a dashboard for trend visualization.

### CI/CD Gate

Include WFDT in your instance migration pipeline. A simple script execution gate can fail the pipeline if `orphanedAssets / totalAssets` exceeds a defined threshold.

---

## Conclusion

WFDT provides a lightweight, zero-dependency solution to a pervasive data governance problem in ServiceNow environments. By making lineage gaps visible, quantifiable, and actionable, it empowers platform teams to maintain clean, compliant, and efficient data fabrics.

For source code, documentation, and contributions, visit github.com/vladarchitectservicenow-oss/WFDT.
