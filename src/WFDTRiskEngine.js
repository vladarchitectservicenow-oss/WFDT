/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: MIT
 *
 * WFDT Risk Engine — scores orphaned assets by data volume and business criticality.
 */
var WFDTRiskEngine = Class.create();
WFDTRiskEngine.prototype = {
    initialize: function() {
        this.CRITICALITY_WEIGHT = 0.6;
        this.VOLUME_WEIGHT = 0.4;
    },

    scoreAssets: function(dataProducts) {
        var scored = [];
        for (var i = 0; i < dataProducts.length; i++) {
            var asset = dataProducts[i];
            if (!asset.orphaned) continue;
            var volume = this._estimateVolume(asset);
            var criticality = this._estimateCriticality(asset);
            var raw = volume * this.VOLUME_WEIGHT + criticality * this.CRITICALITY_WEIGHT;
            var riskScore = Math.round(raw * 100) / 100;
            scored.push({
                table: asset.table,
                sys_id: asset.sys_id,
                name: asset.name,
                riskScore: riskScore,
                volume: volume,
                criticality: criticality
            });
        }
        scored.sort(function(a, b) { return b.riskScore - a.riskScore; });
        return scored;
    },

    _estimateVolume: function(asset) {
        try {
            var gr = new GlideRecord(asset.table);
            if (!gr.isValid()) return 0;
            var relatedTable = "";
            var queryField = "";
            if (asset.table === "sys_data_source") {
                relatedTable = "sys_data_source_run";
                queryField = "sys_data_source";
            } else if (asset.table === "sys_import_set") {
                relatedTable = "sys_import_set_run";
                queryField = "sys_import_set";
            } else if (asset.table === "sys_hub_flow_output") {
                relatedTable = "sys_hub_flow_output_definition";
                queryField = "flow_output";
            } else {
                return 1;
            }
            var agg = new GlideAggregate(relatedTable);
            agg.addQuery(queryField, asset.sys_id);
            agg.addAggregate("COUNT");
            agg.query();
            if (agg.next()) {
                var c = parseInt(agg.getAggregate("COUNT"), 10);
                return isNaN(c) ? 0 : Math.min(c / 100, 10);
            }
        } catch (e) {
            gs.warn("WFDT volume estimation error for " + asset.sys_id + ": " + e.message);
        }
        return 1;
    },

    _estimateCriticality: function(asset) {
        var table = asset.table.toLowerCase();
        if (table.indexOf("cmdb") >= 0 || table.indexOf("security") >= 0) return 10;
        if (table.indexOf("data_source") >= 0) return 7;
        if (table.indexOf("import_set") >= 0) return 5;
        if (table.indexOf("flow_output") >= 0) return 4;
        return 3;
    },

    type: "WFDTRiskEngine"
};
