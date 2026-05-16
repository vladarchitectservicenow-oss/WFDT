/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * WFDT — Workflow Data Fabric Tracker
 * Scope: x_wfdt
 * Problem: Self-service data discovery in Workflow Data Fabric has no lineage visibility.
 */
var WFDTLineageScanner = Class.create();
WFDTLineageScanner.prototype = {
    initialize: function() {
        this.version = "1.0.0";
        this.DATA_PRODUCT_TABLES = ["sys_data_source", "sys_import_set", "sys_metadata_link", "sys_hub_flow_output"];
    },

    scanLineage: function() {
        var out = { dataProducts: [], orphanedAssets: 0, totalAssets: 0, scanDate: new GlideDateTime().getDisplayValueInternal() };
        for (var i = 0; i < this.DATA_PRODUCT_TABLES.length; i++) {
            var table = this.DATA_PRODUCT_TABLES[i];
            try {
                var gr = new GlideRecord(table);
                gr.query();
                while (gr.next()) {
                    out.totalAssets++;
                    var hasParent = !!gr.getValue("sys_source_sys_id") || !!gr.getValue("source") || !!gr.getValue("flow");
                    if (!hasParent) out.orphanedAssets++;
                    out.dataProducts.push({
                        table: table,
                        sys_id: gr.getUniqueValue(),
                        name: gr.getValue("name") || "",
                        orphaned: !hasParent
                    });
                }
            } catch (e) {}
        }
        return out;
    },

    type: "WFDTLineageScanner"
};
