🔍 New open-source release: Workflow Data Fabric Tracker (WFDT)

If you're running ServiceNow's Workflow Data Fabric, you already know the power of unified data products. But here's what most teams miss: without continuous lineage scanning, orphaned assets silently accumulate — dead data sources, orphaned import sets, and flow outputs pointing nowhere.

That's exactly why I built WFDT.

WFDT is a scoped ServiceNow app (x_wfdt) that:
✅ Scans sys_data_source, sys_import_set, sys_hub_flow_output, and sys_metadata_link
✅ Scores orphaned assets by data volume and business criticality
✅ Exports clean HTML/CSV lineage gap reports
✅ Runs entirely inside the Now Platform — zero external dependencies

It's lightweight, read-only, and CI/CD friendly. I use it in production to keep data fabric clean and compliant.

🔗 github.com/vladarchitectservicenow-oss/WFDT

If governance, observability, or technical debt reduction is on your roadmap, I'd love your feedback — or a PR.

#ServiceNow #WorkflowDataFabric #DataGovernance #TechnicalDebt #ServiceNowDev #WFDT #OpenSource
