// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
// test_wfdt.js
const assert = require('assert');
function MockGR(table, rows) { this._rows = rows||[]; this._idx = -1; this._filters = {}; this._limit = null; this._filtered = []; }
MockGR.prototype.addQuery = function() {};
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() { this._idx = -1; this._filtered = this._rows; };
MockGR.prototype.next = function() { this._idx++; if(this._limit && this._idx >= this._limit) return false; return this._idx < this._filtered.length; };
MockGR.prototype.getValue = function(f) { if(this._idx >= 0 && this._idx < this._filtered.length) return String(this._filtered[this._idx][f]||""); return ""; };
MockGR.prototype.getUniqueValue = function() { if(this._idx >= 0 && this._idx < this._filtered.length) return this._filtered[this._idx]["sys_id"]||"m"; return "m"; };

const fs = require('fs');
function stripHeader(code){ return code.replace(/^\/\*.*?\*\//s, ''); }
global.Class = { create: function(){ var cls=function(){ if(this.initialize) this.initialize.apply(this, arguments); }; return cls; } };
global.GlideRecord = function(table){ return new MockGR(table, DB[table]); };
global.GlideDateTime = function(){ this.getDisplayValueInternal=function(){ return '20260516000000'; }; };
var DB = {
  "sys_data_source": [{ name: "HR Feed", sys_source_sys_id: "src1", sys_id: "d1" }, { name: "Orphan", sys_source_sys_id: "", sys_id: "d2" }],
  "sys_import_set": [{ name: "Import A", source: "src1", sys_id: "i1" }],
  "sys_metadata_link": [],
  "sys_hub_flow_output": []
};
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/WFDT/src/WFDTLineageScanner.js','utf8')));

function testLineage() {
  var s = new WFDTLineageScanner();
  var r = s.scanLineage();
  assert.ok(r.totalAssets >= 2);
  assert.strictEqual(r.orphanedAssets, 1);
  console.log("  testLineage PASSED (assets=" + r.totalAssets + ", orphaned=" + r.orphanedAssets + ")");
}
console.log("Running WFDT tests...\n");
testLineage();
console.log("All WFDT tests PASSED");
