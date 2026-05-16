/**
 * WFDT Self-Contained Node.js Test Suite
 * Runs: node tests/test_wfdt.js
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: MIT
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------------
// Mock Globals
// ------------------------------------------------------------------
global.gs = {
    info: function(msg) { console.log("[GS.INFO] " + msg); },
    warn: function(msg) { console.log("[GS.WARN] " + msg); }
};

var _records = {};

function setMockRecords(table, rowsOrFn) {
    _records[table] = rowsOrFn;
}

function getMockRows(table) {
    var r = _records[table];
    if (typeof r === "function") return r();
    return Array.isArray(r) ? r : [];
}

// GlideRecord mock
var MockGR = function(table) {
    this._table = table;
    this._rows = getMockRows(table);
    this._idx = -1;
    this._queries = [];
    this._limit = null;
    this._filtered = [];
};
MockGR.prototype.addQuery = function(field, op, value) {
    this._queries.push({ field: field, op: op, value: value });
};
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() {
    this._idx = -1;
    var rows = Array.isArray(this._rows) ? this._rows : [];
    this._filtered = rows.filter(function(row) {
        for (var i = 0; i < this._queries.length; i++) {
            var q = this._queries[i];
            var v = row[q.field];
            if (q.op === "=" && v !== q.value) return false;
            if (q.op === "!=" && v === q.value) return false;
            if (q.op === "IN" && q.value.indexOf(v) === -1) return false;
        }
        return true;
    }.bind(this));
};
MockGR.prototype.next = function() {
    this._idx++;
    if (this._limit && this._idx >= this._limit) return false;
    return this._idx < this._filtered.length;
};
MockGR.prototype.getValue = function(field) {
    if (this._idx >= 0 && this._idx < this._filtered.length) {
        var val = this._filtered[this._idx][field];
        return val === undefined || val === null ? "" : String(val);
    }
    return "";
};
MockGR.prototype.getUniqueValue = function() {
    if (this._idx >= 0 && this._idx < this._filtered.length) {
        return this._filtered[this._idx]["sys_id"] || "";
    }
    return "";
};
MockGR.prototype.isValid = function() {
    return true;
};

global.GlideRecord = function(table) { return new MockGR(table); };

global.GlideAggregate = function(table) {
    this._table = table;
    this._queries = [];
    this._aggField = null;
    this._aggType = null;
};
global.GlideAggregate.prototype.addQuery = function(field, op, value) {
    this._queries.push({ field: field, op: op, value: value });
};
global.GlideAggregate.prototype.addAggregate = function(type, field) {
    this._aggType = type;
    this._aggField = field;
};
global.GlideAggregate.prototype.query = function() {
    var rows = getMockRows(this._table);
    this._filtered = (Array.isArray(rows) ? rows : []).filter(function(row) {
        for (var i = 0; i < this._queries.length; i++) {
            var q = this._queries[i];
            if (q.op === "=" && row[q.field] !== q.value) return false;
        }
        return true;
    }.bind(this));
    this._idx = -1;
};
global.GlideAggregate.prototype.next = function() {
    this._idx++;
    return this._idx < 1; // aggregates return one summary row
};
global.GlideAggregate.prototype.getAggregate = function(type) {
    if (type === "COUNT") return String(this._filtered.length);
    return "0";
};

global.GlideDateTime = function() {};
global.GlideDateTime.prototype.getDisplayValue = function() { return "2026-05-16 00:00:00"; };
global.GlideDateTime.prototype.getDisplayValueInternal = function() { return "20260516000000"; };

global.Class = {
    create: function() {
        var Constructor = function() {
            if (this.initialize) {
                this.initialize.apply(this, arguments);
            }
        };
        return Constructor;
    }
};

function stripHeader(code) {
    return code.replace(/^\/\*.*?\*\//s, "");
}

function loadScript(name) {
    var filePath = path.join(__dirname, "..", "src", name);
    var code = fs.readFileSync(filePath, "utf8");
    global.eval(stripHeader(code));
}

// ------------------------------------------------------------------
// Load WFDT Source
// ------------------------------------------------------------------
loadScript("WFDTLineageScanner.js");
loadScript("WFDTRiskEngine.js");
loadScript("WFDTReportRenderer.js");

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log("  PASS: " + name);
    } catch (e) {
        failed++;
        console.error("  FAIL: " + name + " — " + e.message);
    }
}

function assertIncludes(str, needle) {
    if (String(str).indexOf(needle) === -1) {
        throw new Error("Expected string to include '" + needle + "'");
    }
}

// ------------------------------------------------------------------
// Test Cases
// ------------------------------------------------------------------
console.log("Running WFDT tests...\n");

test("WFDTLineageScanner initializes with correct version", function() {
    var s = new WFDTLineageScanner();
    assert.strictEqual(s.version, "1.0.0");
    assert.strictEqual(s.DATA_PRODUCT_TABLES.length, 4);
});

test("WFDTLineageScanner detect orphans in sys_data_source", function() {
    setMockRecords("sys_data_source", [
        { name: "HR Feed", sys_source_sys_id: "src1", sys_id: "d1" },
        { name: "Orphan Feed", sys_source_sys_id: "", sys_id: "d2" },
        { name: "Sec Feed", source: "sec1", sys_id: "d3" },
        { name: "No Lineage", sys_source_sys_id: "", source: "", sys_id: "d4" }
    ]);
    setMockRecords("sys_import_set", []);
    setMockRecords("sys_hub_flow_output", []);
    setMockRecords("sys_metadata_link", []);

    var s = new WFDTLineageScanner();
    var r = s.scanLineage();
    assert.strictEqual(r.totalAssets, 4);
    // d1 has sys_source_sys_id, d3 has source, d2 and d4 have neither -> 2 orphans
    assert.strictEqual(r.orphanedAssets, 2);
});

test("WFDTLineageScanner handles empty tables gracefully", function() {
    setMockRecords("sys_data_source", []);
    setMockRecords("sys_import_set", []);
    setMockRecords("sys_hub_flow_output", []);
    setMockRecords("sys_metadata_link", []);
    var s = new WFDTLineageScanner();
    var r = s.scanLineage();
    assert.strictEqual(r.totalAssets, 0);
    assert.strictEqual(r.orphanedAssets, 0);
});

test("WFDTLineageScanner detects import_set source link", function() {
    setMockRecords("sys_data_source", []);
    setMockRecords("sys_import_set", [
        { name: "Import A", source: "s1", sys_id: "i1" },
        { name: "Import B", source: "", data_source: "", sys_id: "i2" }
    ]);
    setMockRecords("sys_hub_flow_output", []);
    setMockRecords("sys_metadata_link", []);
    var s = new WFDTLineageScanner();
    var r = s.scanLineage();
    assert.strictEqual(r.totalAssets, 2);
    assert.strictEqual(r.orphanedAssets, 1);
});

test("WFDTLineageScanner detects flow_output parent flow", function() {
    setMockRecords("sys_data_source", []);
    setMockRecords("sys_import_set", []);
    setMockRecords("sys_hub_flow_output", [
        { name: "Flow Out 1", flow: "f1", sys_id: "o1" },
        { name: "Flow Out 2", flow: "", parent_flow: "", sys_id: "o2" }
    ]);
    setMockRecords("sys_metadata_link", []);
    var s = new WFDTLineageScanner();
    var r = s.scanLineage();
    assert.strictEqual(r.totalAssets, 2);
    assert.strictEqual(r.orphanedAssets, 1);
});

test("WFDTLineageScanner detects metadata_link url or table+key", function() {
    setMockRecords("sys_data_source", []);
    setMockRecords("sys_import_set", []);
    setMockRecords("sys_hub_flow_output", []);
    setMockRecords("sys_metadata_link", [
        { name: "Link ok", url: "http://x", sys_id: "m1" },
        { name: "Link ok2", url: "", table: "t1", document_key: "k1", sys_id: "m2" },
        { name: "Link bad", url: "", table: "", document_key: "", sys_id: "m3" }
    ]);
    var s = new WFDTLineageScanner();
    var r = s.scanLineage();
    assert.strictEqual(r.totalAssets, 3);
    assert.strictEqual(r.orphanedAssets, 1);
});

test("WFDTRiskEngine scores orphaned assets correctly", function() {
    var assets = [
        { table: "sys_data_source", sys_id: "d1", name: "Feed", orphaned: true },
        { table: "sys_data_source", sys_id: "d2", name: "Normal", orphaned: false }
    ];
    var engine = new WFDTRiskEngine();
    var out = engine.scoreAssets(assets);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].sys_id, "d1");
    assert.ok(out[0].riskScore >= 0);
});

test("WFDTRiskEngine sorts by descending risk score", function() {
    var assets = [
        { table: "sys_data_source", sys_id: "d1", name: "A", orphaned: true },
        { table: "sys_data_source", sys_id: "d2", name: "B", orphaned: true }
    ];
    var engine = new WFDTRiskEngine();
    var out = engine.scoreAssets(assets);
    assert.ok(out[0].riskScore >= out[1].riskScore);
});

test("WFDTReportRenderer produces valid HTML", function() {
    var renderer = new WFDTReportRenderer("html");
    var scored = [
        { table: "sys_data_source", sys_id: "d1", name: "Feed", riskScore: 5.2, volume: 2, criticality: 5 }
    ];
    var html = renderer.render(scored);
    assertIncludes(html, "<!DOCTYPE html>");
    assertIncludes(html, "Feed");
    assertIncludes(html, "5.2");
});

test("WFDTReportRenderer includes risk-high CSS class for high scores", function() {
    var renderer = new WFDTReportRenderer("html");
    var scored = [
        { table: "sys_data_source", sys_id: "d1", name: "HighRisk", riskScore: 9.5, volume: 8, criticality: 10 }
    ];
    var html = renderer.render(scored);
    assertIncludes(html, "risk-high");
});

test("WFDTReportRenderer produces valid CSV", function() {
    var renderer = new WFDTReportRenderer("csv");
    var scored = [
        { table: "sys_data_source", sys_id: "d1", name: "Feed", riskScore: 3.1, volume: 1, criticality: 4 }
    ];
    var csv = renderer.render(scored);
    var lines = csv.split("\n");
    assert.strictEqual(lines[0], "Table,Sys ID,Name,Risk Score,Volume,Criticality");
    assertIncludes(lines[1], "Feed");
    assertIncludes(lines[1], "3.1");
});

test("WFDTReportRenderer escapes CSV commas and quotes", function() {
    var renderer = new WFDTReportRenderer("csv");
    var scored = [
        { table: "sys_data_source", sys_id: "d1", name: 'Feed, "special"', riskScore: 1, volume: 0, criticality: 0 }
    ];
    var csv = renderer.render(scored);
    assertIncludes(csv, '"Feed, ""special"""');
});

// ------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------
console.log("\n" + "=".repeat(50));
console.log("Tests complete: " + passed + " passed, " + failed + " failed.");
console.log("=".repeat(50));

process.exit(failed > 0 ? 1 : 0);
