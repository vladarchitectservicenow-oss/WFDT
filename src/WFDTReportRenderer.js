/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: MIT
 *
 * WFDT Report Renderer — HTML / CSV export of lineage gaps.
 */
var WFDTReportRenderer = Class.create();
WFDTReportRenderer.prototype = {
    initialize: function(mode) {
        this.mode = mode || "html";
        this.VERSION = "1.0.0";
    },

    render: function(scoredAssets) {
        if (this.mode === "csv") return this.renderCSV(scoredAssets);
        return this.renderHTML(scoredAssets);
    },

    renderHTML: function(scoredAssets) {
        var sb = [];
        sb.push("<!DOCTYPE html><html><head><meta charset='utf-8'><title>WFDT Report</title>");
        sb.push("<style>");
        sb.push("body{font-family:Arial,sans-serif;margin:20px;background:#f7f8fa;}");
        sb.push("h1{color:#1f2937;}table{width:100%;border-collapse:collapse;background:#fff;}");
        sb.push("th{background:#1f2937;color:#fff;padding:10px;text-align:left;}");
        sb.push("td{padding:10px;border-bottom:1px solid #e5e7eb;}");
        sb.push(".risk-high{color:#dc2626;font-weight:bold;}");
        sb.push(".risk-med{color:#ea580c;font-weight:bold;}");
        sb.push(".risk-low{color:#16a34a;font-weight:bold;}");
        sb.push("</style></head><body>");
        sb.push("<h1>Workflow Data Fabric Tracker — Lineage Gap Report</h1>");
        sb.push("<p>Generated: " + new GlideDateTime().getDisplayValue() + "</p>");
        sb.push("<table><thead><tr><th>Table</th><th>Name</th><th>Risk Score</th><th>Volume</th><th>Criticality</th></tr></thead><tbody>");
        for (var i = 0; i < scoredAssets.length; i++) {
            var a = scoredAssets[i];
            var cls = a.riskScore >= 7 ? "risk-high" : (a.riskScore >= 4 ? "risk-med" : "risk-low");
            sb.push("<tr><td>" + a.table + "</td><td>" + this._escapeHtml(a.name) + "</td><td class='" + cls + "'>" + a.riskScore + "</td><td>" + a.volume + "</td><td>" + a.criticality + "</td></tr>");
        }
        sb.push("</tbody></table></body></html>");
        return sb.join("");
    },

    renderCSV: function(scoredAssets) {
        var sb = [];
        sb.push("Table,Sys ID,Name,Risk Score,Volume,Criticality");
        for (var i = 0; i < scoredAssets.length; i++) {
            var a = scoredAssets[i];
            sb.push([a.table, a.sys_id, this._escapeCsv(a.name), a.riskScore, a.volume, a.criticality].join(","));
        }
        return sb.join("\n");
    },

    _escapeHtml: function(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    _escapeCsv: function(s) {
        var v = String(s || "");
        if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
        return v;
    },

    type: "WFDTReportRenderer"
};
